"use client";

import React, { useCallback, useRef, useMemo } from "react"; // Tambah useMemo
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// 1. Import komponen kustom yang akan kita buat (Step 2)
import { TableNode } from "@/features/architect/components/TableNode";

const initialNodes: Node[] = [];

const CanvasInner = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition } = useReactFlow();

  // 2. Registrasikan tipe node kustom. Gunakan useMemo agar tidak re-render terus.
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

      // Pastikan di Sidebar.tsx, onDragStart mengirim data 'tableErd'
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !reactFlowWrapper.current) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // 3. Buat Node Baru dengan type 'tableErd'
      const newNode: Node = {
        id: `node_${Date.now()}`,
        type: 'tableErd', // <-- WAJIB SESUAI REGISTRASI
        position,
        // Data awal untuk node baru
        data: { 
          label: `NewTable_${nodes.length + 1}`,
          columns: [] // Array kosong untuk menampung isi/kolom nanti
        },
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
        nodeTypes={nodeTypes} // 4. Pasang registrasi tipe node di sini
        colorMode="dark"
        fitView
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