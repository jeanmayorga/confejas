"use client";

import {
  type DragEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  type InfiniteData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Building03Icon from "@hugeicons/core-free-icons/Building03Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import DragDropVerticalIcon from "@hugeicons/core-free-icons/DragDropVerticalIcon";
import MoreHorizontalIcon from "@hugeicons/core-free-icons/MoreHorizontalIcon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DashboardPageSidebar } from "@/modules/dashboard/components/dashboard-page-sidebar.client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { CompanyUnassignedSidebar } from "./company-unassigned-sidebar.client";
import { CompanyActionsMenu } from "./company-actions-menu.client";
import {
  CompanyParticipantFilters,
  DEFAULT_COMPANY_PARTICIPANT_FILTERS,
  type CompanyParticipantFilterValues,
} from "./company-participant-filters.client";
import { CounselorAvatarImage } from "@/modules/counselors/components/counselor-avatar-image";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
} from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getParticipantInitials } from "@/modules/participants/components/participant-details.client";
import {
  UnassignedStatusFilter,
  type UnassignedStatusFilterValue,
} from "@/modules/participants/components/unassigned-status-filter.client";
import {
  getParticipantStatusLabel,
  type ParticipantStatus,
} from "@/modules/participants/status";
import { getCompanyDisplayName } from "@/modules/companies/company-label";
import { getCompanyMoveUnavailableReason } from "@/modules/companies/company-move-options";
import { sortParticipantsByName } from "@/modules/companies/participant-order";
import { CompanyCapacityDialog } from "@/modules/companies/components/company-capacity-dialog.client";
import { CreateCompanyButton } from "@/modules/companies/components/create-company-button.client";
import { CompanyDistributionDialog } from "@/modules/companies/components/company-distribution-dialog.client";
import {
  FEMALE_PARTICIPANT_SEX,
  MALE_PARTICIPANT_SEX,
  type DistributionCapacity,
} from "@/modules/companies/distribution";
import { moveCompanyParticipantsAction } from "@/modules/companies/server/participant-management";
import type {
  CompanyCounselor,
  CompanyListItem,
  CompanyParticipant,
} from "@/modules/companies/server/queries";

export type CompanyDirectoryItem = CompanyListItem;

type CompaniesDirectoryProps = {
  companies: CompanyDirectoryItem[];
  canDelete: boolean;
  capacity: DistributionCapacity;
};

