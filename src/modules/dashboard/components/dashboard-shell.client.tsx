"use client";

import { type CSSProperties, type ReactNode, useState } from "react";
import { usePathname } from "next/navigation";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { AppSidebar, type DashboardUser } from "./app-sidebar.client";

type DashboardShellProps = {
  children: ReactNode;
  user: DashboardUser;
};

export function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname();
  const defaultOpen = !(
    pathname === "/dashboard/participants" ||
    pathname.startsWith("/dashboard/participants/")
  );
  const [sidebarState, setSidebarState] = useState({
    pathname,
    open: defaultOpen,
  });

  // Apply each page's default before rendering its sidebar, without a flash.
  if (sidebarState.pathname !== pathname) {
    setSidebarState({ pathname, open: defaultOpen });
  }

  return (
    <SidebarProvider
      open={sidebarState.open}
      onOpenChange={(open) => setSidebarState({ pathname, open })}
      style={{ "--sidebar-width": "19rem" } as CSSProperties}
    >
      <AppSidebar user={user} />
      <main className="flex min-w-0 flex-1 flex-col bg-background">
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 bg-background px-4 sm:px-6 lg:px-8">
          <SidebarTrigger
            className="md:hidden"
            aria-label="Abrir menú lateral"
          />
          <span className="text-sm text-muted-foreground">
            Conferencia JAS 2026
          </span>
        </header>
        <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
