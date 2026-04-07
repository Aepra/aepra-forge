import { Save, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Toolbar = () => (
  <div className="flex items-center gap-2 p-1.5 bg-[#1a1a1c]/80 backdrop-blur-md border border-white/10 rounded-full shadow-2xl">
    <Button variant="ghost" size="sm" className="rounded-full h-8 px-4 text-xs gap-2">
      <Save className="w-3.5 h-3.5" /> Save
    </Button>
    <div className="w-[1px] h-4 bg-white/10" />
    <Button variant="default" size="sm" className="rounded-full h-8 px-4 text-xs gap-2 bg-primary text-black font-bold">
      <Play className="w-3.5 h-3.5 fill-current" /> Generate Code
    </Button>
  </div>
);