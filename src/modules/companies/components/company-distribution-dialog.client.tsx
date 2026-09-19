"use client";

import { type FormEvent, useState, useTransition } from "react";
import ShuffleSquareIcon from "@hugeicons/core-free-icons/ShuffleSquareIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  DEFAULT_DISTRIBUTION_STRATEGY,
  type DistributionCapacity,
} from "@/modules/companies/distribution";
import {
  previewParticipantDistributionAction,
  saveParticipantDistributionAction,
} from "@/modules/companies/server/actions";

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
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const direction = youngestFirst
        ? "youngest_to_oldest"
        : "oldest_to_youngest";
      const preview = await previewParticipantDistributionAction(
        direction,
        capacity,
        DEFAULT_DISTRIBUTION_STRATEGY,
        stakeDiversity,
      );

      if (!preview.success) {
        toast.error(preview.message);
        return;
      }

      if (preview.proposal.pending.totalCount > 0) {
        toast.error(
          `${preview.proposal.pending.totalCount.toLocaleString("es-EC")} participantes no tienen espacio disponible. Crea más compañías antes de distribuir.`,
        );
        return;
      }

      const result = await saveParticipantDistributionAction({
        direction: preview.proposal.direction,
        strategy: preview.proposal.strategy,
        stakeDiversity: preview.proposal.stakeDiversity,
        capacity: {
          female: preview.proposal.limits.femalePerCompany,
          male: preview.proposal.limits.malePerCompany,
        },
        previewKey: preview.proposal.previewKey,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);
      onDistributed?.();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) {
          setOpen(nextOpen);
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

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Distribuir participantes</DialogTitle>
          <DialogDescription>
            Elige cómo ordenar y distribuir los participantes entre las
            compañías existentes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
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
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending ? "Distribuyendo…" : "Distribuir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
