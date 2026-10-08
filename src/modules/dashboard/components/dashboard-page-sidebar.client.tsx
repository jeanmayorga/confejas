"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

type PageSidebarContextValue = {
  target: HTMLDivElement | null;
  setTarget: (target: HTMLDivElement | null) => void;
};

const PageSidebarContext = createContext<PageSidebarContextValue | null>(null);

export function DashboardPageSidebarProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const value = useMemo(() => ({ target, setTarget }), [target]);

  return (
    <PageSidebarContext.Provider value={value}>
      {children}
    </PageSidebarContext.Provider>
  );
}

export function DashboardPageSidebarOutlet() {
  const context = useContext(PageSidebarContext);

  return (
    <div ref={context?.setTarget} className="flex min-h-0 flex-1 flex-col" />
  );
}

export function DashboardPageSidebar({
  path,
  children,
}: {
  path: string;
  children: ReactNode;
}) {
  const context = useContext(PageSidebarContext);
  const pathname = usePathname();

  // Keep the page's state and event handlers while rendering in the left panel.
  // Cached pages must not contribute content to another page's sidebar.
  return context?.target && pathname === path
    ? createPortal(children, context.target)
    : null;
}
