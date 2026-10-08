"use client";

import { type ReactNode, useState, useSyncExternalStore } from "react";
import UserMultiple02Icon from "@hugeicons/core-free-icons/UserMultiple02Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { MobileUnassignedSheet } from "@/components/mobile-unassigned-sheet.client";

const desktopQuery = "(min-width: 1280px)";

function subscribeToDesktop(onChange: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getDesktopSnapshot() {
  return window.matchMedia(desktopQuery).matches;
}

function getServerSnapshot() {
  return false;
}

export function CompanyUnassignedSidebar({
  children,
}: {
  children: ReactNode;
}) {
  const desktop = useSyncExternalStore(
    subscribeToDesktop,
    getDesktopSnapshot,
    getServerSnapshot,
  );
  const [open, setOpen] = useState(false);

  if (desktop) {
    return (
      <div className="sticky top-0 flex h-svh min-h-0 flex-col border-l bg-sidebar text-sidebar-foreground">
        <h2 className="flex h-12 shrink-0 items-center px-3 text-sm font-semibold">
          Participantes sin compañía
        </h2>
        {children}
      </div>
    );
  }

  return (
    <MobileUnassignedSheet
      title="Participantes sin compañía"
      description="Busca participantes para asignarlos a una compañía."
      icon={
        <HugeiconsIcon
          icon={UserMultiple02Icon}
          strokeWidth={2}
          data-icon="inline-start"
        />
      }
      open={open}
      onOpenChange={setOpen}
    >
      {children}
    </MobileUnassignedSheet>
  );
}
