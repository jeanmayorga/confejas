import type { Metadata, Viewport } from "next";

import { requireCounselorAppSession } from "@/modules/auth/server/session";
import { CounselorBottomNavigation } from "@/modules/counselor-app/components/bottom-navigation.client";

export const metadata: Metadata = {
  title: {
    default: "Consejeros | Confejas",
    template: "%s | Confejas",
  },
  description: "Acompañamiento de participantes de Confejas.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default async function CounselorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCounselorAppSession();

  return (
    <div
      data-counselor-app
      className="min-h-svh bg-background sm:bg-muted/40"
    >
      <div className="mx-auto min-h-svh w-full max-w-xl bg-background sm:border-x sm:shadow-sm">
        <main className="min-h-svh px-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-7">
          {children}
        </main>
        <CounselorBottomNavigation />
      </div>
    </div>
  );
}
