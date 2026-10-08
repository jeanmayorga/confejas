"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  getParticipantDetailAction,
  getParticipantEditDataAction,
  updateParticipantStatusAction,
} from "@/modules/participants/server/actions";
import type { ParticipantStatus } from "@/modules/participants/status";
import { ParticipantDetails } from "./participant-details.client";

const ParticipantForm = dynamic(
  () => import("./participant-form.client").then((module) => module.ParticipantForm),
  { loading: () => <ParticipantSheetLoading /> },
);

function ParticipantSheetLoading() {
  return (
    <div
      className="flex flex-1 flex-col gap-4 px-6 pb-6"
      aria-label="Cargando participante"
      aria-busy="true"
    >
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}

export function ParticipantDetailSheet({
  participantId,
  initialMode = "view",
  onClose,
  onDataChanged,
  onCompanyOpen,
}: {
  participantId: string | null;
  initialMode?: "view" | "edit";
  onClose: () => void;
  onDataChanged: () => void;
  onCompanyOpen?: (companyId: string) => void;
}) {
  const [mode, setMode] = useState(initialMode);
  const queryClient = useQueryClient();
  const detailKey = ["participant-detail", participantId];
  const detail = useQuery({
    queryKey: detailKey,
    enabled: participantId !== null && mode === "view",
    queryFn: async () => {
      const result = await getParticipantDetailAction(participantId!);
      if (!result.success) throw new Error(result.message);
      return result;
    },
    retry: false,
    gcTime: 0,
  });
  const edit = useQuery({
    queryKey: ["participant-edit", participantId],
    enabled: participantId !== null && mode === "edit",
    queryFn: async () => {
      const result = await getParticipantEditDataAction(participantId!);
      if (!result.success) throw new Error(result.message);
      return result;
    },
    retry: false,
    gcTime: 0,
  });

  function refreshParticipant() {
    void queryClient.invalidateQueries({ queryKey: detailKey });
    onDataChanged();
  }

  const status = useMutation({
    mutationFn: async (nextStatus: ParticipantStatus) => {
      const result = await updateParticipantStatusAction(
        participantId!,
        nextStatus,
      );
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      refreshParticipant();
    },
    onError: (error) => toast.error(error.message),
  });

  function close() {
    setMode("view");
    onClose();
  }

  const activeQuery = mode === "edit" ? edit : detail;

  return (
    <Sheet
      open={participantId !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <SheetContent
        side="right"
        className={cn(
          "data-[side=right]:w-full",
          mode === "edit"
            ? "data-[side=right]:sm:max-w-2xl"
            : "data-[side=right]:sm:max-w-lg",
        )}
      >
        <SheetHeader className="justify-center py-4 pr-16">
          <SheetTitle>
            {mode === "edit" ? "Editar Participante" : "Participante"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {detail.data
              ? `${detail.data.participant.firstNames} ${detail.data.participant.lastNames}`
              : "Detalle del participante"}
          </SheetDescription>
        </SheetHeader>
        {activeQuery.isPending ? (
          <ParticipantSheetLoading />
        ) : activeQuery.isError ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No pudimos cargar el participante</EmptyTitle>
              <EmptyDescription>{activeQuery.error.message}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={() => void activeQuery.refetch()}>
                Reintentar
              </Button>
            </EmptyContent>
          </Empty>
        ) : mode === "edit" && edit.data ? (
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <ParticipantForm
              participant={edit.data.participant}
              companies={edit.data.companies}
              wards={edit.data.wards}
              stakes={edit.data.stakes}
              lodgingBuildings={edit.data.lodgingBuildings}
              presentation="sheet"
              onCancel={() => setMode("view")}
              onSuccess={() => {
                close();
                refreshParticipant();
              }}
            />
          </div>
        ) : detail.data ? (
          <ParticipantDetails
            key={detail.data.participant.id}
            participant={detail.data.participant}
            canManage={detail.data.canManage}
            canDelete={detail.data.canDelete}
            canViewWelcome
            className="flex-1"
            onEdit={() => setMode("edit")}
            onDeleted={() => {
              close();
              onDataChanged();
            }}
            onDataChanged={refreshParticipant}
            onCompanyOpen={onCompanyOpen}
            onStatusChange={(nextStatus) => status.mutate(nextStatus)}
            isStatusUpdating={status.isPending}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
