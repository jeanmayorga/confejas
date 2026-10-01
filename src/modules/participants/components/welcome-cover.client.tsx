"use client";

import { QRCodeSVG } from "qrcode.react";

import {
  getWelcomeName,
  WELCOME_CODE_LABEL,
  WELCOME_FAREWELL,
  WELCOME_HEADING,
  WELCOME_INTRO,
  WELCOME_SUBHEADING,
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
          className="absolute inset-x-0 top-[9.9%] text-center font-bold tracking-[0.1em] whitespace-nowrap"
          style={{ fontSize: "2.2cqw" }}
        >
          CONFERENCIA JAS 2026
        </p>
      </header>

      <h1
        className="absolute left-[8%] w-[84%] text-center font-black leading-[0.95] tracking-tight break-words text-[#155682]"
        style={{
          fontSize: greetingSize,
          top: greeting.length > 28 ? "18.4%" : "20.1%",
          WebkitTextStroke: "0.35px #155682",
        }}
      >
        {greeting}
      </h1>

      <p
        className="absolute top-[26.8%] left-[8%] w-[84%] text-center font-bold text-[#155682]"
        style={{ fontSize: "3.7cqw" }}
      >
        {WELCOME_SUBHEADING}
      </p>

      <p
        className="absolute top-[31.2%] left-[8.2%] w-[83.6%] text-center leading-[1.25]"
        style={{ fontSize: "2.85cqw" }}
      >
        {WELCOME_INTRO}
      </p>

      <div className="absolute top-[41%] left-[27.9%] h-[30.8%] w-[44.2%] rounded-[2.2cqw] border border-[#afd8ea] bg-white">
        <QRCodeSVG
          value={String(participant.sourceRecordId)}
          level="H"
          marginSize={2}
          className="absolute top-[1.8%] left-[2.5%] aspect-square h-auto w-[95%]"
          title={`Código QR de ${participant.firstNames} ${participant.lastNames}`}
        />
      </div>
      <p className="absolute top-[72.4%] inset-x-0 text-center font-bold tracking-[0.12em] text-[#2e75ad]" style={{ fontSize: "1.7cqw" }}>
        {WELCOME_CODE_LABEL}
      </p>
      <p className="absolute top-[74.1%] inset-x-0 text-center font-bold text-[#155682]" style={{ fontSize: "2.5cqw" }}>
        # {participant.sourceRecordId}
      </p>

      <p
        className="absolute top-[77.2%] left-[17.1%] w-[65.5%] text-center leading-[1.2] font-bold whitespace-pre-line text-[#2e75ad]"
        style={{ fontSize: "3cqw" }}
      >
        {WELCOME_FAREWELL}
      </p>
    </article>
  );
}
