"use client";

import React from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { ArchitectPreview, ArchitectSidebar, ArchitectToolbar } from "./dashboard";
import { EditorCanvas } from "./EditorCanvas";

export type RelationArrowType = "orthogonal" | "curved";
export type ArchitectTheme = "graphite" | "ocean" | "paper";

const RELATION_ARROW_MODE_STORAGE_KEY = "architect.relationArrowType";
const ARCHITECT_THEME_STORAGE_KEY = "architect.theme";

export const ArchitectDashboard = () => {
  const [relationArrowType, setRelationArrowType] = React.useState<RelationArrowType>("curved");
  const [isPreviewVisible, setIsPreviewVisible] = React.useState(true);
  const [theme, setTheme] = React.useState<ArchitectTheme>("graphite");

  React.useEffect(() => {
    const savedMode = window.localStorage.getItem(RELATION_ARROW_MODE_STORAGE_KEY);
    if (savedMode === "orthogonal" || savedMode === "curved") {
      setRelationArrowType(savedMode);
    }

    const savedTheme = window.localStorage.getItem(ARCHITECT_THEME_STORAGE_KEY);
    if (savedTheme === "graphite" || savedTheme === "ocean" || savedTheme === "paper") {
      setTheme(savedTheme);
    }
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(RELATION_ARROW_MODE_STORAGE_KEY, relationArrowType);
  }, [relationArrowType]);

  React.useEffect(() => {
    window.localStorage.setItem(ARCHITECT_THEME_STORAGE_KEY, theme);
  }, [theme]);

  const themeClassName =
    theme === "ocean"
      ? "bg-[#061018]"
      : theme === "paper"
        ? "bg-[#111214]"
        : "bg-[#0a0a0b]";

  return (
    <ReactFlowProvider>
      <div className={`flex h-screen w-full overflow-hidden ${themeClassName}`}>
        <ArchitectSidebar
          relationArrowType={relationArrowType}
          onRelationArrowTypeChange={setRelationArrowType}
          theme={theme}
          onThemeChange={setTheme}
          isPreviewVisible={isPreviewVisible}
          onTogglePreview={() => setIsPreviewVisible((prev) => !prev)}
        />

        <main className="relative flex flex-1 flex-col overflow-hidden border-x border-white/5">
          <div className="absolute left-1/2 top-6 z-50 -translate-x-1/2">
            <ArchitectToolbar />
          </div>
          <EditorCanvas relationArrowType={relationArrowType} />
        </main>

        {isPreviewVisible && <ArchitectPreview />}
      </div>
    </ReactFlowProvider>
  );
};