"use client";

import { type KeyboardEvent, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { canManageUsers, getRoleLabel } from "@/modules/auth/roles";
import { UserDangerActions } from "@/modules/users/components/user-danger-actions.client";
import { UserFormDialog } from "@/modules/users/components/user-form-dialog.client";

type UserRowData = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
  role: string | null;
  companyId: string | null;
  companyName: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastConnectionAt: string | null;
};

type UserRowProps = {
  user: UserRowData;
  companies: { id: string; name: string }[];
  isCurrentUser: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("es-EC", {
  dateStyle: "medium",
  timeStyle: "short",
});

function getUserInitials(name: string) {
  const nameParts = name.trim().split(/\s+/);

  return `${nameParts[0]?.charAt(0) ?? "U"}${
    nameParts.length > 1 ? (nameParts.at(-1)?.charAt(0) ?? "") : ""
  }`.toLocaleUpperCase("es");
}

function formatDate(value: Date | string | null) {
  if (!value) return "Nunca";

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "Nunca" : dateFormatter.format(date);
}

function formatStatus(user: UserRowData) {
  if (!user.banned) return "Activo";

  if (user.banExpires) {
    const expiresAt = new Date(user.banExpires);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt <= new Date()) {
      return "Activo";
    }
  }

  return "Bloqueado";
}

export function UserRow({
  user,
  companies,
  isCurrentUser,
}: UserRowProps) {
  const [open, setOpen] = useState(false);
  const status = formatStatus(user);

  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    setOpen(true);
  }

  return (
    <>
      <TableRow
        className="h-9 cursor-pointer"
        tabIndex={0}
        aria-label={`Ver usuario ${user.name}`}
        onClick={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      >
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar size="sm" aria-hidden="true">
              {user.image ? <AvatarImage src={user.image} alt="" /> : null}
              <AvatarFallback className="font-medium">
                {getUserInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{user.name}</span>
          </div>
        </TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>
          <Badge
            variant={canManageUsers(user.role) ? "default" : "secondary"}
          >
            {getRoleLabel(user.role)}
          </Badge>
        </TableCell>
        <TableCell>{user.companyName ?? "Sin asignar"}</TableCell>
        <TableCell>
          <Badge variant={status === "Bloqueado" ? "destructive" : "outline"}>
            {status}
          </Badge>
        </TableCell>
        <TableCell>{formatDate(user.createdAt)}</TableCell>
        <TableCell>{formatDate(user.lastConnectionAt)}</TableCell>
        <TableCell>
          <div onClick={(event) => event.stopPropagation()}>
            <UserDangerActions user={user} isCurrentUser={isCurrentUser} />
          </div>
        </TableCell>
      </TableRow>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        >
          <SheetHeader className="border-b pr-16">
            <div className="flex items-center gap-3">
              <Avatar size="lg" aria-hidden="true">
                {user.image ? <AvatarImage src={user.image} alt="" /> : null}
                <AvatarFallback className="font-medium">
                  {getUserInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-xl">{user.name}</SheetTitle>
                <SheetDescription className="mt-1">
                  {user.email}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <section className="flex flex-col gap-3" aria-labelledby={`user-info-${user.id}`}>
              <h2 id={`user-info-${user.id}`} className="font-medium">
                Información del usuario
              </h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Rol</dt>
                  <dd className="font-medium">{getRoleLabel(user.role)}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Compañía</dt>
                  <dd className="font-medium">{user.companyName ?? "Sin asignar"}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Estado</dt>
                  <dd className="font-medium">{status}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Correo verificado</dt>
                  <dd className="font-medium">{user.emailVerified ? "Sí" : "No"}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Creado</dt>
                  <dd className="font-medium">{formatDate(user.createdAt)}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Última conexión</dt>
                  <dd className="font-medium">{formatDate(user.lastConnectionAt)}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Última actualización</dt>
                  <dd className="font-medium">{formatDate(user.updatedAt)}</dd>
                </div>
                {user.banReason ? (
                  <div className="flex flex-col gap-1">
                    <dt className="text-muted-foreground">Motivo del bloqueo</dt>
                    <dd className="font-medium">{user.banReason}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section
              className="mt-6 flex items-center justify-between gap-4 border-t pt-6"
              aria-labelledby={`user-edit-${user.id}`}
            >
              <div>
                <h2 id={`user-edit-${user.id}`} className="font-medium">
                  Editar usuario
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Actualiza sus datos de acceso y asignación.
                </p>
              </div>
              <UserFormDialog
                companies={companies}
                user={user}
                triggerLabel="Editar"
              />
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
