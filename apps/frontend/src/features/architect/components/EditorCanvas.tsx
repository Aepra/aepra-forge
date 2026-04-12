"use client";

import React, { useCallback, useRef, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  Connection,
  Edge,
  Node,
  NodeChange,
  BackgroundVariant,
  SelectionMode,
  MarkerType,
  ConnectionMode,
  ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { TableNode } from "@/features/architect/components/nodes/TableNode";
import type { RelationArrowType } from "../index";
import OrthogonalEditableEdge from "./edges/OrthogonalEditableEdge";
import { loadProject, saveProject, getCurrentProjectId } from "@/lib/project-storage";

const initialNodes: Node[] = [];
const MIN_TABLE_PASSAGE_GAP = 48;
const ARCHITECT_EVENT_UNDO = "architect:undo";
const ARCHITECT_EVENT_REDO = "architect:redo";
const ARCHITECT_EVENT_AUTO_LAYOUT = "architect:auto-layout";
const ARCHITECT_EVENT_EXPORT = "architect:export-json";
const ARCHITECT_EVENT_IMPORT = "architect:import-json";
const ARCHITECT_EVENT_SAVE = "architect:save";
const ARCHITECT_EVENT_GENERATE = "architect:generate";

type OrthogonalEdgeData = {
  laneOffset?: number;
  routeOrder?: number;
};

const getEdgeOrderKey = (edge: Edge) => {
  return [
    edge.source || "",
    edge.sourceHandle || "",
    edge.target || "",
    edge.targetHandle || "",
    edge.id,
  ].join("|");
};

const normalizeOrthogonalEdgeOrder = (edges: Edge[]) => {
  const sortedOrthogonalIds = edges
    .filter((edge) => edge.type === "orthogonalEditable")
    .sort((a, b) => getEdgeOrderKey(a).localeCompare(getEdgeOrderKey(b)))
    .map((edge) => edge.id);

  const idToOrder = new Map(sortedOrthogonalIds.map((id, index) => [id, index]));
  let hasChanges = false;

  const normalized = edges.map((edge) => {
    if (edge.type !== "orthogonalEditable") return edge;

    const nextOrder = idToOrder.get(edge.id) ?? 0;
    const currentData = (edge.data || {}) as OrthogonalEdgeData;
    if (currentData.routeOrder === nextOrder) {
      return edge;
    }

    hasChanges = true;
    return {
      ...edge,
      data: {
        ...currentData,
        routeOrder: nextOrder,
      },
    };
  });

  return hasChanges ? normalized : edges;
};

const getColumnIdFromHandle = (handleId?: string | null) => {
  if (!handleId) return "";
  return handleId
    .replace(/^left-/, "")
    .replace(/^right-/, "")
    .replace(/-source$/, "");
};

const getNodeColumns = (node: Node) =>
  Array.isArray((node.data as { columns?: unknown[] })?.columns)
    ? (((node.data as { columns?: unknown[] }).columns || []) as Array<{
        id?: string;
        name?: string;
        type?: string;
        nullable?: boolean;
        unique?: boolean;
        default?: string | null;
        length?: number;
        primary?: boolean;
        primaryKey?: boolean;
      }>)
    : [];

const getNodeVisualSize = (node: Node) => {
  const measuredWidth =
    typeof node.width === "number"
      ? node.width
      : typeof (node as { measured?: { width?: number } }).measured?.width === "number"
      ? (node as { measured?: { width?: number } }).measured?.width
      : 220;

  const measuredHeight =
    typeof node.height === "number"
      ? node.height
      : typeof (node as { measured?: { height?: number } }).measured?.height === "number"
      ? (node as { measured?: { height?: number } }).measured?.height
      : 180;

  const width = typeof measuredWidth === "number" ? measuredWidth : 220;
  const height = typeof measuredHeight === "number" ? measuredHeight : 180;

  return { width, height };
};

const getNodeCenter = (node: Node) => {
  const { width, height } = getNodeVisualSize(node);
  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2,
  };
};

const buildSourceHandleId = (side: "left" | "right", columnId: string) => {
  return `${side}-${columnId}-source`;
};

const buildTargetHandleId = (side: "left" | "right", columnId: string) => {
  return `${side}-${columnId}`;
};

