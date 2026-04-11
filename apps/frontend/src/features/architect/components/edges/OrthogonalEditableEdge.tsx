"use client";

import React from "react";
import { BaseEdge, EdgeProps, Node, useReactFlow } from "@xyflow/react";

type EdgeData = {
  laneOffset?: number;
  routeOrder?: number;
};

type Point = {
  x: number;
  y: number;
};

type Rect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type Obstacle = {
  id: string;
  rect: Rect;
};

type Segment = {
  from: Point;
  to: Point;
};

type Direction = "right" | "down" | "left" | "up";

const EDGE_PORT_OFFSET = 36;
const OBSTACLE_PADDING = 22;
const SOURCE_TARGET_PADDING = 6;
const DETOUR_GAP = 56;
const OUTER_DETOUR_GAP = 88;
const CORNER_RADIUS = 14;
const DIRECTION_PRIORITY: Record<Direction, number> = {
  right: 0,
  down: 1,
  left: 2,
  up: 3,
};
const OVERLAP_EPSILON = 1;

const toNumber = (value: unknown, fallback: number) => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const almostEqual = (a: number, b: number, epsilon = 1) => Math.abs(a - b) <= epsilon;

const estimateTableSizeFromData = (node: Node) => {
  const data = (node.data || {}) as {
    label?: string;
    columns?: Array<{ name?: string }>;
  };

  const tableName = (data.label || "TABLE").toString();
  const columns = Array.isArray(data.columns) ? data.columns : [];
  const maxColumnNameLength = columns.reduce((max, column) => {
    const length = (column?.name || "").toString().length;
    return Math.max(max, length);
  }, 0);

  const width = Math.max(180, Math.min(300, 160 + Math.max(tableName.length, maxColumnNameLength) * 6));
  const rowCount = Math.max(columns.length, 1);
  const height = 44 + rowCount * 30 + 8;

  return { width, height };
};

const toObstacleRect = (node: Node, padding: number): Rect | null => {
  const measuredWidth =
    typeof node.width === "number"
      ? node.width
      : typeof (node as { measured?: { width?: number } }).measured?.width === "number"
      ? (node as { measured?: { width?: number } }).measured?.width
      : typeof (node as { initialWidth?: number }).initialWidth === "number"
      ? (node as { initialWidth?: number }).initialWidth
      : undefined;

  const measuredHeight =
    typeof node.height === "number"
      ? node.height
      : typeof (node as { measured?: { height?: number } }).measured?.height === "number"
      ? (node as { measured?: { height?: number } }).measured?.height
      : typeof (node as { initialHeight?: number }).initialHeight === "number"
      ? (node as { initialHeight?: number }).initialHeight
      : undefined;

  const fallbackSize = estimateTableSizeFromData(node);
  const width = measuredWidth || fallbackSize.width;
  const height = measuredHeight || fallbackSize.height;

  const absolutePosition = (node as { positionAbsolute?: Point }).positionAbsolute;
  const positionX = typeof absolutePosition?.x === "number" ? absolutePosition.x : node.position.x;
  const positionY = typeof absolutePosition?.y === "number" ? absolutePosition.y : node.position.y;

  if (!Number.isFinite(positionX) || !Number.isFinite(positionY)) return null;

  return {
    left: positionX - padding,
    right: positionX + width + padding,
    top: positionY - padding,
    bottom: positionY + height + padding,
  };
};

const isAxisAligned = (a: Point, b: Point) => almostEqual(a.x, b.x) || almostEqual(a.y, b.y);

const rangesOverlap = (aMin: number, aMax: number, bMin: number, bMax: number, epsilon = OVERLAP_EPSILON) => {
  const start = Math.max(aMin, bMin);
  const end = Math.min(aMax, bMax);
  return end - start > epsilon;
};

