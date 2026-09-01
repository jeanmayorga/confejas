import { requireSession } from "@/modules/auth/server/session";
import { DashboardShell } from "@/modules/dashboard/components/dashboard-shell.client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
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
  );
}
