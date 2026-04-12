"use client";

import React from "react";
import { Download, LayoutGrid, Play, Redo2, Save, Undo2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

const ARCHITECT_EVENT_UNDO = "architect:undo";
const ARCHITECT_EVENT_REDO = "architect:redo";
const ARCHITECT_EVENT_AUTO_LAYOUT = "architect:auto-layout";
const ARCHITECT_EVENT_EXPORT = "architect:export-json";
const ARCHITECT_EVENT_IMPORT = "architect:import-json";

export const Toolbar = () => {
  const importInputRef = React.useRef<HTMLInputElement>(null);

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
      <Button variant="ghost" size="sm" className="rounded-full h-8 px-4 text-xs gap-2">
        <Save className="w-3.5 h-3.5" /> Save
      </Button>
      <Button variant="default" size="sm" className="rounded-full h-8 px-4 text-xs gap-2 bg-primary text-black font-bold">
        <Play className="w-3.5 h-3.5 fill-current" /> Generate Code
      </Button>
    </div>
  );
};