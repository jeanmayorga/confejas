import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPageSidebar } from "@/modules/dashboard/components/dashboard-page-sidebar.client";

function CompanyCardSkeleton() {
  return (
    <Card className="rounded-none bg-transparent p-0 shadow-none ring-0">
      <CardHeader className="px-0">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-6 w-20" />
      </CardHeader>
      <CardContent className="flex flex-col gap-5 px-0">
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
      className="grid min-h-svh min-w-0 items-start xl:grid-cols-[minmax(0,1fr)_20rem]"
      aria-busy="true"
      aria-label="Actualizando compañías"
    >
      <span className="sr-only">Actualizando compañías…</span>
      <DashboardPageSidebar path="/dashboard/companies">
        <div className="flex flex-col gap-4 p-3">
          <Skeleton className="h-9 w-full" />
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      </DashboardPageSidebar>
      <div className="min-w-0 p-4 sm:p-6 xl:p-8">
        <CompanyCardSkeleton />
      </div>
      <div className="sticky top-0 hidden h-svh min-h-0 flex-col border-l bg-sidebar pt-4 xl:flex">
        <UnassignedParticipantsSkeleton />
      </div>
    </div>
  );
}
