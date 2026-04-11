"use client";

import React from "react";
import { ReactFlowProvider } from "@xyflow/react"; // 1. Import ini
import { Sidebar } from "./components/ui/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { Preview } from "./components/ui/Preview"; 
import { EditorCanvas } from "./components/EditorCanvas";

export const ArchitectWorkspace = () => {
  return (
    // 2. Bungkus semua di sini. Ini akan menghilangkan error #001 selamanya.
    <ReactFlowProvider> 
      <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-[#0a0a0b]">
        <Sidebar />
        
        <main className="relative flex-1 flex flex-col overflow-hidden border-x border-white/5">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50">
            <Toolbar />
          </div>
          <EditorCanvas />
        </main>

        <Preview />
      </div>
    </ReactFlowProvider>
  );
};