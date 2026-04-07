import { Button } from "@/components/ui/button";
import { ArrowRight, Database, Terminal, Box } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center relative overflow-hidden dark">
      {/* Glow Effect Futuristis */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

      <main className="container px-4 md:px-6 flex flex-col items-center text-center z-10 space-y-8 pt-24 pb-16">
        
        {/* Badge Versi */}
        <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary backdrop-blur-sm">
          🚀 Aepra-Forge v1.0 is Live
        </div>

        {/* Headline Utama */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl">
          The Hybrid <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">
            Developer Platform
          </span>
        </h1>

        <p className="max-w-[700px] text-muted-foreground md:text-xl leading-relaxed">
          Visual database design, automated API generation, and Docker infrastructure. 
          Go from an idea to production-ready code in seconds.
        </p>

        {/* Tombol Aksi */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
          <Button size="lg" className="gap-2 w-full sm:w-auto h-12 px-8 text-base" asChild>
            <Link href="/architect">
              Start Building <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto h-12 px-8 text-base">
            <Terminal className="w-5 h-5" /> View Docs
          </Button>
        </div>

        {/* Kartu Fitur */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-24 text-left">
          <div className="flex flex-col p-6 bg-card/50 border border-border/50 rounded-2xl shadow-sm backdrop-blur-sm hover:border-primary/50 transition-colors">
            <Database className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Visual DB Architect</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Drag and drop canvas to design your database schemas, tables, and relations effortlessly.
            </p>
          </div>
          
          <div className="flex flex-col p-6 bg-card/50 border border-border/50 rounded-2xl shadow-sm backdrop-blur-sm hover:border-primary/50 transition-colors">
            <Terminal className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Auto CRUD API</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Instantly generate fully-typed FastAPI endpoints with Clean Architecture and Pydantic schemas.
            </p>
          </div>
          
          <div className="flex flex-col p-6 bg-card/50 border border-border/50 rounded-2xl shadow-sm backdrop-blur-sm hover:border-primary/50 transition-colors">
            <Box className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Docker Ready</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Download a complete ZIP containing your infrastructure setup, ready to deploy via Docker Compose.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}