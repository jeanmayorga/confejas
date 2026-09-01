const PARTICIPANT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PARTICIPANT_ID_IN_TEXT_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function isParticipantId(value: string) {
  return PARTICIPANT_ID_PATTERN.test(value);
}

export function normalizeParticipantQrValue(value: string) {
  const match = value.trim().match(PARTICIPANT_ID_IN_TEXT_PATTERN);

  return match?.[0].toLowerCase() ?? null;
}
