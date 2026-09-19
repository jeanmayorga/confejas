import "server-only";

const ECUADOR_API_BASE_URL = "https://api.ecuadorapi.com/api/v1";
const ECUADOR_API_TIMEOUT_MS = 10_000;

export type EcuadorianCitizen = {
  firstNames: string | null;
  lastNames: string | null;
  birthDate: string | null;
  sex: "Masculino" | "Femenino" | null;
};

export type EcuadorianCitizenSearchResult = {
  id: string;
  fullName: string | null;
  age: number | null;
  deathDate: string | null;
};

export type EcuadorianCitizenLookupResult =
  | { success: true; data: EcuadorianCitizen }
  | { success: false; message: string };

type EcuadorApiEnvelope = {
  data?: unknown;
  error?: unknown;
  code?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized || null;
}

function optionalBirthDate(value: unknown) {
  const birthDate = optionalString(value);

  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return null;
  }

  const date = new Date(`${birthDate}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === birthDate
    ? birthDate
    : null;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function optionalSex(value: unknown): EcuadorianCitizen["sex"] {
  const gender = optionalString(value)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (gender === "male" || gender === "masculino" || gender === "m") {
    return "Masculino";
  }

  if (gender === "female" || gender === "femenino" || gender === "f") {
    return "Femenino";
  }

  return null;
}

function apiErrorMessage(status: number, code: unknown) {
  if (status === 400 || code === "invalid") {
    return "La cédula ingresada no es válida.";
  }

  if (status === 404 || code === "not_found") {
    return "EcuadorAPI no encontró información para esa cédula.";
  }

  if (status === 401 || status === 403) {
    return "EcuadorAPI rechazó la credencial configurada.";
  }

  if (status === 402) {
    return "La cuenta de EcuadorAPI no puede realizar esta consulta.";
  }

  if (status === 429) {
    return "EcuadorAPI recibió demasiadas consultas. Inténtalo nuevamente en unos minutos.";
  }

  return "EcuadorAPI no pudo completar la consulta. Inténtalo nuevamente.";
}

async function readEnvelope(response: Response): Promise<EcuadorApiEnvelope | null> {
  try {
    const payload: unknown = await response.json();
    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
}

export async function lookupEcuadorianCitizen(
  governmentId: string,
): Promise<EcuadorianCitizenLookupResult> {
  const apiKey = process.env.ECUADOR_API_KEY?.trim();

  if (!apiKey) {
    return {
      success: false,
      message: "La consulta de EcuadorAPI no está configurada.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ECUADOR_API_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(
      `${ECUADOR_API_BASE_URL}/cedulas/${encodeURIComponent(governmentId)}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
        signal: controller.signal,
      },
    );
  } catch {
    return {
      success: false,
      message: "No se pudo conectar con EcuadorAPI. Inténtalo nuevamente.",
    };
  } finally {
    clearTimeout(timeout);
  }

  const envelope = await readEnvelope(response);

  if (!response.ok || envelope?.error === true) {
    return {
      success: false,
      message: apiErrorMessage(response.status, envelope?.code),
    };
  }

  if (!isRecord(envelope?.data) || envelope.data.id !== governmentId) {
    return {
      success: false,
      message: "EcuadorAPI devolvió una respuesta que no se pudo verificar.",
    };
  }

  return {
    success: true,
    data: {
      firstNames: optionalString(envelope.data.first_name),
      lastNames: optionalString(envelope.data.last_name),
      birthDate: optionalBirthDate(envelope.data.birth_date),
      sex: optionalSex(envelope.data.gender),
    },
  };
}

export async function searchEcuadorianCitizens({
  givenNames,
  familyNames,
}: {
  givenNames?: string;
  familyNames?: string;
}): Promise<
  | { success: true; data: EcuadorianCitizenSearchResult[] }
  | { success: false; message: string }
> {
  const apiKey = process.env.ECUADOR_API_KEY?.trim();

  if (!apiKey) {
    return {
      success: false,
      message: "La consulta de EcuadorAPI no está configurada.",
    };
  }

  const url = new URL(`${ECUADOR_API_BASE_URL}/cedulas/search`);
  if (givenNames?.trim()) {
    url.searchParams.set("given_names", givenNames.trim());
  }
  if (familyNames?.trim()) {
    url.searchParams.set("family_names", familyNames.trim());
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ECUADOR_API_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    return {
      success: false,
      message: "No se pudo conectar con EcuadorAPI. Inténtalo nuevamente.",
    };
  } finally {
    clearTimeout(timeout);
  }

  const envelope = await readEnvelope(response);

  if (!response.ok || envelope?.error === true) {
    return {
      success: false,
      message: apiErrorMessage(response.status, envelope?.code),
    };
  }

  if (!Array.isArray(envelope?.data)) {
    return {
      success: false,
      message: "EcuadorAPI devolvió una respuesta que no se pudo verificar.",
    };
  }

  return {
    success: true,
    data: envelope.data.flatMap((result) => {
      if (!isRecord(result) || typeof result.id !== "string") {
        return [];
      }

      return [
        {
          id: result.id,
          fullName: optionalString(result.full_name),
          age: optionalNumber(result.age),
          deathDate: optionalString(result.death_date),
        },
      ];
    }),
  };
}
