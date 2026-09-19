"use client";

import { type FormEvent, useState, useTransition } from "react";
import ShuffleSquareIcon from "@hugeicons/core-free-icons/ShuffleSquareIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEFAULT_DISTRIBUTION_STRATEGY,
  type DistributionCapacity,
} from "@/modules/companies/distribution";
import {
  previewParticipantDistributionAction,
  saveParticipantDistributionAction,
  type DistributionPreview,
} from "@/modules/companies/server/actions";

type DistributionOperation = "preview" | "save" | null;

function getFullCompanyCount(proposal: DistributionPreview) {
  return proposal.companies.filter(
    (company) =>
      company.final.male === proposal.limits.malePerCompany &&
      company.final.female === proposal.limits.femalePerCompany,
  ).length;
}

function getPendingLabel(proposal: DistributionPreview) {
  const pending = [
    proposal.summary.pendingMale > 0
      ? `${proposal.summary.pendingMale.toLocaleString("es-EC")} hombres`
      : null,
    proposal.summary.pendingFemale > 0
      ? `${proposal.summary.pendingFemale.toLocaleString("es-EC")} mujeres`
      : null,
    proposal.summary.pendingUnsupportedSex > 0
      ? `${proposal.summary.pendingUnsupportedSex.toLocaleString("es-EC")} sin sexo registrado`
      : null,
  ].filter(Boolean);

  return pending.join(" · ");
}

function DistributionPreview({ proposal }: { proposal: DistributionPreview }) {
  const fullCompanyCount = getFullCompanyCount(proposal);
  const pendingLabel = getPendingLabel(proposal);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Compañías completas</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {fullCompanyCount}/{proposal.companies.length}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Quedarán sin compañía</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {proposal.pending.totalCount.toLocaleString("es-EC")}
          </p>
        </div>
      </div>

      <TableFrame className="max-h-56 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Compañía</TableHead>
              <TableHead>Hombres</TableHead>
              <TableHead>Mujeres</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proposal.companies.map((company) => (
              <TableRow key={company.companyId}>
                <TableCell className="font-medium">{company.companyName}</TableCell>
                <TableCell className="tabular-nums">
                  {company.final.male.toLocaleString("es-EC")}/
                  {proposal.limits.malePerCompany}
                </TableCell>
                <TableCell className="tabular-nums">
                  {company.final.female.toLocaleString("es-EC")}/
                  {proposal.limits.femalePerCompany}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableFrame>

      {proposal.pending.totalCount > 0 ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">
            Faltan espacios para {proposal.pending.totalCount.toLocaleString("es-EC")} participantes
          </p>
          {pendingLabel ? (
            <p className="mt-1 text-xs text-destructive/80">{pendingLabel}</p>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3 text-sm">
          <Badge variant="secondary">Listo</Badge>
          Todos los participantes caben en las compañías actuales.
        </div>
      )}
    </div>
  );
}

export function CompanyDistributionDialog({
  capacity,
  onDistributed,
}: {
  capacity: DistributionCapacity;
  onDistributed?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [youngestFirst, setYoungestFirst] = useState(true);
  const [stakeDiversity, setStakeDiversity] = useState(false);
  const [proposal, setProposal] = useState<DistributionPreview | null>(null);
  const [operation, setOperation] = useState<DistributionOperation>(null);
  const [pending, startTransition] = useTransition();

  function resetPreview() {
    setProposal(null);
    setOperation(null);
  }

  function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOperation("preview");

    startTransition(async () => {
      const direction = youngestFirst
        ? "youngest_to_oldest"
        : "oldest_to_youngest";
      const result = await previewParticipantDistributionAction(
        direction,
        capacity,
        DEFAULT_DISTRIBUTION_STRATEGY,
        stakeDiversity,
      );

      if (!result.success) {
        toast.error(result.message);
        setOperation(null);
        return;
      }

      setProposal(result.proposal);
      setOperation(null);
    });
  }

  function handleSave() {
    if (!proposal) return;

    setOperation("save");
    startTransition(async () => {
      const result = await saveParticipantDistributionAction({
        direction: proposal.direction,
        strategy: proposal.strategy,
        stakeDiversity: proposal.stakeDiversity,
        capacity: {
          female: proposal.limits.femalePerCompany,
          male: proposal.limits.malePerCompany,
        },
        previewKey: proposal.previewKey,
      });

      if (!result.success) {
        toast.error(result.message);
        setOperation(null);
        return;
      }

      toast.success(result.message);
      setOpen(false);
      resetPreview();
      onDistributed?.();
      router.refresh();
    });
  }

  const hasPendingParticipants = (proposal?.pending.totalCount ?? 0) > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) {
          setOpen(nextOpen);
          if (!nextOpen) resetPreview();
        }
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <HugeiconsIcon
          icon={ShuffleSquareIcon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        Distribuir en compañías
      </DialogTrigger>

      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
        showCloseButton={!pending}
      >
        <DialogHeader>
          <DialogTitle>Distribuir participantes</DialogTitle>
          <DialogDescription>
            {proposal
              ? "Revisa los números antes de aplicar la distribución."
              : "Elige cómo ordenar a los participantes y revisa los números antes de distribuir."}
          </DialogDescription>
        </DialogHeader>

        {proposal ? (
          <>
            <DistributionPreview proposal={proposal} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={resetPreview}
              >
                Volver
              </Button>
              <Button
                type="button"
                disabled={
                  pending || hasPendingParticipants || !proposal.canSave
                }
                onClick={handleSave}
              >
                {operation === "save" ? (
                  <Spinner data-icon="inline-start" />
                ) : null}
                {operation === "save" ? "Distribuyendo…" : "Distribuir"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handlePreview}>
            <div className="flex flex-col gap-3">
              <label
                htmlFor="distribution-youngest-first"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
              >
                <Checkbox
                  id="distribution-youngest-first"
                  checked={youngestFirst}
                  onCheckedChange={(checked) =>
                    setYoungestFirst(checked === true)
                  }
                  disabled={pending}
                />
                <span className="text-sm leading-5">Menor a mayor</span>
              </label>

              <label
                htmlFor="distribution-stake-diversity"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
              >
                <Checkbox
                  id="distribution-stake-diversity"
                  checked={stakeDiversity}
                  onCheckedChange={(checked) =>
                    setStakeDiversity(checked === true)
                  }
                  disabled={pending}
                />
                <span className="text-sm leading-5">Uno de cada estaca</span>
              </label>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {operation === "preview" ? (
                  <Spinner data-icon="inline-start" />
                ) : null}
                {operation === "preview" ? "Calculando…" : "Ver distribución"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
