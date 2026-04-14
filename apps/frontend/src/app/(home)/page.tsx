import { Button } from "@/components/ui/button";
import { ArrowRight, Database, Terminal, Box } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0d10] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.12),transparent_45%),radial-gradient(circle_at_80%_15%,rgba(56,189,248,0.08),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/[0.06] to-transparent" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center px-4 pb-16 pt-24 text-center md:px-6">
        <div className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-100">
          Aepra-Forge v1.0
        </div>

        <h1 className="mt-6 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Build Database Architecture Visually
          <span className="block bg-gradient-to-r from-cyan-300 to-sky-400 bg-clip-text text-transparent">
            Export Clean Schema. Generate Faster.
          </span>
        </h1>

        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/65 md:text-lg">
          Design tables and relations in a clean canvas, then export structured schema JSON ready for framework generation and Dockerized deployment.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button size="lg" className="h-11 w-full gap-2 px-7 text-base sm:w-auto" asChild>
            <Link href="/hub">
              Start Building <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-11 w-full gap-2 border-white/20 bg-white/[0.02] px-7 text-base text-white hover:bg-white/[0.06] sm:w-auto">
            <Terminal className="w-5 h-5" /> View Docs
          </Button>
        </div>

        <div className="mt-16 grid w-full max-w-5xl grid-cols-1 gap-4 text-left md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-cyan-300/35">
            <Database className="mb-3 h-8 w-8 text-cyan-300" />
            <h3 className="mb-2 text-lg font-semibold text-white">Visual DB Architect</h3>
            <p className="text-sm leading-relaxed text-white/60">
              Drag and drop tables, columns, and relations in one focused workspace.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-cyan-300/35">
            <Terminal className="mb-3 h-8 w-8 text-cyan-300" />
            <h3 className="mb-2 text-lg font-semibold text-white">Framework Generator</h3>
            <p className="text-sm leading-relaxed text-white/60">
              Generate clean backend project structures from schema JSON with professional conventions.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-cyan-300/35">
            <Box className="mb-3 h-8 w-8 text-cyan-300" />
            <h3 className="mb-2 text-lg font-semibold text-white">Docker Ready Output</h3>
            <p className="text-sm leading-relaxed text-white/60">
              Run generated projects instantly using Docker Compose and test endpoints via Swagger.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
