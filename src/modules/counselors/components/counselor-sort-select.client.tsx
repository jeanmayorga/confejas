"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Field, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

type CounselorSort = "company" | "name";

type CounselorSortSelectProps = {
  sort: CounselorSort;
};

export function CounselorSortSelect({ sort }: CounselorSortSelectProps) {
  const router = useRouter();
  const [selectedSort, setSelectedSort] = useOptimistic(sort);
  const [pending, startTransition] = useTransition();

  function handleSortChange(value: string) {
    const nextSort: CounselorSort = value === "name" ? "name" : "company";

    startTransition(() => {
      setSelectedSort(nextSort);
      router.replace(`/dashboard/counselors?sort=${nextSort}`, {
        scroll: false,
      });
    });
  }

  return (
    <Field className="w-full sm:max-w-xs">
      <FieldLabel htmlFor="counselor-sort">Ordenar por</FieldLabel>
      <NativeSelect
        id="counselor-sort"
        value={selectedSort}
        disabled={pending}
        className="w-full"
        onChange={(event) => handleSortChange(event.currentTarget.value)}
      >
        <NativeSelectOption value="company">Compañía</NativeSelectOption>
        <NativeSelectOption value="name">Nombre</NativeSelectOption>
      </NativeSelect>
    </Field>
  );
}
