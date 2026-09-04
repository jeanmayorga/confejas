"use client";

import { type FormEvent, useState, useTransition } from "react";
import AiMagicIcon from "@hugeicons/core-free-icons/AiMagicIcon";
import Briefcase02Icon from "@hugeicons/core-free-icons/Briefcase02Icon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import MapsGlobal01Icon from "@hugeicons/core-free-icons/MapsGlobal01Icon";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

import {
  LODGING_DISTRIBUTION_STRATEGIES,
  type LodgingDistributionStrategy,
} from "../distribution";
import { autoAssignLodgingRoomsAction } from "../server/actions";

type LodgingAutoAssignDialogProps = {
  assignedCount: number;
  registeredCount: number;
};

const strategyOptions = [
  {
    value: "age",
    label: "Por edad",
    description:
      "Coloca juntas a personas de edades parecidas, empezando por las de mayor edad.",
    icon: Calendar03Icon,
  },
  {
    value: "company",
    label: "Por compañía",
    description:
      "Mantiene juntas, en lo posible, a las personas de la misma compañía.",
    icon: Briefcase02Icon,
  },
  {
    value: "stake",
    label: "Por estaca",
    description:
      "Agrupa primero por estaca y luego por barrio para conservar comunidades cercanas.",
    icon: MapsGlobal01Icon,
  },
] satisfies Array<{
  value: LodgingDistributionStrategy;
  label: string;
  description: string;
  icon: typeof Calendar03Icon;
}>;

const DEFAULT_STRATEGY: LodgingDistributionStrategy = "age";

export function LodgingAutoAssignDialog({
  assignedCount,
  registeredCount,
}: LodgingAutoAssignDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [strategy, setStrategy] =
    useState<LodgingDistributionStrategy>(DEFAULT_STRATEGY);
  const [pending, startTransition] = useTransition();

  function handleStrategyChange(values: unknown[]) {
    const nextStrategy = values[0];

    if (
      LODGING_DISTRIBUTION_STRATEGIES.some(
        (candidate) => candidate === nextStrategy,
      )
    ) {
      setStrategy(nextStrategy as LodgingDistributionStrategy);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await autoAssignLodgingRoomsAction(strategy);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);

      if (result.skippedCount > 0) {
        toast.warning(
          `${result.skippedCount.toLocaleString("es-EC")} participante sin sexo registrado quedó pendiente.`,
        );
      }

      if (result.unassignedCount > 0) {
        toast.warning(
          `${result.unassignedCount.toLocaleString("es-EC")} participantes quedaron sin cama por falta de capacidad.`,
        );
      }

      setOpen(false);
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
      <DialogTrigger render={<Button type="button" />}>
        <HugeiconsIcon
          icon={AiMagicIcon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        Organizar dormitorios
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Organizar dormitorios automáticamente</DialogTitle>
          <DialogDescription>
            Elige qué personas quieres mantener juntas. El sistema separará
            siempre a mujeres y varones y llenará una habitación antes de pasar
            a la siguiente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <FieldSet disabled={pending}>
              <FieldLegend>¿Cómo quieres organizarlos?</FieldLegend>
              <FieldDescription>
                Selecciona una de estas tres formas de distribución.
              </FieldDescription>
              <FieldGroup>
                <Field>
                  <ToggleGroup
                    value={[strategy]}
                    onValueChange={handleStrategyChange}
                    orientation="vertical"
                    variant="outline"
                    spacing={2}
                    aria-label="Forma de organizar los dormitorios"
                    className="w-full items-stretch"
                  >
                    {strategyOptions.map((option) => (
                      <ToggleGroupItem
                        key={option.value}
                        value={option.value}
                        className="h-auto w-full justify-start px-4 py-3 text-left whitespace-normal"
                      >
                        <HugeiconsIcon
                          icon={option.icon}
                          strokeWidth={2}
                          data-icon="inline-start"
                        />
                        <span className="flex flex-col gap-0.5">
                          <span>{option.label}</span>
                          <span className="font-normal text-muted-foreground">
                            {option.description}
                          </span>
                        </span>
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </Field>
              </FieldGroup>
            </FieldSet>

            <Field>
              <FieldDescription>
                Hay {registeredCount.toLocaleString("es-EC")} participantes
                registrados y {assignedCount.toLocaleString("es-EC")} tienen
                una cama asignada. Al continuar, las asignaciones actuales se
                reemplazarán con la nueva organización. Quienes no tengan sexo
                registrado quedarán pendientes para asignación manual.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || registeredCount === 0}>
              {pending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <HugeiconsIcon
                  icon={AiMagicIcon}
                  strokeWidth={2}
                  data-icon="inline-start"
                />
              )}
              {pending ? "Organizando…" : "Organizar ahora"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