const getSideAnchorPoint = (node: Node, side: "left" | "right") => {
  const { width, height } = getNodeVisualSize(node);
  const leftX = node.position.x;
  const rightX = node.position.x + width;
  return {
    x: side === "left" ? leftX : rightX,
    y: node.position.y + height / 2,
  };
};

const getSidePairScore = (
  sourceNode: Node,
  targetNode: Node,
  sourceSide: "left" | "right",
  targetSide: "left" | "right"
) => {
  const sourceAnchor = getSideAnchorPoint(sourceNode, sourceSide);
  const targetAnchor = getSideAnchorPoint(targetNode, targetSide);

  const manhattanDistance =
    Math.abs(targetAnchor.x - sourceAnchor.x) + Math.abs(targetAnchor.y - sourceAnchor.y);

  const sourceCenter = getNodeCenter(sourceNode);
  const targetCenter = getNodeCenter(targetNode);
  const targetOnRight = targetCenter.x >= sourceCenter.x;
  const outwardDirectionBonus =
    (targetOnRight && sourceSide === "right") || (!targetOnRight && sourceSide === "left")
      ? -24
      : 0;

  return manhattanDistance + outwardDirectionBonus;
};

type RectBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const getNodeRect = (node: Node, position?: { x: number; y: number }): RectBounds => {
  const { width, height } = getNodeVisualSize(node);
  const x = position?.x ?? node.position.x;
  const y = position?.y ?? node.position.y;

  return {
    left: x,
    right: x + width,
    top: y,
    bottom: y + height,
  };
};

const rectanglesOverlap = (a: RectBounds, b: RectBounds) => {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
};

const resolveNodePositionWithGap = (
  movingNode: Node,
  desiredPosition: { x: number; y: number },
  allNodes: Node[],
  stagedPositions: Map<string, { x: number; y: number }>
) => {
  let nextPosition = { ...desiredPosition };

  for (let iteration = 0; iteration < 10; iteration += 1) {
    const movingRect = getNodeRect(movingNode, nextPosition);
    let adjusted = false;

    for (const otherNode of allNodes) {
      if (otherNode.id === movingNode.id) continue;

      const otherPosition = stagedPositions.get(otherNode.id) || otherNode.position;
      const otherRect = getNodeRect(otherNode, otherPosition);
      const expandedOtherRect: RectBounds = {
        left: otherRect.left - MIN_TABLE_PASSAGE_GAP,
        right: otherRect.right + MIN_TABLE_PASSAGE_GAP,
        top: otherRect.top - MIN_TABLE_PASSAGE_GAP,
        bottom: otherRect.bottom + MIN_TABLE_PASSAGE_GAP,
      };

      if (!rectanglesOverlap(movingRect, expandedOtherRect)) {
        continue;
      }

      const shiftCandidates = [
        { dx: expandedOtherRect.left - movingRect.right, dy: 0 },
        { dx: expandedOtherRect.right - movingRect.left, dy: 0 },
        { dx: 0, dy: expandedOtherRect.top - movingRect.bottom },
        { dx: 0, dy: expandedOtherRect.bottom - movingRect.top },
      ];

      shiftCandidates.sort((a, b) => Math.abs(a.dx) + Math.abs(a.dy) - (Math.abs(b.dx) + Math.abs(b.dy)));
      const bestShift = shiftCandidates[0];

      nextPosition = {
        x: nextPosition.x + bestShift.dx,
        y: nextPosition.y + bestShift.dy,
      };

      adjusted = true;
      break;
    }

    if (!adjusted) {
      break;
    }
  }

  return nextPosition;
};

const getPreferredSides = (sourceNode: Node, targetNode: Node) => {
  const sidePairs: Array<{ sourceSide: "left" | "right"; targetSide: "left" | "right" }> = [
    { sourceSide: "left", targetSide: "left" },
    { sourceSide: "left", targetSide: "right" },
    { sourceSide: "right", targetSide: "left" },
    { sourceSide: "right", targetSide: "right" },
  ];

  return sidePairs
    .map((pair) => ({
      ...pair,
      score: getSidePairScore(sourceNode, targetNode, pair.sourceSide, pair.targetSide),
    }))
    .sort((a, b) => a.score - b.score)[0];
};

