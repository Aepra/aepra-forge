"use client";

import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Plus, GripVertical, Trash2 } from 'lucide-react';

// 1. Daftar Jenis Data untuk Dropdown (Gambar 2)
const DATA_TYPES = [
  'int_primary',
  'uuid',
  'varchar(255)',
  'text',
  'integer',
  'boolean',
  'timestamp',
  'json'
];

// 2. Definisi Struktur Data Kolom
interface ColumnData {
  id: string;
  name: string;
  type: string;
}

// 3. Definisi Tipe Data untuk Node Tabel
type TableNodeData = {
  label: string;
  columns: ColumnData[];
};

// --- Komponen Baris Kolom (ISI) ---
const ColumnRow = memo(({ 
  column, 
  onUpdate, 
  onDelete 
}: { 
  column: ColumnData; 
  onUpdate: (id: string, field: keyof ColumnData, value: string) => void;
  onDelete: (id: string) => void;
}) => {
  return (
    <div className="flex items-center gap-2 group py-1.5 border-b border-white/5 last:border-b-0 hover:bg-white/5 px-2 transition-colors relative">
      {/* Handle Relasi Kiri */}
      <Handle type="target" position={Position.Left} className="!bg-[#00f2ff] !w-2 !h-2 !-left-1 !border-none" />
      
      <GripVertical className="w-3 h-3 text-muted-foreground/50 cursor-grab" />
      
      {/* Nama Kolom (Gambar 2: user_id) */}
      <input 
        type="text" 
        value={column.name}
        onChange={(e) => onUpdate(column.id, 'name', e.target.value)}
        className="flex-1 bg-transparent text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-primary/50 rounded px-1 min-w-[50px]"
        placeholder="column_name"
      />
      
      {/* Dropdown Tipe Data (Gambar 2: type: int_primary) */}
      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
        <span>type:</span>
        <select 
          value={column.type}
          onChange={(e) => onUpdate(column.id, 'type', e.target.value)}
          className="bg-[#1a1a1c] border border-white/10 rounded px-1 py-0.5 text-[10px] text-white/90 focus:outline-none focus:border-primary cursor-pointer hover:border-white/20"
        >
          {DATA_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <button onClick={() => onDelete(column.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 className="w-3 h-3 text-red-500 hover:text-red-400" />
      </button>

      {/* Handle Relasi Kanan */}
      <Handle type="source" position={Position.Right} className="!bg-[#00f2ff] !w-2 !h-2 !-right-1 !border-none" />
    </div>
  );
});

// --- Komponen Utama TableNode ---
export const TableNode = memo(({ data, id }: NodeProps<Node<TableNodeData>>) => {
  // Inisialisasi state dengan pengecekan tipe data yang ketat
  const [columns, setColumns] = useState<ColumnData[]>(
    Array.isArray(data.columns) ? data.columns : []
  );

  const addColumn = useCallback(() => {
    const newColumn: ColumnData = {
      id: `col_${Date.now()}`,
      name: `new_col_${columns.length + 1}`,
      type: DATA_TYPES[0]
    };
    setColumns(prev => [...prev, newColumn]);
  }, [columns.length]);

  const updateColumn = useCallback((colId: string, field: keyof ColumnData, value: string) => {
    setColumns(prev => prev.map(col => col.id === colId ? { ...col, [field]: value } : col));
  }, []);

  const deleteColumn = useCallback((colId: string) => {
    setColumns(prev => prev.filter(col => col.id !== colId));
  }, []);

  return (
    <div className="bg-[#0f0f11] border-2 border-[#00f2ff]/50 rounded-xl shadow-[0_0_20px_rgba(0,242,255,0.15)] min-w-[240px] overflow-hidden group nodrag">
      
      {/* --- HEADER (Gambar 1) --- */}
      <div className="flex items-center justify-between p-3 bg-[#1a1a1c] border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00f2ff] animate-pulse" />
          <input 
            type="text" 
            defaultValue={(data.label as string) || "Table_Name"} 
            className="text-xs font-bold text-white bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/50 rounded px-1"
          />
        </div>
        
        {/* Tombol + (Gambar 1) */}
        <button 
          onClick={addColumn}
          className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/30 text-primary transition-all border border-primary/20 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* --- ISI / COLUMNS (Gambar 2) --- */}
      <div className="py-1 min-h-[40px]">
        {columns.length > 0 ? (
          columns.map(col => (
            <ColumnRow 
              key={col.id} 
              column={col} 
              onUpdate={updateColumn} 
              onDelete={deleteColumn}
            />
          ))
        ) : (
          <div className="py-6 px-4 text-center">
            <p className="text-[10px] text-muted-foreground italic">
              No columns yet. Click + to add.
            </p>
          </div>
        )}
      </div>

      {/* Glow Effect saat terpilih */}
      <div className="absolute inset-0 border-2 border-primary rounded-xl opacity-0 group-data-[selected=true]:opacity-100 pointer-events-none transition-opacity" />
    </div>
  );
});

TableNode.displayName = "TableNode";