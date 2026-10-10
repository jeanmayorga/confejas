import { requireDashboardSession } from "@/modules/auth/server/session";
import { AttendanceQueueProvider } from "@/modules/attendance/components/attendance-queue-provider.client";
import { DashboardShell } from "@/modules/dashboard/components/dashboard-shell.client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireDashboardSession();

  return (
    <AttendanceQueueProvider key={session.user.id} ownerId={session.user.id}>
      <DashboardShell
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          role: session.user.role,
        }}
      >
        {children}
      </DashboardShell>
    </AttendanceQueueProvider>
  );
}
