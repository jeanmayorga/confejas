"use client";

import { type CSSProperties, type ReactNode, useState } from "react";
import { usePathname } from "next/navigation";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { AppSidebar, type DashboardUser } from "./app-sidebar.client";
import { DashboardPageSidebarProvider } from "./dashboard-page-sidebar.client";
import { getDashboardSidebarPanel } from "../sidebar-panels";

type DashboardShellProps = {
  children: ReactNode;
  user: DashboardUser;
};

export function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname();
  const panel = getDashboardSidebarPanel(pathname);
  const defaultOpen = Boolean(panel);
  const [sidebarState, setSidebarState] = useState({
    pathname,
    open: defaultOpen,
  });

  // Apply each page's default before rendering its sidebar, without a flash.
  if (sidebarState.pathname !== pathname) {
    setSidebarState({ pathname, open: defaultOpen });
  }

  return (
    <DashboardPageSidebarProvider>
      <SidebarProvider
        open={Boolean(panel) && sidebarState.open}
        onOpenChange={(open) => setSidebarState({ pathname, open })}
        style={{ "--sidebar-width": panel?.width ?? "3rem" } as CSSProperties}
      >
        <AppSidebar user={user} panel={panel} />
        <main className="flex min-w-0 flex-1 flex-col bg-background">
          <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-6 lg:p-8">
            <SidebarTrigger
              className="mb-3 md:hidden"
              aria-label="Abrir menú lateral"
            />
            {children}
          </div>
        </main>
      </SidebarProvider>
    </DashboardPageSidebarProvider>
  );
}
