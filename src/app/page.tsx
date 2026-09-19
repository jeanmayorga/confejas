import { redirect } from "next/navigation";

import { usesCounselorApp } from "@/modules/auth/roles";
import { getSession } from "@/modules/auth/server/session";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  redirect(usesCounselorApp(session.user.role) ? "/consejero" : "/dashboard");
}
