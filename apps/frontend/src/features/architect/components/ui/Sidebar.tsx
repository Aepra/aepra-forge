"use client";

import React from "react";
import {
  AlertTriangle,
  BookOpenText,
  Box,
  CheckCircle2,
  Eye,
  EyeOff,
  Palette,
  KeyRound,
  Link2,
  X,
} from "lucide-react";
import { Edge, useOnSelectionChange, useReactFlow } from "@xyflow/react";
import type { RelationArrowType } from "../../index";

interface SidebarProps {
  relationArrowType: RelationArrowType;
  onRelationArrowTypeChange: (value: RelationArrowType) => void;
  isPreviewVisible: boolean;
  onTogglePreview: () => void;
}

export const Sidebar = ({
  relationArrowType,
  onRelationArrowTypeChange,
  isPreviewVisible,
  onTogglePreview,
}: SidebarProps) => {
  const { setEdges } = useReactFlow();
  const [isRulesOpen, setIsRulesOpen] = React.useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(null);
  const [selectedEdgeColor, setSelectedEdgeColor] = React.useState("#ffffff");
  const colorInputRef = React.useRef<HTMLInputElement>(null);

  const DEFAULT_EDGE_COLORS = React.useMemo(
    () => ["#ffffff", "#22d3ee", "#34d399", "#f59e0b", "#f87171", "#c084fc", "#60a5fa", "#f472b6"],
    []
  );
  const [edgeColorOptions, setEdgeColorOptions] = React.useState<string[]>(DEFAULT_EDGE_COLORS);

  const resolveEdgeStroke = React.useCallback((edge: Edge) => {
    const styleStroke = typeof edge.style?.stroke === "string" ? edge.style.stroke : null;
    if (styleStroke) return styleStroke;

    const markerStroke =
      edge.markerEnd && typeof edge.markerEnd === "object" && "color" in edge.markerEnd
        ? (edge.markerEnd.color as string | undefined)
        : undefined;

    return markerStroke || "#ffffff";
  }, []);

  useOnSelectionChange({
    onChange: ({ edges }) => {
      const activeEdge = edges.length > 0 ? edges[0] : null;
      if (!activeEdge) {
        setSelectedEdgeId(null);
        setSelectedEdgeColor("#ffffff");
        return;
      }

      setSelectedEdgeId(activeEdge.id);
      setSelectedEdgeColor(resolveEdgeStroke(activeEdge));
    },
  });

  const applySelectedEdgeColor = React.useCallback(
    (color: string) => {
      if (!selectedEdgeId) return;

      setSelectedEdgeColor(color);
      setEdges((prevEdges) =>
        prevEdges.map((edge) => {
          if (edge.id !== selectedEdgeId) return edge;

          const markerEnd =
            edge.markerEnd && typeof edge.markerEnd === "object"
              ? { ...edge.markerEnd, color }
              : edge.markerEnd;

          return {
            ...edge,
            style: {
              ...(edge.style || {}),
              stroke: color,
              strokeWidth: 2,
            },
            markerEnd,
          };
        })
      );
    },
    [selectedEdgeId, setEdges]
  );

  const onPickCustomColor = (event: React.ChangeEvent<HTMLInputElement>) => {
    const customColor = event.target.value;
    if (!customColor) return;

    setEdgeColorOptions((prev) => {
      const exists = prev.some((item) => item.toLowerCase() === customColor.toLowerCase());
      if (exists) return prev;
      return [customColor, ...prev].slice(0, 28);
    });

    applySelectedEdgeColor(customColor);
    event.currentTarget.value = customColor;
  };

  const onPaletteWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

    event.currentTarget.scrollLeft += event.deltaY;
    event.preventDefault();
  };

  React.useEffect(() => {
    if (!isRulesOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsRulesOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRulesOpen]);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-64 border-r border-white/5 bg-[#111113] flex flex-col p-4">
      <div className="mb-4 h-9 rounded-md border border-white/10 bg-[#17171a]" />

      <div className="mb-6">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-4">
          Components
        </span>

        {/* --- KOMPONEN TABEL SAJA --- */}
        <div
          className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1a1c] border border-white/10 cursor-grab active:cursor-grabbing hover:border-primary transition-all text-sm group mb-3"
          onDragStart={(event) => onDragStart(event, "tableErd")} 
          draggable
        >
          <Box className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-gray-200">Tabel Database</span>
        </div>

        <div className="rounded-lg bg-[#1a1a1c] p-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-white/60 block mb-1.5">
            Jenis Panah Relasi
          </label>
          <div className="flex items-center gap-1.5">
            <div className="relative group">
              <button
                type="button"
                onClick={() => onRelationArrowTypeChange("orthogonal")}
                aria-label="Orthogonal"
                className={`h-8 w-8 rounded-md grid place-items-center transition-colors ${
                  relationArrowType === "orthogonal"
                    ? "bg-cyan-500/15 text-cyan-200"
                    : "bg-[#0f0f11] text-gray-300 hover:bg-white/5"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 6h10v8h6" />
                  <path d="M20 14v4H10" />
                </svg>
              </button>
              <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#0f0f11] px-1.5 py-0.5 text-[9px] text-white/85 opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                Orthogonal
              </span>
            </div>

            <div className="relative group">
              <button
                type="button"
                onClick={() => onRelationArrowTypeChange("curved")}
                aria-label="Curved"
                className={`h-8 w-8 rounded-md grid place-items-center transition-colors ${
                  relationArrowType === "curved"
                    ? "bg-cyan-500/15 text-cyan-200"
                    : "bg-[#0f0f11] text-gray-300 hover:bg-white/5"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 16c4-8 12-8 16 0" />
                </svg>
              </button>
              <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#0f0f11] px-1.5 py-0.5 text-[9px] text-white/85 opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                Curved
              </span>
            </div>

            {selectedEdgeId && (
              <div className="ml-1 flex items-center gap-0.5">
                <div
                  className="w-[72px] overflow-x-auto px-0.5 py-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  onWheel={onPaletteWheel}
                >
                  <div className="grid max-h-5 grid-flow-col grid-rows-2 auto-cols-max gap-0.5">
                    {edgeColorOptions.map((color) => {
                      const isActive = selectedEdgeColor.toLowerCase() === color.toLowerCase();

                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => applySelectedEdgeColor(color)}
                          className={`h-2.5 w-2.5 shrink-0 rounded-full border transition-transform hover:scale-110 ${
                            isActive ? "border-white" : "border-white/25"
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`Pilih warna relasi ${color}`}
                          title={color}
                        />
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => colorInputRef.current?.click()}
                  className="h-3.5 w-3.5 shrink-0 rounded-full bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 flex items-center justify-center"
                  aria-label="Pilih custom color"
                  title="Custom color"
                >
                  <Palette className="mx-auto h-2 w-2" />
                </button>
                <input
                  ref={colorInputRef}
                  type="color"
                  value={selectedEdgeColor || "#ffffff"}
                  className="hidden"
                  onChange={onPickCustomColor}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setIsRulesOpen(true)}
            className="group flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-white/70 transition-colors hover:bg-white/5 hover:text-cyan-200"
            aria-label="Buka aturan relasi"
          >
            <BookOpenText className="h-5 w-5 text-cyan-300/90 group-hover:text-cyan-200" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Rules</span>
          </button>

          <button
            type="button"
            onClick={onTogglePreview}
            className="group flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-white/70 transition-colors hover:bg-white/5 hover:text-cyan-200"
            aria-label={isPreviewVisible ? "Sembunyikan preview" : "Tampilkan preview"}
          >
            {isPreviewVisible ? (
              <EyeOff className="h-5 w-5 text-cyan-300/90 group-hover:text-cyan-200" />
            ) : (
              <Eye className="h-5 w-5 text-cyan-300/90 group-hover:text-cyan-200" />
            )}
            <span className="text-[10px] font-semibold uppercase tracking-wider">Preview</span>
          </button>
        </div>
      </div>
      
      <div className="mt-auto p-3 bg-primary/5 border border-primary/10 rounded-md">
        <p className="text-[10px] text-primary/80 leading-relaxed">
          💡 <b>Tips:</b> Tarik tabel ke kanvas. Untuk menghubungkan relasi, tarik garis dari bulatan biru di sisi kolom.
        </p>
      </div>

      {isRulesOpen && (
        <div
          className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setIsRulesOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-white/15 bg-[#111115] p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpenText className="h-4 w-4 text-cyan-300" />
                <h3 className="text-sm font-semibold text-white">Rules Relasi</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRulesOpen(false)}
                className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Tutup aturan relasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-[12px] leading-relaxed">
              <div className="flex items-start gap-2 rounded-md bg-emerald-500/10 px-2.5 py-2 text-emerald-200">
                <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>Tarik relasi dari FK ke PK.</span>
              </div>

              <div className="flex items-start gap-2 rounded-md bg-emerald-500/10 px-2.5 py-2 text-emerald-200">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>Satu PK boleh menerima banyak relasi masuk.</span>
              </div>

              <div className="flex items-start gap-2 rounded-md bg-amber-500/10 px-2.5 py-2 text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <span>Tidak boleh FK -&gt; FK, PK -&gt; PK, self relation, dan relasi duplikat.</span>
              </div>

              <div className="flex items-start gap-2 rounded-md bg-amber-500/10 px-2.5 py-2 text-amber-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <span>Satu kolom FK hanya boleh punya satu tujuan PK.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};