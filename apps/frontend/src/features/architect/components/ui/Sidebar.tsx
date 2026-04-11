"use client";

import React from "react";
import { Box } from "lucide-react";

export const Sidebar = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-64 border-r border-white/5 bg-[#111113] flex flex-col p-4">
      <div className="mb-6">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-4">
          Components
        </span>

        {/* --- KOMPONEN TABEL SAJA --- */}
        <div
          className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1a1c] border border-white/10 cursor-grab active:cursor-grabbing hover:border-primary transition-all text-sm group mb-3"
          onDragStart={(event) => onDragStart(event, "tableErd")} 
          draggable
        >
          <Box className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-gray-200">Tabel Database</span>
        </div>
      </div>
      
      <div className="mt-auto p-3 bg-primary/5 border border-primary/10 rounded-md">
        <p className="text-[10px] text-primary/80 leading-relaxed">
          💡 <b>Tips:</b> Tarik tabel ke kanvas. Untuk menghubungkan relasi, tarik garis dari bulatan biru di sisi kolom.
        </p>
      </div>
    </aside>
  );
};