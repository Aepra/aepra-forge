"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Database, Github, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export const Navbar = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  
  // Jangan tampilkan Navbar di halaman Login/Register agar fokus
  const isAuthPage = pathname === "/login" || pathname === "/register";

  // Cek apakah sedang di dalam Workspace Architectal (path mengandung "/architect")
  const isArchitect = pathname.includes("/architect");

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/docs", label: "Docs" },
    { href: "/showcase", label: "Showcase" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  React.useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setIsProfileMenuOpen(false);
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileMenuOpen]);

  if (isAuthPage) return null;

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-[100] border-b transition-all",
      isArchitect 
        ? "h-14 border-white/5 bg-[#0b0d10]/70 backdrop-blur-sm" 
        : "h-16 border-white/10 bg-[#0b0d10]/90 backdrop-blur-md"
    )}>
      <div className="container mx-auto flex h-full items-center justify-between px-4">
        
        {/* LEFT: Logo & Brand */}
        <Link href="/" className="group flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 transition-transform group-hover:scale-[1.03]">
            <Database className="h-4.5 w-4.5" />
          </div>
          <span className="bg-gradient-to-r from-white to-white/65 bg-clip-text text-lg font-semibold tracking-[0.16em] text-transparent">
            AEPRA-FORGE
          </span>
        </Link>

        {/* CENTER: Navigation */}
        {!isArchitect && (
          <div className="hidden md:flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive(link.href)
                    ? "bg-white/10 text-white"
                    : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="hidden h-9 gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 text-white/70 hover:bg-white/[0.06] hover:text-white sm:flex"
            asChild
          >
            <Link href="https://github.com/Aepra/aepra-forge" target="_blank">
              <Github className="h-4 w-4" /> GitHub
            </Link>
          </Button>

          {status === "authenticated" ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2 pr-3 text-white/80 transition-colors hover:bg-white/[0.08]"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-300/20 text-[11px] font-semibold uppercase text-cyan-100">
                  {(session.user?.name || session.user?.email || "U").slice(0, 1)}
                </span>
                <span className="hidden max-w-[120px] truncate text-xs sm:inline-block">
                  {session.user?.name || session.user?.email || "Signed In"}
                </span>
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-xl border border-white/10 bg-[#111113] p-2 shadow-2xl shadow-black/40">
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                    <p className="truncate text-sm font-medium text-white">{session.user?.name || "User"}</p>
                    <p className="truncate text-xs text-white/55">{session.user?.email || "No email"}</p>
                  </div>
                  <button
                    type="button"
                    className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button
              size="sm"
              className="h-9 rounded-full bg-cyan-300 px-4 font-semibold text-black transition-colors hover:bg-cyan-200"
              asChild
            >
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};