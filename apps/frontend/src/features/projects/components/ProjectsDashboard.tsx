"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Database,
  LayoutDashboard,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createBlankProject,
  deleteProject,
  loadProjectSummaries,
  setCurrentProjectId,
  type ProjectSummary,
} from "@/lib/project-storage";

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export const ProjectsDashboard = () => {
  const router = useRouter();
  const [projects, setProjects] = React.useState<ProjectSummary[]>([]);

  const refreshProjects = React.useCallback(() => {
    setProjects(loadProjectSummaries());
  }, []);

  React.useEffect(() => {
    refreshProjects();
    const onStorage = () => refreshProjects();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshProjects]);

  const openProject = (id: string) => {
    setCurrentProjectId(id);
    router.push("/architect");
  };

  const createBlank = () => {
    const project = createBlankProject();
    if (project) {
      router.push("/architect");
    }
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
    refreshProjects();
  };

  const onGoBack = () => {
    window.history.length > 1 ? router.back() : router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#0b0d10] text-zinc-400">
      <nav className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-white/5 bg-[#0b0d10]/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={onGoBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white transition-colors hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="mb-0.5 text-[9px] font-bold uppercase leading-none tracking-[0.2em] text-cyan-300/70">
                AEPRA-FORGE
              </span>
              <span className="text-xs font-bold leading-none text-white">Projects Dashboard</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-600" />
            <input
              placeholder="Search..."
              className="h-8 w-40 rounded-lg border border-white/5 bg-white/[0.02] pl-8 text-[10px] outline-none transition-all focus:border-cyan-500/30"
            />
          </div>
          <Button
            size="sm"
            onClick={createBlank}
            className="h-8 rounded-lg bg-cyan-300 px-3 text-[10px] font-bold text-black hover:bg-cyan-200"
          >
            <Plus className="mr-1 h-3 w-3" /> Create Project
          </Button>
        </div>
      </nav>

      <div className="mx-auto flex max-w-[1800px] px-6">
        <aside className="sticky top-14 hidden h-[calc(100vh-56px)] w-72 flex-col border-r border-white/5 py-8 pr-8 lg:flex">
          <div className="flex-1 space-y-6">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Overview</p>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Total Files</span>
                    <span className="text-lg font-bold text-white">{projects.length}</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Status</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Active</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-cyan-400/[0.02] p-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Quick Tips</p>
              <p className="text-[11px] leading-relaxed text-zinc-500">
                Blueprint yang kamu simpan akan muncul di dashboard secara otomatis.
              </p>
            </div>
          </div>
        </aside>

        <main className="flex-1 py-8 pl-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Your Projects</h1>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            <button
              onClick={createBlank}
              className="group flex h-[140px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-transparent transition-all hover:border-cyan-300/40 hover:bg-cyan-300/[0.02]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300 transition-transform group-hover:scale-105">
                <Plus className="h-5 w-5" />
              </div>
              <span className="mt-3 text-[9px] font-bold uppercase tracking-widest text-zinc-500">Create Project</span>
            </button>

            {projects.map((project) => (
              <div
                key={project.id}
                className="group relative flex h-[140px] flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 transition-all hover:border-cyan-300/30 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#111113] text-cyan-200">
                    <Database className="h-4 w-4" />
                  </div>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="rounded-lg p-1.5 text-zinc-700 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2">
                  <h3 className="truncate text-xs font-bold text-white transition-colors group-hover:text-cyan-300">
                    {project.name}
                  </h3>
                  <div className="mt-1 flex gap-2">
                    <span className="text-[9px] font-bold uppercase text-zinc-600">{project.tablesCount}T</span>
                    <span className="text-[9px] font-bold uppercase text-zinc-600">{project.relationsCount}R</span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
                  <span className="text-[8px] font-medium text-zinc-600">{formatDate(project.updatedAt)}</span>
                  <button
                    onClick={() => openProject(project.id)}
                    className="text-[9px] font-black uppercase text-cyan-400 transition-colors hover:text-white"
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};