const segmentsCollinearOverlap = (a: Segment, b: Segment) => {
  const aVertical = almostEqual(a.from.x, a.to.x);
  const bVertical = almostEqual(b.from.x, b.to.x);
  const aHorizontal = almostEqual(a.from.y, a.to.y);
  const bHorizontal = almostEqual(b.from.y, b.to.y);

  if (aVertical && bVertical && almostEqual(a.from.x, b.from.x, OVERLAP_EPSILON)) {
    const aMinY = Math.min(a.from.y, a.to.y);
    const aMaxY = Math.max(a.from.y, a.to.y);
    const bMinY = Math.min(b.from.y, b.to.y);
    const bMaxY = Math.max(b.from.y, b.to.y);
    return rangesOverlap(aMinY, aMaxY, bMinY, bMaxY);
  }

  if (aHorizontal && bHorizontal && almostEqual(a.from.y, b.from.y, OVERLAP_EPSILON)) {
    const aMinX = Math.min(a.from.x, a.to.x);
    const aMaxX = Math.max(a.from.x, a.to.x);
    const bMinX = Math.min(b.from.x, b.to.x);
    const bMaxX = Math.max(b.from.x, b.to.x);
    return rangesOverlap(aMinX, aMaxX, bMinX, bMaxX);
  }

  return false;
};

const toSegments = (points: Point[]) => {
  const segments: Segment[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const from = points[i];
    const to = points[i + 1];
    if (almostEqual(from.x, to.x) && almostEqual(from.y, to.y)) continue;
    segments.push({ from, to });
  }
  return segments;
};

const encodePoints = (points: Point[]) => points.map((p) => `${Math.round(p.x)}:${Math.round(p.y)}`).join("|");

const decodePoints = (raw: string): Point[] => {
  return raw
    .split("|")
    .map((token) => {
      const [xRaw, yRaw] = token.split(":");
      const x = Number(xRaw);
      const y = Number(yRaw);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { x, y };
    })
    .filter((p): p is Point => p !== null);
};

const getReservedSegmentsFromDom = (currentEdgeId: string, currentRouteOrder: number | null) => {
  if (typeof document === "undefined") return [] as Segment[];

  const elements = document.querySelectorAll<SVGPathElement>("[data-aepra-route='1']");
  const reserved: Segment[] = [];

  elements.forEach((element) => {
    const edgeId = element.getAttribute("data-edge-id");
    if (!edgeId || edgeId === currentEdgeId) return;

    const orderRaw = element.getAttribute("data-route-order");
    const otherOrder = orderRaw ? Number(orderRaw) : Number.NaN;

    if (currentRouteOrder !== null) {
      if (Number.isFinite(otherOrder) && otherOrder >= currentRouteOrder) {
        return;
      }
    } else {
      // Fallback deterministic ordering when routeOrder metadata is missing.
      if (edgeId.localeCompare(currentEdgeId) >= 0) {
        return;
      }
    }

    const pointsRaw = element.getAttribute("data-route-points");
    if (!pointsRaw) return;

    const points = decodePoints(pointsRaw);
    if (points.length < 2) return;

    reserved.push(...toSegments(points));
  });

  return reserved;
};

const segmentIntersectsRect = (a: Point, b: Point, rect: Rect) => {
  const epsilon = 0.001;

  if (almostEqual(a.x, b.x)) {
    const x = a.x;
    // Strict interior intersection: touching boundary is allowed, crossing body is not.
    if (x <= rect.left + epsilon || x >= rect.right - epsilon) return false;

    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    return maxY > rect.top + epsilon && minY < rect.bottom - epsilon;
  }

  const y = a.y;
  if (y <= rect.top + epsilon || y >= rect.bottom - epsilon) return false;

  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  return maxX > rect.left + epsilon && minX < rect.right - epsilon;
};

const isSegmentBlocked = (a: Point, b: Point, obstacles: Obstacle[], ignoredObstacleIds: Set<string>) => {
  if (!isAxisAligned(a, b)) return true;
  return obstacles.some((obstacle) => {
    if (ignoredObstacleIds.has(obstacle.id)) return false;
    return segmentIntersectsRect(a, b, obstacle.rect);
  });
};

const isRouteClear = (
  points: Point[],
  obstacles: Obstacle[],
  reservedSegments: Segment[],
  sourceNodeId?: string,
  targetNodeId?: string
) => {
  const routeSegments = toSegments(points);

  for (const routeSegment of routeSegments) {
    if (reservedSegments.some((reserved) => segmentsCollinearOverlap(routeSegment, reserved))) {
      return false;
    }
  }

  for (let i = 0; i < points.length - 1; i += 1) {
    const ignoredObstacleIds = new Set<string>();
    if (i === 0 && sourceNodeId) {
      ignoredObstacleIds.add(sourceNodeId);
    }
    if (i === points.length - 2 && targetNodeId) {
      ignoredObstacleIds.add(targetNodeId);
    }

    if (isSegmentBlocked(points[i], points[i + 1], obstacles, ignoredObstacleIds)) {
      return false;
    }
  }
  return true;
};