const resolveEfficientHandles = (connection: Connection, nodes: Node[]) => {
  const { source, target, sourceHandle, targetHandle } = connection;
  if (!source || !target || !sourceHandle || !targetHandle) return connection;

  const sourceNode = nodes.find((node) => node.id === source);
  const targetNode = nodes.find((node) => node.id === target);
  if (!sourceNode || !targetNode) return connection;

  const sourceColumnId = getColumnIdFromHandle(sourceHandle);
  const targetColumnId = getColumnIdFromHandle(targetHandle);
  if (!sourceColumnId || !targetColumnId) return connection;

  const { sourceSide, targetSide } = getPreferredSides(sourceNode, targetNode);

  return {
    ...connection,
    sourceHandle: buildSourceHandleId(sourceSide, sourceColumnId),
    targetHandle: buildTargetHandleId(targetSide, targetColumnId),
  };
};

const getEdgeConnectionKey = (
  source: string | null | undefined,
  sourceHandle: string | null | undefined,
  target: string | null | undefined,
  targetHandle: string | null | undefined
) => {
  return [source || "", sourceHandle || "", target || "", targetHandle || ""].join("|");
};

const optimizeExistingOrthogonalEdges = (edges: Edge[], nodes: Node[]) => {
  let hasChanges = false;
  const usedConnections = new Set<string>();

  const updated = edges.map((edge) => {
    const currentKey = getEdgeConnectionKey(
      edge.source,
      edge.sourceHandle || null,
      edge.target,
      edge.targetHandle || null
    );

    if (edge.type !== "orthogonalEditable") {
      usedConnections.add(currentKey);
      return edge;
    }

    const optimized = resolveEfficientHandles(
      {
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || null,
        targetHandle: edge.targetHandle || null,
      },
      nodes
    );

    const nextSourceHandle = optimized.sourceHandle || edge.sourceHandle;
    const nextTargetHandle = optimized.targetHandle || edge.targetHandle;

    if (!nextSourceHandle || !nextTargetHandle) {
      usedConnections.add(currentKey);
      return edge;
    }

    const nextKey = getEdgeConnectionKey(edge.source, nextSourceHandle, edge.target, nextTargetHandle);
    const connectionAlreadyUsed = nextKey !== currentKey && usedConnections.has(nextKey);

    if (connectionAlreadyUsed) {
      usedConnections.add(currentKey);
      return edge;
    }

    usedConnections.add(nextKey);

    if (nextSourceHandle === edge.sourceHandle && nextTargetHandle === edge.targetHandle) {
      return edge;
    }

    hasChanges = true;
    return {
      ...edge,
      sourceHandle: nextSourceHandle,
      targetHandle: nextTargetHandle,
    };
  });

  return hasChanges ? updated : edges;
};

const isPrimaryKeyColumn = (column: any) => {
  const colName = (column?.name || "").toString().toLowerCase();
  const colType = (column?.type || "").toString().toLowerCase();
  return colName === "id" || colType === "uuid" || column?.primaryKey === true;
};

const isForeignKeyColumn = (column: any) => {
  const colType = (column?.type || "").toString().toLowerCase();
  return colType === "int fk";
};

interface CanvasInnerProps {
  relationArrowType: RelationArrowType;
}

type HistorySnapshot = {
  nodes: Node[];
  edges: Edge[];
};

