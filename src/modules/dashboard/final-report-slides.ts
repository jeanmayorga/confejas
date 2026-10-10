import type { FinalReport } from "./final-report";

export const reportColors = ["#168478", "#b96b38", "#b8c3cc"];
export const formatReportNumber = (n: number) =>
  new Intl.NumberFormat("es-EC").format(n);
export const reportPercent = (n: number, total: number) =>
  formatReportNumber(total ? Math.round((n / total) * 1000) / 10 : 0);
export type ReportSeries = { label: string; value: number; color: string };
type BaseSlide = {
  key: string;
  label: string;
  eyebrow: string;
  title: string;
  note: string;
};
export type ReportSlide = BaseSlide &
  (
    | {
        kind: "summary";
        total: number;
        stats: { label: string; value: number; detail?: string }[];
      }
    | {
        kind: "donut";
        total: number;
        center: string;
        caption: string;
        rows: ReportSeries[];
      }
    | { kind: "bars"; rows: { label: string; value: number }[]; max: number }
  );

// Shared by the interactive presentation and PDF so both use identical counts,
// denominators, labels and page order.
export function buildFinalReportSlides(report: FinalReport): ReportSlide[] {
  const a = report.attendance;
  const c = report.counselors;
  const m = report.membership;
  const date = new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    day: "numeric",
    month: "long",
  }).format(new Date(`${report.registrations.date}T12:00:00-05:00`));
  const base = `Base: ${a.yes} participantes con «Asistió: Sí».`;
  const ageNote = `Base: ${a.yes} asistentes. Edad al ${report.ageDate.split("-").reverse().join("/")}. ${report.ageUnknown} sin fecha de nacimiento · ${report.ageOutsideRange} fuera de 18–35 años.`;
  const ageMax = Math.max(1, ...report.ages.map((row) => row.total));
  const companyMax = Math.max(1, ...report.companies.map((row) => row.total));
  const stakeMax = Math.max(1, ...report.stakes.map((row) => row.total));
  const stakePages = Math.max(1, Math.ceil(report.stakes.length / 6));
  const companyPages = Math.ceil(report.companies.length / 6);
  const series = (
    label: string,
    value: number,
    color: number,
  ): ReportSeries => ({ label, value, color: reportColors[color] });
  return [
    {
      key: "summary",
      label: "Resumen",
      kind: "summary",
      eyebrow: "CONFEJAS · INFORME FINAL",
      title: "Nuestra conferencia, en cifras",
      note: "El total corresponde a participantes registrados. El equipo de servicio se muestra por separado.",
      total: report.total,
      stats: [
        { label: "Consejeros", value: c.total },
        { label: "Compañías", value: report.companyCount },
        {
          label: "Coordinadores",
          value: 4,
          detail: "2 generales · 2 auxiliares",
        },
        { label: "Logística", value: 8, detail: "jóvenes" },
      ],
    },
    {
      key: "attendance",
      label: "Asistencia final",
      kind: "donut",
      eyebrow: "01 / PARTICIPACIÓN",
      title: "Asistencia final",
      note: `Base: ${a.yes + a.no} participantes con respuesta «Asistió: Sí / No» guardada en el perfil.`,
      total: a.yes + a.no,
      center: `${reportPercent(a.yes, a.yes + a.no)}%`,
      caption: "asistió",
      rows: [series("Sí asistió", a.yes, 0), series("No asistió", a.no, 1)],
    },
    {
      key: "membership",
      label: "Membresía",
      kind: "donut",
      eyebrow: "02 / ASISTENTES",
      title: "Membresía de la Iglesia",
      note: `${base} «Sin dato» se muestra por separado.`,
      total: a.yes,
      center: formatReportNumber(m.no),
      caption: "no miembros",
      rows: [
        series("Miembros", m.yes, 0),
        series("No miembros", m.no, 1),
        series("Sin dato", m.unknown, 2),
      ],
    },
    ...[0, 1].map((i): ReportSlide => ({
      key: `ages${i}`,
      label: i ? "Edades 27–35" : "Edades 18–26",
      kind: "bars",
      eyebrow: `${i + 3 < 10 ? "0" : ""}${i + 3} / DISTRIBUCIÓN POR EDAD`,
      title: i ? "De 27 a 35 años" : "De 18 a 26 años",
      note: ageNote,
      max: ageMax,
      rows: report.ages
        .slice(i * 9, i * 9 + 9)
        .map((row) => ({ label: `${row.age} años`, value: row.total })),
    })),
    {
      key: "counselors",
      label: "Consejeros",
      kind: "donut",
      eyebrow: "05 / EQUIPO",
      title: "Consejeros que asistieron",
      note: `Base: ${c.arrived} consejeros con llegada registrada. Contabilizados por separado de los participantes.`,
      total: c.arrived,
      center: formatReportNumber(c.arrived),
      caption: "asistieron",
      rows: [
        series("Con compañía asignada", c.assigned, 0),
        series("Sin compañía asignada", c.arrived - c.assigned, 2),
      ],
    },
    {
      key: "registrations",
      label: "Registros del check-in",
      kind: "donut",
      eyebrow: `06 / REGISTROS · ${date.toLocaleUpperCase("es-EC")}`,
      title: "Registros creados el día del check-in",
      note: `${base} Se cuenta su fecha de creación en hora de Ecuador, no la fecha en que se marcó su llegada.`,
      total: a.yes,
      center: formatReportNumber(report.registrations.onDay),
      caption: `el ${date}`,
      rows: [
        series("Antes del check-in", report.registrations.before, 2),
        series(`El ${date}`, report.registrations.onDay, 0),
        series("Después del check-in", report.registrations.after, 1),
      ],
    },
    {
      key: "check-ins",
      label: "Llegadas del check-in",
      kind: "donut",
      eyebrow: `07 / LLEGADAS · ${date.toLocaleUpperCase("es-EC")}`,
      title: "Llegadas registradas el día del check-in",
      note: `${base} Llegadas confirmadas en hora de Ecuador; no se guardó si se usó QR, código o búsqueda. No es un conteo de escaneos.`,
      total: a.yes,
      center: formatReportNumber(report.checkIns.onDay),
      caption: `el ${date}`,
      rows: [
        series(`El ${date}`, report.checkIns.onDay, 0),
        series("En otro día", report.checkIns.otherDays, 1),
        series("Sin check-in registrado", report.checkIns.notRecorded, 2),
      ],
    },
    ...Array.from({ length: stakePages }, (_, i): ReportSlide => ({
      key: `stakes${i}`,
      label: `Estacas ${i + 1}/${stakePages}`,
      kind: "bars",
      eyebrow: `08 / ESTACAS · ${i + 1} DE ${stakePages}`,
      title: "Asistentes por estaca",
      note: `${base} Estaca del barrio registrado en cada perfil. Las barras comparten la misma escala.`,
      max: stakeMax,
      rows: report.stakes
        .slice(i * 6, i * 6 + 6)
        .map((row) => ({
          label:
            row.id === null || /^estaca\b/i.test(row.name)
              ? row.name
              : `Estaca ${row.name}`,
          value: row.total,
        })),
    })),
    ...Array.from({ length: companyPages }, (_, i): ReportSlide => ({
      key: `companies${i}`,
      label: `Compañías ${i + 1}/${companyPages}`,
      kind: "bars",
      eyebrow: `09 / COMPAÑÍAS · ${i + 1} DE ${companyPages}`,
      title: "Asistentes por compañía",
      note: `${base} Las barras comparan el número de asistentes en cada compañía con la misma escala.`,
      max: companyMax,
      rows: report.companies
        .slice(i * 6, i * 6 + 6)
        .map((row) => ({ label: row.name, value: row.total })),
    })),
  ];
}
