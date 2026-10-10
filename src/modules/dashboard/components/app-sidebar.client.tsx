"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import BedDoubleIcon from "@hugeicons/core-free-icons/BedDoubleIcon";
import Building03Icon from "@hugeicons/core-free-icons/Building03Icon";
import Building06Icon from "@hugeicons/core-free-icons/Building06Icon";
import Logout01Icon from "@hugeicons/core-free-icons/Logout01Icon";
import ChurchIcon from "@hugeicons/core-free-icons/ChurchIcon";
import QrCodeScanIcon from "@hugeicons/core-free-icons/QrCodeScanIcon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import UserGroup02Icon from "@hugeicons/core-free-icons/UserGroup02Icon";
import UserMultiple02Icon from "@hugeicons/core-free-icons/UserMultiple02Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HomeIcon } from "@/components/icons/home-icon";
import { SidebarIcon } from "@/components/icons/sidebar-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { DashboardPageSidebarOutlet } from "./dashboard-page-sidebar.client";
import type { DashboardSidebarPanel } from "../sidebar-panels";
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
  panel: DashboardSidebarPanel | null;
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
  isSigningOut,
  onSignOut,
}: {
  user: DashboardUser;
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
                className="size-9 justify-center rounded-sidebar-item! p-0 group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-0!"
                aria-label={`Cuenta de ${user.name}`}
              />
            }
          >
            <Avatar size="sm">
              {user.image ? (
                <AvatarImage src={user.image} alt={user.name} />
              ) : null}
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
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

