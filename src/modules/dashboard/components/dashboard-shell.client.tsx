"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import Bell01Icon from "@hugeicons/core-free-icons/Notification01Icon";
import Logout01Icon from "@hugeicons/core-free-icons/Logout01Icon";
import Message01Icon from "@hugeicons/core-free-icons/Message01Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/modules/auth/client/auth-client";
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
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await authClient.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0 md:my-2 md:mr-2 md:overflow-clip md:rounded-3xl md:border md:shadow-sm">
        <header className="flex min-h-16 items-center justify-between gap-2 border-b bg-background px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" aria-label="Abrir menú" />
            <h1 className="text-base font-semibold tracking-tight">
              Conferencia JAS 2026
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <InputGroup className="hidden h-8 w-56 sm:flex lg:w-64">
              <InputGroupAddon>
                <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Buscar en el dashboard"
                placeholder="Buscar aquí..."
                className="h-8 text-xs"
              />
              <InputGroupAddon align="inline-end" className="hidden lg:flex">
                <kbd className="text-[10px] text-muted-foreground">⌘K</kbd>
              </InputGroupAddon>
            </InputGroup>
            <Button variant="outline" size="icon-sm" aria-label="Mensajes">
              <HugeiconsIcon icon={Message01Icon} strokeWidth={2} />
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="Notificaciones">
              <HugeiconsIcon icon={Bell01Icon} strokeWidth={2} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="h-8 gap-2 rounded-full p-0 hover:bg-transparent aria-expanded:bg-transparent active:translate-y-0"
                    aria-label={`Cuenta de ${user.name}`}
                  />
                }
              >
                <Avatar>
                  {user.image ? (
                    <AvatarImage src={user.image} alt={user.name} />
                  ) : null}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
                  {user.name}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-2">
                      <span className="font-medium text-foreground">Cuenta</span>
                      <div className="flex items-center gap-2">
                        <Avatar>
                          {user.image ? (
                            <AvatarImage src={user.image} alt={user.name} />
                          ) : null}
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {user.name}
                          </span>
                          <span className="block truncate font-normal">{user.email}</span>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  variant="destructive"
                >
                  {isSigningOut ? (
                    <Spinner />
                  ) : (
                    <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
                  )}
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8">
          <div className="flex w-full min-w-0 flex-1 flex-col">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
