"use client";

import React from "react";
import { Box } from "lucide-react";
import type { RelationArrowType } from "../../index";

interface SidebarProps {
  relationArrowType: RelationArrowType;
  onRelationArrowTypeChange: (value: RelationArrowType) => void;
}

export const Sidebar = ({ relationArrowType, onRelationArrowTypeChange }: SidebarProps) => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-64 border-r border-white/5 bg-[#111113] flex flex-col p-4">
      <div className="mb-4 h-9 rounded-md border border-white/10 bg-[#17171a]" />

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

        <div className="rounded-lg bg-[#1a1a1c] border border-white/10 p-3">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-white/60 block mb-2">
            Jenis Panah Relasi
          </label>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => onRelationArrowTypeChange("orthogonal")}
              className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                relationArrowType === "orthogonal"
                  ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-200"
                  : "border-white/10 bg-[#0f0f11] text-gray-300 hover:border-white/20"
              }`}
            >
              Orthogonal
            </button>
            <button
              type="button"
              onClick={() => onRelationArrowTypeChange("curved")}
              className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                relationArrowType === "curved"
                  ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-200"
                  : "border-white/10 bg-[#0f0f11] text-gray-300 hover:border-white/20"
              }`}
            >
              Curved
            </button>
          </div>
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