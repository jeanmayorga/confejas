"use client";

import { QRCodeSVG } from "qrcode.react";

import {
  getWelcomeHeading,
  getWelcomeName,
  WELCOME_FAREWELL,
  WELCOME_INTRO,
  type WelcomeParticipant,
} from "@/modules/participants/welcome";

export function WelcomeCover({
  participant,
}: {
  participant: WelcomeParticipant & { sourceRecordId: number };
}) {
  const name = getWelcomeName(participant);
  const heading = getWelcomeHeading(participant.sex);
  const headingSize = heading.length > 15 ? "8.6cqw" : "12.5cqw";
  const nameSize = `${Math.max(3.1, Math.min(5.7, 150 / (name.length + 1)))}cqw`;

  return (
    <article
      className="relative aspect-[210/297] w-full max-w-[595px] overflow-hidden bg-white text-[#2e75ad] shadow-xl ring-1 ring-black/10"
      style={{ containerType: "inline-size", fontFamily: "Arial, Helvetica, sans-serif" }}
      aria-label={`Bienvenida para ${participant.firstNames} ${participant.lastNames}`}
    >
      <div
        className="absolute inset-x-0 bottom-0 h-[28.75%] bg-size-[100%_100%] bg-no-repeat"
        style={{ backgroundImage: "url('/welcome-footer.png')" }}
        aria-hidden="true"
      />

      <p className="absolute top-[4.9%] left-[6.55%] font-bold leading-none whitespace-nowrap" style={{ fontSize: "5.2cqw" }}>
        CONFERENCIA JAS 2026
      </p>
      <h1
        className="absolute top-[10.7%] left-[5%] font-bold leading-none whitespace-nowrap"
        style={{ fontSize: headingSize }}
      >
        {heading}
      </h1>
      <p
        className="absolute top-[21.25%] left-[6.55%] max-w-[87%] overflow-hidden font-bold leading-none whitespace-nowrap"
        style={{ fontSize: nameSize }}
      >
        {name},
      </p>
      <p
        className="absolute top-[26.6%] left-[6.55%] w-[87%] whitespace-pre-line leading-[1.2]"
        style={{ fontSize: "4.85cqw" }}
      >
        {WELCOME_INTRO}
      </p>

      <div className="absolute top-[38%] left-[28.15%] aspect-square w-[43.7%] bg-white">
        <QRCodeSVG
          value={String(participant.sourceRecordId)}
          level="H"
          marginSize={2}
          className="size-full"
          title={`Código QR de ${participant.firstNames} ${participant.lastNames}`}
        />
      </div>
      <p className="absolute top-[69.5%] inset-x-0 text-center font-bold" style={{ fontSize: "clamp(10px, 2cqw, 12px)" }}>
        # {participant.sourceRecordId}
      </p>
      <p
        className="absolute top-[73.1%] inset-x-[11%] text-center leading-[1.2] whitespace-pre-line"
        style={{ fontSize: "4cqw" }}
      >
        {WELCOME_FAREWELL}
      </p>
    </article>
  );
}
