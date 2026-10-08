import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPageSidebar } from "@/modules/dashboard/components/dashboard-page-sidebar.client";

function CompanyCardSkeleton() {
  return (
    <Card className="py-3">
      <CardHeader className="border-b !pb-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-6 w-20" />
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Skeleton className="h-6 w-full rounded-full" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-48 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function UnassignedParticipantsSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      aria-label="Cargando participantes sin compañía"
      aria-busy="true"
    >
      <div className="flex flex-col gap-3 border-b px-3 pb-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="flex flex-col gap-3 p-3">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Actualizando compañías"
    >
      <span className="sr-only">Actualizando compañías…</span>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </header>

      <DashboardPageSidebar path="/dashboard/companies">
        <UnassignedParticipantsSkeleton />
      </DashboardPageSidebar>
      <div className="flex min-w-0 flex-col gap-5">
        <CompanyCardSkeleton />
        <CompanyCardSkeleton />
      </div>
    </div>
  );
}
