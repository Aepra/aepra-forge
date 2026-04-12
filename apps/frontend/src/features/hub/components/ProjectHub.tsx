"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Database, FolderPlus, LayoutDashboard, Plus, Clock3, Trash2 } from "lucide-react";
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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const EmptyState = ({ onCreateBlank }: { onCreateBlank: () => void }) => {
  return (
    <button
      type="button"
      onClick={onCreateBlank}
      className="group flex min-h-[240px] flex-col justify-center rounded-[28px] border border-dashed border-white/15 bg-white/[0.03] p-6 text-left transition-colors hover:border-cyan-300/40 hover:bg-white/[0.05]"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
        <FolderPlus className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-semibold text-white">Blank Project</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/55">
        Mulai dari kanvas kosong. Cocok kalau kamu mau bikin schema dari nol sebelum masuk ke architect.
      </p>
      <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-cyan-200">
        Start from blank <ArrowRight className="h-4 w-4" />
      </div>
    </button>
  );
};

const ProjectCard = ({
  project,
  onOpen,
  onDelete,
}: {
  project: ProjectSummary;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  return (
    <div className="group rounded-[24px] border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-cyan-300/35">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={() => onOpen(project.id)} className="text-left">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#111113] text-cyan-200">
            <Database className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-white">{project.name}</h3>
          <p className="mt-1 text-xs text-white/45">Updated {formatDate(project.updatedAt)}</p>
        </button>

        <button
          type="button"
          onClick={() => onDelete(project.id)}
          className="rounded-full border border-white/10 bg-white/[0.03] p-2 text-white/45 transition-colors hover:border-red-400/30 hover:text-red-300"
          aria-label={`Delete ${project.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] uppercase tracking-wide text-white/65">
          {project.tablesCount} tables
        </span>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] uppercase tracking-wide text-white/65">
          {project.relationsCount} relations
        </span>
        {project.isBlank && (
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] uppercase tracking-wide text-cyan-100">
            blank
          </span>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-white/45">
          <Clock3 className="h-3.5 w-3.5" />
          {formatDate(project.updatedAt)}
        </div>
        <Button
          type="button"
          size="sm"
          className="h-9 rounded-full bg-cyan-300 px-4 text-black hover:bg-cyan-200"
          onClick={() => onOpen(project.id)}
        >
          Open
        </Button>
      </div>
    </div>
  );
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

  const openProject = (projectId: string) => {
    setCurrentProjectId(projectId);
    router.push("/architect");
  };

  const createBlank = () => {
    const project = createBlankProject();
    if (!project) return;
    router.push("/architect");
  };

  const handleDelete = (projectId: string) => {
    deleteProject(projectId);
    refreshProjects();
  };

  const onGoBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  const lastUpdated = projects[0]?.updatedAt;

  return (
    <div className="min-h-screen bg-[#0b0d10] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 md:px-6">
        <aside className="hidden w-80 shrink-0 flex-col rounded-[28px] border border-white/10 bg-white/[0.03] p-5 lg:flex">
          <div className="mb-6 flex items-center gap-3 rounded-[22px] border border-white/10 bg-[#111113] px-4 py-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Project Library</p>
              <h2 className="text-lg font-semibold text-white">Aepra-Forge</h2>
            </div>
          </div>

          <Button
            type="button"
            className="h-11 rounded-full bg-cyan-300 text-black hover:bg-cyan-200"
            onClick={createBlank}
          >
            <Plus className="mr-2 h-4 w-4" /> New Blank Project
          </Button>

          <div className="mt-6 rounded-[22px] border border-white/10 bg-[#111113] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Summary</p>
            <div className="mt-4 space-y-3 text-sm text-white/70">
              <div className="flex items-center justify-between">
                <span>Total projects</span>
                <span className="font-semibold text-white">{projects.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last update</span>
                <span className="font-semibold text-white">{lastUpdated ? formatDate(lastUpdated) : "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Status</span>
                <span className="font-semibold text-cyan-200">Ready</span>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[22px] border border-white/10 bg-[#111113] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Quick Tips</p>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Save projects from architect to build your recent history. Empty state tetap tampil sebagai <span className="text-white">Blank</span>.
            </p>
          </div>
        </aside>

        <main className="flex-1">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.02] p-6 md:p-8">
            <div className="mb-4 flex items-center justify-start">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full border-white/15 bg-white/[0.03] px-4 text-white hover:bg-white/[0.06]"
                onClick={onGoBack}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Workspace</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
                  Recent projects before entering canvas.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60 md:text-base">
                  Pilih project yang sudah pernah dibuat, atau mulai dari kanvas kosong. Alur ini dibuat mirip Word: daftar dokumen dulu, lalu buka workspace.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full border-white/15 bg-white/[0.03] px-5 text-white hover:bg-white/[0.06]"
                onClick={createBlank}
              >
                Create Blank Project
              </Button>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <EmptyState onCreateBlank={createBlank} />

              {projects.length > 0 ? (
                projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onOpen={openProject}
                    onDelete={handleDelete}
                  />
                ))
              ) : (
                <div className="flex min-h-[240px] items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/45">
                  Belum ada project tersimpan. Klik Blank Project untuk mulai.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
