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

import {
  buildFinalReportSlides,
  formatReportNumber as format,
  reportPercent as percent,
  reportColors as colors,
  type ReportSlide,
  type ReportSeries as Series,
} from "../final-report-slides";

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

function AgeChart({
  rows,
  max,
}: {
  rows: Extract<ReportSlide, { kind: "bars" }>["rows"];
  max: number;
}) {
  return (
    <div className={styles.bars} role="list" aria-label="Asistentes por edad">
      {rows.map(({ label, value }) => (
        <div
          key={label}
          className={styles.barRow}
          role="listitem"
          aria-label={`${label}: ${value} asistentes`}
        >
          <span>{label}</span>
          <div className={styles.track} aria-hidden="true">
            <div style={{ width: `${(value / max) * 100}%` }} />
          </div>
          <strong>{format(value)}</strong>
        </div>
      ))}
    </div>
  );
}

function CompanyChart({
  rows,
  max,
}: {
  rows: Extract<ReportSlide, { kind: "bars" }>["rows"];
  max: number;
}) {
  return (
    <div className={styles.companyChart}>
      {rows.map((row) => (
        <div key={row.label} className={styles.companyRow}>
          <div>
            <strong>{row.label}</strong>
            <span>{format(row.value)} asistentes</span>
          </div>
          <div className={styles.companyTrack} aria-hidden="true">
            <span
              style={{
                width: `${(row.value / max) * 100}%`,
                background: colors[0],
              }}
            />
          </div>
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
  const [exporting, setExporting] = useState(false);
  const slideData = buildFinalReportSlides(report);
  const titles = slideData.map((slide) => slide.label);
  const date = new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(report.asOf));

  async function exportPdf() {
    setExporting(true);
    setMessage("");
    try {
      const response = await fetch("/api/reports/final/pdf");
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("application/pdf")
      )
        throw new Error("PDF unavailable");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "confejas-informe-final.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Allow mobile browsers time to start reading the download.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setMessage(
        "No se pudo exportar el PDF. Comprueba tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setExporting(false);
    }
  }
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

  const slides = slideData.map((slide) => (
    <Slide
      key={slide.key}
      eyebrow={slide.eyebrow}
      title={slide.title}
      note={slide.note}
      cover={slide.kind === "summary"}
    >
      {slide.kind === "summary" ? (
        <>
          <div className={styles.hero}>
            <strong>{format(slide.total)}</strong>
            <span>Total de participantes registrados</span>
          </div>
          <dl className={styles.summary}>
            {slide.stats.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>
                  {format(stat.value)}
                  {stat.detail ? <span>{stat.detail}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : slide.kind === "donut" ? (
        <Donut
          rows={slide.rows}
          total={slide.total}
          center={slide.center}
          caption={slide.caption}
        />
      ) : slide.key.startsWith("ages") ? (
        <AgeChart rows={slide.rows} max={slide.max} />
      ) : (
        <CompanyChart rows={slide.rows} max={slide.max} />
      )}
    </Slide>
  ));

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
          <button
            onClick={exportPdf}
            disabled={exporting}
            aria-busy={exporting}
          >
            {exporting ? "Exportando…" : "Exportar PDF"}
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
