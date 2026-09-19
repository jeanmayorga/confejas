"use client";

import Home01Icon from "@hugeicons/core-free-icons/Home01Icon";
import Settings01Icon from "@hugeicons/core-free-icons/Settings01Icon";
import UserMultiple02Icon from "@hugeicons/core-free-icons/UserMultiple02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navigationItems = [
  {
    label: "Inicio",
    href: "/consejero",
    icon: Home01Icon,
    isActive: (pathname: string) => pathname === "/consejero",
  },
  {
    label: "Participantes",
    href: "/consejero/participantes",
    icon: UserMultiple02Icon,
    isActive: (pathname: string) =>
      pathname.startsWith("/consejero/participantes"),
  },
  {
    label: "Configuración",
    href: "/consejero/configuracion",
    icon: Settings01Icon,
    isActive: (pathname: string) =>
      pathname.startsWith("/consejero/configuracion"),
  },
] as const;

export function CounselorBottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-xl border-t bg-background/95 px-2 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/90"
    >
      <div className="grid h-18 grid-cols-3 gap-1">
        {navigationItems.map((item) => {
          const isActive = item.isActive(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                isActive &&
                  "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
              )}
            >
              <HugeiconsIcon
                icon={item.icon}
                strokeWidth={isActive ? 2.2 : 1.8}
                className="size-5"
                aria-hidden
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
