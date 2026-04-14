"use client";

import React from "react";
import { createPortal } from "react-dom";
import { Download, LayoutGrid, Play, Redo2, Save, Undo2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const ARCHITECT_EVENT_UNDO = "architect:undo";
const ARCHITECT_EVENT_REDO = "architect:redo";
const ARCHITECT_EVENT_AUTO_LAYOUT = "architect:auto-layout";
const ARCHITECT_EVENT_EXPORT = "architect:export-json";
const ARCHITECT_EVENT_IMPORT = "architect:import-json";
const ARCHITECT_EVENT_SAVE = "architect:save";
const ARCHITECT_EVENT_GENERATE = "architect:generate";

export const ArchitectToolbar = () => {
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const [framework, setFramework] = React.useState("fastapi");
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const emitEvent = (eventName: string, detail?: unknown) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  };

  const onImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    try {
      const payload = JSON.parse(content);
      emitEvent(ARCHITECT_EVENT_IMPORT, payload);
    } catch {
      // Ignore invalid schema payload.
    }

    event.currentTarget.value = "";
  };

  return (
    <div className="flex items-center gap-1.5 p-1.5 bg-[#1a1a1c]/80 backdrop-blur-md border border-white/10 rounded-full shadow-2xl">
      <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0" onClick={() => emitEvent(ARCHITECT_EVENT_UNDO)}>
        <Undo2 className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0" onClick={() => emitEvent(ARCHITECT_EVENT_REDO)}>
        <Redo2 className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0" onClick={() => emitEvent(ARCHITECT_EVENT_AUTO_LAYOUT)}>
        <LayoutGrid className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0" onClick={() => emitEvent(ARCHITECT_EVENT_EXPORT)}>
        <Download className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0" onClick={() => importInputRef.current?.click()}>
        <Upload className="w-3.5 h-3.5" />
      </Button>
      <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={onImportFile} />
      <div className="w-[1px] h-4 bg-white/10" />
      <Button variant="ghost" size="sm" className="rounded-full h-8 px-4 text-xs gap-2" onClick={() => setIsSaveConfirmOpen(true)}>
        <Save className="w-3.5 h-3.5" /> Save Project
      </Button>
      <select
        value={framework}
        onChange={(event) => setFramework(event.target.value)}
        className="h-8 rounded-full border border-white/15 bg-[#111113] px-3 text-[11px] text-white/80 outline-none"
        aria-label="Pilih framework generator"
      >
        <option value="fastapi">FastAPI</option>
      </select>
      <Button
        variant="default"
        size="sm"
        className="rounded-full h-8 px-4 text-xs gap-2 bg-primary text-black font-bold"
        onClick={() => emitEvent(ARCHITECT_EVENT_GENERATE, { framework })}
      >
        <Play className="w-3.5 h-3.5 fill-current" /> Generate Code
      </Button>

      {isMounted &&
        isSaveConfirmOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setIsSaveConfirmOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-xl border border-white/15 bg-[#111115] p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Save Project</h3>
                <button
                  type="button"
                  onClick={() => setIsSaveConfirmOpen(false)}
                  className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Tutup konfirmasi save"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mb-4 text-[12px] leading-relaxed text-white/70">
                Yakin mau save project ini ke daftar project?
              </p>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSaveConfirmOpen(false)}
                  className="rounded-md px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSaveConfirmOpen(false);
                    emitEvent(ARCHITECT_EVENT_SAVE);
                  }}
                  className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-cyan-200"
                >
                  Yakin
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};