const CanvasInner = ({ relationArrowType }: CanvasInnerProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isNodeDragging, setIsNodeDragging] = React.useState(false);
  const isNodeDraggingRef = useRef(false);
  const historyRef = useRef<HistorySnapshot[]>([]);
  const futureRef = useRef<HistorySnapshot[]>([]);
  const suspendHistoryRef = useRef(false);
  const lastSnapshotSignatureRef = useRef("");
  const { screenToFlowPosition } = useReactFlow();
  const [edgeContextMenu, setEdgeContextMenu] = React.useState<{
    edgeId: string;
    x: number;
    y: number;
  } | null>(null);

  const connectionLineType = relationArrowType === "orthogonal"
    ? ConnectionLineType.Straight
    : ConnectionLineType.Bezier;

  const edgeType = relationArrowType === "orthogonal" ? "straight" : "default";

  const nodeTypes = useMemo(() => ({ tableErd: TableNode }), []);
  const edgeTypes = useMemo(() => ({ orthogonalEditable: OrthogonalEditableEdge }), []);

  const snapshotState = useCallback((inputNodes: Node[], inputEdges: Edge[]): HistorySnapshot => {
    return {
      nodes: inputNodes.map((node) => ({ ...node, position: { ...node.position }, data: { ...(node.data || {}) } })),
      edges: inputEdges.map((edge) => ({ ...edge, data: edge.data ? { ...edge.data } : edge.data, style: edge.style ? { ...edge.style } : edge.style })),
    };
  }, []);

  const persistWorkspace = useCallback((workspaceName?: string) => {
    saveProject({
      id: getCurrentProjectId() || undefined,
      name: workspaceName,
      nodes,
      edges,
    });
  }, [nodes, edges]);

  const applySnapshot = useCallback(
    (snapshot: HistorySnapshot) => {
      suspendHistoryRef.current = true;
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);

      requestAnimationFrame(() => {
        suspendHistoryRef.current = false;
      });
    },
    [setNodes, setEdges]
  );

  const applyEdgeLayoutOptimization = useCallback((inputEdges: Edge[], currentNodes: Node[]) => {
    const optimized = optimizeExistingOrthogonalEdges(inputEdges, currentNodes);
    return normalizeOrthogonalEdgeOrder(optimized);
  }, []);

  useEffect(() => {
    if (edges.length === 0) return;

    const debounceMs = isNodeDragging ? 140 : 70;
    const timer = window.setTimeout(() => {
      setEdges((prevEdges) => applyEdgeLayoutOptimization(prevEdges, nodes));
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [setEdges, nodes, edges.length, isNodeDragging, applyEdgeLayoutOptimization]);

  useEffect(() => {
    if (suspendHistoryRef.current) return;

    const signature = JSON.stringify({
      nodes: nodes.map((node) => ({ id: node.id, x: Math.round(node.position.x), y: Math.round(node.position.y), data: node.data })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        style: edge.style,
        data: edge.data,
      })),
    });

    if (lastSnapshotSignatureRef.current === signature) return;
    lastSnapshotSignatureRef.current = signature;

    historyRef.current.push(snapshotState(nodes, edges));
    if (historyRef.current.length > 80) {
      historyRef.current.shift();
    }
    futureRef.current = [];
  }, [nodes, edges, snapshotState]);

  useEffect(() => {
    const currentProjectId = getCurrentProjectId();
    if (!currentProjectId) return;

    const project = loadProject(currentProjectId);
    if (!project) return;

    applySnapshot(snapshotState(project.nodes as Node[], project.edges as Edge[]));
    lastSnapshotSignatureRef.current = JSON.stringify({
      nodes: project.nodes,
      edges: project.edges,
    });
  }, [applySnapshot, snapshotState]);

  useEffect(() => {
    const runUndo = () => {
      if (historyRef.current.length < 2) return;

      const current = historyRef.current.pop();
      if (!current) return;
      futureRef.current.push(current);
      const previous = historyRef.current[historyRef.current.length - 1];
      if (!previous) return;
      applySnapshot(previous);
    };

    const runRedo = () => {
      const next = futureRef.current.pop();
      if (!next) return;
      historyRef.current.push(next);
      applySnapshot(next);
    };

    const runAutoLayout = () => {
      setNodes((prevNodes) => {
        const colCount = Math.max(1, Math.ceil(Math.sqrt(prevNodes.length || 1)));
        const spacingX = 340;
        const spacingY = 240;

        return prevNodes.map((node, index) => {
          const col = index % colCount;
          const row = Math.floor(index / colCount);
          return {
            ...node,
            position: {
              x: 120 + col * spacingX,
              y: 120 + row * spacingY,
            },
          };
        });
      });
    };

    const runExport = () => {
      const payload = {
        version: "1.1",
        nodes,
        edges,
      };

      const content = JSON.stringify(payload, null, 2);
      const element = document.createElement("a");
      element.setAttribute("href", "data:application/json;charset=utf-8," + encodeURIComponent(content));
      element.setAttribute("download", "architect-workspace.json");
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    };

    const runImport = (event: Event) => {
      const customEvent = event as CustomEvent<{ nodes?: Node[]; edges?: Edge[]; tables?: any[]; relations?: any[] }>;
      const detail = customEvent.detail || {};

      if (Array.isArray(detail.nodes) && Array.isArray(detail.edges)) {
        applySnapshot(snapshotState(detail.nodes, detail.edges));
        return;
      }

      if (Array.isArray(detail.tables)) {
        const importedNodes: Node[] = detail.tables.map((table, index) => ({
          id: String(table.id || `table_${index + 1}`),
          type: "tableErd",
          position: { x: 120 + (index % 3) * 340, y: 120 + Math.floor(index / 3) * 240 },
          data: {
            label: table.name || `TABLE_${index + 1}`,
            columns: Array.isArray(table.columns) ? table.columns : [],
          },
        }));

        const importedEdges: Edge[] = Array.isArray(detail.relations)
          ? detail.relations.map((relation, index) => ({
              id: String(relation.id || `edge_${index + 1}`),
              source: String(relation.source || ""),
              target: String(relation.target || ""),
              sourceHandle: relation.sourceColumn || null,
              targetHandle: relation.targetColumn || null,
              type: relationArrowType === "orthogonal" ? "orthogonalEditable" : "default",
              style: { stroke: "#ffffff", strokeWidth: 1.6 },
            }))
          : [];

        applySnapshot(snapshotState(importedNodes, importedEdges));
      }
    };

    const runSave = () => {
      persistWorkspace();
    };

    const runGenerate = async (event: Event) => {
      const customEvent = event as CustomEvent<{ framework?: string }>;
      const framework = customEvent.detail?.framework || "fastapi";

      const tableNameByNodeId = new Map<string, string>();
      const tables = nodes.map((node, index) => {
        const tableName = String((node.data as { label?: string })?.label || `table_${index + 1}`)
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_");

        tableNameByNodeId.set(node.id, tableName);

        const columns = getNodeColumns(node).map((col, colIndex) => ({
          name: String(col.name || `column_${colIndex + 1}`),
          type: String(col.type || "varchar"),
          primary: col.primary === true || col.primaryKey === true,
          nullable: col.nullable !== false,
          unique: col.unique === true,
          default: col.default || null,
          length: typeof col.length === "number" ? col.length : null,
        }));

        return {
          id: String(node.id),
          name: tableName,
          columns,
        };
      });

      const relations = edges
        .map((edge) => {
          const sourceNode = nodes.find((node) => node.id === edge.source);
          const targetNode = nodes.find((node) => node.id === edge.target);

          if (!sourceNode || !targetNode) return null;

          const sourceColumnId = getColumnIdFromHandle(edge.sourceHandle || null);
          const targetColumnId = getColumnIdFromHandle(edge.targetHandle || null);

          const sourceColumn = getNodeColumns(sourceNode).find((col) => String(col.id || "") === sourceColumnId);
          const targetColumn = getNodeColumns(targetNode).find((col) => String(col.id || "") === targetColumnId);

          return {
            from_table: tableNameByNodeId.get(sourceNode.id) || sourceNode.id,
            from_column: String(sourceColumn?.name || edge.sourceHandle || ""),
            to_table: tableNameByNodeId.get(targetNode.id) || targetNode.id,
            to_column: String(targetColumn?.name || edge.targetHandle || ""),
            type: "one-to-many",
            on_delete: "cascade",
          };
        })
        .filter(Boolean);

      const blueprint = {
        tables,
        relations,
        meta: {
          version: "1.0",
          engine: "postgres",
        },
      };

      persistWorkspace();

      try {
        const response = await fetch(
          `/api/generator/build?framework=${encodeURIComponent(framework)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(blueprint),
          }
        );

        if (!response.ok) {
          throw new Error(`Generate failed with status ${response.status}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `aepra-${framework}-project.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Failed to generate project", error);
        window.alert("Generate project gagal. Periksa auth dan koneksi backend generator.");
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.ctrlKey || event.metaKey;
      if (!meta) return;

      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        runUndo();
      }

      if (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey)) {
        event.preventDefault();
        runRedo();
      }
    };

    window.addEventListener(ARCHITECT_EVENT_UNDO, runUndo as EventListener);
    window.addEventListener(ARCHITECT_EVENT_REDO, runRedo as EventListener);
    window.addEventListener(ARCHITECT_EVENT_AUTO_LAYOUT, runAutoLayout as EventListener);
    window.addEventListener(ARCHITECT_EVENT_EXPORT, runExport as EventListener);
    window.addEventListener(ARCHITECT_EVENT_IMPORT, runImport as EventListener);
    window.addEventListener(ARCHITECT_EVENT_SAVE, runSave as EventListener);
    window.addEventListener(ARCHITECT_EVENT_GENERATE, runGenerate as EventListener);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener(ARCHITECT_EVENT_UNDO, runUndo as EventListener);
      window.removeEventListener(ARCHITECT_EVENT_REDO, runRedo as EventListener);
      window.removeEventListener(ARCHITECT_EVENT_AUTO_LAYOUT, runAutoLayout as EventListener);
      window.removeEventListener(ARCHITECT_EVENT_EXPORT, runExport as EventListener);
      window.removeEventListener(ARCHITECT_EVENT_IMPORT, runImport as EventListener);
      window.removeEventListener(ARCHITECT_EVENT_SAVE, runSave as EventListener);
      window.removeEventListener(ARCHITECT_EVENT_GENERATE, runGenerate as EventListener);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [nodes, edges, setNodes, applySnapshot, snapshotState, relationArrowType, persistWorkspace]);

  const onNodeDragStart = useCallback(() => {
    if (isNodeDraggingRef.current) return;
    isNodeDraggingRef.current = true;
    setIsNodeDragging(true);
  }, []);

  const onNodeDragStop = useCallback(() => {
    isNodeDraggingRef.current = false;
    setIsNodeDragging(false);

    // Force final reroute immediately after drag stops for best visual result.
    setEdges((prevEdges) => applyEdgeLayoutOptimization(prevEdges, nodes));
  }, [setEdges, nodes, applyEdgeLayoutOptimization]);

  const onConnect = useCallback(
    (params: Connection) => {
      const optimizedParams = resolveEfficientHandles(params, nodes);
      const finalParams = isValidRelationshipConnection(optimizedParams) ? optimizedParams : params;

      if (!isValidRelationshipConnection(finalParams)) {
        return;
      }

      const laneSeed = edges.filter((edge) => edge.type === "orthogonalEditable").length;
      const laneOffset = (laneSeed % 2 === 0 ? 1 : -1) * (24 + (laneSeed % 5) * 14);

      setEdges((eds) =>
        addEdge(
          {
            ...finalParams,
            type: relationArrowType === "orthogonal" ? "orthogonalEditable" : edgeType,
            animated: false,
            style: { stroke: "#ffffff", strokeWidth: 2 },
            zIndex: 1,
            data:
              relationArrowType === "orthogonal"
                ? ({ laneOffset, routeOrder: edges.length } as OrthogonalEdgeData)
                : undefined,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: "#ffffff",
            },
          },
          eds
        )
      );
    },
    [setEdges, nodes, edges, edgeType, relationArrowType]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      setNodes((prevNodes) => {
        const stagedPositions = new Map<string, { x: number; y: number }>();

        const constrainedChanges = changes.map((change) => {
          if (change.type !== "position" || !change.position) {
            return change;
          }

          const movingNode = prevNodes.find((node) => node.id === change.id);
          if (!movingNode) {
            return change;
          }

          const constrainedPosition = resolveNodePositionWithGap(
            movingNode,
            change.position,
            prevNodes,
            stagedPositions
          );

          stagedPositions.set(change.id, constrainedPosition);
          return {
            ...change,
            position: constrainedPosition,
          };
        });

        return applyNodeChanges(constrainedChanges, prevNodes);
      });
    },
    [setNodes]
  );

  const isValidRelationshipConnection = useCallback(
    (connection: Connection | Edge) => {
      const { source, target, sourceHandle, targetHandle } = connection;

      if (!source || !target || !sourceHandle || !targetHandle) return false;
      if (source === target) return false;

      const sourceNode = nodes.find((n) => n.id === source);
      const targetNode = nodes.find((n) => n.id === target);
      if (!sourceNode || !targetNode) return false;

      const sourceColumns = Array.isArray((sourceNode.data as any)?.columns)
        ? (sourceNode.data as any).columns
        : [];
      const targetColumns = Array.isArray((targetNode.data as any)?.columns)
        ? (targetNode.data as any).columns
        : [];

      const sourceColumnId = getColumnIdFromHandle(sourceHandle);
      const targetColumnId = getColumnIdFromHandle(targetHandle);

      const sourceColumn = sourceColumns.find((col: any) => col.id === sourceColumnId);
      const targetColumn = targetColumns.find((col: any) => col.id === targetColumnId);
      if (!sourceColumn || !targetColumn) return false;

      // Aturan utama: panah hanya relasi FK -> PK
      if (!isForeignKeyColumn(sourceColumn)) return false;
      if (!isPrimaryKeyColumn(targetColumn)) return false;

      const duplicateEdge = edges.some(
        (edge) =>
          edge.source === source &&
          edge.target === target &&
          edge.sourceHandle === sourceHandle &&
          edge.targetHandle === targetHandle
      );
      if (duplicateEdge) return false;

      // Satu kolom FK hanya boleh menunjuk ke satu kolom target
      const fkAlreadyUsed = edges.some(
        (edge) => edge.source === source && edge.sourceHandle === sourceHandle
      );
      if (fkAlreadyUsed) return false;

      return true;
    },
    [nodes, edges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !reactFlowWrapper.current) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `node_${Date.now()}`,
        type: "tableErd",
        position,
        data: { 
          label: `TABLE_${nodes.length + 1}`, 
          columns: [] 
        },
      };

      setNodes((nds) => {
        const constrainedPosition = resolveNodePositionWithGap(newNode, position, nds, new Map());
        return nds.concat({
          ...newNode,
          position: constrainedPosition,
        });
      });
    },
    [screenToFlowPosition, setNodes, nodes.length]
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      event.stopPropagation();

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      setEdgeContextMenu({
        edgeId: edge.id,
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
    },
    []
  );

  const deleteSelectedEdge = useCallback(() => {
    if (!edgeContextMenu) return;
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeContextMenu.edgeId));
    setEdgeContextMenu(null);
  }, [edgeContextMenu, setEdges]);

  return (
    <div className="flex-1 w-full h-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeContextMenu={onEdgeContextMenu}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode="dark"
        
        // Tetap loose untuk UX drag, validasi relasi dijaga via isValidConnection
        connectionMode={ConnectionMode.Loose} 
        connectionLineType={relationArrowType === "orthogonal" ? ConnectionLineType.Step : connectionLineType}
        connectionLineStyle={{ stroke: "#ffffff", strokeWidth: 2 }}
        isValidConnection={isValidRelationshipConnection}
        defaultEdgeOptions={{ zIndex: 1 }}
        elevateEdgesOnSelect

        panOnDrag={[2]} 
        selectionMode={SelectionMode.Partial}
        onContextMenu={(e) => e.preventDefault()}
        
        fitViewOptions={{ padding: 0.2 }}
        snapToGrid={true}
        snapGrid={[20, 20]}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} color="#333" />
        <MiniMap
          pannable
          zoomable
          nodeStrokeColor="#22d3ee"
          nodeColor="#0f172a"
          maskColor="rgba(0,0,0,0.45)"
          style={{ background: "#0b0c0e", border: "1px solid rgba(255,255,255,0.1)" }}
        />
        <Controls />
      </ReactFlow>

      {edgeContextMenu && (
        <div
          className="absolute z-[1200] min-w-[140px] rounded-md border border-white/20 bg-[#151518] p-1 shadow-2xl"
          style={{ left: edgeContextMenu.x, top: edgeContextMenu.y }}
        >
          <button
            type="button"
            className="w-full rounded px-3 py-2 text-left text-xs text-red-300 hover:bg-red-500/15"
            onClick={deleteSelectedEdge}
          >
            Hapus Relasi
          </button>
        </div>
      )}

      {edgeContextMenu && (
        <button
          type="button"
          aria-label="Tutup menu relasi"
          className="absolute inset-0 z-[1100] cursor-default"
          onClick={() => setEdgeContextMenu(null)}
        />
      )}
    </div>
  );
};

interface EditorCanvasProps {
  relationArrowType: RelationArrowType;
}

export const EditorCanvas = ({ relationArrowType }: EditorCanvasProps) => {
  return <CanvasInner relationArrowType={relationArrowType} />;
};