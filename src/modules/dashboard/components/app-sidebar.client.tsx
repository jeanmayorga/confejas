"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Building03Icon from "@hugeicons/core-free-icons/Building03Icon";
import Building06Icon from "@hugeicons/core-free-icons/Building06Icon";
import Logout01Icon from "@hugeicons/core-free-icons/Logout01Icon";
import ChurchIcon from "@hugeicons/core-free-icons/ChurchIcon";
import QrCodeScanIcon from "@hugeicons/core-free-icons/QrCodeScanIcon";
import UnfoldMoreIcon from "@hugeicons/core-free-icons/UnfoldMoreIcon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import UserGroup02Icon from "@hugeicons/core-free-icons/UserGroup02Icon";
import UserMultiple02Icon from "@hugeicons/core-free-icons/UserMultiple02Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/modules/auth/client/auth-client";
import {
  canCheckInParticipants,
  canManageParticipants,
  canManageUsers,
  canViewParticipantDirectory,
  getRoleLabel,
} from "@/modules/auth/roles";

export type DashboardUser = {
  name: string;
  email: string;
  image: string | null | undefined;
  role: string | null | undefined;
};

type AppSidebarProps = {
  user: DashboardUser;
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function AccountMenu({
  user,
  compact,
  isSigningOut,
  onSignOut,
}: {
  user: DashboardUser;
  compact: boolean;
  isSigningOut: boolean;
  onSignOut: () => void;
}) {
  const { isMobile } = useSidebar();
  const roleLabel = getRoleLabel(user.role);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className={
                  compact
                    ? "size-10 justify-center p-0 text-sidebar-rail-foreground hover:bg-sidebar-rail-accent hover:text-sidebar-rail-foreground"
                    : "h-14 gap-3 border border-sidebar-border bg-background px-2"
                }
                aria-label={`Cuenta de ${user.name}`}
              />
            }
          >
            <Avatar>
              {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            {compact ? null : (
              <>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {roleLabel}
                  </span>
                </div>
                <HugeiconsIcon
                  icon={UnfoldMoreIcon}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="ml-auto"
                />
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? "top" : "right"}
            align="end"
            sideOffset={8}
            className="w-64"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span className="block truncate font-medium text-foreground">
                  {user.name}
                </span>
                <span className="block truncate font-normal">{user.email}</span>
                <Badge variant="secondary" className="mt-2">
                  {roleLabel}
                </Badge>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={onSignOut}
                disabled={isSigningOut}
                variant="destructive"
              >
                {isSigningOut ? (
                  <Spinner />
                ) : (
                  <HugeiconsIcon
                    icon={Logout01Icon}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                )}
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const homeHref = canViewParticipantDirectory(user.role)
    ? "/dashboard/participants"
    : "/dashboard";
  const actionNavigation = canCheckInParticipants(user.role)
    ? [
        {
          title: "Bienvenida",
          href: "/dashboard/check-in",
          icon: QrCodeScanIcon,
        },
      ]
    : [];
  const managementNavigation = [
    ...(canViewParticipantDirectory(user.role)
      ? [
          {
            title: "Participantes",
            href: "/dashboard/participants",
            icon: UserMultiple02Icon,
          },
          ...(canManageParticipants(user.role)
            ? [
                {
                  title: "Compañías",
                  href: "/dashboard/companies",
                  icon: Building03Icon,
                },
                {
                  title: "Consejeros",
                  href: "/dashboard/counselors",
                  icon: UserGroup02Icon,
                },
              ]
            : []),
          {
            title: "Alojamiento",
            href: "/dashboard/lodging",
            icon: Building06Icon,
          },
        ]
      : []),
  ];
  const configurationNavigation = [
    ...(canManageParticipants(user.role)
      ? [
          {
            title: "Unidades",
            href: "/dashboard/units",
            icon: ChurchIcon,
          },
        ]
      : []),
    ...(canManageUsers(user.role)
      ? [
          {
            title: "Usuarios",
            href: "/dashboard/users",
            icon: UserGroupIcon,
          },
        ]
      : []),
  ];
  const navigationSections = [
    { label: "Acciones", icon: QrCodeScanIcon, items: actionNavigation },
    { label: "Gestión", icon: UserMultiple02Icon, items: managementNavigation },
    { label: "Configuración", icon: ChurchIcon, items: configurationNavigation },
  ].filter((section) => section.items.length > 0);
  const routeSection = navigationSections.find((section) =>
    section.items.some((item) => pathname.startsWith(item.href)),
  );
  function handleNavigation() {
    setOpenMobile(false);
  }

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
    <Sidebar variant="sidebar" collapsible="icon">
      <div className="flex min-h-0 flex-1">
        <div className="flex w-(--sidebar-width-icon) shrink-0 flex-col bg-sidebar-rail text-sidebar-rail-foreground">
          <SidebarHeader className="p-1">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  className="size-10 justify-center p-0 hover:bg-sidebar-rail-accent hover:text-sidebar-rail-foreground"
                  render={<Link href={homeHref} onClick={handleNavigation} />}
                  aria-label="Confejas"
                >
                  <Image
                    src="/logo.png"
                    alt=""
                    width={32}
                    height={32}
                    sizes="32px"
                    priority
                    className="size-8 rounded-lg bg-background object-cover"
                  />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup className="px-1 py-3">
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {navigationSections.map((section) => (
                    <SidebarMenuItem key={section.label}>
                      <SidebarMenuButton
                        isActive={routeSection?.label === section.label}
                        tooltip={{ children: section.label, hidden: false }}
                        aria-label={section.label}
                        className="size-10 justify-center p-0 hover:bg-sidebar-rail-accent hover:text-sidebar-rail-foreground active:bg-sidebar-rail-accent active:text-sidebar-rail-foreground data-active:bg-sidebar-rail-accent data-active:text-sidebar-rail-foreground"
                        render={<Link href={section.items[0].href} onClick={handleNavigation} />}
                      >
                        <HugeiconsIcon
                          icon={section.icon}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        <span className="sr-only">{section.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="hidden p-1 group-data-[collapsible=icon]:block">
            <AccountMenu
              user={user}
              compact
              isSigningOut={isSigningOut}
              onSignOut={handleSignOut}
            />
          </SidebarFooter>
        </div>

        <div className="flex min-w-0 flex-1 flex-col border-r border-sidebar-border bg-background text-foreground group-data-[collapsible=icon]:hidden">
          <SidebarHeader className="gap-1 border-b border-sidebar-border p-4">
            <span className="truncate text-sm font-semibold">Confejas</span>
            <span className="truncate text-xs text-muted-foreground">
              Conferencia JAS 2026
            </span>
          </SidebarHeader>
          <SidebarContent>
            {navigationSections.map((section) => (
              <SidebarGroup key={section.label} className="px-2 py-3">
                <div className="px-2 pb-2 text-xs font-medium text-muted-foreground">
                  {section.label}
                </div>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    {section.items.map((item) => {
                      const isActive = pathname.startsWith(item.href);

                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            isActive={isActive}
                            aria-current={isActive ? "page" : undefined}
                            className="h-10 gap-3 px-2 hover:bg-muted hover:text-foreground data-active:bg-muted data-active:text-foreground"
                            render={<Link href={item.href} onClick={handleNavigation} />}
                          >
                            <HugeiconsIcon
                              icon={item.icon}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
          <SidebarFooter className="p-3">
            <AccountMenu
              user={user}
              compact={false}
              isSigningOut={isSigningOut}
              onSignOut={handleSignOut}
            />
          </SidebarFooter>
        </div>
      </div>
    </Sidebar>
  );
}
