import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "@/app/globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Harmony",
  description: "Practice SATB vocal harmonies from sheet music.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} min-h-screen font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
