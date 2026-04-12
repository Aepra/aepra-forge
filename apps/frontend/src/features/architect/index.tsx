"use client";

import React from "react";
import { ReactFlowProvider } from "@xyflow/react"; // 1. Import ini
import { Sidebar } from "./components/ui/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { Preview } from "./components/ui/Preview"; 
import { EditorCanvas } from "./components/EditorCanvas";

export type RelationArrowType = "orthogonal" | "curved";
const RELATION_ARROW_MODE_STORAGE_KEY = "architect.relationArrowType";

export const ArchitectWorkspace = () => {
  const [relationArrowType, setRelationArrowType] = React.useState<RelationArrowType>("curved");
  const [isPreviewVisible, setIsPreviewVisible] = React.useState(true);

  React.useEffect(() => {
    const savedMode = window.localStorage.getItem(RELATION_ARROW_MODE_STORAGE_KEY);
    if (savedMode === "orthogonal" || savedMode === "curved") {
      setRelationArrowType(savedMode);
    }
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(RELATION_ARROW_MODE_STORAGE_KEY, relationArrowType);
  }, [relationArrowType]);

  return (
    // 2. Bungkus semua di sini. Ini akan menghilangkan error #001 selamanya.
    <ReactFlowProvider> 
      <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0b]">
        <Sidebar
          relationArrowType={relationArrowType}
          onRelationArrowTypeChange={setRelationArrowType}
          isPreviewVisible={isPreviewVisible}
          onTogglePreview={() => setIsPreviewVisible((prev) => !prev)}
        />
        
        <main className="relative flex-1 flex flex-col overflow-hidden border-x border-white/5">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50">
            <Toolbar />
          </div>
          <EditorCanvas relationArrowType={relationArrowType} />
        </main>

        {isPreviewVisible && <Preview />}
      </div>
    </ReactFlowProvider>
  );
};