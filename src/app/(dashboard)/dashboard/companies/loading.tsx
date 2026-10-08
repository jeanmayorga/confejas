import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardPageSidebar } from "@/modules/dashboard/components/dashboard-page-sidebar.client";

function CompanyCardSkeleton() {
  return (
    <Card className="rounded-none bg-transparent p-0 shadow-none ring-0">
      <CardHeader className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 px-0">
        <Skeleton className="h-8 w-40" />
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <Skeleton className="h-9 min-w-0 flex-1 rounded-full sm:w-60 sm:flex-none" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 px-0">
        <Card size="sm" className="border shadow-none ring-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-5 w-36" />
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-5 sm:gap-8">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="flex flex-col gap-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-1.5 w-full rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-20" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-3">
            {Array.from({ length: 2 }, (_, index) => (
              <Card key={index} size="sm" className="border shadow-none ring-0">
                <CardHeader className="flex flex-row items-center gap-4">
                  <Skeleton className="size-16 shrink-0 rounded-full" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-8 rounded-full" />
          </div>
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
