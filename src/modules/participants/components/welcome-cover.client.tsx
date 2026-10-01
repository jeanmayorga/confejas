"use client";

import { QRCodeSVG } from "qrcode.react";

import {
  getWelcomeName,
  WELCOME_FAREWELL,
  WELCOME_HEADING,
  WELCOME_INTRO,
  type WelcomeParticipant,
} from "@/modules/participants/welcome";

export function WelcomeCover({
  participant,
}: {
  participant: WelcomeParticipant & { sourceRecordId: number };
}) {
  const name = getWelcomeName(participant);
  const nameSize = `${Math.max(4.3, Math.min(8.7, 132 / (name.length + 4)))}cqw`;

  return (
    <article
      className="relative aspect-[210/297] w-full max-w-[595px] overflow-hidden bg-white text-[#155682] shadow-xl ring-1 ring-black/10"
      style={{ containerType: "inline-size", fontFamily: "Arial, Helvetica, sans-serif" }}
      aria-label={`Bienvenida para ${participant.firstNames} ${participant.lastNames}`}
    >
      <div
        className="absolute inset-x-0 bottom-0 h-[28.75%] bg-size-[100%_100%] bg-no-repeat"
        style={{ backgroundImage: "url('/welcome-footer.png')" }}
        aria-hidden="true"
      />

      <header className="absolute inset-x-0 top-0 h-[26.1%] overflow-hidden bg-[#126ba3] text-white">
        <div
          className="absolute -top-[81%] -right-[24%] aspect-square w-[58%] rounded-full bg-[#4bb7e1]/25"
          aria-hidden="true"
        />
        <p
          className="absolute top-[19.5%] left-[8%] font-bold tracking-[0.1em] whitespace-nowrap"
          style={{ fontSize: "2.2cqw" }}
        >
          CONFERENCIA JAS 2026
        </p>
        <div className="absolute top-[34.5%] left-[8%] h-[0.36cqw] w-[8.7%] bg-[#91d8ee]" aria-hidden="true" />
        <h1
          className="absolute top-[42%] left-[8%] font-bold leading-none whitespace-nowrap"
          style={{ fontSize: "8.6cqw" }}
        >
          {WELCOME_HEADING}
        </h1>
        <p
          className="absolute left-[8%] w-[84%] overflow-hidden font-bold leading-[0.95] break-words"
          style={{ fontSize: nameSize, top: name.length > 26 ? "63%" : "68%" }}
        >
          {name}.
        </p>
      </header>

      <p
        className="absolute top-[29.9%] left-[8.2%] w-[83.6%] leading-[1.25]"
        style={{ fontSize: "3.7cqw" }}
      >
        {WELCOME_INTRO}
      </p>

      <div className="absolute top-[42.05%] left-[8.05%] flex h-[27.9%] w-[83.8%] flex-col items-center justify-center gap-[0.8cqw] rounded-[2.9cqw] border border-[#afd8ea] bg-[#f3faff]">
        <QRCodeSVG
          value={String(participant.sourceRecordId)}
          level="H"
          marginSize={2}
          className="aspect-square h-[81%] w-auto bg-white"
          title={`Código QR de ${participant.firstNames} ${participant.lastNames}`}
        />
        <p className="font-bold text-[#2e75ad]" style={{ fontSize: "2cqw" }}>
          # {participant.sourceRecordId}
        </p>
      </div>

      <p
        className="absolute top-[74%] left-[8.2%] w-[65%] leading-[1.2] font-bold whitespace-pre-line text-[#2e75ad]"
        style={{ fontSize: "3.35cqw" }}
      >
        {WELCOME_FAREWELL}
      </p>
    </article>
  );
}
