import { Settings, Plus } from "lucide-react";

export const Properties = () => (
  <aside className="w-72 border-l border-white/5 bg-[#111113] flex flex-col">
    <div className="p-4 border-b border-white/5">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
        <Settings className="w-3.5 h-3.5" /> Properties
      </span>
    </div>
    <div className="p-4 space-y-6">
      <div className="space-y-2">
        <label className="text-[11px] text-muted-foreground uppercase font-bold">Table Name</label>
        <input type="text" className="w-full bg-[#1a1a1c] border border-white/10 rounded px-3 py-2 text-sm focus:border-primary outline-none" defaultValue="users_table" />
      </div>
    </div>
  </aside>
);