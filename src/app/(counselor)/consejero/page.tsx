import type { Metadata } from "next";
import Building03Icon from "@hugeicons/core-free-icons/Building03Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Card, CardContent } from "@/components/ui/card";
import { CounselorActivitySpotlight } from "@/modules/counselor-app/components/activity-spotlight.client";
import {
  getCounselorAppContext,
  getCounselorCompanySummary,
} from "@/modules/counselor-app/server/queries";

export const metadata: Metadata = {
  title: "Inicio",
};

export default async function CounselorHomePage() {
  const [{ company, user }, summary] = await Promise.all([
    getCounselorAppContext(),
    getCounselorCompanySummary(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Hola, {user.name}
      </h1>

      <Card className="gap-0 py-0 shadow-none">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HugeiconsIcon icon={Building03Icon} strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Tu compañía
              </p>
              <p className="mt-0.5 truncate text-base font-semibold">
                {company?.name ?? "Sin compañía asignada"}
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.total} {summary.total === 1 ? "participante" : "participantes"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t pt-4">
            <div className="rounded-xl bg-primary/5 px-3 py-2.5">
              <p className="text-xl font-semibold text-primary">{summary.arrived}</p>
              <p className="text-xs text-muted-foreground">Ya llegaron</p>
            </div>
            <div className="rounded-xl bg-muted px-3 py-2.5">
              <p className="text-xl font-semibold">{summary.toArrive}</p>
              <p className="text-xs text-muted-foreground">Por llegar</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <CounselorActivitySpotlight initialNow={new Date().toISOString()} />
    </div>
  );
}
