import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/shared/Navbar"; // Pastikan path ini benar

// Konfigurasi Font
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aepra-Forge | Visual Database Architect",
  description: "Generate FastAPI & Docker Infrastructure visually",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        {/* Navbar Global yang kita buat tadi */}
        <Navbar />

        {/* Gunakan main tag dengan padding-top (pt-16) 
            agar konten tidak tertutup navbar yang posisinya 'fixed'
        */}
        <main className="pt-16 min-h-screen flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}