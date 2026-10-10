"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { FinalReport } from "../final-report";
import styles from "./final-report.module.css";

const number = new Intl.NumberFormat("es-EC");
const format = (n: number) => number.format(n);
const percent = (n: number, total: number) =>
  format(total ? Math.round((n / total) * 1000) / 10 : 0);
const colors = ["#168478", "#b96b38", "#b8c3cc"];

type Series = { label: string; value: number; color: string };

function Donut({
  rows,
  total,
  center,
  caption,
}: {
  rows: Series[];
  total: number;
  center: string;
  caption: string;
}) {
  return (
    <div className={styles.split}>
      <div className={styles.donut}>
        <svg viewBox="0 0 240 240" aria-hidden="true">
          <circle
            cx="120"
            cy="120"
            r="96"
            fill="none"
            stroke="#e5e9e9"
            strokeWidth="23"
          />
          {rows.map((row, index) => {
            const length = total ? (row.value / total) * 100 : 0;
            const start = total
              ? (rows
                  .slice(0, index)
                  .reduce((sum, item) => sum + item.value, 0) /
                  total) *
                100
              : 0;
            return (
              <circle
                key={row.label}
                cx="120"
                cy="120"
                r="96"
                fill="none"
                stroke={row.color}
                strokeWidth="23"
                pathLength="100"
                strokeDasharray={`${length} ${100 - length}`}
                strokeDashoffset={-start}
                transform="rotate(-90 120 120)"
              />
            );
          })}
        </svg>
        <div className={styles.donutCenter}>
          <strong>{center}</strong>
          <span>{caption}</span>
        </div>
      </div>
      <dl className={styles.legend}>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>
              <i style={{ background: row.color }} aria-hidden="true" />
              {row.label}
            </dt>
            <dd>
              <strong>{format(row.value)}</strong>
              <span>{percent(row.value, total)}% del total</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function AgeChart({ rows, max }: { rows: FinalReport["ages"]; max: number }) {
  return (
    <div
      className={styles.bars}
      role="list"
      aria-label="Participantes por edad"
    >
      {rows.map(({ age, total }) => (
        <div
          key={age}
          className={styles.barRow}
          role="listitem"
          aria-label={`${age} años: ${total} participantes`}
        >
          <span>
            {age} <small>años</small>
          </span>
          <div className={styles.track} aria-hidden="true">
            <div style={{ width: `${(total / max) * 100}%` }} />
          </div>
          <strong>{format(total)}</strong>
        </div>
      ))}
    </div>
  );
}

function CompanyChart({ rows }: { rows: FinalReport["companies"] }) {
  return (
    <div className={styles.companyChart}>
      <p className={styles.chartKey}>
        <span>● Sí</span>
        <span>● No</span>
        <span>● Sin registrar</span>
      </p>
      {rows.map((row) => (
        <div key={row.id} className={styles.companyRow}>
          <div>
            <strong>{row.name}</strong>
            <span>
              {row.total > 0
                ? `${row.yes} sí · ${row.no} no · ${row.unknown} sin registrar`
                : "Sin participantes"}
            </span>
          </div>
          {row.total > 0 ? (
            <div className={styles.companyTrack} aria-hidden="true">
              {[row.yes, row.no, row.unknown].map((value, i) => (
                <span
                  key={i}
                  style={{
                    width: `${(value / row.total) * 100}%`,
                    background: colors[i],
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Slide({
  eyebrow,
  title,
  note,
  children,
  cover = false,
}: {
  eyebrow: string;
  title: string;
  note: string;
  children: ReactNode;
  cover?: boolean;
}) {
  return (
    <section
      className={`${styles.slide} ${cover ? styles.cover : ""}`}
      aria-label={title}
    >
      <header>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2>{title}</h2>
      </header>
      <div className={styles.content}>{children}</div>
      <p className={styles.note}>{note}</p>
    </section>
  );
}

export function FinalReportPresentation({ report }: { report: FinalReport }) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [message, setMessage] = useState("");
  const [refreshing, startRefresh] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const router = useRouter();
  const a = report.attendance;
  const recordedAttendance = a.yes + a.no;
  const m = report.membership;
  const c = report.counselors;
  const registrations = report.registrations;
  const registrationDate = new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    day: "numeric",
    month: "long",
  }).format(new Date(`${registrations.date}T12:00:00-05:00`));
  const date = new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(report.asOf));
  const ageMax = Math.max(1, ...report.ages.map((row) => row.total));
  const ageNote = `Edad al ${report.ageDate.split("-").reverse().join("/")}. ${report.ageUnknown} sin fecha de nacimiento · ${report.ageOutsideRange} fuera de 18–35 años.`;
  const companyPages = Array.from(
    { length: Math.ceil(report.companies.length / 6) },
    (_, i) => report.companies.slice(i * 6, i * 6 + 6),
  );
  const titles = [
    "Resumen",
    "Asistencia final",
    "Membresía",
    "Edades 18–26",
    "Edades 27–35",
    "Consejeros",
    "Registros del check-in",
    ...companyPages.map((_, i) => `Compañías ${i + 1}/${companyPages.length}`),
  ];
  const active = Math.min(index, titles.length - 1);
  function go(delta: number) {
    setIndex(Math.max(0, Math.min(titles.length - 1, active + delta)));
  }

  useEffect(() => {
    function changed() {
      setFullscreen(document.fullscreenElement === root.current);
    }
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);

  async function toggleFullscreen() {
    setMessage("");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.current?.requestFullscreen)
        await root.current.requestFullscreen();
      else
        setMessage(
          "Este navegador no ofrece pantalla completa. Puedes recorrer todas las diapositivas aquí.",
        );
      root.current?.focus();
    } catch {
      setMessage(
        "No se pudo abrir pantalla completa. Puedes recorrer todas las diapositivas aquí.",
      );
    }
  }

  const slides = [
    <Slide
      key="summary"
      eyebrow="CONFEJAS · INFORME FINAL"
      title="Nuestra conferencia, en cifras"
      cover
      note="Participantes: todos los registros, incluidos los cancelados. Consejeros contabilizados por separado."
    >
      <div className={styles.hero}>
        <strong>{format(a.yes)}</strong>
        <span>
          participantes con
          <br />
          asistencia confirmada
        </span>
      </div>
      <dl className={styles.summary}>
        <div>
          <dt>Participantes registrados</dt>
          <dd>{format(report.total)}</dd>
        </div>
        <div>
          <dt>Consejeros registrados</dt>
          <dd>{format(c.total)}</dd>
        </div>
        <div>
          <dt>Compañías</dt>
          <dd>{format(report.companyCount)}</dd>
        </div>
      </dl>
    </Slide>,
    <Slide
      key="attendance"
      eyebrow="01 / PARTICIPACIÓN"
      title="Asistencia final"
      note={`Base: ${recordedAttendance} participantes con respuesta «Asistió: Sí / No» guardada en el perfil.`}
    >
      <Donut
        total={recordedAttendance}
        center={`${percent(a.yes, recordedAttendance)}%`}
        caption="asistió"
        rows={[
          { label: "Sí asistió", value: a.yes, color: colors[0] },
          { label: "No asistió", value: a.no, color: colors[1] },
        ]}
      />
    </Slide>,
    <Slide
      key="membership"
      eyebrow="02 / PARTICIPANTES"
      title="Membresía de la Iglesia"
      note={`Base: los ${report.total} participantes registrados, hayan asistido o no. «Sin dato» se muestra por separado.`}
    >
      <Donut
        total={report.total}
        center={format(m.no)}
        caption="no miembros"
        rows={[
          { label: "Miembros", value: m.yes, color: colors[0] },
          { label: "No miembros", value: m.no, color: colors[1] },
          { label: "Sin dato", value: m.unknown, color: colors[2] },
        ]}
      />
    </Slide>,
    <Slide
      key="ages1"
      eyebrow="03 / DISTRIBUCIÓN POR EDAD"
      title="De 18 a 26 años"
      note={ageNote}
    >
      <AgeChart rows={report.ages.slice(0, 9)} max={ageMax} />
    </Slide>,
    <Slide
      key="ages2"
      eyebrow="04 / DISTRIBUCIÓN POR EDAD"
      title="De 27 a 35 años"
      note={ageNote}
    >
      <AgeChart rows={report.ages.slice(9)} max={ageMax} />
    </Slide>,
    <Slide
      key="counselors"
      eyebrow="05 / EQUIPO"
      title="Consejeros"
      note="Registro de llegada de consejeros. Este dato es independiente de la asistencia final de participantes."
    >
      <Donut
        total={c.total}
        center={format(c.total)}
        caption="registrados"
        rows={[
          {
            label: "Con llegada registrada",
            value: c.arrived,
            color: colors[0],
          },
          {
            label: "Sin llegada registrada",
            value: c.total - c.arrived,
            color: colors[2],
          },
        ]}
      />
      <p className={styles.assignment}>
        {c.assigned} con compañía asignada · {c.total - c.assigned} sin compañía
      </p>
    </Slide>,
    <Slide
      key="registrations"
      eyebrow={`06 / REGISTROS · ${registrationDate.toLocaleUpperCase("es-EC")}`}
      title="Registros creados el día del check-in"
      note={`Base: ${report.total} fichas de participantes. Se cuenta su fecha de creación en hora de Ecuador, no la fecha en que se marcó su llegada.`}
    >
      <Donut
        total={report.total}
        center={format(registrations.onDay)}
        caption={`el ${registrationDate}`}
        rows={[
          {
            label: "Antes del check-in",
            value: registrations.before,
            color: colors[2],
          },
          {
            label: `El ${registrationDate}`,
            value: registrations.onDay,
            color: colors[0],
          },
          {
            label: "Después del check-in",
            value: registrations.after,
            color: colors[1],
          },
        ]}
      />
    </Slide>,
    ...companyPages.map((rows, i) => (
      <Slide
        key={`companies-${i}`}
        eyebrow={`07 / COMPAÑÍAS · ${i + 1} DE ${companyPages.length}`}
        title="Asistencia por compañía"
        note="Cada barra representa el 100% de los participantes de esa compañía. El gris indica únicamente asistencia sin registrar."
      >
        <CompanyChart rows={rows} />
      </Slide>
    )),
  ];

  return (
    <div
      className={styles.report}
      ref={root}
      tabIndex={0}
      aria-label="Presentación del informe final"
      onKeyDown={(event) => {
        if ((event.target as HTMLElement).closest("button, select, input, a"))
          return;
        if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) {
          event.preventDefault();
          go(1);
        }
        if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
          event.preventDefault();
          go(-1);
        }
        if (event.key === "Home") {
          event.preventDefault();
          setIndex(0);
        }
        if (event.key === "End") {
          event.preventDefault();
          setIndex(titles.length - 1);
        }
      }}
    >
      <div className={styles.toolbar}>
        <div>
          <h1>Informe final</h1>
          <p>Datos al {date} · Ecuador</p>
        </div>
        <div className={styles.actions}>
          <button
            disabled={refreshing}
            onClick={() => startRefresh(() => router.refresh())}
          >
            {refreshing ? "Actualizando…" : "Actualizar"}
          </button>
          <button onClick={toggleFullscreen}>
            {fullscreen ? "Salir de pantalla completa" : "Presentar"}
          </button>
        </div>
      </div>
      {message ? (
        <p role="status" className={styles.message}>
          {message}
        </p>
      ) : null}
      <div
        className={styles.stage}
        onTouchStart={(e) => {
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          if (!touch.current) return;
          const dx = e.changedTouches[0].clientX - touch.current.x;
          const dy = e.changedTouches[0].clientY - touch.current.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5)
            go(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
      >
        {slides[active]}
      </div>
      <nav className={styles.navigation} aria-label="Diapositivas">
        <button
          onClick={() => go(-1)}
          disabled={active === 0}
          aria-label="Diapositiva anterior"
        >
          ← <span>Anterior</span>
        </button>
        <label>
          <span className={styles.srOnly}>Ir a diapositiva</span>
          <select
            value={active}
            onChange={(e) => setIndex(Number(e.target.value))}
          >
            {titles.map((title, i) => (
              <option key={title} value={i}>
                {i + 1}. {title}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => go(1)}
          disabled={active === titles.length - 1}
          aria-label="Diapositiva siguiente"
        >
          <span>Siguiente</span> →
        </button>
      </nav>
      <div className={styles.progress} aria-hidden="true">
        <div style={{ width: `${((active + 1) / titles.length) * 100}%` }} />
      </div>
      <p className={styles.source} aria-live="polite">
        {active + 1} / {titles.length} · {titles[active]}
        <span>
          Solo datos sincronizados. Pulsa Actualizar para consultar cambios.
        </span>
      </p>
    </div>
  );
}
