"use client";

import React from 'react';
import { ReactFlow, Background, Controls, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useArchitectStore } from '@/store/useArchitectStore';
import { Button } from '@/components/ui/button';
import { Save, Plus } from 'lucide-react';
import axios from 'axios';

export default function EditorCanvas() {
  // Pastikan setNodes dipanggil dari store
  const { nodes, setNodes, edges, onNodesChange, onEdgesChange, onConnect } = useArchitectStore();

  // Fungsi Tambah Tabel (Node)
  const addTable = () => {
    console.log("Klik: Add Table"); // Debug log
    const id = `table_${nodes.length + 1}`;
    const newNode = {
      id,
      data: { label: `Table: ${id}` },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
    };
    
    // Update store dengan node baru
    setNodes([...nodes, newNode]);
  };

  // Fungsi Simpan ke Database (Prisma)
  const handleSave = async () => {
    console.log("Klik: Save Schema"); // Debug log
    try {
      const response = await axios.post('/api/schema/save', {
        projectName: "Project Aepra Forge",
        nodes,
        edges
      });
      alert("Success! Data tersimpan di Docker PostgreSQL 🚀");
      console.log("Response:", response.data);
    } catch (error: any) {
      console.error("Save Error:", error);
      alert("Gagal simpan: " + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="w-full h-screen bg-[#0b0b0b]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        colorMode="dark"
        fitView
      >
        <Background gap={20} size={1} color="#222" />
        <Controls />
        
        {/* Panel Menu - Tambahkan z-index tinggi agar tidak tertutup kanvas */}
        <Panel position="top-right" className="z-50 flex gap-2 bg-black/50 p-3 rounded-xl border border-white/10 backdrop-blur-xl">
          <Button 
            onClick={() => {
                console.log("Button Add Table pressed");
                addTable();
            }} 
            variant="outline" 
            size="sm" 
            className="gap-2 border-primary/50 hover:bg-primary/20"
          >
            <Plus className="w-4 h-4" /> Add Table
          </Button>
          
          <Button 
            onClick={handleSave} 
            size="sm" 
            className="gap-2 bg-primary hover:bg-primary/80"
          >
            <Save className="w-4 h-4" /> Save Schema
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
}