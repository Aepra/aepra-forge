"use client";

import React, { useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  BackgroundVariant,
} from "@xyflow/react";

// WAJIB Import CSS-nya agar tampilannya tidak berantakan
import "@xyflow/react/dist/style.css";

// Data dummy awal biar kanvas nggak kosong pas dibuka
const initialNodes = [
  {
    id: "node-1",
    type: "default",
    data: { label: "users_table" },
    position: { x: 250, y: 5 },
    style: { 
      background: "#1a1a1c", 
      color: "#fff", 
      border: "1px solid #333",
      borderRadius: "8px",
      fontSize: "12px",
      fontWeight: "bold"
    },
  },
  {
    id: "node-2",
    data: { label: "posts_table" },
    position: { x: 100, y: 100 },
    style: { 
      background: "#1a1a1c", 
      color: "#fff", 
      border: "1px solid #333",
      borderRadius: "8px",
      fontSize: "12px",
      fontWeight: "bold"
    },
  },
];

const initialEdges: Edge[] = [];

export const EditorCanvas = () => {
  // State untuk Node (Kotak Tabel) dan Edges (Garis Relasi)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Fungsi untuk menyambungkan dua tabel (bikin garis relasi)
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="flex-1 w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        // Mode Gelap otomatis
        colorMode="dark"
        // Agar kanvas langsung fokus ke tabel yang ada
        fitView
      >
        {/* Latar belakang titik-titik (Dots) */}
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1} 
          color="#333" 
        />
        
        {/* Tombol Zoom dan Fit View di pojok kiri bawah */}
        <Controls className="bg-[#1a1a1c] border-white/10 fill-white" />
        
        {/* Peta kecil di pojok kanan bawah */}
        <MiniMap 
          nodeColor="#00f2ff" 
          maskColor="rgba(0, 0, 0, 0.7)"
          className="bg-[#111113] border border-white/5 rounded-lg"
        />
      </ReactFlow>
    </div>
  );
};