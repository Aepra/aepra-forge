"use client";

import React, { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { Plus, Trash2 } from "lucide-react";

const DATA_TYPES = ["int", "uuid", "varchar", "text", "boolean", "timestamp"];

interface ColumnData {
  id: string;
  name: string;
  type: string;
}

type TableNodeData = {
  label: string;
  columns: ColumnData[];
};

// --- COLUMN ROW ---
const ColumnRow = memo(
  ({
    column,
    onUpdate,
    onDelete,
  }: {
    column: ColumnData;
    onUpdate: (id: string, field: keyof ColumnData, value: string) => void;
    onDelete: (id: string) => void;
  }) => {
    return (
      <div className="flex items-center px-2 py-1.5 text-[12px] border-b border-white/10 group/row relative hover:bg-white/5 transition-colors">
        
        {/* HANDLE LEFT (FIX: scoped hover + hitbox besar) */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <Handle
            type="target"
            position={Position.Left}
            id={`target-${column.id}`}
            className="!w-[14px] !h-[14px] !bg-transparent !border-none cursor-crosshair"
          >
            <div className="w-[6px] h-[6px] bg-[#00f2ff] rounded-full mx-auto my-auto" />
          </Handle>
        </div>

        {/* INPUT */}
        <input
          value={column.name}
          onChange={(e) => onUpdate(column.id, "name", e.target.value)}
          className="flex-1 bg-transparent outline-none text-white placeholder:text-white/20"
          placeholder="field_name"
        />

        {/* TYPE */}
        <select
          value={column.type}
          onChange={(e) => onUpdate(column.id, "type", e.target.value)}
          className="text-[10px] text-white/50 bg-transparent outline-none cursor-pointer hover:text-white"
        >
          {DATA_TYPES.map((t) => (
            <option key={t} value={t} className="bg-[#0a0a0a] text-white">
              {t}
            </option>
          ))}
        </select>

        {/* DELETE */}
        <button
          onClick={() => onDelete(column.id)}
          className="ml-2 opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <Trash2 className="w-3 h-3 text-red-400/60 hover:text-red-500" />
        </button>

        {/* HANDLE RIGHT */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <Handle
            type="source"
            position={Position.Right}
            id={`source-${column.id}`}
            className="!w-[14px] !h-[14px] !bg-transparent !border-none cursor-crosshair"
          >
            <div className="w-[6px] h-[6px] bg-[#00f2ff] rounded-full mx-auto my-auto" />
          </Handle>
        </div>
      </div>
    );
  }
);

// --- TABLE NODE ---
export const TableNode = memo(({ data }: NodeProps<Node<TableNodeData>>) => {
  const [columns, setColumns] = useState<ColumnData[]>(
    Array.isArray(data.columns) ? data.columns : []
  );

  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addColumn = useCallback(() => {
    setColumns((prev) => [
      ...prev,
      { id: `col_${Date.now()}`, name: "new_column", type: "int" },
    ]);
  }, []);

  const updateColumn = useCallback(
    (id: string, field: keyof ColumnData, value: string) => {
      setColumns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
      );
    },
    []
  );

  const deleteColumn = useCallback((id: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== id));
  }, []);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div className="bg-black/60 border border-white/40 rounded-lg min-w-[220px] text-xs shadow-2xl backdrop-blur-md overflow-hidden transition-all hover:border-[#00f2ff]/50">
      
      {/* HEADER */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-white/20 bg-white/5 cursor-grab active:cursor-grabbing"
        onDoubleClick={() => setIsEditing(true)}
      >
        <div className="flex items-center gap-2 w-full mr-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00f2ff]" />
          <input
            ref={inputRef}
            readOnly={!isEditing}
            defaultValue={(data.label as string) || "TABLE_NAME"}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
            className={`font-bold bg-transparent outline-none text-[11px] uppercase tracking-wider w-full ${
              isEditing
                ? "text-white bg-white/10 px-1 rounded cursor-text"
                : "text-gray-300 cursor-grab"
            }`}
          />
        </div>

        <button
          onClick={addColumn}
          className="nodrag p-1 hover:bg-[#00f2ff]/20 rounded transition-colors text-[#00f2ff]"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* BODY */}
      <div className="nodrag bg-black/20">
        {columns.length > 0 ? (
          columns.map((col) => (
            <ColumnRow
              key={col.id}
              column={col}
              onUpdate={updateColumn}
              onDelete={deleteColumn}
            />
          ))
        ) : (
          <div className="py-6 text-center text-[10px] text-white/20 uppercase tracking-widest italic">
            no fields defined
          </div>
        )}
      </div>

      {/* SELECTED OUTLINE */}
      <div className="absolute inset-0 border-2 border-[#00f2ff]/0 group-data-[selected=true]:border-[#00f2ff]/40 rounded-lg pointer-events-none transition-all" />
    </div>
  );
});

TableNode.displayName = "TableNode";