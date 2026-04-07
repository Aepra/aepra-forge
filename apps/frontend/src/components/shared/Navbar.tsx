"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
// Saya pakai Github (h kecil di akhir) agar konsisten
import { LayoutDashboard, Database, User, LogOut, Github } from "lucide-react";
import { cn } from "@/lib/utils";

export const Navbar = () => {
  const pathname = usePathname();
  
  // Jangan tampilkan Navbar di halaman Login/Register agar fokus
  const isAuthPage = pathname === "/login" || pathname === "/register";
  if (isAuthPage) return null;

  // Cek apakah sedang di dalam Workspace Architectal (path mengandung "/architect")
  const isArchitect = pathname.includes("/architect");

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-[100] border-b backdrop-blur-md transition-all",
      isArchitect 
        ? "bg-background/50 border-white/5 h-14" 
        : "bg-background/80 border-white/10 h-16"
    )}>
      <div className="container h-full mx-auto px-4 flex items-center justify-between">
        
        {/* LEFT: Logo & Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.5)] group-hover:scale-110 transition-transform">
            <Database className="w-5 h-5 text-black" />
          </div>
          <span className="font-bold text-xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            AEPRA-FORGE
          </span>
        </Link>

        {/* CENTER: Navigation */}
        {!isArchitect && (
          <div className="hidden md:flex items-center gap-8">
            <Link href="/features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</Link>
            <Link href="/docs" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Docs</Link>
            <Link href="/showcase" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Showcase</Link>
          </div>
        )}

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-3">
          {pathname === "/hub" ? (
            <Button variant="ghost" size="sm" className="gap-2" asChild>
              <Link href="/profile"><User className="w-4 h-4" /> Profile</Link>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="hidden sm:flex gap-2" asChild>
              <Link href="https://github.com/AbelEkaPutra/aepra-forge" target="_blank">
                {/* Pakai Github yang sudah diimport di atas */}
                <Github className="w-4 h-4" /> Star
              </Link>
            </Button>
          )}

          <div className="h-4 w-[1px] bg-white/10 mx-2 hidden sm:block" />

          {/* Tombol Utama Dinamis */}
          <Button 
            size="sm" 
            className={cn(
              "gap-2 font-semibold shadow-lg transition-all",
              isArchitect 
                ? "bg-secondary hover:bg-secondary/80 text-white" 
                : "bg-primary hover:bg-primary/90 text-black shadow-primary/20 shadow-primary/10"
            )}
            asChild
          >
            <Link href={isArchitect ? "/hub" : "/login"}>
              {isArchitect ? (
                <><LayoutDashboard className="w-4 h-4" /> Exit to Hub</>
              ) : (
                "Initialize Workspace"
              )}
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};