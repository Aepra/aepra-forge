"use client";

import React, { useCallback, useRef, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  Connection,
  Edge,
  Node,
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

const initialNodes: Node[] = [];

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

const CanvasInner = ({ relationArrowType }: CanvasInnerProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
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

  useEffect(() => {
    setEdges((prevEdges) => {
      const optimized = optimizeExistingOrthogonalEdges(prevEdges, nodes);
      return normalizeOrthogonalEdgeOrder(optimized);
    });
  }, [setEdges, nodes, edges.length]);

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

      setNodes((nds) => nds.concat(newNode));
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

export const EditorCanvas = ({ relationArrowType }: EditorCanvasProps) => (
  <ReactFlowProvider>
    <CanvasInner relationArrowType={relationArrowType} />
  </ReactFlowProvider>
);