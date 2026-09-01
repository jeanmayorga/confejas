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
};

export function DataPagination({
  basePath,
  page,
  totalPages,
}: DataPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <Pagination className="mx-0 w-auto justify-end">
      <PaginationContent>
        {page > 1 ? (
          <PaginationItem>
            <PaginationPrevious
              href={`${basePath}?page=${page - 1}`}
              text="Anterior"
            />
          </PaginationItem>
        ) : null}
        <PaginationItem>
          <PaginationLink
            href={`${basePath}?page=${page}`}
            isActive
            aria-label={`Página ${page} de ${totalPages}`}
          >
            {page}
          </PaginationLink>
        </PaginationItem>
        {page < totalPages ? (
          <PaginationItem>
            <PaginationNext
              href={`${basePath}?page=${page + 1}`}
              text="Siguiente"
            />
          </PaginationItem>
        ) : null}
      </PaginationContent>
    </Pagination>
  );
}