type UnassignedParticipantsPage = {
  rows: CompanyParticipant[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  search: string;
  status: UnassignedStatusFilterValue | null;
};

type DraggedCompanyParticipant = {
  participantId: string;
  companyId: string | null;
  name: string;
  participant: CompanyParticipant;
};

type DraggedCompanyParticipants = {
  source: "company" | "unassigned";
  participants: DraggedCompanyParticipant[];
};

type PendingCompanyMove = DraggedCompanyParticipants & {
  id: number;
  targetCompanyId: string | null;
};

type RequestedCompanyAssignmentChange = {
  participantId: string;
  sourceCompanyId: string;
  targetCompanyId: string | null;
};

const participantStatusClassNames = {
  registered: "bg-muted text-muted-foreground",
  confirmed: "bg-participant-confirmed/10 text-participant-confirmed",
  arrived: "bg-participant-arrived/10 text-participant-arrived",
  cancelled: "bg-participant-cancelled/10 text-participant-cancelled",
  pending: "bg-participant-pending/10 text-participant-pending",
} satisfies Record<ParticipantStatus, string>;

function getParticipantName(participant: CompanyParticipant) {
  return `${participant.firstNames} ${participant.lastNames}`.trim();
}

const surnamePrefixes = new Set(["de", "del", "la", "las", "los", "san", "santa"]);

function getShortParticipantName(participant: CompanyParticipant) {
  const firstName = participant.firstNames.trim().split(/\s+/)[0];
  const surnames = participant.lastNames.trim().split(/\s+/).filter(Boolean);
  let surnameLength = 1;
  while (
    surnameLength < surnames.length &&
    surnamePrefixes.has(surnames[surnameLength - 1].toLocaleLowerCase("es"))
  ) {
    surnameLength += 1;
  }

  return [firstName, ...surnames.slice(0, surnameLength)]
    .filter(Boolean)
    .map((part, index) => {
      const lower = part.toLocaleLowerCase("es");
      if (index > 0 && surnamePrefixes.has(lower)) return lower;
      return lower.replace(
        /(^|[-'])(\p{L})/gu,
        (_, separator: string, letter: string) =>
          `${separator}${letter.toLocaleUpperCase("es")}`,
      );
    })
    .join(" ");
}

function getParticipantAge(age: number | null) {
  return age === null ? "Edad no registrada" : `${age} años`;
}

function getCounselorInitials(counselor: CompanyCounselor) {
  const firstNames = counselor.firstNames?.trim();
  const lastNames = counselor.lastNames?.trim();

  if (firstNames && lastNames) {
    return getParticipantInitials(firstNames, lastNames);
  }

  const nameParts = counselor.name.trim().split(/\s+/);
  return `${nameParts[0]?.charAt(0) ?? "C"}${
    nameParts.length > 1 ? (nameParts.at(-1)?.charAt(0) ?? "") : ""
  }`.toLocaleUpperCase("es");
}

function getParticipantSexLabel(value: string | null) {
  if (value === FEMALE_PARTICIPANT_SEX) {
    return "Mujer";
  }

  if (value === MALE_PARTICIPANT_SEX) {
    return "Hombre";
  }

  return value?.trim() || "Sexo no registrado";
}

function getParticipantCounts(participants: CompanyParticipant[]) {
  let female = 0;
  let male = 0;
  let unsupported = 0;

  for (const participant of participants) {
    if (participant.sex === FEMALE_PARTICIPANT_SEX) {
      female += 1;
    } else if (participant.sex === MALE_PARTICIPANT_SEX) {
      male += 1;
    } else {
      unsupported += 1;
    }
  }

  return { female, male, unsupported, total: participants.length };
}

function applyPendingCompanyMove(
  companies: CompanyDirectoryItem[],
  move: PendingCompanyMove,
  capacity: DistributionCapacity,
) {
  const sourceParticipantIdsByCompany = new Map<string, Set<string>>();

  for (const participant of move.participants) {
    if (!participant.companyId) continue;

    const ids =
      sourceParticipantIdsByCompany.get(participant.companyId) ?? new Set();
    ids.add(participant.participantId);
    sourceParticipantIdsByCompany.set(participant.companyId, ids);
  }

  return companies.map((company) => {
    const sourceParticipantIds = sourceParticipantIdsByCompany.get(company.id);
    const incomingParticipants =
      move.targetCompanyId === company.id
        ? move.participants.map(({ participant }) => participant)
        : [];

    if (!sourceParticipantIds && incomingParticipants.length === 0) {
      return company;
    }

    const nextParticipants = sourceParticipantIds
      ? company.participants.filter(
          (participant) => !sourceParticipantIds.has(participant.id),
        )
      : [...company.participants];
    const nextParticipantIds = new Set(
      nextParticipants.map((participant) => participant.id),
    );

    for (const participant of incomingParticipants) {
      if (!nextParticipantIds.has(participant.id)) {
        nextParticipants.push(participant);
        nextParticipantIds.add(participant.id);
      }
    }

    const orderedParticipants = sortParticipantsByName(nextParticipants);
    const counts = getParticipantCounts(orderedParticipants);

    return {
      ...company,
      participants: orderedParticipants,
      participantCount: counts.total,
      femaleCount: counts.female,
      maleCount: counts.male,
      unsupportedSexCount: counts.unsupported,
      remainingCapacity: Math.max(
        0,
        capacity.female + capacity.male - counts.total,
      ),
      remainingFemaleCapacity: Math.max(0, capacity.female - counts.female),
      remainingMaleCapacity: Math.max(0, capacity.male - counts.male),
    };
  });
}

function isPendingMoveReflected(
  companies: CompanyDirectoryItem[],
  move: PendingCompanyMove,
) {
  if (move.targetCompanyId) {
    const targetCompany = companies.find(
      (company) => company.id === move.targetCompanyId,
    );

    return (
      targetCompany !== undefined &&
      move.participants.every(({ participantId }) =>
        targetCompany.participants.some(
          (participant) => participant.id === participantId,
        ),
      )
    );
  }

  return move.participants.every(({ participantId, companyId }) => {
    const sourceCompany = companies.find((company) => company.id === companyId);

    return !sourceCompany?.participants.some(
      (participant) => participant.id === participantId,
    );
  });
}

function matchesParticipantSearch(
  participant: CompanyParticipant,
  search: string,
) {
  const normalizedSearch = search.trim().toLocaleLowerCase("es");

  return (
    normalizedSearch.length === 0 ||
    getParticipantName(participant)
      .toLocaleLowerCase("es")
      .includes(normalizedSearch)
  );
}

function normalizeParticipantName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

export function CompaniesDirectory({
  companies,
  canDelete,
  capacity,
}: CompaniesDirectoryProps) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const normalizedParticipantSearch = normalizeParticipantName(participantSearch);
  const hasParticipantSearch = normalizedParticipantSearch.length > 0;

  // Each visit starts at the first company, including old bookmarked selections.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("company")) {
      url.searchParams.delete("company");
      window.history.replaceState(
        null,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
  }, []);
  const queryClient = useQueryClient();
  const [draggedParticipant, setDraggedParticipant] =
    useState<DraggedCompanyParticipants | null>(null);
  const [
    selectedUnassignedParticipantIds,
    setSelectedUnassignedParticipantIds,
  ] = useState<ReadonlySet<string>>(new Set());
  const [isUnassignedDropTarget, setIsUnassignedDropTarget] = useState(false);
  const [companyDropTargetId, setCompanyDropTargetId] = useState<string | null>(
    null,
  );
  const [pendingCompanyMoves, setPendingCompanyMoves] = useState<
    PendingCompanyMove[]
  >([]);
  const nextPendingMoveIdRef = useRef(0);
  const [moving, setMoving] = useState(false);
  const [requestedChange, setRequestedChange] =
    useState<RequestedCompanyAssignmentChange | null>(null);
  const [refreshing, startTransition] = useTransition();
  const dragDisabled = moving || refreshing;
  const draggedParticipantIds = useMemo(
    () =>
      new Set(
        draggedParticipant?.participants.map(
          ({ participantId }) => participantId,
        ),
      ),
    [draggedParticipant],
  );
  const displayedCompanies = useMemo(
    () =>
      pendingCompanyMoves.reduce(
        (currentCompanies, move) =>
          isPendingMoveReflected(currentCompanies, move)
            ? currentCompanies
            : applyPendingCompanyMove(currentCompanies, move, capacity),
        companies,
      ),
    [capacity, companies, pendingCompanyMoves],
  );
  const companySearchResults = useMemo(() => {
    const terms = normalizedParticipantSearch.split(/\s+/).filter(Boolean);

    return displayedCompanies
      .map((company, index) => ({
        company,
        position: index + 1,
        participants: terms.length
          ? company.participants.filter((participant) => {
              const name = normalizeParticipantName(
                getParticipantName(participant),
              );
              return terms.every((term) => name.includes(term));
            })
          : company.participants,
      }))
      .filter((result) => !terms.length || result.participants.length > 0);
  }, [displayedCompanies, normalizedParticipantSearch]);
  const activeResult =
    companySearchResults.find(({ company }) => company.id === activeCompanyId) ??
    companySearchResults[0];
  const activeCompany = activeResult?.company;

  function selectCompany(companyId: string) {
    setActiveCompanyId(companyId);
    setOpenMobile(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  const requestedSource = displayedCompanies.find(
    (company) => company.id === requestedChange?.sourceCompanyId,
  );
  const requestedParticipant = requestedSource?.participants.find(
    (participant) => participant.id === requestedChange?.participantId,
  );
  const requestedTarget = displayedCompanies.find(
    (company) => company.id === requestedChange?.targetCompanyId,
  );
  const requestedSourceLabel = requestedSource
    ? getCompanyDisplayName(
        requestedSource.name,
        displayedCompanies.indexOf(requestedSource) + 1,
      )
    : "su compañía";
  const requestedTargetLabel = requestedTarget
    ? getCompanyDisplayName(
        requestedTarget.name,
        displayedCompanies.indexOf(requestedTarget) + 1,
      )
    : "la compañía elegida";
  const requestedChangeUnavailableReason = !requestedChange
    ? null
    : !requestedParticipant ||
        (requestedChange.targetCompanyId !== null && !requestedTarget)
      ? "La asignación cambió. Cierra esta ventana y vuelve a intentarlo."
      : requestedTarget
        ? getCompanyMoveUnavailableReason(
            requestedChange.sourceCompanyId,
            requestedParticipant.sex,
            requestedTarget,
            capacity,
          )
        : null;

  function clearDragState() {
    setDraggedParticipant(null);
    setIsUnassignedDropTarget(false);
    setCompanyDropTargetId(null);
  }

  function handleParticipantDragStart(
    event: DragEvent<HTMLButtonElement>,
    participant: CompanyParticipant,
    company: CompanyDirectoryItem,
  ) {
    if (dragDisabled) {
      event.preventDefault();
      return;
    }

    const dragged = {
      participantId: participant.id,
      companyId: company.id,
      name: getParticipantName(participant),
      participant,
    };
    const row = event.currentTarget.closest("tr");
    if (row) {
      const bounds = row.getBoundingClientRect();
      event.dataTransfer.setDragImage(
        row,
        event.clientX - bounds.left,
        event.clientY - bounds.top,
      );
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", dragged.participantId);
    setDraggedParticipant({ source: "company", participants: [dragged] });
  }

  function handleUnassignedParticipantDragStart(
    event: DragEvent<HTMLTableRowElement>,
    participant: CompanyParticipant,
    availableParticipants: CompanyParticipant[],
  ) {
    if (dragDisabled) {
      event.preventDefault();
      return;
    }

    const dragged = {
      participantId: participant.id,
      companyId: null,
      name: getParticipantName(participant),
      participant,
    };
    const participants = selectedUnassignedParticipantIds.has(participant.id)
      ? availableParticipants
          .filter((currentParticipant) =>
            selectedUnassignedParticipantIds.has(currentParticipant.id),
          )
          .map((currentParticipant) => ({
            participantId: currentParticipant.id,
            companyId: null,
            name: getParticipantName(currentParticipant),
            participant: currentParticipant,
          }))
      : [dragged];

    if (!selectedUnassignedParticipantIds.has(participant.id)) {
      setSelectedUnassignedParticipantIds(new Set([participant.id]));
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", dragged.participantId);
    setDraggedParticipant({ source: "unassigned", participants });
  }

  function handleUnassignedParticipantSelectionChange(
    participantId: string,
    checked: boolean,
  ) {
    setSelectedUnassignedParticipantIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(participantId);
      } else {
        next.delete(participantId);
      }

      return next;
    });
  }

  function handleUnassignedParticipantsSelectionChange(
    participants: CompanyParticipant[],
    checked: boolean,
  ) {
    setSelectedUnassignedParticipantIds((current) => {
      const next = new Set(current);

      for (const participant of participants) {
        if (checked) {
          next.add(participant.id);
        } else {
          next.delete(participant.id);
        }
      }

      return next;
    });
  }

  function moveDraggedParticipants(
    dragged: DraggedCompanyParticipants,
    targetCompany: CompanyDirectoryItem | null,
  ) {
    const targetCompanyId = targetCompany?.id ?? null;
    const pendingMove: PendingCompanyMove = {
      ...dragged,
      id: nextPendingMoveIdRef.current,
      targetCompanyId,
    };
    nextPendingMoveIdRef.current += 1;
    const unassignedQuerySnapshots = queryClient.getQueriesData<
      InfiniteData<UnassignedParticipantsPage>
    >({
      queryKey: ["company-unassigned-participants"],
    });

    setPendingCompanyMoves((current) => [
      ...current.filter((move) => !isPendingMoveReflected(companies, move)),
      pendingMove,
    ]);
    queryClient.setQueriesData<InfiniteData<UnassignedParticipantsPage>>(
      { queryKey: ["company-unassigned-participants"] },
      (current) => {
        if (!current || current.pages.length === 0) {
          return current;
        }

        if (targetCompanyId === null) {
          const existingParticipantIds = new Set(
            current.pages.flatMap((page) =>
              page.rows.map((participant) => participant.id),
            ),
          );
          const additions = dragged.participants
            .map(({ participant }) => participant)
            .filter(
              (participant) =>
                matchesParticipantSearch(
                  participant,
                  current.pages[0].search,
                ) &&
                (current.pages[0].status === null ||
                  current.pages[0].status === participant.status) &&
                !existingParticipantIds.has(participant.id),
            );

          if (additions.length === 0) {
            return current;
          }

          return {
            ...current,
            pages: current.pages.map((page, index) => ({
              ...page,
              total: page.total + additions.length,
              rows: index === 0 ? [...additions, ...page.rows] : page.rows,
            })),
          };
        }

        const participantIds = new Set(
          dragged.participants.map(({ participantId }) => participantId),
        );
        const removedParticipantIds = new Set<string>();
        const pages = current.pages.map((page) => ({
          ...page,
          rows: page.rows.filter((participant) => {
            if (!participantIds.has(participant.id)) {
              return true;
            }

            removedParticipantIds.add(participant.id);
            return false;
          }),
        }));

        if (removedParticipantIds.size === 0) {
          return current;
        }

        return {
          ...current,
          pages: pages.map((page) => ({
            ...page,
            total: Math.max(0, page.total - removedParticipantIds.size),
          })),
        };
      },
    );

    setMoving(true);
    const operation = moveCompanyParticipantsAction(
      dragged.participants.map(({ participantId, companyId }) => ({
        participantId,
        companyId,
      })),
      targetCompanyId,
    )
      .then(async (result) => {
        if (!result.success) {
          throw new Error(result.message);
        }

        void queryClient.invalidateQueries({
          queryKey: ["company-unassigned-participants"],
        });
        startTransition(() => {
          router.refresh();
        });

        if (dragged.source === "unassigned") {
          setSelectedUnassignedParticipantIds(new Set());
        }

        return result;
      })
      .catch((error: unknown) => {
        for (const [queryKey, data] of unassignedQuerySnapshots) {
          queryClient.setQueryData(queryKey, data);
        }

        setPendingCompanyMoves((current) =>
          current.filter((move) => move.id !== pendingMove.id),
        );

        throw error;
      });

    const participantLabel =
      dragged.participants.length === 1
        ? dragged.participants[0]?.name
        : `${dragged.participants.length} participantes`;

    toast.promise(operation, {
      loading: targetCompany
        ? `Asignando a ${participantLabel} a ${targetCompany.name}…`
        : dragged.participants.length === 1
          ? `Quitando a ${participantLabel} de su compañía…`
          : `Quitando a ${participantLabel} de sus compañías…`,
      success: (result) => result.message,
      error: (error) =>
        error instanceof Error
          ? error.message
          : targetCompany
            ? "No pudimos asignar los participantes a la compañía."
            : "No pudimos quitar al participante de su compañía.",
    });

    void operation.catch(() => undefined).finally(() => setMoving(false));
  }

  function confirmRequestedChange() {
    const targetCompany =
      requestedChange?.targetCompanyId === null ? null : requestedTarget;

    if (
      !requestedChange ||
      !requestedParticipant ||
      targetCompany === undefined ||
      requestedChangeUnavailableReason ||
      dragDisabled
    ) {
      return;
    }

    const participant = requestedParticipant;
    const sourceCompanyId = requestedChange.sourceCompanyId;

    setRequestedChange(null);
    moveDraggedParticipants(
      {
        source: "company",
        participants: [
          {
            participantId: participant.id,
            companyId: sourceCompanyId,
            name: getParticipantName(participant),
            participant,
          },
        ],
      },
      targetCompany,
    );
  }

  function handleUnassignedDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const dragged = draggedParticipant;

    clearDragState();

    if (!dragged || dragged.source !== "company" || dragDisabled) {
      return;
    }

    moveDraggedParticipants(dragged, null);
  }

  function handleUnassignedDragOver(event: DragEvent<HTMLDivElement>) {
    if (draggedParticipant?.source !== "company" || dragDisabled) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsUnassignedDropTarget(true);
  }

  function handleUnassignedDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsUnassignedDropTarget(false);
    }
  }

  function handleCompanyDragOver(
    event: DragEvent<HTMLDivElement>,
    company: CompanyDirectoryItem,
  ) {
    if (draggedParticipant?.source !== "unassigned" || dragDisabled) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setCompanyDropTargetId(company.id);
  }

  function handleCompanyDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setCompanyDropTargetId(null);
    }
  }

  function handleCompanyDrop(
    event: DragEvent<HTMLDivElement>,
    company: CompanyDirectoryItem,
  ) {
    event.preventDefault();
    const dragged = draggedParticipant;

    clearDragState();

    if (!dragged || dragged.source !== "unassigned" || dragDisabled) {
      return;
    }

    moveDraggedParticipants(dragged, company);
  }

  return (
    <div className="grid min-h-svh min-w-0 items-start xl:grid-cols-[minmax(0,1fr)_20rem]">
      <DashboardPageSidebar path="/dashboard/companies">
        <div className="px-2 pt-0.5 pb-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <CreateCompanyButton
                appearance="sidebar"
                onCreated={(companyId) => {
                  setParticipantSearch("");
                  selectCompany(companyId);
                }}
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
        <div className="shrink-0 px-3 pb-3">
          <InputGroup>
            <InputGroupInput
              type="search"
              placeholder="Buscar participante"
              aria-label="Buscar participante en las compañías"
              value={participantSearch}
              onChange={(event) => setParticipantSearch(event.target.value)}
              className="[&::-webkit-search-cancel-button]:hidden"
            />
            <InputGroupAddon>
              <HugeiconsIcon
                icon={Search01Icon}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </InputGroupAddon>
            {participantSearch ? (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label="Limpiar búsqueda de participantes"
                  onClick={() => setParticipantSearch("")}
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
          <p className="sr-only" role="status">
            {hasParticipantSearch
              ? `${companySearchResults.length} compañías con coincidencias`
              : ""}
          </p>
        </div>
        <SidebarContent className="gap-0 px-2 pb-3">
          <nav aria-label="Compañías">
            <SidebarMenu className="gap-0">
              {companySearchResults.map(({ company, position, participants }) => (
                <SidebarMenuItem key={company.id}>
                  <SidebarMenuButton
                    isActive={company.id === activeCompany?.id}
                    aria-current={
                      company.id === activeCompany?.id ? "page" : undefined
                    }
                    className="h-9 rounded-sidebar-item! px-3 group-hover/menu-item:bg-sidebar-accent group-focus-within/menu-item:bg-sidebar-accent group-has-[[aria-expanded=true]]/menu-item:bg-sidebar-accent data-active:font-normal"
                    onClick={() => selectCompany(company.id)}
                  >
                    <HugeiconsIcon
                      icon={Building03Icon}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {getCompanyDisplayName(company.name, position)}
                    </span>
                    <span
                      className="pointer-events-none absolute top-2 right-2 flex size-5 items-center justify-center text-xs tabular-nums text-muted-foreground group-hover/menu-item:opacity-0 group-focus-within/menu-item:opacity-0 group-has-[[aria-expanded=true]]/menu-item:opacity-0 max-md:hidden"
                      aria-label={
                        hasParticipantSearch
                          ? `${participants.length} coincidencias`
                          : `${company.participantCount} participantes`
                      }
                    >
                      {hasParticipantSearch
                        ? participants.length
                        : company.participantCount}
                    </span>
                  </SidebarMenuButton>
                  <CompanyActionsMenu
                    company={company}
                    label={getCompanyDisplayName(company.name, position)}
                    canDelete={canDelete}
                    onUpdated={() => selectCompany(company.id)}
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </nav>
          {displayedCompanies.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Aún no hay compañías.
            </p>
          ) : companySearchResults.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Ninguna compañía tiene participantes con ese nombre.
            </p>
          ) : null}
        </SidebarContent>
      </DashboardPageSidebar>
      <div className="min-w-0 p-4 pb-24 sm:p-6 xl:p-8">
        {displayedCompanies.length === 0 ? (
          <Empty className="min-h-80">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={Building03Icon} strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>Aún no hay compañías</EmptyTitle>
              <p className="text-sm text-muted-foreground">
                Crea la primera compañía para empezar a asignar participantes.
              </p>
            </EmptyHeader>
            <EmptyContent>
              <CreateCompanyButton onCreated={selectCompany} />
            </EmptyContent>
          </Empty>
        ) : null}
        {hasParticipantSearch && displayedCompanies.length > 0 && !activeCompany ? (
          <Empty className="min-h-80">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={Search01Icon} strokeWidth={1.5} />
              </EmptyMedia>
              <EmptyTitle>No encontramos participantes</EmptyTitle>
              <p className="text-sm text-muted-foreground">
                Prueba con otro nombre o apellido.
              </p>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={() => setParticipantSearch("")}>
                Limpiar búsqueda
              </Button>
            </EmptyContent>
          </Empty>
        ) : null}
        {activeCompany && activeResult ? (
          <CompanyCard
            key={activeCompany.id}
            company={activeCompany}
            position={activeResult.position}
            visibleParticipants={activeResult.participants}
            hasParticipantSearch={hasParticipantSearch}
            onCompanyUpdated={() => selectCompany(activeCompany.id)}
            canDelete={canDelete}
            capacity={capacity}
            draggedParticipantIds={draggedParticipantIds}
            dragDisabled={dragDisabled}
            isDropTarget={companyDropTargetId === activeCompany.id}
            onParticipantDragStart={handleParticipantDragStart}
            onParticipantDragEnd={clearDragState}
            companies={displayedCompanies}
            onParticipantMoveRequest={(participantId, targetCompanyId) => {
              if (!dragDisabled) {
                setRequestedChange({
                  participantId,
                  sourceCompanyId: activeCompany.id,
                  targetCompanyId,
                });
              }
            }}
            onParticipantRemoveRequest={(participantId) => {
              if (!dragDisabled) {
                setRequestedChange({
                  participantId,
                  sourceCompanyId: activeCompany.id,
                  targetCompanyId: null,
                });
              }
            }}
            onDragOver={handleCompanyDragOver}
            onDragLeave={handleCompanyDragLeave}
            onDrop={handleCompanyDrop}
          />
        ) : null}
      </div>
      <CompanyUnassignedSidebar>
        <UnassignedParticipantsPanel
          capacity={capacity}
          draggedParticipant={draggedParticipant}
          draggedParticipantIds={draggedParticipantIds}
          isDropTarget={isUnassignedDropTarget}
          dragDisabled={dragDisabled}
          selectedParticipantIds={selectedUnassignedParticipantIds}
          onDragOver={handleUnassignedDragOver}
          onDragLeave={handleUnassignedDragLeave}
          onDrop={handleUnassignedDrop}
          onParticipantDragStart={handleUnassignedParticipantDragStart}
          onParticipantDragEnd={clearDragState}
          onParticipantSelectionChange={
            handleUnassignedParticipantSelectionChange
          }
          onParticipantsSelectionChange={
            handleUnassignedParticipantsSelectionChange
          }
        />
      </CompanyUnassignedSidebar>
      <AlertDialog
        open={requestedChange !== null}
        onOpenChange={(open) => {
          if (!open && !moving) {
            setRequestedChange(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {requestedChange?.targetCompanyId === null
                ? "¿Eliminar de la compañía?"
                : "¿Mover participante?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {requestedChange?.targetCompanyId === null
                ? `¿Seguro quieres eliminar a ${requestedParticipant ? getParticipantName(requestedParticipant) : "este participante"} de ${requestedSourceLabel}? Su ficha se conservará y aparecerá en Participantes sin compañía.`
                : `¿Seguro quieres mover a ${requestedParticipant ? getParticipantName(requestedParticipant) : "este participante"} de ${requestedSourceLabel} a ${requestedTargetLabel}? Su registro se conservará.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {requestedChangeUnavailableReason ? (
            <p role="alert" className="text-sm text-destructive">
              {requestedChangeUnavailableReason}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={moving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant={
                requestedChange?.targetCompanyId === null
                  ? "destructive"
                  : "default"
              }
              disabled={
                dragDisabled || Boolean(requestedChangeUnavailableReason)
              }
              onClick={confirmRequestedChange}
            >
              {requestedChange?.targetCompanyId === null
                ? "Sí, eliminar de la compañía"
                : "Sí, mover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UnassignedParticipantsPanel({
  capacity,
  draggedParticipant,
  draggedParticipantIds,
  isDropTarget,
  dragDisabled,
  selectedParticipantIds,
  onDragOver,
  onDragLeave,
  onDrop,
  onParticipantDragStart,
  onParticipantDragEnd,
  onParticipantSelectionChange,
  onParticipantsSelectionChange,
}: {
  capacity: DistributionCapacity;
  draggedParticipant: DraggedCompanyParticipants | null;
  draggedParticipantIds: ReadonlySet<string>;
  isDropTarget: boolean;
  dragDisabled: boolean;
  selectedParticipantIds: ReadonlySet<string>;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onParticipantDragStart: (
    event: DragEvent<HTMLTableRowElement>,
    participant: CompanyParticipant,
    availableParticipants: CompanyParticipant[],
  ) => void;
  onParticipantDragEnd: () => void;
  onParticipantSelectionChange: (
    participantId: string,
    checked: boolean,
  ) => void;
  onParticipantsSelectionChange: (
    participants: CompanyParticipant[],
    checked: boolean,
  ) => void;
}) {
  const queryClient = useQueryClient();
  const listViewportRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<UnassignedStatusFilterValue>("all");
  const deferredSearch = useDeferredValue(search);
  const unassignedParticipantsQuery = useInfiniteQuery({
    queryKey: ["company-unassigned-participants", deferredSearch, status],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam) });

      if (deferredSearch) {
        params.set("query", deferredSearch);
      }

      if (status !== "all") {
        params.set("status", status);
      }

      const response = await fetch(
        `/api/companies/unassigned-participants?${params}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("No pudimos cargar los participantes sin compañía.");
      }

      return (await response.json()) as UnassignedParticipantsPage;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
  const participants =
    unassignedParticipantsQuery.data?.pages.flatMap((page) => page.rows) ?? [];
  const firstPage = unassignedParticipantsQuery.data?.pages[0];
  const total = firstPage?.total ?? 0;
  const selectedParticipantCount = participants.filter((participant) =>
    selectedParticipantIds.has(participant.id),
  ).length;
  const areAllParticipantsSelected =
    participants.length > 0 && selectedParticipantCount === participants.length;
  const draggedCompanyParticipants =
    draggedParticipant?.source === "company" ? draggedParticipant : null;
  const { fetchNextPage, hasNextPage, isFetchingNextPage } =
    unassignedParticipantsQuery;

  useEffect(() => {
    listViewportRef.current?.scrollTo({ top: 0 });
  }, [deferredSearch, status]);

  useEffect(() => {
    const listViewport = listViewportRef.current;
    const loadMoreNode = loadMoreRef.current;

    if (!listViewport || !loadMoreNode || !hasNextPage || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { root: listViewport, rootMargin: "0px 0px 240px" },
    );

    observer.observe(loadMoreNode);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <aside
      className="flex min-h-0 flex-1 flex-col text-sm"
      aria-label="Participantes sin compañía"
    >
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col transition-colors",
          draggedCompanyParticipants && "bg-primary/5",
          isDropTarget && "ring-2 ring-inset ring-primary",
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {draggedCompanyParticipants ? (
          <p className="px-3 pb-2 text-xs text-primary" aria-live="polite">
            {isDropTarget
              ? "Suelta para quitar de la compañía."
              : "Arrastra aquí para quitar de la compañía."}
          </p>
        ) : null}
        <div className="flex shrink-0 flex-col gap-2 border-b px-3 pb-3">
          <div className="flex flex-wrap gap-2">
            <CompanyDistributionDialog
              capacity={capacity}
              onDistributed={() =>
                queryClient.invalidateQueries({
                  queryKey: ["company-unassigned-participants"],
                })
              }
            />
            <CompanyCapacityDialog capacity={capacity} />
          </div>
          <InputGroup>
            <InputGroupAddon>
              <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder="Buscar participante"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar participantes sin compañía"
            />
          </InputGroup>
          <UnassignedStatusFilter value={status} onChange={setStatus} />
        </div>

        <div
          ref={listViewportRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y"
        >
          {unassignedParticipantsQuery.isPending ? (
            <div
              className="flex flex-col gap-5 p-3"
              aria-label="Cargando participantes"
              aria-busy="true"
            >
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Skeleton className="size-4 rounded-sm" />
                  <Skeleton className="size-6 rounded-full" />
                  <Skeleton className="h-3 flex-1" />
                </div>
              ))}
            </div>
          ) : unassignedParticipantsQuery.isError ? (
            <p
              role="alert"
              className="px-4 py-8 text-center text-muted-foreground"
            >
              No pudimos cargar los participantes sin compañía.
            </p>
          ) : participants.length > 0 ? (
            <>
              <TableFrame className="rounded-none border-0">
                <Table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-10" />
                    <col />
                  </colgroup>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">
                        <Checkbox
                          checked={areAllParticipantsSelected}
                          indeterminate={
                            selectedParticipantCount > 0 &&
                            !areAllParticipantsSelected
                          }
                          onCheckedChange={(checked) =>
                            onParticipantsSelectionChange(participants, checked)
                          }
                          onPointerDown={(event) => event.stopPropagation()}
                          aria-label="Seleccionar todos los participantes cargados"
                        />
                      </TableHead>
                      <TableHead>
                        {selectedParticipantCount > 0
                          ? `${selectedParticipantCount} seleccionados`
                          : "Participantes"}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.map((participant) => {
                      const isSelected = selectedParticipantIds.has(
                        participant.id,
                      );
                      const isDragged =
                        draggedParticipant?.source === "unassigned" &&
                        draggedParticipantIds.has(participant.id);

                      return (
                        <TableRow
                          key={participant.id}
                          draggable={!dragDisabled}
                          aria-grabbed={isDragged}
                          aria-selected={isSelected}
                          title="Arrastra a una compañía para asignarlo."
                          className={cn(
                            "cursor-grab active:cursor-grabbing",
                            isSelected && "bg-primary/5 hover:bg-primary/10",
                            isDragged && "opacity-50",
                          )}
                          onDragStart={(event) =>
                            onParticipantDragStart(
                              event,
                              participant,
                              participants,
                            )
                          }
                          onDragEnd={onParticipantDragEnd}
                        >
                          <TableCell className="text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                onParticipantSelectionChange(
                                  participant.id,
                                  checked,
                                )
                              }
                              onPointerDown={(event) => event.stopPropagation()}
                              aria-label={`Seleccionar a ${getParticipantName(participant)}`}
                            />
                          </TableCell>
                          <TableCell className="whitespace-normal py-3">
                            <div className="flex min-w-0 items-start gap-2">
                              <Avatar size="sm" aria-hidden="true">
                                <AvatarFallback
                                  className={cn(
                                    "!text-[9px] font-medium",
                                    participantStatusClassNames[
                                      participant.status
                                    ],
                                  )}
                                >
                                  {getParticipantInitials(
                                    participant.firstNames,
                                    participant.lastNames,
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <span className="min-w-0">
                                <span className="block break-words font-medium">
                                  {getParticipantName(participant)}
                                </span>
                                <span className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "border-transparent",
                                      participantStatusClassNames[
                                        participant.status
                                      ],
                                    )}
                                  >
                                    {getParticipantStatusLabel(
                                      participant.status,
                                    )}
                                  </Badge>
                                  {getParticipantAge(participant.age)} ·{" "}
                                  {getParticipantSexLabel(participant.sex)}
                                </span>
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {isFetchingNextPage ? (
                      <TableRow>
                        <TableCell colSpan={2}>
                          <Skeleton className="h-3 w-28" />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TableFrame>
              {hasNextPage ? (
                <div ref={loadMoreRef} className="h-px" aria-hidden="true" />
              ) : null}
            </>
          ) : (
            <p
              className="px-4 py-8 text-center text-muted-foreground"
              role="status"
            >
              {deferredSearch || status !== "all"
                ? "No encontramos participantes sin compañía."
                : "No hay participantes sin compañía."}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t p-3">
          <span className="text-muted-foreground">
            {deferredSearch || status !== "all"
              ? "Resultados"
              : "Total de participantes"}
          </span>
          <Badge variant="secondary">
            {unassignedParticipantsQuery.isPending
              ? "…"
              : total.toLocaleString("es-EC")}
          </Badge>
        </div>
      </div>
    </aside>
  );
}

function CompanyCard({
  company,
  visibleParticipants,
  hasParticipantSearch,
  onCompanyUpdated,
  companies,
  position,
  canDelete,
  capacity,
  draggedParticipantIds,
  dragDisabled,
  isDropTarget,
  onParticipantDragStart,
  onParticipantDragEnd,
  onParticipantMoveRequest,
  onParticipantRemoveRequest,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  company: CompanyDirectoryItem;
  visibleParticipants: CompanyParticipant[];
  hasParticipantSearch: boolean;
  onCompanyUpdated: () => void;
  companies: CompanyDirectoryItem[];
  position: number;
  canDelete: boolean;
  capacity: DistributionCapacity;
  draggedParticipantIds: ReadonlySet<string>;
  dragDisabled: boolean;
  isDropTarget: boolean;
  onParticipantDragStart: (
    event: DragEvent<HTMLButtonElement>,
    participant: CompanyParticipant,
    company: CompanyDirectoryItem,
  ) => void;
  onParticipantDragEnd: () => void;
  onParticipantMoveRequest: (
    participantId: string,
    targetCompanyId: string,
  ) => void;
  onParticipantRemoveRequest: (participantId: string) => void;
  onDragOver: (
    event: DragEvent<HTMLDivElement>,
    company: CompanyDirectoryItem,
  ) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (
    event: DragEvent<HTMLDivElement>,
    company: CompanyDirectoryItem,
  ) => void;
}) {
  const [openActionsParticipantId, setOpenActionsParticipantId] = useState<
    string | null
  >(null);
  const [companySearch, setCompanySearch] = useState("");
  const [participantFilters, setParticipantFilters] =
    useState<CompanyParticipantFilterValues>(DEFAULT_COMPANY_PARTICIPANT_FILTERS);
  const hasParticipantFilters = Object.values(participantFilters).some(
    (value) => value !== "all",
  );
  const searchTerms = normalizeParticipantName(companySearch)
    .split(/\s+/)
    .filter(Boolean);
  const matchingParticipants = searchTerms.length || hasParticipantFilters
    ? visibleParticipants.filter((participant) => {
        const name = normalizeParticipantName(getParticipantName(participant));
        const sex =
          participant.sex === MALE_PARTICIPANT_SEX
            ? "male"
            : participant.sex === FEMALE_PARTICIPANT_SEX
              ? "female"
              : "other";
        const age = participant.age === null ? "unknown" : String(participant.age);
        return (
          searchTerms.every((term) => name.includes(term)) &&
          (participantFilters.status === "all" ||
            participant.status === participantFilters.status) &&
          (participantFilters.sex === "all" || sex === participantFilters.sex) &&
          (participantFilters.age === "all" || age === participantFilters.age)
        );
      })
    : visibleParticipants;
  const isFilteringParticipants =
    hasParticipantSearch || searchTerms.length > 0 || hasParticipantFilters;
  const titleId = `company-${company.id}-title`;
  const companyLabel = getCompanyDisplayName(company.name, position);

  return (
    <Card
      className={cn(
        "gap-6 rounded-none bg-transparent p-0 shadow-none ring-0 transition-[background-color,box-shadow]",
        isDropTarget && "bg-primary/5 ring-2 ring-primary ring-offset-2",
      )}
      aria-labelledby={titleId}
      onDragOver={(event) => onDragOver(event, company)}
      onDragLeave={onDragLeave}
      onDrop={(event) => onDrop(event, company)}
    >
      <CardHeader className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 px-0">
        <CardTitle className="min-w-0 flex-1 basis-40">
          <h1
            id={titleId}
            className="break-words text-2xl font-medium tracking-tight"
          >
            {companyLabel}
          </h1>
          {isDropTarget ? (
            <span className="text-sm font-medium text-primary">
              {" · Suelta para asignar"}
            </span>
          ) : null}
        </CardTitle>
        <div className="flex w-full items-center gap-3 sm:w-auto sm:shrink-0">
          <InputGroup className="min-w-0 flex-1 sm:w-60 sm:flex-none">
            <InputGroupInput
              type="search"
              placeholder="Buscar"
              aria-label={`Buscar participantes en ${companyLabel}`}
              value={companySearch}
              onChange={(event) => setCompanySearch(event.target.value)}
              className="[&::-webkit-search-cancel-button]:hidden"
            />
            <InputGroupAddon>
              <HugeiconsIcon
                icon={Search01Icon}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </InputGroupAddon>
            {companySearch ? (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label="Limpiar búsqueda en esta compañía"
                  onClick={() => setCompanySearch("")}
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
          <CompanyActionsMenu
            company={company}
            label={companyLabel}
            canDelete={canDelete}
            onUpdated={onCompanyUpdated}
            appearance="header"
          />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6 px-0">
        <CapacityProgress
          total={company.participantCount}
          female={company.femaleCount}
          male={company.maleCount}
          unsupported={company.unsupportedSexCount}
          capacity={capacity}
        />

        <section aria-labelledby={`${titleId}-counselors`}>
          <h3 id={`${titleId}-counselors`} className="text-sm font-semibold">
            Consejeros
          </h3>

          {company.counselors.length > 0 ? (
            <ul className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-3">
              {company.counselors.map((counselor) => (
                <li key={counselor.id} className="min-w-0">
                  <Card size="sm" className="h-full border shadow-none ring-0">
                    <CardHeader className="flex flex-row items-center gap-4">
                      <Avatar
                        className="size-16 overflow-hidden"
                        aria-hidden="true"
                      >
                        <CounselorAvatarImage counselorId={counselor.id} />
                        <AvatarFallback className="text-lg font-medium">
                          {getCounselorInitials(counselor)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col gap-1">
                        <CardTitle>
                          <h4 className="break-words">{counselor.name}</h4>
                        </CardTitle>
                        <CardDescription>
                          {counselor.stakeName
                            ? `Estaca ${counselor.stakeName}`
                            : "Sin estaca asignada"}
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Sin consejeros asignados.
            </p>
          )}
        </section>

        <Separator />

        <section aria-labelledby={`${titleId}-participants`}>
          <CompanyParticipantFilters
            titleId={`${titleId}-participants`}
            participants={company.participants}
            value={participantFilters}
            onChange={setParticipantFilters}
          />
          {isFilteringParticipants ? (
            <p className="mt-1 text-sm text-muted-foreground" role="status">
              Mostrando {matchingParticipants.length} de {company.participantCount}{" "}
              participantes.
            </p>
          ) : null}

          {matchingParticipants.length > 0 ? (
            <TableFrame className="mt-3">
              <Table className="block w-full md:table md:min-w-[620px] md:table-fixed">
                <colgroup className="hidden md:table-column-group">
                  <col className="md:w-11" />
                  <col className="md:w-12" />
                  <col className="md:w-24" />
                  <col />
                  <col className="md:w-[76px]" />
                  <col className="md:w-20" />
                  <col className="md:w-11" />
                </colgroup>
                <TableHeader className="hidden md:table-header-group">
                  <TableRow>
                    <TableHead className="text-center">
                      <span className="sr-only">Arrastrar</span>
                    </TableHead>
                    <TableHead className="text-center">#</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Sexo</TableHead>
                    <TableHead className="text-center">
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="block md:table-row-group">
                  {matchingParticipants.map((participant, index) =>
                    (() => {
                      const isDragged = draggedParticipantIds.has(
                        participant.id,
                      );

                      return (
                        <TableRow
                          key={participant.id}
                          className={cn(
                            "flex min-w-0 items-center gap-2 px-3 py-2 md:table-row md:p-0",
                            isDragged && "opacity-50",
                          )}
                        >
                          <TableCell className="shrink-0 border-r-0 p-0 text-center md:table-cell md:border-r md:px-1 md:py-[3px]">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="cursor-grab text-muted-foreground active:cursor-grabbing"
                              disabled={dragDisabled}
                              draggable={!dragDisabled}
                              aria-label={`Arrastrar o mover a ${getParticipantName(participant)}`}
                              aria-haspopup="menu"
                              aria-expanded={
                                openActionsParticipantId === participant.id
                              }
                              title="Arrastra para mover o pulsa para ver opciones"
                              onClick={() =>
                                setOpenActionsParticipantId(participant.id)
                              }
                              onDragStart={(event) => {
                                setOpenActionsParticipantId(null);
                                onParticipantDragStart(
                                  event,
                                  participant,
                                  company,
                                );
                              }}
                              onDragEnd={onParticipantDragEnd}
                            >
                              <HugeiconsIcon
                                icon={DragDropVerticalIcon}
                                strokeWidth={1.5}
                                aria-hidden="true"
                              />
                            </Button>
                          </TableCell>
                          <TableCell className="hidden text-center tabular-nums text-muted-foreground md:table-cell">
                            {index + 1}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge
                              variant="outline"
                              className={cn(
                                "border-transparent",
                                participantStatusClassNames[participant.status],
                              )}
                            >
                              {getParticipantStatusLabel(participant.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="min-w-0 flex-1 overflow-hidden whitespace-normal border-r-0 p-0 md:table-cell md:max-w-0 md:border-r md:px-3 md:py-[3px]">
                            <div className="flex min-w-0 items-center gap-2">
                              <Avatar
                                size="sm"
                                aria-hidden="true"
                                className="hidden md:flex"
                              >
                                <AvatarFallback
                                  className={cn(
                                    "!text-[9px] font-medium",
                                    participantStatusClassNames[
                                      participant.status
                                    ],
                                  )}
                                >
                                  {getParticipantInitials(
                                    participant.firstNames,
                                    participant.lastNames,
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <span
                                  className="block truncate font-medium"
                                  title={getParticipantName(participant)}
                                >
                                  {getShortParticipantName(participant)}
                                </span>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 md:hidden">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "border-transparent",
                                      participantStatusClassNames[
                                        participant.status
                                      ],
                                    )}
                                  >
                                    {getParticipantStatusLabel(
                                      participant.status,
                                    )}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {getParticipantAge(participant.age)} ·{" "}
                                    {getParticipantSexLabel(participant.sex)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {getParticipantAge(participant.age)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="secondary">
                              {getParticipantSexLabel(participant.sex)}
                            </Badge>
                          </TableCell>
                          <TableCell className="shrink-0 border-r-0 p-0 text-center md:table-cell md:px-3 md:py-[3px]">
                            <CompanyParticipantActionsMenu
                              open={openActionsParticipantId === participant.id}
                              onOpenChange={(open) =>
                                setOpenActionsParticipantId(
                                  open ? participant.id : null,
                                )
                              }
                              participant={participant}
                              company={company}
                              companies={companies}
                              capacity={capacity}
                              dragDisabled={dragDisabled}
                              onMoveRequest={onParticipantMoveRequest}
                              onRemoveRequest={onParticipantRemoveRequest}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })(),
                  )}
                </TableBody>
              </Table>
            </TableFrame>
          ) : (
            <Empty className="min-h-40 p-6">
              <EmptyHeader>
                <EmptyTitle>
                  {isFilteringParticipants
                    ? "No encontramos participantes"
                    : "Sin participantes"}
                </EmptyTitle>
                <p className="text-sm text-muted-foreground">
                  {isFilteringParticipants
                    ? "Prueba con otra búsqueda o ajusta los filtros de esta compañía."
                    : "No hay participantes asignados a esta compañía."}
                </p>
              </EmptyHeader>
              {companySearch || hasParticipantFilters ? (
                <EmptyContent>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCompanySearch("");
                      setParticipantFilters(DEFAULT_COMPANY_PARTICIPANT_FILTERS);
                    }}
                  >
                    {hasParticipantFilters
                      ? "Limpiar búsqueda y filtros"
                      : "Limpiar búsqueda"}
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function CompanyParticipantActionsMenu({
  open,
  onOpenChange,
  participant,
  company,
  companies,
  capacity,
  dragDisabled,
  onMoveRequest,
  onRemoveRequest,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: CompanyParticipant;
  company: CompanyDirectoryItem;
  companies: CompanyDirectoryItem[];
  capacity: DistributionCapacity;
  dragDisabled: boolean;
  onMoveRequest: (participantId: string, targetCompanyId: string) => void;
  onRemoveRequest: (participantId: string) => void;
}) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-11 md:size-8"
            disabled={dragDisabled}
            draggable={false}
            aria-label={`Acciones para ${getParticipantName(participant)}`}
            onPointerDown={(event) => event.stopPropagation()}
            onDragStart={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          />
        }
      >
        <HugeiconsIcon
          icon={MoreHorizontalIcon}
          strokeWidth={2}
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      {open ? (
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={dragDisabled}>
                Mover a otra compañía
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-[70dvh] min-w-64 overflow-y-auto">
                <DropdownMenuGroup>
                  {companies.map((destination, index) => {
                    const unavailableReason = getCompanyMoveUnavailableReason(
                      company.id,
                      participant.sex,
                      destination,
                      capacity,
                    );

                    return (
                      <DropdownMenuItem
                        key={destination.id}
                        disabled={dragDisabled || Boolean(unavailableReason)}
                        onClick={() =>
                          onMoveRequest(participant.id, destination.id)
                        }
                      >
                        <span>
                          {getCompanyDisplayName(destination.name, index + 1)}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {unavailableReason ??
                            `${destination.participantCount}/${capacity.female + capacity.male}`}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              disabled={dragDisabled}
              onClick={() => onRemoveRequest(participant.id)}
            >
              Eliminar de la compañía
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      ) : null}
    </DropdownMenu>
  );
}

function CapacityProgress({
  total,
  female,
  male,
  unsupported = 0,
  capacity,
}: {
  total: number;
  female: number;
  male: number;
  unsupported?: number;
  capacity: DistributionCapacity;
}) {
  const totalCapacity = capacity.female + capacity.male;
  const available = Math.max(0, totalCapacity - total);
  const exceedsCapacity =
    total > totalCapacity || male > capacity.male || female > capacity.female;
  const groups = [
    { label: "Hombres", count: male, limit: capacity.male, color: "bg-primary" },
    {
      label: "Mujeres",
      count: female,
      limit: capacity.female,
      color: "bg-company-female",
    },
  ];

  return (
    <Card
      size="sm"
      className="border shadow-none ring-0"
      role="region"
      aria-label="Ocupación de la compañía"
    >
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle>Ocupación</CardTitle>
          <CardDescription>
            <span className="font-medium tabular-nums text-foreground">
              {total.toLocaleString("es-EC")}
            </span>{" "}
            de {totalCapacity} participantes
          </CardDescription>
        </div>
        <Badge variant={exceedsCapacity ? "destructive" : "secondary"}>
          {exceedsCapacity
            ? "Cupo excedido"
            : available === 0
              ? "Sin cupos libres"
              : `${available} ${available === 1 ? "cupo libre" : "cupos libres"}`}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-5 sm:gap-8">
          {groups.map(({ label, count, limit, color }) => {
            const remaining = Math.max(0, Math.min(limit - count, available));
            const overCapacity = count > limit;
            const progress =
              limit > 0
                ? Math.min(100, (count / limit) * 100)
                : count > 0
                  ? 100
                  : 0;

            return (
              <div key={label} className="flex min-w-0 flex-col gap-2">
                <Progress
                  value={progress}
                  renderTrack={false}
                  className="gap-2"
                  aria-valuetext={`${count} de ${limit} cupos ocupados`}
                >
                  <div className="flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <ProgressLabel className="flex items-center gap-2">
                      <span
                        className={cn("size-1.5 rounded-full", color)}
                        aria-hidden="true"
                      />
                      {label}
                    </ProgressLabel>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {count}
                      </span>
                      {" / "}
                      {limit}
                    </span>
                  </div>
                  <ProgressTrack className="h-1.5">
                    <ProgressIndicator
                      className={cn(
                        "rounded-full transition-[width] duration-300 motion-reduce:transition-none",
                        color,
                      )}
                    />
                  </ProgressTrack>
                </Progress>
                <p
                  className={cn(
                    "text-xs text-muted-foreground",
                    overCapacity && "text-destructive",
                  )}
                >
                  {overCapacity
                    ? `${count - limit} sobre el cupo`
                    : remaining === 0
                      ? "Sin cupos libres"
                      : `${remaining} ${remaining === 1 ? "disponible" : "disponibles"}`}
                </p>
              </div>
            );
          })}
        </div>
        {unsupported > 0 ? (
          <p className="text-xs text-muted-foreground">
            Otro o sin registrar: {unsupported.toLocaleString("es-EC")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
