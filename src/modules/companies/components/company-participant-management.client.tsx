"use client";

import {
  createContext,
  type DragEvent,
  type ReactNode,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  COMPANY_PARTICIPANT_LIMIT,
  COMPANY_PARTICIPANT_SEX_LIMIT,
} from "../distribution";
import {
  areCompanyParticipantsCurrent,
  type CapturedCompanyParticipant,
  getParticipantMovePreview,
} from "../participant-move-preview";
import {
  deleteCompanyParticipantsAction,
  moveCompanyParticipantsAction,
} from "../server/participant-management";
import type { CompanyDirectoryItem } from "./companies-directory.client";

type ParticipantManagement = {
  selectedIds: ReadonlySet<string>;
  busy: boolean;
  draggedIds: readonly string[];
  toggleParticipant: (id: string, checked: boolean) => void;
  toggleCompany: (companyId: string, checked: boolean) => void;
  openMove: (ids: readonly string[]) => void;
  openRemove: (ids: readonly string[]) => void;
  openDelete: (ids: readonly string[]) => void;
  startDrag: (event: DragEvent, participantId: string) => void;
  endDrag: () => void;
  canDrop: (companyId: string | null) => boolean;
  drop: (event: DragEvent, companyId: string | null) => void;
};

type ManagementPrompt = {
  kind: "move" | "remove" | "delete";
  participants: CapturedCompanyParticipant[];
  targetCompanyId: string;
};

const ParticipantManagementContext = createContext<ParticipantManagement | null>(null);
const STALE_SELECTION_MESSAGE =
  "La asignación o los datos de un participante cambiaron. Cierra esta ventana y vuelve a seleccionarlos.";

export function useCompanyParticipantManagement() {
  const context = useContext(ParticipantManagementContext);

  if (!context) {
    throw new Error("Company participant controls require CompanyParticipantManagement.");
  }

  return context;
}

