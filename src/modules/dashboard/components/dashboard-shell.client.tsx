"use client";

import { ReactNode } from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { AppSidebar, type DashboardUser } from "./app-sidebar.client";

type DashboardShellProps = {
  children: ReactNode;
  user: DashboardUser;
};

export function DashboardShell({ children, user }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0">
        <div className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8">
          <SidebarTrigger className="mb-4 md:hidden" aria-label="Abrir menú" />
          <div className="flex w-full min-w-0 flex-1 flex-col">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
