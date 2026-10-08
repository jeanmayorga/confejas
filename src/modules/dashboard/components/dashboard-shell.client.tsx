"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

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
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  // Apply each page's default before rendering its sidebar, without a flash.
  if (sidebarState.pathname !== pathname) {
    setSidebarState({ pathname, open: defaultOpen });
  }

  return (
    <DashboardPageSidebarProvider>
      <SidebarProvider
        open={Boolean(panel) && sidebarState.open}
        onOpenChange={(open) => setSidebarState({ pathname, open })}
        className="h-dvh min-h-0 overflow-hidden bg-sidebar-rail p-(--dashboard-frame) [--dashboard-frame:0rem] md:pl-0 md:[--dashboard-frame:0.5rem]"
        style={
          {
            "--sidebar-width": panel?.width ?? "3rem",
            "--dashboard-content-height": "calc(100dvh - var(--dashboard-frame) * 2)",
          } as CSSProperties
        }
      >
        <AppSidebar user={user} panel={panel} />
        <main
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background md:rounded-sidebar-panel",
            panel && sidebarState.open && "md:rounded-l-none",
          )}
        >
          <div
            ref={contentRef}
            data-dashboard-scroll
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain",
              !panel?.flushContent && "p-4 sm:p-6 lg:p-8",
            )}
          >
            <SidebarTrigger
              className={cn(
                "mb-3 md:hidden",
                panel?.flushContent && "m-4 mb-0",
              )}
              aria-label="Abrir menú lateral"
            />
            {children}
          </div>
        </main>
      </SidebarProvider>
    </DashboardPageSidebarProvider>
  );
}
