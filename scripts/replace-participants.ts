import { readFile } from "node:fs/promises";

import { drizzle } from "drizzle-orm/neon-serverless";

import "../env.config";

import { stakes, wards } from "../src/modules/church-units/server/schema";
import { companies } from "../src/modules/companies/server/schema";
import { counselors } from "../src/modules/counselors/server/schema";
import {
  participantMedicalProfiles,
  participants,
} from "../src/modules/participants/server/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

const db = drizzle(databaseUrl, { casing: "snake_case" });

type Cell = string | number | boolean | null;

const expectedHeaders = {
  sourceRecordId: "ID",
  firstNames: "Nombres",
  lastNames: "Apellidos",
  preferredName: "Nombre de preferencia",
  birthDate: "Fecha de Nacimiento",
  sex: "Sexo",
  phone: "Número de celular (incluya el indicador de pais)",
  email: "Correo Electrónico",
  shirtSize: "Elija el tamaño de su camiseta",
  isChurchMember:
    "¿Eres miembro de la iglesia de Jesucristo de los Santos de los Últimos días?",
  stake: "Seleccione su estaca, distrito o misión para ramas de misión",
  ward: "Barrio o Rama",
  bloodType: "Grupo sanguíneo y factor (RH)",
  chronicCondition: "¿Sufres de algún tipo de enfermedad crónica? Cuál es?",
  medicalTreatment: "¿Recibes algún tipo de tratamiento médico?",
  insuranceProvider: "¿Con qué seguro médico cuentas?",
  emergencyContactName: "Nombre y Apellido - Persona de contacto",
  emergencyContactPhone: "Teléfono - Persona de contacto",
} as const;

const canonicalUnitNames = new Map([
  ["la aurora", "La Aurora"],
  ["las orquideas", "Las Orquídeas"],
  ["orquideas", "Orquídeas"],
  ["sin barrio o rama", "Sin barrio o rama"],
  ["villa del rey", "Villa del Rey"],
]);

function text(value: Cell) {
  const normalized = value == null ? "" : String(value).trim();
  return normalized || null;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUnit(value: string) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanStakeName(value: Cell) {
  const original = text(value) ?? "";
  const cleaned = original.replace(/^(?:estaca|distrito|misi[oó]n)\s+/i, "").trim();
  const normalized = normalizeUnit(cleaned);
  const key = normalized === "las orquideas" ? "orquideas" : normalized;

  return {
    key,
    displayName: canonicalUnitNames.get(key) ?? cleaned,
  };
}

function cleanWardName(value: Cell) {
  const original = text(value) ?? "";
  let cleaned = original
    .replace(/^(?:barrios?|ramas?)\s+/i, "")
    .replace(/,?\s+(?:estaca|distrito|misi[oó]n)\b.*$/i, "")
    .trim();
  let key = normalizeUnit(cleaned);

  if (["", "ninguna", "ninguno", "no tengo"].includes(key)) {
    key = "sin barrio o rama";
    cleaned = "Sin barrio o rama";
  }

  if (key === "aurora") key = "la aurora";
  if (key === "de las orquideas") key = "las orquideas";
  if (key === "villas del rey") key = "villa del rey";

  return {
    key,
    displayName: canonicalUnitNames.get(key) ?? cleaned,
  };
}

function slugify(value: string) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function excelDate(value: Cell) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const excelEpoch = Date.UTC(1899, 11, 30);
  return new Date(excelEpoch + value * 86_400_000).toISOString().slice(0, 10);
}

function yesNo(value: Cell) {
  const normalized = normalize(text(value) ?? "");
  if (normalized === "si") return true;
  if (normalized === "no") return false;
  return null;
}

function nullableMedicalText(value: Cell) {
  const original = text(value);
  if (!original) return null;

  const normalized = normalize(original).replace(/[.]/g, "").trim();
  const emptyValues = new Set([
    "-",
    "n/a",
    "na",
    "n/u",
    "nu",
    "no",
    "ninguno",
    "ninguna",
    "con ninguno",
  ]);

  if (
    emptyValues.has(normalized) ||
    normalized.startsWith("no tengo") ||
    normalized.startsWith("ningun")
  ) {
    return null;
  }

  return original;
}

