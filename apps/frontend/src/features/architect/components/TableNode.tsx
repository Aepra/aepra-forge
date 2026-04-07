"use client";

import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Plus, GripVertical, Trash2 } from 'lucide-react';

// Daftar jenis data dummy untuk dropdown sesuai sketsa gambar 2
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

// Struktur data untuk satu baris isi/kolom
interface ColumnData {
  id: string;
  name: string;
  type: string;
}

// Komponen untuk satu baris isi/kolom
const ColumnRow = memo(({ column, onUpdate, onDelete }: { 
  column: ColumnData; 
  onUpdate: (id: string, field: keyof ColumnData, value: string) => void;
  onDelete: (id: string) => void;
}) => {
  return (
    <div className="flex items-center gap-1 group py-1 border-b border-white/5 last:border-b-0 hover:bg-white/5 px-2 transition-colors relative">
      {/* Handle Kiri untuk koneksi relasi */}
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2 !-left-1 !border-none" />
      
      {/* Ikon grip untuk Drag & Drop (Nanti bisa diimplementasikan) */}
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Bagian ISI - Nama Kolom (Gambar 2: user_id) */}
      <input 
        type="text" 
        value={column.name}
        onChange={(e) => onUpdate(column.id, 'name', e.target.value)}
        className="flex-1 bg-transparent text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 min-w-[60px]"
        placeholder="column_name"
      />
      
      {/* Bagian ISI - Dropdown Jenis Data (Gambar 2: type: int_primary) */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <span>type:</span>
        <select 
          value={column.type}
          onChange={(e) => onUpdate(column.id, 'type', e.target.value)}
          className="bg-[#1a1a1c] border border-white/10 rounded px-1 py-0.5 text-white/90 focus:outline-none focus:border-primary cursor-pointer"
        >
          {DATA_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Tombol Hapus Kolom */}
      <button onClick={() => onDelete(column.id)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
        <Trash2 className="w-3 h-3 text-red-500 hover:text-red-400" />
      </button>

      {/* Handle Kanan untuk koneksi relasi */}
      <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2 !-right-1 !border-none" />
    </div>
  );
});

// Komponen Utama Node Tabel ERD
// Kita pakai memo agar tidak re-render jika props nodes.data tidak berubah
export const TableNode = memo(({ data, id }: NodeProps) => {
  // Ambil data columns dari node data, atau array kosong jika belum ada
  const [columns, setColumns] = useState<ColumnData[]>(data.columns || []);

  // Fungsi untuk update data di state React Flow (PENTING!)
  const updateReactFlowData = useCallback((newColumns: ColumnData[]) => {
    // Di sini kita seharusnya mengupdate state 'nodes' di EditorCanvas.tsx.
    // Untuk kesederhanaan di awal, kita update local state dulu.
    // Di tahap 'Zustand Store' nanti, kita akan hubungkan ini ke store global.
    console.log(`Updating node ${id} with columns:`, newColumns);
  }, [id]);

  // Fungsi Tombol + di Header (Gambar 1)
  const addColumn = useCallback(() => {
    const newColumn: ColumnData = {
      id: `col_${Date.now()}`,
      name: `new_column_${columns.length + 1}`,
      type: DATA_TYPES[0] // Default jenis data pertama
    };
    const updatedColumns = [...columns, newColumn];
    setColumns(updatedColumns);
    updateReactFlowData(updatedColumns); // Beritahu React Flow datanya berubah
  }, [columns, updateReactFlowData]);

  const updateColumn = useCallback((colId: string, field: keyof ColumnData, value: string) => {
    const updatedColumns = columns.map(col => col.id === colId ? { ...col, [field]: value } : col);
    setColumns(updatedColumns);
    updateReactFlowData(updatedColumns);
  }, [columns, updateReactFlowData]);

  const deleteColumn = useCallback((colId: string) => {
    const updatedColumns = columns.filter(col => col.id !== colId);
    setColumns(updatedColumns);
    updateReactFlowData(updatedColumns);
  }, [columns, updateReactFlowData]);

  return (
    // Wadah Kotak Utama - Kasih border cyan biar kontras
    <div className="bg-[#111113] border-2 border-[#00f2ff] rounded-xl shadow-2xl min-w-[220px] overflow-hidden group nodrag">
      
      {/* --- Bagian HEADER (Gambar 1) --- */}
      <div className="flex items-center justify-between p-3 bg-[#1a1a1c] border-b border-white/10 relative">
        {/* Nama Tabel (Header) */}
        <input 
          type="text" 
          defaultValue={data.label} 
          className="text-sm font-bold text-white bg-transparent focus:outline-none focus:ring-1 focus:ring-primary rounded px-1.5"
          placeholder="TableName"
        />
        
        {/* Tombol + di kanan header (Gambar 1) */}
        <button 
          onClick={addColumn}
          className="p-1 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors ml-2"
          title="Add column"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* --- Bagian ISI (Di bawah garis horizontal header) --- */}
      <div className="p-1.5 space-y-1">
        {columns.length === 0 ? (
          // Tampilan jika belum ada isinya
          <p className="text-[10px] text-muted-foreground text-center py-4 italic px-3">
            Click + to add columns (id, name, type...)
          </p>
        ) : (
          // Mapping array columns menjadi baris isi (ColumnRow)
          columns.map(col => (
            <ColumnRow 
              key={col.id} 
              column={col} 
              onUpdate={updateColumn} 
              onDelete={deleteColumn}
            />
          ))
        )}
      </div>

      {/* Indikator Pilihan (Hanya muncul saat node diklik) */}
      <div className="absolute inset-0 border-2 border-primary rounded-xl opacity-0 group-data-[selected=true]:opacity-100 pointer-events-none transition-opacity" />
    </div>
  );
});