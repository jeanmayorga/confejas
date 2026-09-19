import type { Metadata } from "next";

import { requireCounselorAppSession } from "@/modules/auth/server/session";
import { CounselorBottomNavigation } from "@/modules/counselor-app/components/bottom-navigation.client";

export const metadata: Metadata = {
  title: {
    default: "Consejeros | Confejas",
    template: "%s | Confejas",
  },
  description: "Acompañamiento de participantes de Confejas.",
};

export default async function CounselorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCounselorAppSession();

  return (
    <div className="min-h-svh bg-muted/40">
      <div className="mx-auto min-h-svh w-full max-w-xl border-x bg-background shadow-sm">
        <main className="min-h-svh px-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-7">
          {children}
        </main>
        <CounselorBottomNavigation />
      </div>
    </div>
  );
}
