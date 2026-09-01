"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
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

const pageTitles: Record<string, string> = {
  "/dashboard": "Mi espacio",
  "/dashboard/participants": "Participantes",
  "/dashboard/users": "Usuarios",
};

export function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname();
  const pageTitle = pageTitles[pathname] ?? "Panel";

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-card/95 px-4 backdrop-blur-sm sm:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8">
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
