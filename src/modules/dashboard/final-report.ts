export type FinalReportGroup = {
  age: number | null;
  member: boolean | null;
  attended: boolean | null;
  companyId: string | null;
  total: number;
};

export type FinalReportSnapshot = {
  groups: FinalReportGroup[];
  companies: { id: string; name: string }[];
  counselors: { total: number; arrived: number; assigned: number };
  registrations: { date: string; before: number; onDay: number; after: number };
  checkIns: {
    date: string;
    onDay: number;
    otherDays: number;
    notRecorded: number;
  };
  asOf: string;
  ageDate: string;
};

export function buildFinalReport(snapshot: FinalReportSnapshot) {
  const attendance = { yes: 0, no: 0, unknown: 0 };
  const membership = { yes: 0, no: 0, unknown: 0 };
  const ages = Array.from({ length: 18 }, (_, i) => ({
    age: 18 + i,
    total: 0,
  }));
  const companies = new Map(
    snapshot.companies.map((company) => [
      company.id,
      {
        ...company,
        total: 0,
      },
    ]),
  );
  let total = 0,
    ageUnknown = 0,
    ageOutsideRange = 0;
  for (const group of snapshot.groups) {
    const n = group.total;
    total += n;
    const key =
      group.attended === null ? "unknown" : group.attended ? "yes" : "no";
    attendance[key] += n;
    // Every participant breakdown after attendance uses this same cohort.
    if (group.attended !== true) continue;
    membership[
      group.member === null ? "unknown" : group.member ? "yes" : "no"
    ] += n;
    if (group.age === null) ageUnknown += n;
    else if (group.age >= 18 && group.age <= 35)
      ages[group.age - 18].total += n;
    else ageOutsideRange += n;
    const id = group.companyId ?? "unassigned";
    const company = companies.get(id) ?? {
      id,
      name: "Sin compañía",
      total: 0,
    };
    company.total += n;
    companies.set(id, company);
  }
  return {
    total,
    attendance,
    membership,
    ages,
    ageUnknown,
    ageOutsideRange,
    companyCount: snapshot.companies.length,
    companies: [...companies.values()].sort((a, b) =>
      a.id === "unassigned"
        ? 1
        : b.id === "unassigned"
          ? -1
          : a.name
              .replaceAll("#", "")
              .localeCompare(b.name.replaceAll("#", ""), "es", {
                numeric: true,
              }),
    ),
    counselors: snapshot.counselors,
    registrations: snapshot.registrations,
    checkIns: snapshot.checkIns,
    asOf: snapshot.asOf,
    ageDate: snapshot.ageDate,
  };
}

export type FinalReport = ReturnType<typeof buildFinalReport>;
