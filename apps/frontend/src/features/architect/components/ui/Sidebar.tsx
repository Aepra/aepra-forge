"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenText,
  Box,
  CheckCircle2,
  Eye,
  EyeOff,
  Folder,
  Gauge,
  Layers,
  Palette,
  Search,
  KeyRound,
  Link2,
  X,
} from "lucide-react";
import { Edge, useEdges, useNodes, useOnSelectionChange, useReactFlow } from "@xyflow/react";
import type { ArchitectTheme, RelationArrowType } from "../../index";

interface SidebarProps {
  relationArrowType: RelationArrowType;
  onRelationArrowTypeChange: (value: RelationArrowType) => void;
  theme: ArchitectTheme;
  onThemeChange: (value: ArchitectTheme) => void;
  isPreviewVisible: boolean;
  onTogglePreview: () => void;
}

export const Sidebar = ({
  relationArrowType,
  onRelationArrowTypeChange,
  theme,
  onThemeChange,
  isPreviewVisible,
  onTogglePreview,
}: SidebarProps) => {
  const router = useRouter();
  const { setEdges, setCenter, fitView } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const [isRulesOpen, setIsRulesOpen] = React.useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(null);
  const [selectedEdgeColor, setSelectedEdgeColor] = React.useState("#ffffff");
  const [searchTerm, setSearchTerm] = React.useState("");
  const colorInputRef = React.useRef<HTMLInputElement>(null);

  const DEFAULT_EDGE_COLORS = React.useMemo(
    () => ["#ffffff", "#22d3ee", "#34d399", "#f59e0b", "#f87171", "#c084fc", "#60a5fa", "#f472b6"],
    []
  );
  const [edgeColorOptions, setEdgeColorOptions] = React.useState<string[]>(DEFAULT_EDGE_COLORS);

  const filteredNodes = React.useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return [] as typeof nodes;
    return nodes.filter((node) => {
      const tableName = String(node.data?.label || "").toLowerCase();
      const columns = Array.isArray(node.data?.columns) ? (node.data?.columns as Array<{ name?: string }>) : [];
      const hasColumnMatch = columns.some((column) => String(column?.name || "").toLowerCase().includes(keyword));
      return tableName.includes(keyword) || hasColumnMatch;
    });
  }, [nodes, searchTerm]);

  const selectedEdge = React.useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) || null,
    [edges, selectedEdgeId]
  );

  const selectedSourceTable = React.useMemo(
    () => nodes.find((node) => node.id === selectedEdge?.source) || null,
    [nodes, selectedEdge]
  );

  const selectedTargetTable = React.useMemo(
    () => nodes.find((node) => node.id === selectedEdge?.target) || null,
    [nodes, selectedEdge]
  );

  const selectedSourceColumnName = React.useMemo(() => {
    if (!selectedSourceTable || !selectedEdge?.sourceHandle) return selectedEdge?.sourceHandle || "-";
    const columns = Array.isArray(selectedSourceTable.data?.columns)
      ? (selectedSourceTable.data?.columns as Array<{ id?: string; name?: string }>)
      : [];
    const handleId = String(selectedEdge.sourceHandle);
    const matchedColumn = columns.find((column) => {
      const columnId = String(column?.id || "");
      return handleId === `left-${columnId}` || handleId === `left-${columnId}-source` || handleId === `right-${columnId}` || handleId === `right-${columnId}-source`;
    });
    return matchedColumn?.name || selectedEdge.sourceHandle || "-";
  }, [selectedSourceTable, selectedEdge]);

  const selectedTargetColumnName = React.useMemo(() => {
    if (!selectedTargetTable || !selectedEdge?.targetHandle) return selectedEdge?.targetHandle || "-";
    const columns = Array.isArray(selectedTargetTable.data?.columns)
      ? (selectedTargetTable.data?.columns as Array<{ id?: string; name?: string }>)
      : [];
    const handleId = String(selectedEdge.targetHandle);
    const matchedColumn = columns.find((column) => {
      const columnId = String(column?.id || "");
      return handleId === `left-${columnId}` || handleId === `left-${columnId}-source` || handleId === `right-${columnId}` || handleId === `right-${columnId}-source`;
    });
    return matchedColumn?.name || selectedEdge.targetHandle || "-";
  }, [selectedTargetTable, selectedEdge]);

  const validationItems = React.useMemo(() => {
    const issues: string[] = [];

    nodes.forEach((node) => {
      const columns = Array.isArray(node.data?.columns) ? (node.data?.columns as Array<{ name?: string; type?: string }>) : [];
      if (columns.length === 0) {
        issues.push(`Table ${String(node.data?.label || node.id)} has no columns.`);
      }

      const hasPrimaryKey = columns.some((column) => {
        const name = String(column?.name || "").toLowerCase();
        const type = String(column?.type || "").toLowerCase();
        return name === "id" || type === "uuid";
      });

      if (!hasPrimaryKey) {
        issues.push(`Table ${String(node.data?.label || node.id)} has no PK indicator.`);
      }
    });

    const duplicateRelationKey = new Set<string>();
    edges.forEach((edge) => {
      const key = `${edge.source}|${edge.sourceHandle}|${edge.target}|${edge.targetHandle}`;
      if (duplicateRelationKey.has(key)) {
        issues.push(`Duplicate relation detected: ${edge.id}.`);
      } else {
        duplicateRelationKey.add(key);
      }
    });

    return issues.slice(0, 6);
  }, [nodes, edges]);

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

  const focusNode = (nodeId: string) => {
    const targetNode = nodes.find((node) => node.id === nodeId);
    if (!targetNode) return;

    const x = targetNode.position.x + ((targetNode.width as number) || 220) / 2;
    const y = targetNode.position.y + ((targetNode.height as number) || 180) / 2;
    setCenter(x, y, { zoom: 1.1, duration: 280 });
  };

  const onGoBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  const sectionClassName = "mt-2 rounded-xl border border-white/10 bg-[#17171a] p-2.5";
  const sectionLabelClassName =
    "mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/65";

  return (
    <aside className="w-64 h-full shrink-0 border-r border-white/5 bg-[#111113] flex flex-col">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#121214]/95 px-3 py-2 backdrop-blur">
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#17171a] px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onGoBack}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-[#0f0f11] text-white/75 transition-colors hover:border-cyan-300/40 hover:text-cyan-200"
              aria-label="Kembali ke halaman sebelumnya"
              title="Back"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-[#0f0f11] text-white/70"
              aria-label="Folder"
              title="Folder"
            >
              <Folder className="h-3.5 w-3.5" />
            </button>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">Architect</span>
          <span className="h-7 w-7" aria-hidden="true" />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/30">
        <p className="mb-4 text-[10px] leading-relaxed text-white/45">Bangun tabel, atur relasi, lalu ekspor skema dengan cepat.</p>

        <div className="space-y-2.5">
        <div className={sectionClassName}>
          <label className={sectionLabelClassName}>
            <Gauge className="h-3 w-3" /> Quick Actions
          </label>
          <button
            type="button"
            onClick={() => fitView({ padding: 0.2, duration: 300 })}
            className="w-full rounded-md bg-[#0f0f11] px-2 py-1.5 text-[10px] text-white/75 transition-colors hover:bg-white/5"
          >
            Focus All Nodes
          </button>
        </div>

        <span className="text-[10px] font-bold uppercase tracking-widest text-white/45 block">
          Components
        </span>

        {/* --- KOMPONEN TABEL SAJA --- */}
        <div
          className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#17171a] px-2.5 py-2.5 text-sm transition-all hover:border-cyan-300/35 group cursor-grab active:cursor-grabbing"
          onDragStart={(event) => onDragStart(event, "tableErd")} 
          draggable
        >
          <div className="grid h-7 w-7 place-items-center rounded-md bg-cyan-500/10 text-cyan-200">
            <Box className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-white/90">Tabel Database</p>
            <p className="text-[10px] text-white/45">Drag ke kanvas untuk mulai desain</p>
          </div>
        </div>

        <div className={sectionClassName}>
          <label className={sectionLabelClassName}>
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

        <div className={sectionClassName}>
          <label className={sectionLabelClassName}>
            <Search className="h-3 w-3" /> Search and Jump
          </label>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Find table or column..."
            className="w-full rounded-md border border-white/10 bg-[#0f0f11] px-2 py-1 text-[11px] text-white/80 outline-none placeholder:text-white/30 focus:border-cyan-300/40"
          />
          {searchTerm.trim() && (
            <div className="mt-1.5 max-h-20 space-y-1 overflow-auto pr-1">
              {filteredNodes.length > 0 ? (
                filteredNodes.slice(0, 6).map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => focusNode(node.id)}
                    className="w-full rounded px-1.5 py-1 text-left text-[10px] text-white/70 hover:bg-white/5"
                  >
                    {String(node.data?.label || node.id)}
                  </button>
                ))
              ) : (
                <div className="text-[10px] text-white/35">No result.</div>
              )}
            </div>
          )}
        </div>

        <div className={sectionClassName}>
          <label className={sectionLabelClassName}>
            <Layers className="h-3 w-3" /> Relation Inspector
          </label>
          {selectedEdge ? (
            <div className="space-y-2 text-[10px] text-white/70">
              <div className="text-white/45">Garis ini menghubungkan dua tabel.</div>

              <div className="rounded-md bg-white/5 px-2 py-1.5 leading-relaxed text-white/80">
                <span className="text-cyan-200">{String(selectedSourceTable?.data?.label || selectedEdge.source)}</span>
                <span> </span>
                <span className="text-amber-200">{String(selectedSourceColumnName)}</span>
                <span> adalah foreign key dari </span>
                <span className="text-violet-200">{String(selectedTargetTable?.data?.label || selectedEdge.target)}</span>
                <span> </span>
                <span className="text-emerald-200">{String(selectedTargetColumnName)}</span>
                <span>.</span>
              </div>

              <div className="flex items-center gap-1.5 text-sky-200">
                <Link2 className="h-3 w-3 text-sky-300" />
                <span>Klik garis untuk ubah warna atau hapus.</span>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-white/35">Pilih garis relasi untuk lihat detailnya.</div>
          )}
        </div>

        <div className={sectionClassName}>
          <label className={sectionLabelClassName}>
            <AlertTriangle className="h-3 w-3" /> Validation
          </label>
          {validationItems.length > 0 ? (
            <div className="max-h-20 space-y-1 overflow-auto pr-1">
              {validationItems.map((item) => (
                <div key={item} className="rounded bg-amber-500/10 px-1.5 py-1 text-[10px] text-amber-200">
                  {item}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-emerald-300/80">No validation issues.</div>
          )}
        </div>

        <div className={sectionClassName}>
          <label className={sectionLabelClassName}>
            <Gauge className="h-3 w-3" /> View and Theme
          </label>
          <button
            type="button"
            onClick={onTogglePreview}
            className="mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-md bg-[#0f0f11] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/75 transition-colors hover:bg-white/5"
            aria-label={isPreviewVisible ? "Sembunyikan preview" : "Tampilkan preview"}
          >
            {isPreviewVisible ? (
              <EyeOff className="h-3.5 w-3.5 text-cyan-300/90" />
            ) : (
              <Eye className="h-3.5 w-3.5 text-cyan-300/90" />
            )}
            <span>{isPreviewVisible ? "Hide Preview" : "Show Preview"}</span>
          </button>
          <div className="flex gap-1">
            {(["graphite", "ocean", "paper"] as ArchitectTheme[]).map((themeItem) => (
              <button
                key={themeItem}
                type="button"
                onClick={() => onThemeChange(themeItem)}
                className={`rounded px-2 py-1 text-[10px] uppercase tracking-wide ${
                  theme === themeItem
                    ? "bg-cyan-500/20 text-cyan-200"
                    : "bg-[#0f0f11] text-white/60 hover:bg-white/5"
                }`}
              >
                {themeItem}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setIsRulesOpen(true)}
            className="group flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#17171a] px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/70 transition-colors hover:border-cyan-300/35 hover:text-cyan-200"
            aria-label="Buka aturan relasi"
          >
            <BookOpenText className="h-3.5 w-3.5 text-cyan-300/90 group-hover:text-cyan-200" />
            <span>Rules</span>
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-cyan-400/15 bg-cyan-500/5 px-2.5 py-2 text-[10px] leading-relaxed text-cyan-100/85">
          <p><span className="font-semibold text-cyan-100">Tips:</span> Tarik tabel ke kanvas, lalu hubungkan relasi dari bulatan biru tiap kolom.</p>
        </div>
      </div>
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