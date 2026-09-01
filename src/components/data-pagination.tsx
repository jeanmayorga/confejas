import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type DataPaginationProps = {
  basePath: string;
  page: number;
  totalPages: number;
  query?: Record<string, string | undefined>;
};

export function DataPagination({
  basePath,
  page,
  totalPages,
  query = {},
}: DataPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  function getHref(targetPage: number) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
      if (value) {
        params.set(key, value);
      }
    }

    params.set("page", String(targetPage));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <Pagination className="mx-0 w-auto justify-end">
      <PaginationContent>
        {page > 1 ? (
          <PaginationItem>
            <PaginationPrevious
              href={getHref(page - 1)}
              text="Anterior"
            />
          </PaginationItem>
        ) : null}
        <PaginationItem>
          <PaginationLink
            href={getHref(page)}
            isActive
            aria-label={`Página ${page} de ${totalPages}`}
          >
            {page}
          </PaginationLink>
        </PaginationItem>
        {page < totalPages ? (
          <PaginationItem>
            <PaginationNext
              href={getHref(page + 1)}
              text="Siguiente"
            />
          </PaginationItem>
        ) : null}
      </PaginationContent>
    </Pagination>
  );
}
