"use client";

import React, { memo, useCallback, useRef, useEffect } from "react";
import { Handle, Position, NodeProps, Node, useReactFlow } from "@xyflow/react";
import { Plus, Trash2, Key, Hash, Type, FileText, ToggleLeft, Calendar, Database, Link2 } from "lucide-react";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";

const DATA_TYPES = ["int", "uuid", "varchar", "text", "boolean", "timestamp"];

interface TableNodeData extends Record<string, unknown> {
  label: string;
  columns: Array<{ id: string; name: string; type: string }>;
}

export const TableNode = memo(({ id, data }: NodeProps<Node<TableNodeData>>) => {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = React.useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmDialog, setConfirmDialog] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // FUNGSI KRUSIAL: Update data ke pusat React Flow
  const updateNodeData = useCallback((newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
  }, [id, setNodes]);

  const addColumn = () => {
    const newCol = { id: `col_${Date.now()}`, name: "new_column", type: "varchar" };
    const currentCols = Array.isArray(data.columns) ? data.columns : [];
    updateNodeData({ columns: [...currentCols, newCol] });
  };

  const updateColumn = (colId: string, field: string, value: string) => {
    const currentCols = Array.isArray(data.columns) ? data.columns : [];
    const updatedCols = currentCols.map((c: any) =>
      c.id === colId ? { ...c, [field]: value } : c
    );
    updateNodeData({ columns: updatedCols });
  };

  const deleteColumn = (colId: string) => {
    const currentCols = Array.isArray(data.columns) ? data.columns : [];
    const updatedCols = currentCols.filter((c: any) => c.id !== colId);
    updateNodeData({ columns: updatedCols });
  };

  const cycleColumnType = (colId: string) => {
    const currentCols = Array.isArray(data.columns) ? data.columns : [];
    const updatedCols = currentCols.map((col: any) => {
      if (col.id !== colId) return col;
      const currentTypeIndex = DATA_TYPES.indexOf(col.type as string);
      const nextType = DATA_TYPES[(currentTypeIndex + 1) % DATA_TYPES.length];
      return { ...col, type: nextType };
    });
    updateNodeData({ columns: updatedCols });
  };

  const deleteTable = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Table",
      message: "Are you sure you want to delete this table? This action cannot be undone.",
      onConfirm: () => {
        setNodes((nds) => nds.filter((node) => node.id !== id));
        setConfirmDialog(null);
      }
    });
  };

  const isPrimaryKey = (column: any) => {
    const name = (column.name || "").toString().toLowerCase();
    return name === "id" || column.type === "uuid";
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "int":
        return <Hash className="w-3 h-3" />;
      case "uuid":
        return <Database className="w-3 h-3" />;
      case "varchar":
        return <Type className="w-3 h-3" />;
      case "text":
        return <FileText className="w-3 h-3" />;
      case "boolean":
        return <ToggleLeft className="w-3 h-3" />;
      case "timestamp":
        return <Calendar className="w-3 h-3" />;
      default:
        return <Link2 className="w-3 h-3" />;
    }
  };

  // Hitung lebar tabel berdasarkan panjang teks dari nama tabel dan nama kolom
  const calculateTableWidth = () => {
    const tableName = data.label || "Table";
    const columns = Array.isArray(data.columns) ? data.columns : [];
    
    // Hitung panjang maksimal dari nama tabel dan nama kolom
    const columnLengths = columns.length > 0 ? columns.map((col: any) => (col.name || "").length) : [0];
    const maxTextLength = Math.max(
      tableName.length,
      ...columnLengths
    );
    
    // Base width 160px + 6px per karakter (untuk padding dan spacing)
    const baseWidth = 160;
    const charWidth = 6;
    const calculatedWidth = baseWidth + (maxTextLength * charWidth);
    
    // Minimum 180px, maximum 300px untuk lebar tabel
    return Math.max(180, Math.min(300, calculatedWidth));
  };

  const tableWidth = calculateTableWidth();

  // Fungsi untuk mengecek apakah text overflow
  const isTextOverflow = (text: string, containerWidth: number) => {
    return text.length * 6 > containerWidth - 20; // 6px per char, 20px padding
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div 
      className="bg-black/80 border border-white/40 rounded-lg text-xs shadow-2xl backdrop-blur-md overflow-visible transition-all relative group min-w-[180px]"
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/20 bg-white/5 rounded-t-lg">
        <div className="flex items-center gap-2 w-full mr-2" onDoubleClick={() => setIsEditing(true)}>
          {/* Table Name dengan sliding effect */}
          <div className="flex-1 overflow-hidden">
            <div 
              className={`whitespace-nowrap transition-transform duration-2000 ease-in-out ${
                isTextOverflow((data.label as string) || "", tableWidth - 80) ? "hover:translate-x-[-50%]" : ""
              }`}
              style={{ 
                width: '200%', // 2x width untuk sliding effect
                maxWidth: 'none'
              }}
            >
              <input
                ref={inputRef}
                readOnly={!isEditing}
                value={data.label as string}
                onChange={(e) => updateNodeData({ label: e.target.value })}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
                className={`font-bold bg-transparent outline-none text-[11px] uppercase tracking-wider w-full ${
                  isEditing ? "text-white bg-white/10 px-1 rounded cursor-text" : "text-gray-300 cursor-grab"
                }`}
                placeholder="TABLE_NAME"
                maxLength={50}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={addColumn} className="nodrag p-1 hover:bg-[#00f2ff]/20 rounded transition-colors text-[#00f2ff]">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={deleteTable} className="nodrag p-1 hover:bg-red-400/20 rounded transition-colors text-red-400">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ROWS */}
      <div className="nodrag bg-black/20 rounded-b-lg py-1">
        {Array.isArray(data.columns) && data.columns.length > 0 ? (
          data.columns.map((col: any) => (
            <div key={col.id} className="flex items-center px-2 py-1.5 text-[12px] border-b border-white/10 group/row relative hover:bg-white/5 transition-colors">
              {/* Handle kiri - universal (bisa source atau target) */}
              <Handle 
                type="target" 
                position={Position.Left} 
                id={`left-${col.id}`} 
                className="!w-2 !h-2 !bg-[#00f2ff] !border-none opacity-0 group-hover/row:opacity-100"
                isConnectable={true}
              />
              <Handle 
                type="source" 
                position={Position.Left} 
                id={`left-${col.id}-source`} 
                className="!w-2 !h-2 !bg-[#00f2ff] !border-none opacity-0 group-hover/row:opacity-100"
                isConnectable={true}
              />
              
              {/* Column Name dengan sliding effect */}
              <div className="flex-1 min-w-0 ml-2">
                <div className="flex items-center gap-1 min-w-0">
                  <div className="min-w-0 overflow-hidden">
                    <div 
                      className={`whitespace-nowrap transition-transform duration-2000 ease-in-out ${
                        isTextOverflow(col.name || "", tableWidth - 120) ? "hover:translate-x-[-50%]" : ""
                      }`}
                      style={{ 
                        width: '200%', // 2x width untuk sliding effect
                        maxWidth: 'none'
                      }}
                    >
                      <input
                        value={col.name}
                        onChange={(e) => updateColumn(col.id, "name", e.target.value)}
                        title={col.name}
                        className="bg-transparent outline-none text-white w-full min-w-0 max-w-[20ch] overflow-hidden text-ellipsis whitespace-nowrap"
                        placeholder="column_name"
                        maxLength={50} // Max 50 karakter untuk isi
                      />
                    </div>
                  </div>

                  <span
                    onClick={() => cycleColumnType(col.id)}
                    className="shrink-0 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/70 cursor-pointer hover:bg-white/10"
                    title="Click to change type"
                  >
                    {getTypeIcon(col.type)}
                    <span>{col.type}</span>
                  </span>

                  {isPrimaryKey(col) && (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-emerald-300">
                      <Key className="w-3 h-3" />
                      PK
                    </span>
                  )}
                </div>
              </div>

              <button 
                onClick={() => {
                  setConfirmDialog({
                    isOpen: true,
                    title: "Delete Column",
                    message: "Are you sure you want to delete this column?",
                    onConfirm: () => {
                      deleteColumn(col.id);
                      setConfirmDialog(null);
                    }
                  });
                }} 
                className="ml-2 opacity-0 group-hover/row:opacity-100"
              >
                <Trash2 className="w-3 h-3 text-red-400/60" />
              </button>

              {/* Handle kanan - universal (bisa source atau target) */}
              <Handle 
                type="target" 
                position={Position.Right} 
                id={`right-${col.id}`} 
                className="!w-2 !h-2 !bg-[#00f2ff] !border-none opacity-0 group-hover/row:opacity-100"
                isConnectable={true}
              />
              <Handle 
                type="source" 
                position={Position.Right} 
                id={`right-${col.id}-source`} 
                className="!w-2 !h-2 !bg-[#00f2ff] !border-none opacity-0 group-hover/row:opacity-100"
                isConnectable={true}
              />
            </div>
          ))
        ) : (
          <div className="py-4 text-center text-[10px] text-white/20 uppercase italic">no fields</div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog?.isOpen || false}
        title={confirmDialog?.title || ""}
        message={confirmDialog?.message || ""}
        onConfirm={confirmDialog?.onConfirm || (() => {})}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
});

TableNode.displayName = "TableNode";