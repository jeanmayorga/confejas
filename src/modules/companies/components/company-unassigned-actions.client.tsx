"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import MoreHorizontalIcon from "@hugeicons/core-free-icons/MoreHorizontalIcon";
import PencilEdit02Icon from "@hugeicons/core-free-icons/PencilEdit02Icon";
import ShuffleSquareIcon from "@hugeicons/core-free-icons/ShuffleSquareIcon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DistributionCapacity } from "../distribution";
import { CompanyCapacityDialog } from "./company-capacity-dialog.client";
import { CompanyDistributionDialog } from "./company-distribution-dialog.client";

export function CompanyUnassignedActions({
  capacity,
}: {
  capacity: DistributionCapacity;
}) {
  const queryClient = useQueryClient();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [action, setAction] = useState<"distribute" | "capacity" | null>(null);

  function handleDialogOpenChange(open: boolean) {
    if (!open) setAction(null);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              ref={triggerRef}
              variant="ghost"
              size="icon-sm"
              aria-label="Acciones de participantes sin compañía"
              title="Acciones"
            />
          }
        >
          <HugeiconsIcon
            icon={MoreHorizontalIcon}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-xl">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => setAction("distribute")}
              className="rounded-lg"
            >
              <HugeiconsIcon
                icon={ShuffleSquareIcon}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Distribuir en compañías
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setAction("capacity")}
              className="rounded-lg"
            >
              <HugeiconsIcon
                icon={PencilEdit02Icon}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Editar tamaño
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {action === "distribute" ? (
        <CompanyDistributionDialog
          capacity={capacity}
          open
          onOpenChange={handleDialogOpenChange}
          returnFocus={triggerRef}
          onDistributed={() =>
            queryClient.invalidateQueries({
              queryKey: ["company-unassigned-participants"],
            })
          }
        />
      ) : null}
      {action === "capacity" ? (
        <CompanyCapacityDialog
          capacity={capacity}
          open
          onOpenChange={handleDialogOpenChange}
          returnFocus={triggerRef}
        />
      ) : null}
    </>
  );
}
