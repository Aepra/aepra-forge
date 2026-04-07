"use client";

import React, { useCallback, useRef, useMemo } from "react";
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
  SelectionMode, // Import ini untuk mode navigasi
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// 1. Import komponen kustom TableNode
import { TableNode } from "@/features/architect/components/TableNode";

const initialNodes: Node[] = [];

const CanvasInner = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition } = useReactFlow();

  // 2. Registrasikan tipe node kustom
  const nodeTypes = useMemo(() => ({ tableErd: TableNode }), []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
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

      // 3. Buat Node Baru
      const newNode: Node = {
        id: `node_${Date.now()}`,
        type: "tableErd",
        position,
        data: { 
          label: `TABLE_${nodes.length + 1}`, 
          columns: [] 
        },
        // Kita tidak pakai dragHandle khusus lagi karena seluruh header jadi pegangan
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes, nodes.length]
  );

  return (
    <div className="flex-1 w-full h-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        colorMode="dark"
        
        // --- FITUR NAVIGASI PROFESIONAL ---
        panOnDrag={[2]} // [2] Menggunakan Klik Kanan untuk geser layar (panning)
        selectionMode={SelectionMode.Partial}
        panOnScroll={true}
        
        // Matikan menu klik kanan default browser agar tidak muncul saat geser layar
        onContextMenu={(e) => e.preventDefault()}
        
        fitViewOptions={{ padding: 0.2 }}
        snapToGrid={true}
        snapGrid={[10, 10]}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} color="#333" />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export const EditorCanvas = () => (
  <ReactFlowProvider>
    <CanvasInner />
  </ReactFlowProvider>
);