import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PARTICIPANT_STATUS_OPTIONS } from "@/modules/participants/status";
import { percentage } from "../reports";
import { getHomeReports } from "../server/reports";

const number = new Intl.NumberFormat("es-EC");

function Distribution({
  title,
  description,
  rows,
  total,
}: {
  title: string;
  description: string;
  rows: { label: string; value: number; href?: string }[];
  total: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.label} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4 text-sm">
                {row.href ? (
                  <Link
                    href={row.href}
                    className="underline-offset-4 hover:underline"
                  >
                    {row.label}
                  </Link>
                ) : (
                  <span>{row.label}</span>
                )}
                <span className="shrink-0 tabular-nums">
                  <strong>{number.format(row.value)}</strong>{" "}
                  <span className="text-muted-foreground">
                    · {percentage(row.value, total)}%
                  </span>
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-muted"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${percentage(row.value, total)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay participantes activos para este reporte.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Attendance({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; total: number; arrived: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription>
          Participantes activos y avance de llegada.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {title === "Por estaca" ? "Estaca" : "Compañía"}
              </TableHead>
              <TableHead className="text-right">Activos</TableHead>
              <TableHead className="text-right">Llegaron</TableHead>
              <TableHead className="text-right">Avance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="max-w-64 whitespace-normal font-medium">
                    {row.label}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {number.format(row.total)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {number.format(row.arrived)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {percentage(row.arrived, row.total)}%
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4}>Sin participantes activos.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export async function HomeReports({ name }: { name: string }) {
  const report = await getHomeReports();
  const arrived = report.statusCounts.arrived;
  const metrics = [
    {
      label: "Total de inscritos",
      value: report.total,
      detail: `${number.format(report.statusCounts.cancelled)} cancelados`,
      href: "/dashboard/participants",
    },
    {
      label: "Participantes activos",
      value: report.active,
      detail: "Todos los estados excepto cancelados",
      href: "#estados",
    },
    {
      label: "Ya llegaron",
      value: arrived,
      detail: `${percentage(arrived, report.active)}% de los activos`,
      href: "/dashboard/participants?status=arrived",
    },
    {
      label: "Por llegar",
      value: report.active - arrived,
      detail: "Activos que aún no tienen estado Llegó",
      href: "/dashboard/check-in",
    },
  ];
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <PageHeader
        title="Home"
        description={`Hola, ${name}. Así va la organización de Confejas.`}
        badge={<Badge variant="secondary">Reportes</Badge>}
        actions={
          <Button
            variant="outline"
            render={<Link href="/dashboard/participants" />}
          >
            Ver participantes
          </Button>
        }
      />
      <section
        aria-label="Resumen general"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <Card key={metric.label} size="sm">
            <CardHeader>
              <CardDescription>{metric.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={metric.href}
                className="text-3xl font-semibold tracking-tight tabular-nums underline-offset-4 hover:underline"
              >
                {number.format(metric.value)}
                <span className="sr-only"> {metric.label}</span>
              </Link>
              <p className="mt-2 text-xs text-muted-foreground">
                {metric.detail}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Pendientes de organización</h2>
          </CardTitle>
          <CardDescription>
            Participantes activos que todavía necesitan una asignación.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard/participants?company=unassigned"
            className="flex items-center justify-between gap-4 rounded-lg border p-4 hover:bg-muted"
          >
            <span>Sin compañía</span>
            <strong className="text-xl tabular-nums">
              {number.format(report.withoutCompany)} →
            </strong>
          </Link>
          <Link
            href="/dashboard/lodging"
            className="flex items-center justify-between gap-4 rounded-lg border p-4 hover:bg-muted"
          >
            <span>Sin dormitorio</span>
            <strong className="text-xl tabular-nums">
              {number.format(report.withoutRoom)} →
            </strong>
          </Link>
        </CardContent>
      </Card>
      <div id="estados" className="grid scroll-mt-6 gap-6 lg:grid-cols-2">
        <Distribution
          title="Estado de inscripción"
          description="Distribución sobre el total de registros, incluidos los cancelados."
          total={report.total}
          rows={PARTICIPANT_STATUS_OPTIONS.map(({ value, label }) => ({
            label,
            value: report.statusCounts[value],
            href: `/dashboard/participants?status=${value}`,
          }))}
        />
        <Distribution
          title="Correos de bienvenida"
          description="Cobertura de envío entre participantes activos; enviado no significa entregado."
          total={report.active}
          rows={[
            { label: "Enviados", value: report.emailSent },
            { label: "Pendientes de envío", value: report.emailPending },
            { label: "Sin correo para enviar", value: report.withoutEmail },
          ]}
        />
        <Distribution
          title="Tallas de camiseta"
          description="Cantidades necesarias para participantes activos."
          total={report.active}
          rows={report.shirts}
        />
        <Distribution
          title="Distribución por sexo"
          description="Información registrada de los participantes activos."
          total={report.active}
          rows={report.sexes}
        />
        <Attendance title="Por estaca" rows={report.stakes} />
        <Attendance title="Por compañía" rows={report.companies} />
      </div>
      <p className="text-xs text-muted-foreground">
        Datos consultados al abrir esta página. Activos: todos los registros
        excepto cancelados. Llegadas: participantes con estado «Llegó».
      </p>
    </div>
  );
}
