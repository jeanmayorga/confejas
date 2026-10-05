import type { Metadata } from "next";
import Image from "next/image";

import { conferenceDays } from "@/modules/itinerary/schedule";

export const metadata: Metadata = {
  title: "Itinerario | Conferencia JAS 2026",
  description:
    "Consulta el itinerario público de la Conferencia JAS 2026 para participantes.",
};

export default function ItinerarioPage() {
  return (
    <main className="min-h-screen bg-[#edf6fb] text-[#173c59]">
      <header className="relative overflow-hidden bg-gradient-to-br from-[#075584] via-[#086eab] to-[#238dc5] text-white">
        <div aria-hidden="true" className="absolute -right-20 -top-32 h-96 w-96 rounded-full border-[64px] border-white/5" />
        <div aria-hidden="true" className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#75c7eb]/15" />
        <div className="relative mx-auto max-w-5xl px-5 pb-14 pt-8 sm:px-8 sm:pb-16 sm:pt-12">
          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#d9f2ff] sm:text-sm">
              Conferencia JAS 2026
            </p>
            <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-[#e8f7ff] shadow-lg sm:size-28">
              <Image
                src="/logo.png"
                alt="Confía en Cristo"
                width={220}
                height={220}
                className="absolute left-1/2 top-1/2 mt-1 size-[128px] max-w-none -translate-x-1/2 -translate-y-1/2 sm:mt-1.5 sm:size-[180px]"
                priority
              />
            </div>
          </div>
          <h1 className="max-w-2xl text-5xl font-extrabold tracking-tight sm:text-6xl">
            Tu itinerario
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#e4f4fc] sm:text-lg">
            Nos vemos el 9 y el 10 de octubre de 2026. Guarda esta página para
            consultarla cuando la necesites.
          </p>
          <nav aria-label="Ir a un día" className="mt-8 flex flex-wrap gap-3">
            {conferenceDays.map((dia) => (
              <a
                key={dia.id}
                href={`#${dia.id}`}
                className="rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {dia.shortTitle} <span aria-hidden="true">↓</span>
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8 sm:pt-12">
        <div className="space-y-12">
          {conferenceDays.map((dia) => (
            <section
              key={dia.id}
              id={dia.id}
              aria-labelledby={`${dia.id}-title`}
              className="scroll-mt-6"
            >
              <div className="mb-5 border-b border-[#cce3ef] pb-4">
                <h2
                  id={`${dia.id}-title`}
                  className="text-2xl font-extrabold tracking-tight text-[#114d73] sm:text-3xl"
                >
                  {dia.title}
                </h2>
              </div>

              <div className="hidden overflow-hidden rounded-3xl border border-[#d1e6f0] bg-white shadow-[0_12px_40px_rgba(13,90,135,0.08)] lg:block">
                <table className="w-full table-fixed border-collapse text-left">
                  <colgroup>
                    <col className="w-44" />
                    <col />
                    <col className="w-44" />
                  </colgroup>
                  <thead className="bg-[#e7f3fa] text-xs font-bold tracking-[0.12em] uppercase text-[#2877a2]">
                    <tr>
                      <th scope="col" className="px-7 py-4">Horario</th>
                      <th scope="col" className="px-5 py-4">Actividad</th>
                      <th scope="col" className="px-7 py-4">Lugar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dia.activities.map((activity, index) => (
                      <tr key={`${activity.time}-${index}`} className="border-t border-[#e7f0f5]">
                        <td className="px-7 py-4 font-mono text-sm font-semibold tracking-tight text-[#0877ae]">
                          {activity.time}
                        </td>
                        <td className="px-5 py-4 text-base font-semibold leading-6 text-[#1d435e]">
                          {activity.title}
                        </td>
                        <td className="px-7 py-4 text-sm text-[#397395]">
                          {"place" in activity ? activity.place : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ol className="overflow-hidden rounded-3xl border border-[#d1e6f0] bg-white shadow-[0_12px_40px_rgba(13,90,135,0.08)] lg:hidden">
                {dia.activities.map((activity, index) => (
                  <li
                    key={`${activity.time}-${index}`}
                    className="flex flex-col gap-2 border-b border-[#e7f0f5] px-5 py-4 last:border-b-0"
                  >
                    <span className="font-mono text-xs font-semibold tracking-tight text-[#0877ae]">
                      {activity.time}
                    </span>
                    <span className="text-base font-semibold leading-6 text-[#1d435e]">
                      {activity.title}
                    </span>
                    {"place" in activity && (
                      <span className="w-fit rounded-full bg-[#eaf5fb] px-3 py-1 text-xs font-medium text-[#397395]">
                        {activity.place}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>

        <footer className="mt-12 flex flex-col items-center gap-3 border-t border-[#cce3ef] pt-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm font-medium text-[#52778c]">
            Nos alegra compartir esta experiencia contigo.
          </p>
          <span className="text-xs font-bold tracking-[0.14em] uppercase text-[#126b9c]">
            Conferencia JAS 2026
          </span>
        </footer>
      </div>
    </main>
  );
}
