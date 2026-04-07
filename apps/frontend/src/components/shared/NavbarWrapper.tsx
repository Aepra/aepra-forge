"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";

export const NavbarWrapper = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  
  // Daftar halaman Workspace yang ingin FULL SCREEN (Tanpa Navbar & Tanpa Padding)
  const isWorkspace = pathname.startsWith("/architect") || pathname.startsWith("/danlainlain");

  return (
    <>
      {/* 1. Tampilkan Navbar HANYA jika bukan di halaman workspace */}
      {!isWorkspace && <Navbar />}

      {/* 2. Main content dengan logika padding: 
          - Jika di workspace: pt-0 (mentok atas)
          - Jika halaman biasa: pt-16 (agar tidak tertutup navbar fixed)
      */}
      <main className={`${isWorkspace ? "pt-0" : "pt-16"} min-h-screen flex flex-col`}>
        {children}
      </main>
    </>
  );
};