const simplifyPoints = (points: Point[]) => {
  if (points.length <= 2) return points;

  const simplified: Point[] = [points[0]];

  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = simplified[simplified.length - 1];
    const current = points[i];
    const next = points[i + 1];

    const sameVertical = almostEqual(prev.x, current.x) && almostEqual(current.x, next.x);
    const sameHorizontal = almostEqual(prev.y, current.y) && almostEqual(current.y, next.y);

    if (!sameVertical && !sameHorizontal) {
      simplified.push(current);
    }
  }

  simplified.push(points[points.length - 1]);
  return simplified;
};

const buildRoundedOrthogonalPath = (points: Point[], radius = 12) => {
  const cleaned = simplifyPoints(points);
  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return `M ${cleaned[0].x} ${cleaned[0].y}`;

  if (cleaned.length === 2) {
    return `M ${cleaned[0].x} ${cleaned[0].y} L ${cleaned[1].x} ${cleaned[1].y}`;
  }

  const pathParts: string[] = [`M ${cleaned[0].x} ${cleaned[0].y}`];

  for (let i = 1; i < cleaned.length - 1; i += 1) {
    const prev = cleaned[i - 1];
    const corner = cleaned[i];
    const next = cleaned[i + 1];

    const inLength = Math.hypot(corner.x - prev.x, corner.y - prev.y);
    const outLength = Math.hypot(next.x - corner.x, next.y - corner.y);
    const cut = Math.min(radius, inLength / 2, outLength / 2);

    const inDx = (corner.x - prev.x) / (inLength || 1);
    const inDy = (corner.y - prev.y) / (inLength || 1);
    const outDx = (next.x - corner.x) / (outLength || 1);
    const outDy = (next.y - corner.y) / (outLength || 1);

    const before = { x: corner.x - inDx * cut, y: corner.y - inDy * cut };
    const after = { x: corner.x + outDx * cut, y: corner.y + outDy * cut };

    pathParts.push(`L ${before.x} ${before.y}`);
    pathParts.push(`Q ${corner.x} ${corner.y} ${after.x} ${after.y}`);
  }

  const last = cleaned[cleaned.length - 1];
  pathParts.push(`L ${last.x} ${last.y}`);
  return pathParts.join(" ");
};

const uniqueCandidates = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.filter((value, idx) => idx === 0 || !almostEqual(value, sorted[idx - 1], 1));
};

const estimateLength = (points: Point[]) => {
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    total += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  return total;
};

const getSegmentDirection = (a: Point, b: Point): Direction | null => {
  if (almostEqual(a.x, b.x) && almostEqual(a.y, b.y)) return null;
  if (almostEqual(a.x, b.x)) {
    return b.y > a.y ? "down" : "up";
  }
  if (almostEqual(a.y, b.y)) {
    return b.x > a.x ? "right" : "left";
  }
  return null;
};

const getTurnCount = (points: Point[]) => {
  let turns = 0;
  let lastDirection: Direction | null = null;

  for (let i = 0; i < points.length - 1; i += 1) {
    const direction = getSegmentDirection(points[i], points[i + 1]);
    if (!direction) continue;
    if (lastDirection && direction !== lastDirection) {
      turns += 1;
    }
    lastDirection = direction;
  }

  return turns;
};

const isOppositeDirection = (a: Direction, b: Direction) => {
  return (
    (a === "left" && b === "right") ||
    (a === "right" && b === "left") ||
    (a === "up" && b === "down") ||
    (a === "down" && b === "up")
  );
};

const getDirectionPreferenceScore = (points: Point[]) => {
  let score = 0;
  let lastDirection: Direction | null = null;

  for (let i = 0; i < points.length - 1; i += 1) {
    const direction = getSegmentDirection(points[i], points[i + 1]);
    if (!direction) continue;

    score += DIRECTION_PRIORITY[direction] * 10;

    if (lastDirection && direction !== lastDirection) {
      score += 3;
      if (isOppositeDirection(lastDirection, direction)) {
        score += 18;
      }
    }

    lastDirection = direction;
  }

  return score;
};

