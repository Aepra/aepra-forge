"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Box, CheckCircle2, Cloud, Database, Rocket, ServerCog } from "lucide-react";
import { Button } from "@/components/ui/button";

const deploymentSteps = [
  {
    title: "Build Image",
    description: "Generate a clean backend image from the selected project and schema output.",
    icon: Box,
  },
  {
    title: "Run Compose",
    description: "Start services locally with Docker Compose for fast validation and testing.",
    icon: ServerCog,
  },
  {
    title: "Ship Release",
    description: "Promote the same setup to a production target when the project is ready.",
    icon: Rocket,
  },
];

const targetCards = [
  {
    title: "Local Docker",
    description: "Build and run the project on your machine with the current compose config.",
    icon: Database,
  },
  {
    title: "Staging",
    description: "Validate the deployment flow before sending it to a shared environment.",
    icon: Cloud,
  },
  {
    title: "Production",
    description: "Use the same pipeline for the final release target with minimal drift.",
    icon: CheckCircle2,
  },
];

export const DeployDashboard = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0d10] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.12),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.10),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-white/[0.05] to-transparent" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-16 pt-24 md:px-6">
        <div className="inline-flex items-center self-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100">
          Deploy Center
        </div>

        <section className="mt-6 text-center">
          <p className="text-sm uppercase tracking-[0.22em] text-white/45">Project release workflow</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-6xl">
            Prepare, validate, and deploy
            <span className="block bg-gradient-to-r from-emerald-300 to-sky-400 bg-clip-text text-transparent">
              from the same canvas output.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/65 md:text-lg">
            This page keeps the same visual concept as the project flow: compact, focused, and centered on one action path for deployment.
          </p>
        </section>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" className="h-11 gap-2 bg-emerald-300 px-7 text-base font-semibold text-black hover:bg-emerald-200" asChild>
            <Link href="/projects">
              Open Project Library <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-11 gap-2 border-white/20 bg-white/[0.02] px-7 text-base text-white hover:bg-white/[0.06]" asChild>
            <Link href="/architect">
              Open Canvas
            </Link>
          </Button>
        </div>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {deploymentSteps.map((step) => {
            const Icon = step.icon;

            return (
              <article key={step.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-emerald-300/35">
                <Icon className="h-8 w-8 text-emerald-300" />
                <h2 className="mt-4 text-lg font-semibold text-white">{step.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{step.description}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-12 grid gap-4 lg:grid-cols-3">
          {targetCards.map((card) => {
            const Icon = card.icon;

            return (
              <article key={card.title} className="rounded-2xl border border-white/10 bg-[#111113]/70 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{card.title}</h3>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">Deployment target</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/60">{card.description}</p>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
};