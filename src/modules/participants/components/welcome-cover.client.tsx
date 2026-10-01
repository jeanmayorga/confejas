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
  const greeting = `${WELCOME_HEADING} ${name}.`;
  const greetingSize = `${Math.max(4.3, Math.min(8, 170 / (greeting.length + 4)))}cqw`;

  return (
    <article
      className="relative aspect-[210/297] w-full max-w-[595px] overflow-hidden bg-white text-[#155682] shadow-xl ring-1 ring-black/10"
      style={{ containerType: "inline-size", fontFamily: "Arial, Helvetica, sans-serif" }}
      aria-label={`Invitación para ${participant.firstNames} ${participant.lastNames}`}
    >
      <div
        className="absolute inset-x-0 bottom-0 h-[28.75%] bg-size-[100%_100%] bg-no-repeat"
        style={{ backgroundImage: "url('/welcome-footer.png')" }}
        aria-hidden="true"
      />

      <header className="absolute inset-x-0 top-0 h-[28.75%] text-white">
        <div
          className="absolute inset-0 bg-size-[100%_100%] bg-no-repeat"
          style={{ backgroundImage: "url('/welcome-header.png')" }}
          aria-hidden="true"
        />
        <p
          className="absolute top-[9.9%] left-[8%] font-bold tracking-[0.1em] whitespace-nowrap"
          style={{ fontSize: "2.2cqw" }}
        >
          CONFERENCIA JAS 2026
        </p>
      </header>

      <h1
        className="absolute top-[21.5%] left-[8%] w-[84%] font-black leading-[0.95] tracking-tight break-words text-[#155682]"
        style={{ fontSize: greetingSize, WebkitTextStroke: "0.35px #155682" }}
      >
        {greeting}
      </h1>

      <p
        className="absolute top-[32.1%] left-[8.2%] w-[83.6%] leading-[1.25]"
        style={{ fontSize: "3.7cqw" }}
      >
        {WELCOME_INTRO}
      </p>

      <div className="absolute top-[39.8%] left-[27.9%] h-[30.8%] w-[44.2%] rounded-[2.2cqw] border border-[#afd8ea] bg-white">
        <QRCodeSVG
          value={String(participant.sourceRecordId)}
          level="H"
          marginSize={2}
          className="absolute top-[4.5%] left-[5%] aspect-square h-auto w-[90%]"
          title={`Código QR de ${participant.firstNames} ${participant.lastNames}`}
        />
      </div>
      <p
        className="absolute top-[71%] inset-x-0 text-center font-bold text-[#2e75ad]"
        style={{ fontSize: "2cqw" }}
      >
        # {participant.sourceRecordId}
      </p>

      <p
        className="absolute top-[74%] left-[8.2%] w-[65%] leading-[1.2] font-bold whitespace-pre-line text-[#2e75ad]"
        style={{ fontSize: "3.35cqw" }}
      >
        {WELCOME_FAREWELL}
      </p>
    </article>
  );
}
