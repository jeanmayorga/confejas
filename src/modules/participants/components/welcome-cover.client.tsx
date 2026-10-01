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

      <header className="absolute inset-x-0 top-0 h-[29.8%] overflow-hidden text-white">
        <svg
          className="absolute inset-0 size-full"
          viewBox="0 0 595 251"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="#126ba3" d="M0 0h595v251H0z" />
          <path fill="#73c8ed" d="M0 200C115 191 212 217 323 201S509 201 595 208V251H0Z" />
          <path fill="#2e8dca" d="M0 213C129 228 226 200 336 220S505 210 595 220V251H0Z" />
          <path fill="#43aee0" d="M0 225C126 215 222 248 350 230S527 230 595 232V251H0Z" />
          <path fill="#ffffff" d="M0 240C140 233 213 258 340 242S511 248 595 238V251H0Z" />
        </svg>
        <p
          className="absolute top-[17.1%] left-[8%] font-bold tracking-[0.1em] whitespace-nowrap"
          style={{ fontSize: "2.2cqw" }}
        >
          CONFERENCIA JAS 2026
        </p>
        <div className="absolute top-[30.3%] left-[8%] h-[0.36cqw] w-[8.7%] bg-[#91d8ee]" aria-hidden="true" />
        <h1
          className="absolute top-[36.3%] left-[8%] font-bold leading-none whitespace-nowrap"
          style={{ fontSize: "8.6cqw" }}
        >
          {WELCOME_HEADING}
        </h1>
        <p
          className="absolute left-[8%] w-[84%] overflow-hidden font-bold leading-[0.95] break-words"
          style={{ fontSize: nameSize, top: name.length > 26 ? "56%" : "60%" }}
        >
          {name}.
        </p>
      </header>

      <p
        className="absolute top-[32.1%] left-[8.2%] w-[83.6%] leading-[1.25]"
        style={{ fontSize: "3.7cqw" }}
      >
        {WELCOME_INTRO}
      </p>

      <div className="absolute top-[40.4%] left-[29.75%] h-[28.25%] w-[40.5%] rounded-[2.2cqw] border border-[#afd8ea] bg-white">
        <QRCodeSVG
          value={String(participant.sourceRecordId)}
          level="H"
          marginSize={2}
          className="absolute inset-[5%] size-[90%]"
          title={`Código QR de ${participant.firstNames} ${participant.lastNames}`}
        />
      </div>
      <p
        className="absolute top-[69.9%] inset-x-0 text-center font-bold text-[#2e75ad]"
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