const chooseBestRoute = (routes: Point[][]) => {
  if (routes.length === 0) return null;
  return routes.sort((a, b) => {
    const aSimplified = simplifyPoints(a);
    const bSimplified = simplifyPoints(b);

    const aPreference = getDirectionPreferenceScore(aSimplified);
    const bPreference = getDirectionPreferenceScore(bSimplified);
    if (aPreference !== bPreference) return aPreference - bPreference;

    const aTurns = getTurnCount(aSimplified);
    const bTurns = getTurnCount(bSimplified);
    if (aTurns !== bTurns) return aTurns - bTurns;

    return estimateLength(aSimplified) - estimateLength(bSimplified);
  })[0];
};

const getOrthogonalRoute = (
  source: Point,
  sourceOut: Point,
  targetIn: Point,
  target: Point,
  obstacles: Obstacle[],
  reservedSegments: Segment[],
  sourceNodeId: string | undefined,
  targetNodeId: string | undefined,
  laneOffset: number
): Point[] | null => {
  const candidates: Point[][] = [];

  const straightAligned =
    almostEqual(sourceOut.x, targetIn.x) || almostEqual(sourceOut.y, targetIn.y);

  if (straightAligned) {
    const route = [source, sourceOut, targetIn, target];
    if (isRouteClear(route, obstacles, reservedSegments, sourceNodeId, targetNodeId)) {
      candidates.push(route);
    }
  }

  const primaryL = [source, sourceOut, { x: targetIn.x, y: sourceOut.y }, targetIn, target];
  if (isRouteClear(primaryL, obstacles, reservedSegments, sourceNodeId, targetNodeId)) {
    candidates.push(primaryL);
  }

  const secondaryL = [source, sourceOut, { x: sourceOut.x, y: targetIn.y }, targetIn, target];
  if (isRouteClear(secondaryL, obstacles, reservedSegments, sourceNodeId, targetNodeId)) {
    candidates.push(secondaryL);
  }

  const midY = (sourceOut.y + targetIn.y) / 2;
  const midX = (sourceOut.x + targetIn.x) / 2;
  const detourGap = DETOUR_GAP;
  const lane = laneOffset * 0.25;

  const yCandidates = uniqueCandidates([
    sourceOut.y,
    targetIn.y,
    midY,
    midY - detourGap,
    midY + detourGap,
    sourceOut.y + lane,
    targetIn.y - lane,
    ...obstacles.flatMap((obstacle) => [obstacle.rect.top - detourGap, obstacle.rect.bottom + detourGap]),
  ]);

  for (const y of yCandidates) {
    const route = [
      source,
      sourceOut,
      { x: sourceOut.x, y },
      { x: targetIn.x, y },
      targetIn,
      target,
    ];
    if (isRouteClear(route, obstacles, reservedSegments, sourceNodeId, targetNodeId)) {
      candidates.push(route);
    }
  }

  const xCandidates = uniqueCandidates([
    sourceOut.x,
    targetIn.x,
    midX,
    midX - detourGap,
    midX + detourGap,
    sourceOut.x + lane,
    targetIn.x - lane,
    ...obstacles.flatMap((obstacle) => [obstacle.rect.left - detourGap, obstacle.rect.right + detourGap]),
  ]);

  for (const x of xCandidates) {
    const route = [
      source,
      sourceOut,
      { x, y: sourceOut.y },
      { x, y: targetIn.y },
      targetIn,
      target,
    ];
    if (isRouteClear(route, obstacles, reservedSegments, sourceNodeId, targetNodeId)) {
      candidates.push(route);
    }
  }

  if (obstacles.length > 0) {
    const topMost = Math.min(...obstacles.map((obstacle) => obstacle.rect.top));
    const bottomMost = Math.max(...obstacles.map((obstacle) => obstacle.rect.bottom));
    const leftMost = Math.min(...obstacles.map((obstacle) => obstacle.rect.left));
    const rightMost = Math.max(...obstacles.map((obstacle) => obstacle.rect.right));

    const outerY = [topMost - OUTER_DETOUR_GAP, bottomMost + OUTER_DETOUR_GAP];
    for (const y of outerY) {
      const route = [
        source,
        sourceOut,
        { x: sourceOut.x, y },
        { x: targetIn.x, y },
        targetIn,
        target,
      ];
      if (isRouteClear(route, obstacles, reservedSegments, sourceNodeId, targetNodeId)) {
        candidates.push(route);
      }
    }

    const outerX = [leftMost - OUTER_DETOUR_GAP, rightMost + OUTER_DETOUR_GAP];
    for (const x of outerX) {
      const route = [
        source,
        sourceOut,
        { x, y: sourceOut.y },
        { x, y: targetIn.y },
        targetIn,
        target,
      ];
      if (isRouteClear(route, obstacles, reservedSegments, sourceNodeId, targetNodeId)) {
        candidates.push(route);
      }
    }
  }

  const best = chooseBestRoute(candidates);
  if (best) {
    return simplifyPoints(best);
  }

  const sweepSteps = 48;
  for (let i = 1; i <= sweepSteps; i += 1) {
    const delta = i * DETOUR_GAP;

    const yUp = midY - delta;
    const yDown = midY + delta;
    const yRoutes = [
      [source, sourceOut, { x: sourceOut.x, y: yUp }, { x: targetIn.x, y: yUp }, targetIn, target],
      [source, sourceOut, { x: sourceOut.x, y: yDown }, { x: targetIn.x, y: yDown }, targetIn, target],
    ];

    for (const route of yRoutes) {
      if (isRouteClear(route, obstacles, reservedSegments, sourceNodeId, targetNodeId)) {
        return simplifyPoints(route);
      }
    }

    const xLeft = midX - delta;
    const xRight = midX + delta;
    const xRoutes = [
      [source, sourceOut, { x: xLeft, y: sourceOut.y }, { x: xLeft, y: targetIn.y }, targetIn, target],
      [source, sourceOut, { x: xRight, y: sourceOut.y }, { x: xRight, y: targetIn.y }, targetIn, target],
    ];

    for (const route of xRoutes) {
      if (isRouteClear(route, obstacles, reservedSegments, sourceNodeId, targetNodeId)) {
        return simplifyPoints(route);
      }
    }
  }

  return null;
};

