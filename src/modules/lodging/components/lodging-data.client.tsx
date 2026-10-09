"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LodgingListInput } from "../board-pagination";
import { getUnassignedLodgingPageAction } from "../server/board-actions";
import { Button } from "@/components/ui/button";
import { LODGING_PAGE_SIZE } from "../board-pagination";

export function useDebouncedLodgingSearch(value: string) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), 250);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
}

export function useUnassignedLodgingPage(
  input: LodgingListInput,
  revision: string,
  enabled = true,
) {
  const search = useDebouncedLodgingSearch(input.search);
  const query = useQuery({
    queryKey: ["lodging-unassigned", revision, { ...input, search }],
    queryFn: () => getUnassignedLodgingPageAction({ ...input, search }),
    enabled,
    gcTime: 0,
    retry: false,
  });
  return { ...query, searching: search !== input.search };
}

function subscribeDesktop(callback: () => void) {
  const media = window.matchMedia("(min-width: 1280px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function useLodgingDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia("(min-width: 1280px)").matches,
    () => false,
  );
}

export function LodgingPagination({
  page,
  total,
  disabled,
  onPageChange,
}: {
  page: number;
  total: number;
  disabled: boolean;
  onPageChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / LODGING_PAGE_SIZE));
  return (
    <nav
      aria-label="Páginas de participantes sin alojamiento"
      className="flex items-center justify-between gap-2 border-t px-3 py-2"
    >
      <Button
        size="xs"
        variant="outline"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Anterior
      </Button>
      <span className="text-xs tabular-nums" aria-live="polite">
        {page} / {pages} · {total}
      </span>
      <Button
        size="xs"
        variant="outline"
        disabled={disabled || page >= pages}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente
      </Button>
    </nav>
  );
}
