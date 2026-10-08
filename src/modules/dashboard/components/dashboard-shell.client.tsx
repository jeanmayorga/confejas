"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
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
    if (window.matchMedia("(min-width: 768px)").matches) {
      contentRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
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
        className="min-h-dvh overflow-x-clip bg-sidebar-rail md:h-dvh md:min-h-0 md:overflow-hidden p-(--dashboard-frame) [--dashboard-frame:0rem] [--app-sticky-offset:3.5rem] md:[--app-sticky-offset:0rem] md:pl-0 md:[--dashboard-frame:0.5rem]"
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
            "flex min-h-0 min-w-0 flex-1 flex-col bg-background md:overflow-hidden md:rounded-sidebar-panel",
            panel && sidebarState.open && "md:rounded-l-none",
          )}
        >
          <header className="sticky top-0 z-30 flex h-(--app-sticky-offset) shrink-0 items-center justify-between gap-3 bg-sidebar-rail px-4 text-sidebar-rail-foreground [--foreground:var(--sidebar-rail-foreground)] [--muted:var(--sidebar-rail-accent)] [--ring:var(--sidebar-rail-foreground)] md:hidden">
            <Link
              href="/dashboard"
              aria-label="Confejas, ir a Home"
              className="flex min-h-11 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-rail-foreground"
            >
              <Image
                src="/logo.png"
                alt=""
                width={32}
                height={32}
                sizes="32px"
                className="size-8 rounded-full object-cover"
              />
              <span className="text-sm font-semibold">Confejas</span>
            </Link>
            <SidebarTrigger
              variant="outline"
              className="size-11 rounded-xl border-sidebar-rail-foreground/25 bg-sidebar-rail-accent"
              aria-label="Abrir menú lateral"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M3 5h14M3 10h14M3 15h14" />
              </svg>
            </SidebarTrigger>
          </header>
          <div
            ref={contentRef}
            data-dashboard-scroll
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:overflow-y-auto md:overscroll-contain md:pb-0 [&>*]:shrink-0",
              !panel?.flushContent && "px-4 pt-4 sm:px-6 sm:pt-6 md:pb-6 lg:p-8",
            )}
          >
            {children}
          </div>
        </main>
      </SidebarProvider>
    </DashboardPageSidebarProvider>
  );
}