const getPortOffsetPoint = (
  position: string | undefined,
  x: number,
  y: number,
  distance: number
) => {
  switch ((position || "").toLowerCase()) {
    case "left":
      return { x: x - distance, y };
    case "right":
      return { x: x + distance, y };
    case "top":
      return { x, y: y - distance };
    case "bottom":
      return { x, y: y + distance };
    default:
      return { x, y };
  }
};

export default function OrthogonalEditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  source,
  target,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps) {
  const { getNodes } = useReactFlow();
  const edgeData = (data || {}) as EdgeData;
  const routeOrder = typeof edgeData.routeOrder === "number" ? edgeData.routeOrder : null;

  const sourceOut = getPortOffsetPoint(sourcePosition, sourceX, sourceY, EDGE_PORT_OFFSET);
  const targetIn = getPortOffsetPoint(targetPosition, targetX, targetY, EDGE_PORT_OFFSET);

  const nodes = getNodes();
  const laneOffset = toNumber(edgeData.laneOffset, 0);
  const reservedSegments = getReservedSegmentsFromDom(id, routeOrder);
  const obstacles = nodes
    .map((node) => {
      const padding = node.id === source || node.id === target ? SOURCE_TARGET_PADDING : OBSTACLE_PADDING;
      const rect = toObstacleRect(node, padding);
      return rect ? { id: node.id, rect } : null;
    })
    .filter((obstacle): obstacle is Obstacle => obstacle !== null);

  const points = getOrthogonalRoute(
    { x: sourceX, y: sourceY },
    sourceOut,
    targetIn,
    { x: targetX, y: targetY },
    obstacles,
    reservedSegments,
    source,
    target,
    laneOffset
  );
  const isFinalRouteSafe =
    points &&
    isRouteClear(
      [
        { x: sourceX, y: sourceY },
        ...points.slice(1, -1),
        { x: targetX, y: targetY },
      ],
      obstacles,
      reservedSegments,
      source,
      target
    );

  const path = points && isFinalRouteSafe ? buildRoundedOrthogonalPath(points, CORNER_RADIUS) : "";
  const serializedPoints = points ? encodePoints(points) : "";

  return (
    <>
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        style={{ stroke: "#ffffff", strokeWidth: 2, strokeLinecap: "round", ...(style || {}) }}
      />
      {path && (
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={1}
          pointerEvents="none"
          data-aepra-route="1"
          data-edge-id={id}
          data-route-order={routeOrder !== null ? routeOrder : undefined}
          data-route-points={serializedPoints}
        />
      )}
    </>
  );
}
