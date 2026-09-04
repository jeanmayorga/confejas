import { normalizeGovernmentId } from "./identity";

const PARTICIPANT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PARTICIPANT_ID_IN_TEXT_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const QR_VALUE_MAX_LENGTH = 2_048;
const SOURCE_RECORD_ID_PATTERN = /^\d{1,10}$/;
const PARTICIPANT_PATH_SEGMENTS = new Set([
  "check-in",
  "participante",
  "participantes",
  "participant",
  "participants",
  "registro",
]);
const PARTICIPANT_QUERY_PARAMETERS = new Set([
  "cedula",
  "code",
  "codigo",
  "document",
  "documento",
  "governmentid",
  "id",
  "participant",
  "participantid",
  "participante",
  "qr",
  "qrtoken",
  "recordid",
  "sourcerecordid",
  "token",
]);

export type ParticipantQrLookupValue = {
  governmentId: string | null;
  sourceRecordId: number | null;
  uuid: string | null;
};

export function isParticipantId(value: string) {
  return PARTICIPANT_ID_PATTERN.test(value);
}

export function normalizeParticipantQrValue(value: string) {
  const match = value.trim().match(PARTICIPANT_ID_IN_TEXT_PATTERN);

  return match?.[0].toLowerCase() ?? null;
}

function normalizeQrParameterName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function getUrlCandidates(value: string) {
  try {
    const url = new URL(value);
    const candidates: string[] = [];

    for (const [name, candidate] of url.searchParams) {
      if (PARTICIPANT_QUERY_PARAMETERS.has(normalizeQrParameterName(name))) {
        candidates.push(candidate);
      }
    }

    const hash = url.hash.replace(/^#/, "");

    if (hash) {
      const hashParameters = new URLSearchParams(hash);

      for (const [name, candidate] of hashParameters) {
        if (PARTICIPANT_QUERY_PARAMETERS.has(normalizeQrParameterName(name))) {
          candidates.push(candidate);
        }
      }
    }

    const pathSegments = url.pathname.split("/").filter(Boolean);

    for (let index = 0; index < pathSegments.length - 1; index += 1) {
      if (PARTICIPANT_PATH_SEGMENTS.has(pathSegments[index].toLowerCase())) {
        candidates.push(decodeURIComponent(pathSegments[index + 1]));
      }
    }

    return candidates;
  } catch {
    return [];
  }
}

function getLabelledIdentityCandidate(value: string) {
  const match = value.match(
    /(?:c[eé]dula|documento|identificaci[oó]n|c[oó]digo)\s*[:=#-]\s*([a-z0-9][a-z0-9 .-]{3,40})/i,
  );

  return match?.[1]?.trim() ?? null;
}

function normalizeSourceRecordId(value: string) {
  const candidate = value.trim();

  if (!SOURCE_RECORD_ID_PATTERN.test(candidate)) {
    return null;
  }

  const parsed = Number(candidate);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseParticipantQrValue(
  value: string,
): ParticipantQrLookupValue | null {
  const trimmed = value.trim();

  if (!trimmed || trimmed.length > QR_VALUE_MAX_LENGTH) {
    return null;
  }

  const uuid = normalizeParticipantQrValue(trimmed);

  if (uuid) {
    return { uuid, governmentId: null, sourceRecordId: null };
  }

  const candidates = [
    ...getUrlCandidates(trimmed),
    getLabelledIdentityCandidate(trimmed),
    trimmed,
  ].filter((candidate): candidate is string => Boolean(candidate));
  let governmentId: string | null = null;
  let sourceRecordId: number | null = null;

  for (const candidate of candidates) {
    governmentId ??= normalizeGovernmentId(candidate);
    sourceRecordId ??= normalizeSourceRecordId(candidate);

    if (governmentId && sourceRecordId) {
      break;
    }
  }

  if (!governmentId && !sourceRecordId) {
    return null;
  }

  return { uuid: null, governmentId, sourceRecordId };
}
