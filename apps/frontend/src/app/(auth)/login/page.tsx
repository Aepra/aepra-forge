"use client";

import React from "react";
import { Github } from "lucide-react";
import { signIn } from "next-auth/react";

const SocialButton = ({
  label,
  provider,
  icon,
}: {
  label: string;
  provider: "google" | "github";
  icon: React.ReactNode;
}) => {
  return (
    <button
      type="button"
      onClick={() => signIn(provider, { callbackUrl: "/hub" })}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] text-sm font-medium text-white/85 transition-colors hover:bg-white/[0.08]"
    >
      {icon}
      {label}
    </button>
  );
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0b0d10] px-4 py-16 text-white">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/30">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Aepra Forge</p>
        <h1 className="mt-3 text-2xl font-semibold">Sign In</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Masuk menggunakan Google atau GitHub untuk mengakses Project Hub dan Architect Workspace.
        </p>

        <div className="mt-6 space-y-3">
          <SocialButton
            provider="google"
            label="Continue with Google"
            icon={<span className="text-base font-semibold text-[#f4f4f5]">G</span>}
          />
          <SocialButton
            provider="github"
            label="Continue with GitHub"
            icon={<Github className="h-4 w-4" />}
          />
        </div>
      </div>
    </div>
  );
}
