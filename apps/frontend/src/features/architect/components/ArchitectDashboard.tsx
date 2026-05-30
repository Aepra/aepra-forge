"use client";

import React from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { ArchitectPreview, ArchitectSidebar, ArchitectToolbar } from "./dashboard";
import { EditorCanvas } from "./EditorCanvas";
import { getCurrentProjectId, hydrateProjectFromServer, loadProject } from "@/lib/project-storage";

export type RelationArrowType = "orthogonal" | "curved";
export type ArchitectTheme = "graphite" | "ocean" | "paper";

const RELATION_ARROW_MODE_STORAGE_KEY = "architect.relationArrowType";
const ARCHITECT_THEME_STORAGE_KEY = "architect.theme";
const DEFAULT_PROJECT_NAME = "Untitled Project";

export const ArchitectDashboard = () => {
  const [relationArrowType, setRelationArrowType] = React.useState<RelationArrowType>("curved");
  const [isPreviewVisible, setIsPreviewVisible] = React.useState(true);
  const [theme, setTheme] = React.useState<ArchitectTheme>("graphite");
  const [projectName, setProjectName] = React.useState(DEFAULT_PROJECT_NAME);

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

  React.useEffect(() => {
    const activeProjectId = getCurrentProjectId();
    if (!activeProjectId) {
      setProjectName(DEFAULT_PROJECT_NAME);
      return;
    }

    const activeProject = loadProject(activeProjectId);
    if (activeProject) {
      const nextProjectName = activeProject?.name?.trim() || DEFAULT_PROJECT_NAME;
      setProjectName(nextProjectName);
      return;
    }

    void hydrateProjectFromServer(activeProjectId)
      .then((project) => {
        setProjectName(project?.name?.trim() || DEFAULT_PROJECT_NAME);
      })
      .catch(() => {
        setProjectName(DEFAULT_PROJECT_NAME);
      });
  }, []);

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
          projectName={projectName}
          onProjectNameChange={setProjectName}
        />

        <main className="relative flex flex-1 flex-col overflow-hidden border-x border-white/5">
          <div className="absolute left-1/2 top-6 z-50 -translate-x-1/2">
            <ArchitectToolbar projectName={projectName} />
          </div>
          <EditorCanvas
            relationArrowType={relationArrowType}
            projectName={projectName}
            onProjectNameLoaded={setProjectName}
          />
        </main>

        {isPreviewVisible && <ArchitectPreview />}
      </div>
    </ReactFlowProvider>
  );
};