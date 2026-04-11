"use client";

import { Code2, Copy, Check, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";

export const Preview = () => {
  const { getNodes, getEdges } = useReactFlow();
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<"json" | "sql">("json");
  const [currentTimestamp, setCurrentTimestamp] = useState<string>("");
  const [isClient, setIsClient] = useState(false);

  // Set client-side flag and timestamp
  useEffect(() => {
    setIsClient(true);
    setCurrentTimestamp(new Date().toISOString());
  }, []);

  const nodes = getNodes();
  const edges = getEdges();

  // Generate schema JSON dengan struktur yang lebih lengkap
  const generateSchema = () => {
    return {
      version: "1.0",
      timestamp: currentTimestamp || "2026-01-01T00:00:00.000Z", // fallback timestamp
      tables: nodes.map(node => ({
        id: node.id,
        name: node.data.label || "Untitled",
        columns: Array.isArray(node.data.columns) 
          ? node.data.columns.map((col: any) => ({
              id: col.id,
              name: col.name || "column",
              type: col.type || "varchar",
              nullable: col.nullable !== false,
              default: col.default || null,
              primaryKey: col.primaryKey || false
            }))
          : []
      })),
      relations: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceColumn: edge.sourceHandle,
        targetColumn: edge.targetHandle,
        type: "foreignKey"
      }))
    };
  };

  // Generate SQL CREATE TABLE statements
  const generateSQL = () => {
    const normalizeSqlType = (type?: string) => {
      switch ((type || "").toLowerCase()) {
        case "int":
        case "int fk":
          return "INT";
        case "uuid":
          return "UUID";
        case "varchar":
          return "VARCHAR(255)";
        case "text":
          return "TEXT";
        case "boolean":
          return "BOOLEAN";
        case "timestamp":
          return "TIMESTAMP";
        default:
          return type || "VARCHAR(255)";
      }
    };

    return nodes.map(node => {
      const tableName = node.data.label || "table";
      const columns = Array.isArray(node.data.columns) ? node.data.columns : [];
      
      if (columns.length === 0) return "";
      
      const columnDefs = columns.map((col: any) => {
        let def = `  ${col.name || "column"} ${normalizeSqlType(col.type)}`;
        if (col.primaryKey) def += " PRIMARY KEY";
        if (col.nullable === false) def += " NOT NULL";
        if (col.default) def += ` DEFAULT ${col.default}`;
        return def;
      }).join(",\n");

      return `CREATE TABLE ${tableName} (\n${columnDefs}\n);`;
    }).filter(sql => sql).join("\n\n");
  };

  const currentSchema = generateSchema();
  const sqlScript = generateSQL();
  const displayContent = format === "json" ? JSON.stringify(currentSchema, null, 2) : sqlScript;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    const element = document.createElement("a");
    const fileContent = displayContent;
    const fileName = format === "json" ? "schema.json" : "schema.sql";
    
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(fileContent));
    element.setAttribute("download", fileName);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <aside className="w-96 border-l border-white/5 bg-[#09090b] flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-[#111113]">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5" /> Schema Preview
          </span>
          <div className="flex gap-2">
            <button 
              onClick={copyToClipboard} 
              className="p-1.5 hover:bg-white/10 rounded text-blue-300 transition"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button 
              onClick={downloadFile} 
              className="p-1.5 hover:bg-white/10 rounded text-blue-300 transition"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Format Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFormat("json")}
            className={`px-3 py-1 text-xs rounded font-medium transition ${
              format === "json"
                ? "bg-blue-600/30 text-blue-300 border border-blue-500/50"
                : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
            }`}
          >
            JSON
          </button>
          <button
            onClick={() => setFormat("sql")}
            className={`px-3 py-1 text-xs rounded font-medium transition ${
              format === "sql"
                ? "bg-blue-600/30 text-blue-300 border border-blue-500/50"
                : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
            }`}
          >
            SQL
          </button>
        </div>
      </div>

      {/* Code Display */}
      <div className="flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-blue-200/70 bg-[#0c0c0e]">
        <pre className="whitespace-pre-wrap break-words text-blue-300/80">
          {displayContent}
        </pre>
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-white/5 bg-[#111113] text-[10px] text-white/40 flex justify-between">
        <span>Tables: {nodes.length}</span>
        <span>Relations: {edges.length}</span>
      </div>
    </aside>
  );
};