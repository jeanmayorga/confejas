import Building03Icon from "@hugeicons/core-free-icons/Building03Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { Card, CardContent } from "@/components/ui/card";
import { getCounselorAppContext } from "@/modules/counselor-app/server/queries";

export default async function CounselorHomePage() {
  const { company } = await getCounselorAppContext();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Inicio
      </h1>

      <Card className="gap-0 py-0 shadow-none">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HugeiconsIcon icon={Building03Icon} strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Tu compañía
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold">
              {company?.name ?? "Sin compañía asignada"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