export function AppSidebar({ user, panel }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile, toggleSidebar, isMobile } = useSidebar();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const homeHref = "/dashboard";
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
          {
            title: "Alojamiento de staff",
            href: "/dashboard/lodging/counselors",
            icon: BedDoubleIcon,
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
    {
      label: "Inicio",
      items: [
        { title: "Home", href: "/dashboard", icon: UserMultiple02Icon },
        ...(canViewParticipantDirectory(user.role)
          ? [
              {
                title: "Calendario",
                href: "/dashboard/calendar",
                icon: Calendar03Icon,
              },
            ]
          : []),
      ],
    },
    { label: "Acciones", items: actionNavigation },
    { label: "Gestión", items: managementNavigation },
    { label: "Configuración", items: configurationNavigation },
  ].filter((section) => section.items.length > 0);
  const activeNavigationHref = navigationSections
    .flatMap((section) => section.items)
    .filter(
      ({ href }) =>
        pathname === href ||
        (href !== homeHref && pathname.startsWith(`${href}/`)),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const isNavigationActive = (href: string) => href === activeNavigationHref;
  const normalizedQuery = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const visibleSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.title
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(normalizedQuery),
      ),
    }))
    .filter((section) => section.items.length > 0);

  function handleNavigation() {
    setSearchOpen(false);
    setQuery("");
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
    <Sidebar
      variant="sidebar"
      collapsible="icon"
      className="inset-y-(--dashboard-frame) h-(--dashboard-content-height)"
    >
      <div className="flex h-[min(75dvh,44rem)] min-h-0 flex-1 bg-sidebar-rail md:h-full">
        <nav
          aria-label="Accesos rápidos"
          data-dashboard-sidebar="rail"
          className="flex w-(--sidebar-width-icon) shrink-0 flex-col bg-sidebar text-sidebar-foreground"
        >
          <SidebarHeader className="h-12 justify-center p-1.5">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="size-9 justify-center rounded-sidebar-item! p-0 group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-0!"
                  render={<Link href={homeHref} onClick={handleNavigation} />}
                  aria-label="Confejas"
                >
                  <Image
                    src="/logo.png"
                    alt=""
                    width={24}
                    height={24}
                    sizes="24px"
                    priority
                    className="size-6 rounded-full object-cover"
                  />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent className="gap-0">
            {panel ? (
              <SidebarGroup className="hidden px-1.5 py-1 group-data-[collapsible=icon]:flex">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      aria-label="Expandir menú lateral"
                      aria-expanded={false}
                      tooltip={{ children: "Expandir menú", hidden: false }}
                      className="size-9 justify-center rounded-sidebar-item! p-0 group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-0!"
                      onClick={toggleSidebar}
                    >
                      <SidebarIcon />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            ) : null}
            {navigationSections.map((section) => (
              <SidebarGroup key={section.label} className="px-1.5 py-1">
                {section.label === "Configuración" ? (
                  <SidebarSeparator className="mx-1 mb-3" />
                ) : null}
                <SidebarGroupContent>
                  <SidebarMenu className="gap-2">
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={isNavigationActive(item.href)}
                          tooltip={{ children: item.title, hidden: false }}
                          aria-label={item.title}
                          aria-current={
                            isNavigationActive(item.href) ? "page" : undefined
                          }
                          className="size-9 justify-center rounded-sidebar-item! p-0 group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-0!"
                          render={
                            <Link href={item.href} onClick={handleNavigation} />
                          }
                        >
                          {item.href === "/dashboard" ? (
                            <HomeIcon />
                          ) : (
                            <HugeiconsIcon
                              icon={item.icon}
                              strokeWidth={1.5}
                              aria-hidden="true"
                            />
                          )}
                          <span className="sr-only">{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
          <SidebarFooter className="p-1.5 pb-3">
            <AccountMenu
              user={user}
              isSigningOut={isSigningOut}
              onSignOut={handleSignOut}
            />
          </SidebarFooter>
        </nav>

        {panel || isMobile ? (
          <div
            data-dashboard-sidebar="panel"
            className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-sidebar-panel bg-sidebar text-sidebar-foreground md:rounded-r-none group-data-[collapsible=icon]:hidden"
          >
            <SidebarHeader className="h-11 shrink-0 flex-row items-center gap-1 px-4 py-1.5">
              {panel ? (
                <span className="mr-auto truncate text-base font-medium">
                  {panel.title}
                </span>
              ) : (
                <Link
                  href={homeHref}
                  onClick={handleNavigation}
                  className="mr-auto truncate text-sm font-semibold"
                >
                  Confejas
                </Link>
              )}
              {!panel ? (
                <Button
                  ref={searchButtonRef}
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-sidebar-item!"
                  aria-label="Buscar sección"
                  aria-expanded={searchOpen}
                  aria-controls={searchOpen ? "sidebar-search" : undefined}
                  onClick={() => {
                    setSearchOpen((value) => !value);
                    setQuery("");
                  }}
                >
                  <HugeiconsIcon
                    icon={Search01Icon}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-sidebar-item! text-muted-foreground aria-expanded:bg-transparent"
                aria-label={
                  isMobile ? "Cerrar menú lateral" : "Contraer menú lateral"
                }
                aria-expanded={true}
                onClick={toggleSidebar}
              >
                <SidebarIcon />
              </Button>
            </SidebarHeader>
            {panel ? (
              <DashboardPageSidebarOutlet />
            ) : (
              <>
                {searchOpen ? (
                  <div id="sidebar-search" className="px-2 pb-2">
                    <InputGroup>
                      <InputGroupAddon>
                        <HugeiconsIcon
                          icon={Search01Icon}
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      </InputGroupAddon>
                      <InputGroupInput
                        autoFocus
                        aria-label="Filtrar secciones del menú"
                        placeholder="Buscar sección…"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setSearchOpen(false);
                            setQuery("");
                            searchButtonRef.current?.focus();
                          }
                        }}
                      />
                    </InputGroup>
                  </div>
                ) : null}
                <SidebarContent
                  role="navigation"
                  aria-label="Menú principal"
                  className="gap-4 pb-4"
                >
                  {visibleSections.map((section) => (
                    <SidebarGroup key={section.label} className="px-2 py-0">
                      {section.label !== "Acciones" ? (
                        <div className="flex h-8 items-center px-2 text-xs text-muted-foreground">
                          {section.label}
                        </div>
                      ) : null}
                      <SidebarGroupContent>
                        <SidebarMenu className="gap-0">
                          {section.items.map((item) => {
                            const isActive = isNavigationActive(item.href);

                            return (
                              <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton
                                  isActive={isActive}
                                  aria-current={isActive ? "page" : undefined}
                                  className="h-9 gap-2 rounded-sidebar-item! px-2"
                                  render={
                                    <Link
                                      href={item.href}
                                      onClick={handleNavigation}
                                    />
                                  }
                                >
                                  {item.href === "/dashboard" ? (
                                    <HomeIcon />
                                  ) : (
                                    <HugeiconsIcon
                                      icon={item.icon}
                                      strokeWidth={1.5}
                                      aria-hidden="true"
                                    />
                                  )}
                                  <span>{item.title}</span>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            );
                          })}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>
                  ))}
                  {visibleSections.length === 0 ? (
                    <p
                      role="status"
                      className="px-4 text-sm text-muted-foreground"
                    >
                      No se encontraron secciones.
                    </p>
                  ) : null}
                </SidebarContent>
              </>
            )}
          </div>
        ) : null}
      </div>
    </Sidebar>
  );
}
