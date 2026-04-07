import { Database, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Sidebar = () => (
  <aside className="w-64 border-r border-white/5 bg-[#111113] flex flex-col">
    <div className="p-4 border-b border-white/5 flex items-center justify-between">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Explorer</span>
      <Button variant="ghost" size="icon" className="h-6 w-6"><Plus className="w-4 h-4" /></Button>
    </div>
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      <div className="flex items-center gap-2 p-2 rounded-md bg-primary/10 text-primary text-sm font-medium border border-primary/20">
        <Database className="w-4 h-4" /> users_table
      </div>
    </div>
  </aside>
);