import type { CompanyParticipantFilterValues } from "@/modules/companies/components/company-participant-filters.client";

export const LODGING_PAGE_SIZE = 40;
export type LodgingListInput = {
  page: number;
  search: string;
  filters: CompanyParticipantFilterValues;
};

export function normalizeLodgingPage(page: number) {
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100_000) : 1;
}