function normalizeBloodType(value: Cell) {
  const original = text(value);
  if (!original) return null;

  const unknown = normalize(original).replace(/[.]/g, "").trim();
  if (
    ["no", "no se", "no lo se", "n/a", "na", "ninguno", "ninguna"].includes(
      unknown,
    ) ||
    unknown.startsWith("desconozco") ||
    unknown.startsWith("no me lo")
  ) {
    return null;
  }

  let bloodType = original
    .toUpperCase()
    .replace(/0/g, "O")
    .replace(/POSITIVO/g, "+")
    .replace(/NEGATIVO/g, "-")
    .replace(/RH/g, "")
    .replace(/\s+/g, "");

  if (/^[+-](O|A|B|AB)$/.test(bloodType)) {
    bloodType = `${bloodType.slice(1)}${bloodType[0]}`;
  }

  return /^(O|A|B|AB)[+-]?$/.test(bloodType) ? bloodType : original;
}

function getWorkbookRows(parsed: unknown) {
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("values" in parsed) ||
    !Array.isArray(parsed.values)
  ) {
    throw new Error("El archivo intermedio no contiene una tabla válida.");
  }

  return parsed.values as Cell[][];
}

function chooseDisplayName(candidates: Map<string, number>) {
  return [...candidates.entries()].sort(
    ([nameA, countA], [nameB, countB]) =>
      countB - countA || nameA.localeCompare(nameB, "es"),
  )[0]?.[0];
}

function limitedText(value: Cell, maxLength: number, label: string, rowNumber: number) {
  const normalized = text(value);
  if (normalized && normalized.length > maxLength) {
    throw new Error(
      `La fila ${rowNumber} excede el máximo de ${maxLength} caracteres en ${label}.`,
    );
  }

  return normalized;
}

function chunks<T>(rows: T[], size: number) {
  return Array.from({ length: Math.ceil(rows.length / size) }, (_, index) =>
    rows.slice(index * size, (index + 1) * size),
  );
}

