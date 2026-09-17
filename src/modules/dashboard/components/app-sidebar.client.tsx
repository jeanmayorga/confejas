"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Building03Icon from "@hugeicons/core-free-icons/Building03Icon";
import Building06Icon from "@hugeicons/core-free-icons/Building06Icon";
import Logout01Icon from "@hugeicons/core-free-icons/Logout01Icon";
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
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

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const homeHref = canViewParticipantDirectory(user.role)
    ? "/dashboard/participants"
    : "/dashboard";
  const roleLabel = getRoleLabel(user.role);
  const actionNavigation = canCheckInParticipants(user.role)
    ? [
        {
          title: "Check-in",
          href: "/dashboard/check-in",
          icon: QrCodeScanIcon,
          exact: false,
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
            exact: false,
          },
          ...(canManageParticipants(user.role)
            ? [
                {
                  title: "Compañías",
                  href: "/dashboard/companies",
                  icon: Building03Icon,
                  exact: false,
                },
                {
                  title: "Consejeros",
                  href: "/dashboard/counselors",
                  icon: UserGroup02Icon,
                  exact: false,
                },
              ]
            : []),
          {
            title: "Alojamiento",
            href: "/dashboard/lodging",
            icon: Building06Icon,
            exact: false,
          },
        ]
      : []),
    ...(canManageUsers(user.role)
      ? [
          {
            title: "Usuarios",
            href: "/dashboard/users",
            icon: UserGroupIcon,
            exact: false,
          },
        ]
      : []),
  ];
  const navigationSections = [
    { label: "Acciones", items: actionNavigation },
    { label: "Gestión", items: managementNavigation },
  ].filter((section) => section.items.length > 0);

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
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="relative p-3 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Confejas"
              className="h-14 justify-center px-2 group-data-[collapsible=icon]:px-0"
              render={<Link href={homeHref} />}
            >
              <Image
                src="/logo.png"
                alt=""
                width={44}
                height={44}
                sizes="44px"
                priority
                className="size-11 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-sidebar-border group-data-[collapsible=icon]:size-8"
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarTrigger
          className="absolute right-4 top-1/2 -translate-y-1/2 group-data-[collapsible=icon]:right-2"
          aria-label="Alternar barra lateral"
        />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        {navigationSections.map((section) => (
          <SidebarGroup
            key={section.label}
            className="px-3 py-2 first:pt-4 last:pb-4 group-data-[collapsible=icon]:px-2"
          >
            <SidebarGroupLabel className="px-2">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {section.items.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.title}
                        aria-current={isActive ? "page" : undefined}
                        className="h-10 gap-3 px-3"
                        render={<Link href={item.href} />}
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
      <SidebarSeparator />
      <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="h-14 gap-3 px-2"
                    aria-label={`Cuenta de ${user.name}`}
                  />
                }
              >
                <Avatar>
                  {user.image ? (
                    <AvatarImage src={user.image} alt={user.name} />
                  ) : null}
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {roleLabel}
                  </span>
                </div>
                <HugeiconsIcon
                  icon={UnfoldMoreIcon}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="ml-auto group-data-[collapsible=icon]:hidden"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={8}
                className="w-64"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <span className="block truncate font-medium text-foreground">
                      {user.name}
                    </span>
                    <span className="block truncate font-normal">
                      {user.email}
                    </span>
                    <Badge variant="secondary" className="mt-2">
                      {roleLabel}
                    </Badge>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={handleSignOut}
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
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
