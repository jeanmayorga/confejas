import { readFile } from "node:fs/promises";

import { inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import "../env.config";

import { wards } from "../src/modules/church-units/server/schema";
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
  ward: "Barrio o Rama",
  bloodType: "Grupo sanguíneo y factor (RH)",
  chronicCondition: "¿Sufres de algún tipo de enfermedad crónica? Cuál es?",
  medicalTreatment: "¿Recibes algún tipo de tratamiento médico?",
  insuranceProvider: "¿Con qué seguro médico cuentas?",
  emergencyContactName: "Nombre y Apellido - Persona de contacto",
  emergencyContactPhone: "Teléfono - Persona de contacto",
} as const;

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

function normalizeWard(value: Cell) {
  let ward = normalize(text(value) ?? "").replace(/^barrio\s+/, "");

  if (ward === "aurora") ward = "la aurora";
  if (ward === "villas del rey") ward = "villa del rey";

  return ward;
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
  if (["no", "no se", "no lo se", "n/a", "na"].includes(unknown)) {
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

  if (/^(O|A|B|AB)[+-]?$/.test(bloodType)) {
    return bloodType;
  }

  return original;
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

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("Uso: bun run participants:import -- <archivo-json-extraído>");
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
  const wardRows = await db.select({ id: wards.id, name: wards.name }).from(wards);
  const wardIds = new Map(wardRows.map((ward) => [normalizeWard(ward.name), ward.id]));

  const normalizedRows = rows.map((row, index) => {
    const sourceRecordId = Number(row[columnIndex("sourceRecordId")]);
    const firstNames = text(row[columnIndex("firstNames")]);
    const lastNames = text(row[columnIndex("lastNames")]);
    const wardId = wardIds.get(normalizeWard(row[columnIndex("ward")]));

    if (!Number.isSafeInteger(sourceRecordId) || !firstNames || !lastNames || !wardId) {
      throw new Error(`La fila ${index + 2} contiene un ID, nombre o barrio inválido.`);
    }

    return {
      sourceRecordId,
      participant: {
        sourceRecordId,
        firstNames,
        lastNames,
        preferredName: text(row[columnIndex("preferredName")]),
        birthDate: excelDate(row[columnIndex("birthDate")]),
        sex: text(row[columnIndex("sex")]),
        phone: text(row[columnIndex("phone")]),
        email: text(row[columnIndex("email")])?.toLowerCase() ?? null,
        shirtSize: text(row[columnIndex("shirtSize")]),
        isChurchMember: yesNo(row[columnIndex("isChurchMember")]),
        wardId,
      },
      medical: {
        bloodType: normalizeBloodType(row[columnIndex("bloodType")]),
        chronicCondition: nullableMedicalText(row[columnIndex("chronicCondition")]),
        medicalTreatment: nullableMedicalText(row[columnIndex("medicalTreatment")]),
        insuranceProvider: nullableMedicalText(row[columnIndex("insuranceProvider")]),
        emergencyContactName: text(row[columnIndex("emergencyContactName")]),
        emergencyContactPhone: text(row[columnIndex("emergencyContactPhone")]),
      },
    };
  });

  if (new Set(normalizedRows.map((row) => row.sourceRecordId)).size !== normalizedRows.length) {
    throw new Error("El listado contiene IDs de origen duplicados.");
  }

  await db
    .insert(participants)
    .values(normalizedRows.map((row) => row.participant))
    .onConflictDoUpdate({
      target: participants.sourceRecordId,
      set: {
        firstNames: sql.raw('excluded."first_names"'),
        lastNames: sql.raw('excluded."last_names"'),
        preferredName: sql.raw('excluded."preferred_name"'),
        birthDate: sql.raw('excluded."birth_date"'),
        sex: sql`case
          when ${participants.companyId} is null then excluded."sex"
          else ${participants.sex}
        end`,
        phone: sql.raw('excluded."phone"'),
        email: sql.raw('excluded."email"'),
        shirtSize: sql.raw('excluded."shirt_size"'),
        isChurchMember: sql.raw('excluded."is_church_member"'),
        wardId: sql.raw('excluded."ward_id"'),
        updatedAt: new Date(),
      },
    });

  const importedParticipants = await db
    .select({ id: participants.id, sourceRecordId: participants.sourceRecordId })
    .from(participants)
    .where(inArray(participants.sourceRecordId, normalizedRows.map((row) => row.sourceRecordId)));
  const participantIds = new Map(
    importedParticipants.map((participant) => [participant.sourceRecordId, participant.id]),
  );

  const medicalRows = normalizedRows.map((row) => {
    const participantId = participantIds.get(row.sourceRecordId);
    if (!participantId) {
      throw new Error("No se pudo relacionar uno de los perfiles médicos.");
    }

    return { participantId, ...row.medical };
  });

  await db
    .insert(participantMedicalProfiles)
    .values(medicalRows)
    .onConflictDoUpdate({
      target: participantMedicalProfiles.participantId,
      set: {
        bloodType: sql.raw('excluded."blood_type"'),
        chronicCondition: sql.raw('excluded."chronic_condition"'),
        medicalTreatment: sql.raw('excluded."medical_treatment"'),
        insuranceProvider: sql.raw('excluded."insurance_provider"'),
        emergencyContactName: sql.raw('excluded."emergency_contact_name"'),
        emergencyContactPhone: sql.raw('excluded."emergency_contact_phone"'),
        updatedAt: new Date(),
      },
    });

  console.info(`Importación completada: ${normalizedRows.length} participantes procesados.`);
}

try {
  await main();
} catch (error) {
  const cause =
    error instanceof Error && typeof error.cause === "object" && error.cause !== null
      ? (error.cause as { code?: string })
      : null;
  console.error(
    `La importación no pudo completarse${cause?.code ? ` (código ${cause.code})` : ""}.`,
  );
  process.exitCode = 1;
}