function ParticipantReview({
  participants,
  targetCompanyId,
}: {
  participants: readonly CapturedCompanyParticipant[];
  targetCompanyId?: string;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <p className="text-sm font-medium">
        {participants.length} {participants.length === 1 ? "participante" : "participantes"}
      </p>
      <ul
        className="flex max-h-48 flex-col gap-3 overflow-y-auto rounded-xl border p-3"
        aria-label="Participantes y compañías de origen"
        tabIndex={0}
      >
        {participants.map((participant) => (
          <li key={participant.participantId} className="flex flex-col gap-0.5 text-sm">
            <span className="font-medium">{participant.name}</span>
            <span className="text-muted-foreground">
              {participant.companyName}
              {participant.companyId === targetCompanyId ? " · Ya está en el destino" : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CompanyParticipantManagement({
  companies,
  canDelete,
  children,
}: {
  companies: CompanyDirectoryItem[];
  canDelete: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const targetSelectId = useId();
  const [pending, startTransition] = useTransition();
  const submittingRef = useRef(false);
  const [selection, setSelection] = useState<Map<string, string | null>>(() => new Map());
  const [prompt, setPrompt] = useState<ManagementPrompt | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [draggedParticipants, setDraggedParticipants] = useState<CapturedCompanyParticipant[]>([]);
  const draggedRef = useRef<CapturedCompanyParticipant[]>([]);
  const currentById = useMemo(() => {
    const participants = new Map<string, CapturedCompanyParticipant>();

    for (const company of companies) {
      for (const participant of company.participants) {
        participants.set(participant.id, {
          participantId: participant.id,
          companyId: company.id,
          companyName: company.name,
          name: `${participant.firstNames} ${participant.lastNames}`.trim(),
          sex: participant.sex,
        });
      }
    }

    return participants;
  }, [companies]);
  const selectedIds = useMemo(() => new Set(
    [...selection].filter(([id, companyId]) =>
      currentById.get(id)?.companyId === companyId,
    ).map(([id]) => id),
  ), [currentById, selection]);
  const destinations = useMemo(() => companies.map((company) => ({
    company,
    preview: getParticipantMovePreview(prompt?.participants ?? [], company),
  })), [companies, prompt?.participants]);
  const dragDestinations = useMemo(() => new Map(companies.map((company) => [
    company.id,
    getParticipantMovePreview(draggedParticipants, company),
  ])), [companies, draggedParticipants]);
  const target = destinations.find(({ company }) => company.id === prompt?.targetCompanyId);
  const promptIsStale = prompt !== null && !areCompanyParticipantsCurrent(prompt.participants, currentById);
  const dragIsCurrent = areCompanyParticipantsCurrent(draggedParticipants, currentById);
  const moveDisabledReason = promptIsStale
    ? STALE_SELECTION_MESSAGE
    : !target
      ? "Selecciona una compañía de destino."
      : target.preview.disabledReason;

  function captureParticipants(ids: readonly string[]) {
    const uniqueIds = [...new Set(ids)];
    const participants = uniqueIds.flatMap((id) => {
      const participant = currentById.get(id);
      return participant ? [participant] : [];
    });

    if (participants.length === 0 || participants.length !== uniqueIds.length) {
      toast.error("La lista de participantes cambió. Actualiza la página y vuelve a seleccionarlos.");
      return null;
    }

    return participants;
  }

  function openAction(kind: ManagementPrompt["kind"], ids: readonly string[]) {
    if (pending || submittingRef.current || (kind === "delete" && !canDelete)) {
      return;
    }

    const participants = captureParticipants(ids);

    if (participants) {
      setFailure(null);
      setPrompt({ kind, participants, targetCompanyId: "" });
    }
  }

  function toggleParticipant(id: string, checked: boolean) {
    if (pending || submittingRef.current) return;
    const participant = currentById.get(id);
    if (!participant) return;

    setSelection((previous) => {
      const next = new Map(previous);
      if (checked) next.set(id, participant.companyId);
      else next.delete(id);
      return next;
    });
  }

  function toggleCompany(companyId: string, checked: boolean) {
    if (pending || submittingRef.current) return;
    const company = companies.find((item) => item.id === companyId);
    if (!company) return;

    setSelection((previous) => {
      const next = new Map(previous);
      for (const participant of company.participants) {
        if (checked) next.set(participant.id, company.id);
        else next.delete(participant.id);
      }
      return next;
    });
  }

  function endDrag() {
    draggedRef.current = [];
    setDraggedParticipants([]);
  }

  function executeAction(action: ManagementPrompt) {
    if (pending || submittingRef.current) return;
    if (action.kind === "delete" && !canDelete) return;

    if (!areCompanyParticipantsCurrent(action.participants, currentById)) {
      setPrompt(action);
      toast.error(STALE_SELECTION_MESSAGE);
      return;
    }

    if (action.kind === "move") {
      const company = companies.find((item) => item.id === action.targetCompanyId);
      const reason = company
        ? getParticipantMovePreview(action.participants, company).disabledReason
        : "Selecciona una compañía de destino.";

      if (reason) {
        setPrompt(action);
        setFailure(reason);
        return;
      }
    }

    submittingRef.current = true;
    setFailure(null);
    startTransition(async () => {
      try {
        const assignments = action.participants.map(({ participantId, companyId }) => ({
          participantId,
          companyId,
        }));
        const result = action.kind === "delete"
          ? await deleteCompanyParticipantsAction(assignments)
          : await moveCompanyParticipantsAction(
            assignments,
            action.kind === "remove" ? null : action.targetCompanyId,
          );

        if (!result.success) {
          setPrompt(action);
          setFailure(result.message);
          toast.error(result.message);
          router.refresh();
          return;
        }

        setSelection((previous) => {
          const next = new Map(previous);
          for (const participant of action.participants) next.delete(participant.participantId);
          return next;
        });
        setPrompt(null);
        endDrag();
        toast.success(result.message);
        router.refresh();
      } catch {
        const message = "No se pudo completar la operación. Revisa tu conexión e inténtalo nuevamente.";
        setPrompt(action);
        setFailure(message);
        toast.error(message);
      } finally {
        submittingRef.current = false;
      }
    });
  }

  function startDrag(event: DragEvent, participantId: string) {
    if (pending || submittingRef.current || prompt) {
      event.preventDefault();
      return;
    }

    const ids = selectedIds.has(participantId) ? [...selectedIds] : [participantId];
    const participants = captureParticipants(ids);

    if (!participants) {
      event.preventDefault();
      return;
    }

    draggedRef.current = participants;
    setDraggedParticipants(participants);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-company-participants", JSON.stringify(ids));
    event.dataTransfer.setData("text/plain", `${participants.length} participantes`);
  }

  function canDrop(companyId: string | null) {
    if (pending || !dragIsCurrent) return false;
    if (companyId === null) return draggedParticipants.some((participant) => participant.companyId !== null);
    const preview = dragDestinations.get(companyId);
    return preview !== undefined && preview.disabledReason === null;
  }

  function drop(event: DragEvent, companyId: string | null) {
    event.preventDefault();
    event.stopPropagation();
    if (!canDrop(companyId) || submittingRef.current) return;

    const participants = draggedRef.current;
    if (!areCompanyParticipantsCurrent(participants, currentById)) return;
    endDrag();
    setFailure(null);
    const action: ManagementPrompt = {
      kind: companyId === null ? "remove" : "move",
      participants,
      targetCompanyId: companyId ?? "",
    };

    if (companyId === null) setPrompt(action);
    else executeAction(action);
  }

  function closePrompt(open: boolean) {
    if (!open && !pending && !submittingRef.current) {
      setPrompt(null);
      setFailure(null);
    }
  }

  const context: ParticipantManagement = {
    selectedIds,
    busy: pending,
    draggedIds: draggedParticipants.map((participant) => participant.participantId),
    toggleParticipant,
    toggleCompany,
    openMove: (ids) => openAction("move", ids),
    openRemove: (ids) => openAction("remove", ids),
    openDelete: (ids) => openAction("delete", ids),
    startDrag,
    endDrag,
    canDrop,
    drop,
  };

  return (
    <ParticipantManagementContext.Provider value={context}>
      <p className="text-sm text-muted-foreground">
        Selecciona participantes de una o varias compañías para moverlos o quitarlos en grupo.
        También puedes arrastrar una fila a otra compañía; si está seleccionada, se moverá toda la selección.
      </p>

      {selectedIds.size > 0 || pending ? (
        <div className="sticky top-3 z-20 flex flex-wrap items-center gap-2 rounded-xl border bg-background p-3 shadow-sm">
          <p className="mr-auto flex items-center gap-2 text-sm" role="status" aria-live="polite">
            {pending ? <Spinner /> : null}
            {pending ? "Guardando cambios…" : `${selectedIds.size} seleccionados`}
          </p>
          <Button type="button" size="sm" disabled={pending || selectedIds.size === 0} onClick={() => openAction("move", [...selectedIds])}>
            Mover
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={pending || selectedIds.size === 0} onClick={() => openAction("remove", [...selectedIds])}>
            Quitar de compañía
          </Button>
          {canDelete ? (
            <Button type="button" size="sm" variant="destructive" disabled={pending || selectedIds.size === 0} onClick={() => openAction("delete", [...selectedIds])}>
              Eliminar definitivamente
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setSelection(new Map())}>
            Limpiar selección
          </Button>
        </div>
      ) : null}

      {children}

      {draggedParticipants.length > 0 ? (
        <section aria-label="Destinos para mover participantes" className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-4xl flex-col gap-3 rounded-xl border bg-background p-4 shadow-lg">
          <p className="text-sm font-medium">
            Suelta aquí para mover {draggedParticipants.length} {draggedParticipants.length === 1 ? "participante" : "participantes"}
          </p>
          <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
            {companies.map((company) => {
              const preview = dragDestinations.get(company.id);
              const allowed = canDrop(company.id);

              return (
                <Button
                  key={company.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!allowed}
                  title={preview?.disabledReason ?? `Mover a ${company.name}`}
                  onDragOver={(event) => {
                    if (allowed) {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }
                  }}
                  onDrop={(event) => drop(event, company.id)}
                >
                  {company.name} · {preview?.final.total}/{COMPANY_PARTICIPANT_LIMIT}
                </Button>
              );
            })}
            <Button type="button" variant="secondary" size="sm" disabled={!canDrop(null)} onDragOver={(event) => {
              if (canDrop(null)) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }
            }} onDrop={(event) => drop(event, null)}>
              Sin compañía
            </Button>
          </div>
        </section>
      ) : null}

      <Dialog open={prompt?.kind === "move"} onOpenChange={closePrompt}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl" showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>Mover participantes</DialogTitle>
            <DialogDescription>
              Revisa la selección y elige la compañía de destino. Se conservarán los registros de los participantes.
            </DialogDescription>
          </DialogHeader>
          {prompt?.kind === "move" ? (
            <>
              <ParticipantReview participants={prompt.participants} targetCompanyId={prompt.targetCompanyId} />
              <FieldGroup>
                <Field data-invalid={Boolean(target?.preview.disabledReason) || promptIsStale} data-disabled={pending}>
                  <FieldLabel htmlFor={targetSelectId}>Compañía de destino</FieldLabel>
                  <NativeSelect
                    id={targetSelectId}
                    className="w-full"
                    value={prompt.targetCompanyId}
                    disabled={pending || promptIsStale}
                    aria-invalid={Boolean(target?.preview.disabledReason) || promptIsStale}
                    aria-describedby={`${targetSelectId}-description`}
                    onChange={(event) => {
                      setPrompt({ ...prompt, targetCompanyId: event.target.value });
                      setFailure(null);
                    }}
                  >
                    <NativeSelectOption value="">Selecciona una compañía</NativeSelectOption>
                    {destinations.map(({ company, preview }) => (
                      <NativeSelectOption key={company.id} value={company.id} disabled={Boolean(preview.disabledReason)}>
                        {company.name} · {preview.disabledReason ?? `${preview.final.total}/${COMPANY_PARTICIPANT_LIMIT} participantes`}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription id={`${targetSelectId}-description`}>
                    Máximo {COMPANY_PARTICIPANT_LIMIT} participantes: hasta {COMPANY_PARTICIPANT_SEX_LIMIT} mujeres y {COMPANY_PARTICIPANT_SEX_LIMIT} hombres.
                  </FieldDescription>
                  {target ? (
                    <div className="flex flex-col gap-2" aria-live="polite">
                      <p className="text-sm">Así quedará {target.company.name}:</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">Total: {target.company.participantCount} → {target.preview.final.total}/{COMPANY_PARTICIPANT_LIMIT}</Badge>
                        <Badge variant="outline">Mujeres: {target.company.femaleCount} → {target.preview.final.female}/{COMPANY_PARTICIPANT_SEX_LIMIT}</Badge>
                        <Badge variant="outline">Hombres: {target.company.maleCount} → {target.preview.final.male}/{COMPANY_PARTICIPANT_SEX_LIMIT}</Badge>
                      </div>
                      {target.preview.movingCount < prompt.participants.length ? (
                        <p className="text-sm text-muted-foreground">
                          {prompt.participants.length - target.preview.movingCount} ya pertenecen al destino; conservarán su asignación.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {promptIsStale || target?.preview.disabledReason ? <FieldError>{moveDisabledReason}</FieldError> : null}
                </Field>
              </FieldGroup>
              {failure ? <FieldError>{failure}</FieldError> : null}
              <DialogFooter>
                <Button type="button" variant="outline" disabled={pending} onClick={() => closePrompt(false)}>Cancelar</Button>
                <Button type="button" disabled={pending || Boolean(moveDisabledReason)} onClick={() => executeAction(prompt)}>
                  {pending ? <Spinner data-icon="inline-start" /> : null}
                  {pending ? "Moviendo…" : `Mover ${target?.preview.movingCount ?? prompt.participants.length}`}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={prompt?.kind === "remove" || prompt?.kind === "delete"} onOpenChange={closePrompt}>
        <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{prompt?.kind === "delete" ? "¿Eliminar participantes definitivamente?" : "¿Quitar participantes de sus compañías?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {prompt?.kind === "delete"
                ? "Se eliminarán permanentemente los registros de estas personas, incluida su información médica. Esta acción no se puede deshacer."
                : "Los participantes quedarán sin compañía. Sus registros se conservarán y podrás asignarlos nuevamente desde Agregar participantes."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {prompt && prompt.kind !== "move" ? <ParticipantReview participants={prompt.participants} /> : null}
          {promptIsStale ? <FieldError>{STALE_SELECTION_MESSAGE}</FieldError> : null}
          {failure ? <FieldError>{failure}</FieldError> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant={prompt?.kind === "delete" ? "destructive" : "default"}
              disabled={pending || promptIsStale || (prompt?.kind === "delete" && !canDelete)}
              onClick={() => { if (prompt) executeAction(prompt); }}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending ? "Guardando…" : prompt?.kind === "delete" ? "Eliminar definitivamente" : "Quitar de compañía"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ParticipantManagementContext.Provider>
  );
}
