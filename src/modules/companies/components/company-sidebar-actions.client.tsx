"use client";

import { type FormEvent, useId, useState, useTransition } from "react";
import MoreHorizontalIcon from "@hugeicons/core-free-icons/MoreHorizontalIcon";
import PencilEdit02Icon from "@hugeicons/core-free-icons/PencilEdit02Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SidebarMenuAction } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { normalizeCompanyName } from "../company-label";
import { renameCompanyAction } from "../server/actions";
import type { CompanyListItem } from "../server/queries";
import { DeleteCompanyDialog } from "./delete-company-button.client";

function EditCompanyDialog({
  company,
  label,
  onClose,
  onUpdated,
}: {
  company: CompanyListItem;
  label: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const router = useRouter();
  const fieldId = useId();
  const [name, setName] = useState(label);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const normalizedName = normalizeCompanyName(name);
    if (!normalizedName) {
      setError("Ingresa un nombre de entre 1 y 120 caracteres.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await renameCompanyAction({
        companyId: company.id,
        name: normalizedName,
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      toast.success(result.message);
      onUpdated();
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar compañía</DialogTitle>
          <DialogDescription>Cambia el nombre de {label}.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor={fieldId}>Nombre</FieldLabel>
            <Input
              id={fieldId}
              autoFocus
              value={name}
              maxLength={120}
              disabled={pending}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${fieldId}-error` : undefined}
            />
            {error ? (
              <FieldError id={`${fieldId}-error`}>{error}</FieldError>
            ) : null}
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CompanySidebarActions({
  company,
  label,
  canDelete,
  onUpdated,
}: {
  company: CompanyListItem;
  label: string;
  canDelete: boolean;
  onUpdated: () => void;
}) {
  const [action, setAction] = useState<"edit" | "delete" | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuAction
              showOnHover
              className="rounded-sidebar-item!"
              aria-label={`Acciones de ${label}`}
            />
          }
        >
          <HugeiconsIcon
            icon={MoreHorizontalIcon}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="start"
          className="w-48 rounded-xl"
        >
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="rounded-lg font-normal"
              onClick={() => setAction("edit")}
            >
              <HugeiconsIcon
                icon={PencilEdit02Icon}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Editar
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="rounded-lg font-normal"
                  variant="destructive"
                  onClick={() => setAction("delete")}
                >
                  <HugeiconsIcon
                    icon={Delete02Icon}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {action === "edit" ? (
        <EditCompanyDialog
          company={company}
          label={label}
          onClose={() => setAction(null)}
          onUpdated={onUpdated}
        />
      ) : null}
      {action === "delete" ? (
        <DeleteCompanyDialog
          company={company}
          label={label}
          open
          onOpenChange={(open) => {
            if (!open) setAction(null);
          }}
        />
      ) : null}
    </>
  );
}
