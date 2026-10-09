import { redirect } from "next/navigation";
export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; company?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (typeof params.date === "string") query.set("date", params.date);
  if (typeof params.company === "string") query.set("company", params.company);
  redirect(`/asistencia?${query}`);
}
