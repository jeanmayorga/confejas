"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getInlineAssignmentOptionsAction,
  updateInlineAssignmentAction,
  type InlineAssignmentKind,
} from "../server/inline-assignment-actions";

const UNASSIGNED = "__unassigned__";

export function ParticipantAssignmentDialog({
  participantId, participantName, kind, onClose, onDataChanged,
}: {
  participantId: string;
  participantName: string;
  kind: InlineAssignmentKind;
  onClose: () => void;
  onDataChanged: () => void;
}) {
  const [target, setTarget] = useState("");
  const queryClient = useQueryClient();
  const options = useQuery({
    queryKey: ["participant-inline-assignment", participantId, kind],
    queryFn: async () => {
      const result = await getInlineAssignmentOptionsAction(participantId, kind);
      if (!result.success) throw new Error(result.message);
      return result;
    },
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const assignment = useMutation({
    mutationFn: async () => {
      if (!options.data || !target) throw new Error("Selecciona un destino.");
      const result = await updateInlineAssignmentAction(
        participantId, kind, options.data.currentValue,
        target === UNASSIGNED ? null : target,
      );
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      void queryClient.invalidateQueries({ queryKey: ["participant-detail", participantId] });
      void queryClient.invalidateQueries({ queryKey: ["participant-edit", participantId] });
      onDataChanged();
      onClose();
    },
    onError: () => {
      setTarget("");
      void options.refetch();
    },
  });
  const company = kind === "company";
  const canSave = Boolean(target && options.data && !options.isFetching && !options.isError && !assignment.isPending);

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !assignment.isPending) onClose(); }}>
      <DialogContent showCloseButton={!assignment.isPending}>
        <DialogHeader>
          <DialogTitle>{company ? "Cambiar compañía" : "Cambiar dormitorio"}</DialogTitle>
          <DialogDescription>{participantName}</DialogDescription>
        </DialogHeader>
        {options.isPending ? (
          <div role="status" aria-label="Cargando opciones disponibles">
            <Skeleton className="h-24 w-full" />
          </div>
        ) : options.isError ? (
          <div className="flex flex-col gap-3">
            <p role="alert">No pudimos cargar las opciones. Inténtalo nuevamente.</p>
            <Button variant="outline" onClick={() => void options.refetch()}>Reintentar</Button>
          </div>
        ) : (
          <FieldGroup>
            <p className="text-sm text-muted-foreground">Asignación actual: {options.data.currentLabel}</p>
            <Field data-disabled={assignment.isPending}>
              <FieldLabel htmlFor="participant-assignment-target">
                {company ? "Compañías disponibles" : "Dormitorios disponibles"}
              </FieldLabel>
              <NativeSelect
                id="participant-assignment-target"
                className="w-full"
                value={target}
                disabled={assignment.isPending || options.isFetching}
                onChange={(event) => { setTarget(event.target.value); assignment.reset(); }}
              >
                <NativeSelectOption value="" disabled>Selecciona una opción</NativeSelectOption>
                {options.data.options.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label} · {option.available} cupos
                  </NativeSelectOption>
                ))}
                {options.data.currentValue !== null ? (
                  <NativeSelectOption value={UNASSIGNED}>Dejar sin asignar</NativeSelectOption>
                ) : null}
              </NativeSelect>
              <FieldDescription>
                {options.data.options.length
                  ? "Solo se muestran destinos con cupo y compatibles con el sexo del participante."
                  : "No hay destinos disponibles compatibles con el sexo del participante."}
              </FieldDescription>
            </Field>
          </FieldGroup>
        )}
        {assignment.isError ? <p role="alert" className="text-sm text-destructive">{assignment.error.message}</p> : null}
        <DialogFooter>
          <Button variant="outline" disabled={assignment.isPending} onClick={onClose}>Cancelar</Button>
          <Button disabled={!canSave} onClick={() => assignment.mutate()}>
            {assignment.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
