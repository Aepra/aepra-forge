"use client";

import React from "react";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { Properties } from "./components/Properties";
import { EditorCanvas } from "./components/EditorCanvas";

export const ArchitectWorkspace = () => {
  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-[#0a0a0b]">
      {/* Sisi Kiri: Bahan-bahan */}
      <Sidebar />
      
      {/* Tengah: Area Gambar */}
      <main className="relative flex-1 flex flex-col overflow-hidden border-x border-white/5">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50">
          <Toolbar />
        </div>
        <EditorCanvas />
      </main>

      {/* Sisi Kanan: Edit Detail */}
      <Properties />
    </div>
  );
};