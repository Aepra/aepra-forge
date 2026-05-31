"use client";

import React, { useState } from "react";

interface SaveProjectDialogProps {
  isOpen: boolean;
  initialName: string;
  onConfirm: (projectName: string) => void;
  onCancel: () => void;
}

export const SaveProjectDialog: React.FC<SaveProjectDialogProps> = ({
  isOpen,
  initialName,
  onConfirm,
  onCancel,
}) => {
  const [projectName, setProjectName] = useState(initialName);

  const handleConfirm = () => {
    const trimmedName = projectName.trim();
    if (trimmedName.length === 0) {
      alert("Project name cannot be empty");
      return;
    }
    onConfirm(trimmedName);
    setProjectName(initialName);
  };

  const handleCancel = () => {
    setProjectName(initialName);
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#111115] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <h3 className="text-lg font-semibold text-white">Save Project</h3>
        <p className="mt-2 text-sm text-white/70">Enter a name for your project</p>
        
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Project name"
          className="mt-4 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 transition-colors focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
            if (e.key === "Escape") handleCancel();
          }}
          autoFocus
        />

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="rounded-md px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-cyan-200"
          >
            Save Project
          </button>
        </div>
      </div>
    </div>
  );
};
