"use client";

import {
  createContext,
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
  busy: boolean;
  openMove: (ids: readonly string[]) => void;
  openRemove: (ids: readonly string[]) => void;
  openDelete: (ids: readonly string[]) => void;
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
  const [prompt, setPrompt] = useState<ManagementPrompt | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
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
  const destinations = useMemo(() => companies.map((company) => ({
    company,
    preview: getParticipantMovePreview(prompt?.participants ?? [], company),
  })), [companies, prompt?.participants]);
  const target = destinations.find(({ company }) => company.id === prompt?.targetCompanyId);
  const promptIsStale = prompt !== null && !areCompanyParticipantsCurrent(prompt.participants, currentById);
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
      setDeleteConfirmed(false);
      setPrompt({ kind, participants, targetCompanyId: "" });
    }
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

        setPrompt(null);
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

  function closePrompt(open: boolean) {
    if (!open && !pending && !submittingRef.current) {
      setPrompt(null);
      setDeleteConfirmed(false);
      setFailure(null);
    }
  }

  const context: ParticipantManagement = {
    busy: pending,
    openMove: (ids) => openAction("move", ids),
    openRemove: (ids) => openAction("remove", ids),
    openDelete: (ids) => openAction("delete", ids),
  };

  return (
    <ParticipantManagementContext.Provider value={context}>
      {children}

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
            <AlertDialogTitle>
              {prompt?.kind === "delete"
                ? deleteConfirmed
                  ? "Última confirmación"
                  : "¿Eliminar participantes definitivamente?"
                : "¿Quitar participantes de sus compañías?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {prompt?.kind === "delete"
                ? deleteConfirmed
                  ? "Esta es la última confirmación. Se eliminarán permanentemente los registros de estas personas, incluida su información médica. Esta acción no se puede deshacer."
                  : "Esta acción eliminará permanentemente los registros de estas personas, incluida su información médica. Selecciona continuar para revisar la confirmación final."
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
              onClick={() => {
                if (!prompt) return;
                if (prompt.kind === "delete" && !deleteConfirmed) {
                  setDeleteConfirmed(true);
                  return;
                }
                executeAction(prompt);
              }}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending
                ? "Guardando…"
                : prompt?.kind === "delete"
                  ? deleteConfirmed
                    ? "Eliminar definitivamente"
                    : "Continuar"
                  : "Quitar de compañía"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ParticipantManagementContext.Provider>
  );
}
