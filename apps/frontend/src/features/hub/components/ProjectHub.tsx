"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ChevronRight, 
  Database, 
  Plus, 
  Clock3, 
  Trash2, 
  Search,
  LayoutDashboard
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
  } catch { return value; }
};

export const ProjectHub = () => {
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

  const openProject = (id: string) => { setCurrentProjectId(id); router.push("/architect"); };
  const createBlank = () => { const p = createBlankProject(); if (p) router.push("/architect"); };
  const handleDelete = (id: string) => { deleteProject(id); refreshProjects(); };
  const onGoBack = () => { window.history.length > 1 ? router.back() : router.push("/home"); };

  return (
    <div className="min-h-screen bg-[#0b0d10] text-zinc-400">
      
      {/* 1. TOP NAV (Stay Compact) */}
      <nav className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-white/5 bg-[#0b0d10]/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={onGoBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          
          <div className="h-4 w-[1px] bg-white/10" />
          
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-300/70 leading-none mb-0.5">AEPRA-FORGE</span>
              <span className="text-xs font-bold text-white leading-none">Library</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
             <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-600" />
             <input 
               placeholder="Search..." 
               className="h-8 w-40 rounded-lg border border-white/5 bg-white/[0.02] pl-8 text-[10px] outline-none focus:border-cyan-500/30 transition-all"
             />
          </div>
          <Button 
            size="sm" 
            onClick={createBlank}
            className="h-8 rounded-lg bg-cyan-300 px-3 text-[10px] font-bold text-black hover:bg-cyan-200"
          >
            <Plus className="mr-1 h-3 w-3" /> NEW
          </Button>
        </div>
      </nav>

      <div className="mx-auto flex max-w-[1800px] px-6">
        
        {/* 2. SIDEBAR (UKURAN TETAP) */}
        <aside className="sticky top-14 hidden h-[calc(100vh-56px)] w-72 flex-col py-8 pr-8 lg:flex border-r border-white/5">
          <div className="flex-1 space-y-6">
            <div>
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Overview</p>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Total Files</span>
                    <span className="font-bold text-white text-lg">{projects.length}</span>
                  </div>
                  <div className="h-[1px] bg-white/5" />
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Status</span>
                    <span className="font-bold text-cyan-400 text-[10px] uppercase tracking-widest">Active</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-cyan-400/[0.02] p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Quick Tips</p>
              <p className="text-[11px] leading-relaxed text-zinc-500">
                Blueprint yang kamu simpan akan muncul di library secara otomatis.
              </p>
            </div>
          </div>
        </aside>

        {/* 3. MAIN AREA (ITEM PROYEK SUPER COMPACT) */}
        <main className="flex-1 py-8 pl-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Blueprints</h1>
          </div>

          {/* GRID DIPERBANYAK KOLOMNYA AGAR CARD KELIHATAN KECIL */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            
            {/* Action Card: New Project (MINI) */}
            <button
              onClick={createBlank}
              className="group flex h-[140px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-transparent transition-all hover:border-cyan-300/40 hover:bg-cyan-300/[0.02]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300 transition-transform group-hover:scale-105">
                <Plus className="h-5 w-5" />
              </div>
              <span className="mt-3 text-[9px] font-bold tracking-widest text-zinc-500 uppercase">Create</span>
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
                    className="p-1.5 rounded-lg text-zinc-700 opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2">
                  <h3 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                    {project.name}
                  </h3>
                  <div className="mt-1 flex gap-2">
                    <span className="text-[9px] font-bold text-zinc-600 uppercase">
                      {project.tablesCount}T
                    </span>
                    <span className="text-[9px] font-bold text-zinc-600 uppercase">
                      {project.relationsCount}R
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
                  <span className="text-[8px] text-zinc-600 font-medium">
                    {formatDate(project.updatedAt)}
                  </span>
                  <button 
                    onClick={() => openProject(project.id)}
                    className="text-[9px] font-black text-cyan-400 hover:text-white uppercase transition-colors"
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