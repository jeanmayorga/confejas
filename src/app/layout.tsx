import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { QueryProvider } from "@/components/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Confejas",
  description: "Plataforma de gestión de Confejas.",
  applicationName: "Confejas",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Confejas",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#046db0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={cn(
        "h-full font-sans antialiased",
        inter.variable,
        geistMono.variable,
      )}
    >
      <body className="flex min-h-full flex-col bg-sidebar">
        <NuqsAdapter>
          <QueryProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </QueryProvider>
        </NuqsAdapter>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
