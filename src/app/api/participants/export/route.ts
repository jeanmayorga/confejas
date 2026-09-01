import type { NextRequest } from "next/server";

import { requireParticipantDirectoryAccess } from "@/modules/auth/server/session";
import { listStakes, listWards } from "@/modules/church-units/server/queries";
import { listCompanyOptions } from "@/modules/companies/server/queries";
import { createParticipantsPdf } from "@/modules/participants/server/pdf";
import { listParticipantsForExport } from "@/modules/participants/server/queries";

export const runtime = "nodejs";

function getOptionalNumber(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  await requireParticipantDirectoryAccess();

  const searchParams = request.nextUrl.searchParams;
  const [result, companies, wards, stakes] = await Promise.all([
    listParticipantsForExport({
      search: searchParams.get("q") ?? "",
      sort: searchParams.get("sort") ?? "name",
      companyId: searchParams.get("company") ?? "",
      wardId: getOptionalNumber(searchParams.get("ward")),
      stakeId: getOptionalNumber(searchParams.get("stake")),
    }),
    listCompanyOptions(),
    listWards(),
    listStakes(),
  ]);
  const filters: string[] = [];

  if (result.search) {
    filters.push(`Búsqueda: ${result.search}`);
  }

  if (result.companyId === "unassigned") {
    filters.push("Compañía: Sin asignar");
  } else if (result.companyId) {
    const company = companies.find((item) => item.id === result.companyId);
    filters.push(`Compañía: ${company?.name ?? "Seleccionada"}`);
  }

  if (result.wardId) {
    const ward = wards.find((item) => item.id === result.wardId);
    filters.push(`Barrio: ${ward?.name ?? "Seleccionado"}`);
  }

  if (result.stakeId) {
    const stake = stakes.find((item) => item.id === result.stakeId);
    filters.push(`Estaca: ${stake?.name ?? "Seleccionada"}`);
  }

  const sortLabel =
    result.sort === "age_asc"
      ? "Edad (menor a mayor)"
      : result.sort === "age_desc"
        ? "Edad (mayor a menor)"
        : "Nombres (A-Z)";
  const generatedAt = new Date();
  const pdf = await createParticipantsPdf({
    participants: result.rows,
    generatedAt,
    sortLabel,
    filters,
  });
  const dateLabel = generatedAt.toLocaleDateString("en-CA", {
    timeZone: "America/Guayaquil",
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="participantes-${dateLabel}.pdf"`,
      "Content-Length": String(pdf.byteLength),
      "Content-Type": "application/pdf",
    },
  });
}