async function main() {
  const inputPath = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!inputPath) {
    throw new Error(
      "Uso: bun run participants:replace -- <archivo-json-extraído> [--dry-run]",
    );
  }

  const parsed = JSON.parse(await readFile(inputPath, "utf8")) as unknown;
  const [headerRow, ...rows] = getWorkbookRows(parsed);
  if (!headerRow) {
    throw new Error("El listado está vacío.");
  }

  const column = new Map(headerRow.map((header, index) => [String(header), index]));
  for (const header of Object.values(expectedHeaders)) {
    if (!column.has(header)) {
      throw new Error(`Falta una columna requerida: ${header}`);
    }
  }

  const columnIndex = (key: keyof typeof expectedHeaders) =>
    column.get(expectedHeaders[key]) as number;
  const stakeCandidates = new Map<string, Map<string, number>>();
  const wardCandidates = new Map<string, Map<string, number>>();

  const normalizedRows = rows.map((row, index) => {
    const rowNumber = index + 2;
    const sourceRecordId = Number(row[columnIndex("sourceRecordId")]);
    const firstNames = limitedText(
      row[columnIndex("firstNames")],
      160,
      "Nombres",
      rowNumber,
    );
    const lastNames = limitedText(
      row[columnIndex("lastNames")],
      160,
      "Apellidos",
      rowNumber,
    );
    const stake = cleanStakeName(row[columnIndex("stake")]);
    const ward = cleanWardName(row[columnIndex("ward")]);

    if (
      !Number.isSafeInteger(sourceRecordId) ||
      sourceRecordId <= 0 ||
      !firstNames ||
      !lastNames ||
      !stake.key ||
      !ward.key
    ) {
      throw new Error(`La fila ${rowNumber} contiene un ID, nombre o unidad inválido.`);
    }

    const stakeNames = stakeCandidates.get(stake.key) ?? new Map<string, number>();
    stakeNames.set(stake.displayName, (stakeNames.get(stake.displayName) ?? 0) + 1);
    stakeCandidates.set(stake.key, stakeNames);

    const wardKey = `${stake.key}\u0000${ward.key}`;
    const wardNames = wardCandidates.get(wardKey) ?? new Map<string, number>();
    wardNames.set(ward.displayName, (wardNames.get(ward.displayName) ?? 0) + 1);
    wardCandidates.set(wardKey, wardNames);

    return {
      sourceRecordId,
      stakeKey: stake.key,
      wardKey,
      participant: {
        sourceRecordId,
        firstNames,
        lastNames,
        preferredName: limitedText(
          row[columnIndex("preferredName")],
          120,
          "Nombre de preferencia",
          rowNumber,
        ),
        birthDate: excelDate(row[columnIndex("birthDate")]),
        sex: limitedText(row[columnIndex("sex")], 24, "Sexo", rowNumber),
        phone: limitedText(
          row[columnIndex("phone")],
          32,
          "Número de celular",
          rowNumber,
        ),
        email:
          limitedText(
            row[columnIndex("email")],
            254,
            "Correo Electrónico",
            rowNumber,
          )?.toLowerCase() ?? null,
        shirtSize: limitedText(
          row[columnIndex("shirtSize")],
          16,
          "Tamaño de camiseta",
          rowNumber,
        ),
        isChurchMember: yesNo(row[columnIndex("isChurchMember")]),
      },
      medical: {
        bloodType: limitedText(
          normalizeBloodType(row[columnIndex("bloodType")]),
          16,
          "Grupo sanguíneo",
          rowNumber,
        ),
        chronicCondition: nullableMedicalText(row[columnIndex("chronicCondition")]),
        medicalTreatment: nullableMedicalText(row[columnIndex("medicalTreatment")]),
        insuranceProvider: limitedText(
          nullableMedicalText(row[columnIndex("insuranceProvider")]),
          160,
          "Seguro médico",
          rowNumber,
        ),
        emergencyContactName: limitedText(
          row[columnIndex("emergencyContactName")],
          200,
          "Persona de contacto",
          rowNumber,
        ),
        emergencyContactPhone: limitedText(
          row[columnIndex("emergencyContactPhone")],
          32,
          "Teléfono de contacto",
          rowNumber,
        ),
      },
    };
  });

  if (new Set(normalizedRows.map((row) => row.sourceRecordId)).size !== normalizedRows.length) {
    throw new Error("El listado contiene IDs de origen duplicados.");
  }

  const stakeKeys = [...stakeCandidates.keys()].sort();
  const stakeRows = stakeKeys.map((key, index) => ({
    id: index + 1,
    name: chooseDisplayName(stakeCandidates.get(key) as Map<string, number>) as string,
    slug: slugify(key),
  }));
  const stakeIds = new Map(stakeKeys.map((key, index) => [key, index + 1]));
  const wardKeys = [...wardCandidates.keys()].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
  const wardRows = wardKeys.map((key, index) => {
    const [stakeKey, wardKey] = key.split("\u0000");
    const stakeId = stakeIds.get(stakeKey);
    if (!stakeId || !wardKey) {
      throw new Error("No se pudo preparar una unidad de la Iglesia.");
    }

    return {
      id: index + 1,
      stakeId,
      name: chooseDisplayName(wardCandidates.get(key) as Map<string, number>) as string,
      slug: slugify(wardKey),
    };
  });
  const wardIds = new Map(wardKeys.map((key, index) => [key, index + 1]));

  if (dryRun) {
    console.info(
      `Validación completada: ${normalizedRows.length} participantes, ${stakeRows.length} estacas/distritos y ${wardRows.length} barrios/ramas.`,
    );
    return;
  }

  await db.transaction(async (tx) => {
    await tx.delete(participants);
    await tx.delete(counselors);
    await tx.delete(companies);
    await tx.delete(wards);
    await tx.delete(stakes);

    await tx.insert(stakes).values(stakeRows);
    await tx.insert(wards).values(wardRows);

    const importedParticipants = [];
    for (const batch of chunks(normalizedRows, 250)) {
      const values = batch.map((row) => {
        const wardId = wardIds.get(row.wardKey);
        if (!wardId) {
          throw new Error(`No se encontró el barrio o rama del ID ${row.sourceRecordId}.`);
        }

        return { ...row.participant, wardId };
      });
      const inserted = await tx
        .insert(participants)
        .values(values)
        .returning({ id: participants.id, sourceRecordId: participants.sourceRecordId });
      importedParticipants.push(...inserted);
    }

    const participantIds = new Map(
      importedParticipants.map((participant) => [participant.sourceRecordId, participant.id]),
    );
    const medicalRows = normalizedRows.map((row) => {
      const participantId = participantIds.get(row.sourceRecordId);
      if (!participantId) {
        throw new Error(`No se pudo relacionar el perfil médico del ID ${row.sourceRecordId}.`);
      }

      return { participantId, ...row.medical };
    });

    for (const batch of chunks(medicalRows, 250)) {
      await tx.insert(participantMedicalProfiles).values(batch);
    }
  });

  console.info(
    `Reemplazo completado: ${normalizedRows.length} participantes, ${stakeRows.length} estacas/distritos y ${wardRows.length} barrios/ramas.`,
  );
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "La importación no pudo completarse.");
  process.exitCode = 1;
} finally {
  await db.$client.end();
}
