"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { type SortingState, useTable } from "@tanstack/react-table";
import {
  Ban,
  ChevronDown,
  Copy,
  ExternalLink,
  Loader2,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatDate,
  getUserLabel,
  getUsersColumns,
  roleTone,
  type Translate,
} from "@/app/dashboard/users/columns";
import {
  banReasonCodes,
  getBanReasonLabel,
  type BanReasonCode,
} from "@/lib/account/ban-reasons";
import {
  accountRoles,
  getAccountRoleLabel,
  type AccountRole,
} from "@/lib/account/roles";
import { isInactiveAccount, type AdminUser } from "@/lib/account/admin-users";
import type { AuditEvent } from "@/lib/server/audit";
import type { UserContextStats } from "@/lib/server/users";
import DataTable from "@/components/data-table/DataTable";
import DataTableFacetFilter from "@/components/data-table/DataTableFacetFilter";
import DataTableToolbar from "@/components/data-table/DataTableToolbar";
import { dataTableFeatures } from "@/components/data-table/tableFeatures";
import {
  DangerAction,
  DetailList,
  DetailNotice,
  DetailSection,
  DetailStats,
} from "@/components/dashboard/DetailSheet";
import StatusFilter from "@/components/dashboard/StatusFilter";
import ToneBadge from "@/components/dashboard/ToneBadge";
import UserAvatar from "@/components/UserAvatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type DashboardUsersManagerProps = {
  currentUserId: string;
  initialUsers: AdminUser[];
};

type UserSegment = "all" | "staff" | "inactive" | "banned";

const segmentFilters: Record<UserSegment, (user: AdminUser) => boolean> = {
  all: () => true,
  staff: (user) => user.role !== "user",
  inactive: (user) => isInactiveAccount(user),
  banned: (user) => Boolean(user.bannedAt),
};

function mergeAdminUser(previous: AdminUser, updated: AdminUser): AdminUser {
  return {
    ...previous,
    role: updated.role,
    bannedAt: updated.bannedAt,
    banReason: updated.banReason,
    updatedAt: updated.updatedAt,
  };
}

function formatAuditEventType(eventType: string) {
  const parts = eventType.split(".");
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" · ");
}

type UserContextData = {
  stats: UserContextStats;
  recentEvents: AuditEvent[];
};

export default function DashboardUsersManager({
  currentUserId,
  initialUsers,
}: DashboardUsersManagerProps) {
  const t = useTranslations("dashboard.users");
  const isMobile = useIsMobile();
  const [users, setUsers] = useState(initialUsers);
  const [segment, setSegment] = useState<UserSegment>("all");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<AccountRole[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [draftRoles, setDraftRoles] = useState<Record<string, AccountRole>>(
    Object.fromEntries(initialUsers.map((u) => [u.id, u.role]))
  );
  const [inspectCandidate, setInspectCandidate] = useState<AdminUser | null>(
    null
  );
  const [inspectData, setInspectData] = useState<UserContextData | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [banCandidate, setBanCandidate] = useState<AdminUser | null>(null);
  const [banReasonCode, setBanReasonCode] = useState<BanReasonCode>("spam");
  const [banReasonDetail, setBanReasonDetail] = useState("");
  const [pendingBanUserId, setPendingBanUserId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<AdminUser | null>(
    null
  );
  const [deleteConfirmValue, setDeleteConfirmValue] = useState("");
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<string | null>(
    null
  );
  const [deleteStats, setDeleteStats] = useState<UserContextStats | null>(null);
  const [deleteStatsLoading, setDeleteStatsLoading] = useState(false);
  const deleteCandidateId = deleteCandidate?.id ?? null;
  const inspectCandidateId = inspectCandidate?.id ?? null;

  useEffect(() => {
    if (!deleteCandidateId) return;

    let cancelled = false;

    fetch(`/api/dashboard/users/${encodeURIComponent(deleteCandidateId)}`)
      .then(async (res) => {
        const payload = (await res.json()) as {
          ok: boolean;
          error?: string;
          stats?: UserContextStats;
        };
        if (cancelled) return;
        if (!res.ok || !payload.ok) {
          toast.error(payload.error ?? t("messages.loadFailed"));
          return;
        }
        if (payload.stats) {
          setDeleteStats(payload.stats);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error(t("messages.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setDeleteStatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [deleteCandidateId, t]);

  useEffect(() => {
    if (!inspectCandidateId) return;

    let cancelled = false;

    fetch(`/api/dashboard/users/${encodeURIComponent(inspectCandidateId)}`)
      .then(async (res) => {
        const payload = (await res.json()) as {
          ok: boolean;
          error?: string;
          stats?: UserContextStats;
          recentEvents?: AuditEvent[];
        };
        if (cancelled) return;
        if (!res.ok || !payload.ok) {
          toast.error(payload.error ?? t("messages.loadFailed"));
          return;
        }
        if (payload.stats && payload.recentEvents) {
          setInspectData({
            stats: payload.stats,
            recentEvents: payload.recentEvents,
          });
        }
      })
      .catch(() => {
        if (!cancelled) toast.error(t("messages.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setInspectLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [inspectCandidateId, t]);

  const openInspectCandidate = (candidate: AdminUser) => {
    setInspectData(null);
    setInspectLoading(true);
    setInspectCandidate(candidate);
  };

  const closeInspectCandidate = () => {
    setInspectCandidate(null);
    setInspectData(null);
    setInspectLoading(false);
  };

  const openDeleteCandidate = (candidate: AdminUser) => {
    setDeleteConfirmValue("");
    setDeleteStats(null);
    setDeleteStatsLoading(true);
    setDeleteCandidate(candidate);
  };

  const closeDeleteCandidate = () => {
    setDeleteCandidate(null);
    setDeleteConfirmValue("");
    setDeleteStats(null);
    setDeleteStatsLoading(false);
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("messages.copySuccess", { label }));
    } catch {
      toast.error(t("messages.copyFailed", { label }));
    }
  };

  const saveRole = async (userId: string) => {
    const nextRole = draftRoles[userId];
    const current = users.find((u) => u.id === userId);
    if (!nextRole || !current || current.role === nextRole) return;

    setPendingUserId(userId);

    try {
      const response = await fetch(`/api/dashboard/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        user?: AdminUser;
      };

      if (!response.ok || !payload.ok || !payload.user) {
        throw new Error(payload.error ?? t("messages.updateFailed"));
      }

      const updated = payload.user;
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? mergeAdminUser(u, updated) : u))
      );
      setInspectCandidate((prev) =>
        prev?.id === updated.id ? mergeAdminUser(prev, updated) : prev
      );
      setDraftRoles((prev) => ({ ...prev, [updated.id]: updated.role }));
      toast.success(
        t("messages.updateSuccess", {
          name: getUserLabel(updated, t("fallback.unnamedUser")),
          role: getAccountRoleLabel(updated.role),
        })
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("messages.updateFailed")
      );
    } finally {
      setPendingUserId(null);
    }
  };

  const resolveBanReason = () =>
    banReasonCode === "other"
      ? banReasonDetail.trim()
      : getBanReasonLabel(banReasonCode);

  const submitBan = async (userId: string) => {
    const reason = resolveBanReason();
    if (!reason) return;

    setPendingBanUserId(userId);

    try {
      const response = await fetch(
        `/api/dashboard/users/${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "ban", reason }),
        }
      );

      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        user?: AdminUser;
      };

      if (!response.ok || !payload.ok || !payload.user) {
        throw new Error(payload.error ?? t("banDialog.banFailed"));
      }

      const updated = payload.user;
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? mergeAdminUser(u, updated) : u))
      );
      setInspectCandidate((prev) =>
        prev?.id === updated.id ? mergeAdminUser(prev, updated) : prev
      );
      setBanCandidate(null);
      setBanReasonDetail("");
      toast.success(
        t("banDialog.banSuccess", {
          name: getUserLabel(updated, t("fallback.unnamedUser")),
        })
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("banDialog.banFailed")
      );
    } finally {
      setPendingBanUserId(null);
    }
  };

  const submitUnban = async (userId: string) => {
    setPendingBanUserId(userId);

    try {
      const response = await fetch(
        `/api/dashboard/users/${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unban" }),
        }
      );

      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        user?: AdminUser;
      };

      if (!response.ok || !payload.ok || !payload.user) {
        throw new Error(payload.error ?? t("banDialog.unbanFailed"));
      }

      const updated = payload.user;
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? mergeAdminUser(u, updated) : u))
      );
      setInspectCandidate((prev) =>
        prev?.id === updated.id ? mergeAdminUser(prev, updated) : prev
      );
      toast.success(
        t("banDialog.unbanSuccess", {
          name: getUserLabel(updated, t("fallback.unnamedUser")),
        })
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("banDialog.unbanFailed")
      );
    } finally {
      setPendingBanUserId(null);
    }
  };

  const submitDelete = async (user: AdminUser) => {
    setPendingDeleteUserId(user.id);

    try {
      const response = await fetch(
        `/api/dashboard/users/${encodeURIComponent(user.id)}`,
        { method: "DELETE" }
      );

      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? t("deleteDialog.deleteFailed"));
      }

      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      closeDeleteCandidate();
      if (inspectCandidate?.id === user.id) closeInspectCandidate();
      toast.success(
        t("deleteDialog.deleteSuccess", {
          name: getUserLabel(user, t("fallback.unnamedUser")),
        })
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("deleteDialog.deleteFailed")
      );
    } finally {
      setPendingDeleteUserId(null);
    }
  };

  const columns = useMemo(
    () =>
      getUsersColumns({
        t: t as unknown as Translate,
        currentUserId,
      }),
    [currentUserId, t]
  );
  const segmentedUsers = useMemo(
    () => users.filter(segmentFilters[segment]),
    [users, segment]
  );
  const columnFilters = useMemo(
    () =>
      selectedRoles.length > 0 ? [{ id: "role", value: selectedRoles }] : [],
    [selectedRoles]
  );

  const table = useTable({
    features: dataTableFeatures,
    data: segmentedUsers,
    columns,
    state: {
      globalFilter,
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: { pageIndex: 0, pageSize: 10 },
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const user = row.original;
      const q = filterValue.toLowerCase();
      return (
        (user.name?.toLowerCase().includes(q) ?? false) ||
        (user.email?.toLowerCase().includes(q) ?? false)
      );
    },
  });
  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const roleCounts = table.getColumn("role")?.getFacetedUniqueValues();
  const roleFilterOptions = accountRoles.map((role) => ({
    label: getAccountRoleLabel(role),
    value: role,
    count: roleCounts?.get(role) ?? 0,
  }));

  const segmentCounts = {
    all: users.length,
    staff: users.filter(segmentFilters.staff).length,
    inactive: users.filter(segmentFilters.inactive).length,
    banned: users.filter(segmentFilters.banned).length,
  };
  const hasFilters =
    globalFilter.trim() !== "" || selectedRoles.length > 0 || segment !== "all";
  const clearFilters = () => {
    setGlobalFilter("");
    setSelectedRoles([]);
    setSegment("all");
  };
  const emptyState = hasFilters ? (
    <div className="flex flex-col items-center gap-2 py-6 whitespace-normal">
      <span className="bg-muted text-muted-foreground inline-flex size-10 items-center justify-center rounded-lg">
        <Search className="size-4" aria-hidden="true" />
      </span>
      <p className="text-foreground text-sm font-medium">
        {t("empty.filtered")}
      </p>
      <p className="text-muted-foreground text-sm">{t("empty.filteredHint")}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={clearFilters}
      >
        {t("filters.clear")}
      </Button>
    </div>
  ) : (
    t("empty.default")
  );
  const visibleRows = table.getRowModel().rows;
  const inspectInactive = inspectCandidate
    ? isInactiveAccount(inspectCandidate)
    : false;
  const inspectLastActive =
    inspectCandidate?.lastActiveAt ?? inspectCandidate?.lastLoginAt ?? null;

  return (
    <div className="space-y-4">
      <StatusFilter
        label={t("segments.label")}
        value={segment}
        onChange={setSegment}
        items={[
          { value: "all", label: t("segments.all"), count: segmentCounts.all },
          {
            value: "staff",
            label: t("segments.staff"),
            count: segmentCounts.staff,
          },
          {
            value: "inactive",
            label: t("segments.inactive"),
            count: segmentCounts.inactive,
            attention: true,
          },
          {
            value: "banned",
            label: t("segments.banned"),
            count: segmentCounts.banned,
          },
        ]}
      />

      <DataTableToolbar
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder={t("filters.searchPlaceholder")}
      >
        <DataTableFacetFilter
          title={t("filters.role")}
          selected={selectedRoles}
          options={roleFilterOptions}
          onChange={setSelectedRoles}
        />
      </DataTableToolbar>

      {isMobile ? (
        <ul className="divide-y overflow-hidden rounded-lg border">
          {visibleRows.length > 0 ? (
            visibleRows.map((row) => {
              const user = row.original;
              const lastActive = user.lastActiveAt ?? user.lastLoginAt;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => openInspectCandidate(user)}
                    className="hover:bg-muted/50 flex min-h-14 w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <UserAvatar
                      name={user.name}
                      email={user.email}
                      className="size-9 text-xs"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {getUserLabel(user, t("fallback.unnamedUser"))}
                      </span>
                      <span
                        className={cn(
                          "block truncate text-xs",
                          isInactiveAccount(user)
                            ? "font-medium text-amber-700 dark:text-amber-300"
                            : "text-muted-foreground"
                        )}
                      >
                        {lastActive
                          ? t("mobile.lastActive", {
                              date: formatDate(lastActive),
                            })
                          : (user.email ?? user.id)}
                      </span>
                    </span>
                    {user.bannedAt ? (
                      <ToneBadge tone="destructive">
                        {t("table.banned")}
                      </ToneBadge>
                    ) : user.role !== "user" ? (
                      <ToneBadge tone={roleTone(user.role)}>
                        {getAccountRoleLabel(user.role)}
                      </ToneBadge>
                    ) : null}
                  </button>
                </li>
              );
            })
          ) : (
            <li className="text-muted-foreground px-4 py-6 text-center text-sm">
              {emptyState}
            </li>
          )}
        </ul>
      ) : null}

      <DataTable
        table={table}
        columnsLength={columns.length}
        emptyMessage={emptyState}
        wrapperClassName={isMobile ? "hidden" : undefined}
        onRowClick={(row) => openInspectCandidate(row.original)}
        pagination={{
          summary: (
            <p className="text-muted-foreground text-xs">
              {t("status.showing", {
                filtered: filteredRowCount,
                total: users.length,
              })}
            </p>
          ),
        }}
      />

      <Sheet
        open={inspectCandidate !== null}
        onOpenChange={(open) => {
          if (!open) closeInspectCandidate();
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          {inspectCandidate ? (
            <>
              <SheetHeader className="border-b p-6 pr-12 text-left">
                <div className="flex items-start gap-4">
                  <UserAvatar
                    name={inspectCandidate.name}
                    email={inspectCandidate.email}
                    className="size-10 text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="truncate text-base leading-tight">
                      {getUserLabel(
                        inspectCandidate,
                        t("fallback.unnamedUser")
                      )}
                    </SheetTitle>
                    <SheetDescription className="mt-0.5 truncate">
                      {inspectCandidate.email ?? inspectCandidate.id}
                    </SheetDescription>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {inspectCandidate.bannedAt ? (
                        <ToneBadge tone="destructive">
                          {t("panel.badges.banned")}
                        </ToneBadge>
                      ) : (
                        <ToneBadge tone={roleTone(inspectCandidate.role)}>
                          {getAccountRoleLabel(inspectCandidate.role)}
                        </ToneBadge>
                      )}
                      {inspectCandidate.removalAt ? (
                        <ToneBadge tone="amber">
                          {t("panel.badges.removal", {
                            date: formatDate(inspectCandidate.removalAt),
                          })}
                        </ToneBadge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              {inspectCandidate.bannedAt ? (
                <DetailNotice tone="destructive">
                  {t("panel.messages.bannedSince", {
                    date: formatDate(inspectCandidate.bannedAt),
                    reason: inspectCandidate.banReason ?? "—",
                  })}
                </DetailNotice>
              ) : null}
              {inspectInactive && inspectLastActive ? (
                <DetailNotice tone="amber">
                  {inspectCandidate.removalAt
                    ? t("panel.messages.removalScheduled", {
                        lastActive: formatDate(inspectLastActive),
                        removal: formatDate(inspectCandidate.removalAt),
                      })
                    : t("panel.messages.inactive", {
                        lastActive: formatDate(inspectLastActive),
                      })}
                </DetailNotice>
              ) : null}

              <div className="min-h-0 flex-1 overflow-y-auto">
                {inspectLoading ? (
                  <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
                    <Loader2 className="size-4 animate-spin" />
                    {t("panel.status.loading")}
                  </div>
                ) : inspectData ? (
                  <>
                    <DetailStats
                      items={[
                        {
                          label: t("panel.stats.projects"),
                          value: inspectData.stats.projectCount,
                        },
                        {
                          label: t("panel.stats.shares"),
                          value: inspectData.stats.activeShareCount,
                        },
                        {
                          label: t("panel.stats.gallery"),
                          value: inspectData.stats.galleryEntryCount,
                        },
                        {
                          label: t("panel.stats.apiKeys"),
                          value: inspectData.stats.apiKeyCount,
                        },
                      ]}
                    />

                    <DetailSection title={t("panel.sections.account")}>
                      <DetailList
                        items={[
                          {
                            label: t("panel.fields.memberSince"),
                            value: formatDate(inspectCandidate.createdAt),
                          },
                          {
                            label: t("panel.fields.lastActive"),
                            value: inspectLastActive
                              ? formatDate(inspectLastActive)
                              : "—",
                          },
                          {
                            label: t("panel.fields.lastLogin"),
                            value: inspectCandidate.lastLoginAt
                              ? formatDate(inspectCandidate.lastLoginAt)
                              : "—",
                          },
                          ...(inspectCandidate.removalAt
                            ? [
                                {
                                  label: t("panel.fields.removalDate"),
                                  value: formatDate(inspectCandidate.removalAt),
                                  className:
                                    "font-medium text-amber-700 dark:text-amber-300",
                                },
                              ]
                            : []),
                          {
                            label: t("panel.fields.userId"),
                            value: (
                              <span className="inline-flex items-center gap-1">
                                <span className="text-muted-foreground truncate font-mono text-xs">
                                  {inspectCandidate.id}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground hover:text-foreground size-6 shrink-0"
                                  aria-label={t("panel.actions.copyUserId")}
                                  onClick={() =>
                                    void copyToClipboard(
                                      inspectCandidate.id,
                                      t("panel.fields.userId")
                                    )
                                  }
                                >
                                  <Copy className="size-3.5" />
                                </Button>
                              </span>
                            ),
                          },
                        ]}
                      />
                    </DetailSection>

                    <DetailSection title={t("panel.actions.changeRole")}>
                      {inspectCandidate.id === currentUserId ? (
                        <p className="text-muted-foreground text-sm">
                          {t("panel.messages.cannotChangeOwnRole")}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={pendingUserId === inspectCandidate.id}
                                className="hover:bg-muted hover:text-foreground h-8 flex-1 cursor-pointer justify-between text-xs shadow-none"
                              >
                                {getAccountRoleLabel(
                                  draftRoles[inspectCandidate.id] ??
                                    inspectCandidate.role
                                )}
                                <ChevronDown className="text-muted-foreground size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuRadioGroup
                                value={
                                  draftRoles[inspectCandidate.id] ??
                                  inspectCandidate.role
                                }
                                onValueChange={(val) =>
                                  setDraftRoles((prev) => ({
                                    ...prev,
                                    [inspectCandidate.id]: val as AccountRole,
                                  }))
                                }
                              >
                                {accountRoles.map((role) => (
                                  <DropdownMenuRadioItem
                                    key={role}
                                    value={role}
                                    className="focus:bg-muted focus:text-foreground cursor-pointer"
                                  >
                                    {getAccountRoleLabel(role)}
                                  </DropdownMenuRadioItem>
                                ))}
                              </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            size="sm"
                            className="h-8"
                            disabled={
                              (draftRoles[inspectCandidate.id] ??
                                inspectCandidate.role) ===
                                inspectCandidate.role ||
                              pendingUserId === inspectCandidate.id
                            }
                            onClick={() => void saveRole(inspectCandidate.id)}
                          >
                            {pendingUserId === inspectCandidate.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              t("panel.actions.save")
                            )}
                          </Button>
                        </div>
                      )}
                    </DetailSection>

                    <DetailSection title={t("panel.sections.recentActivity")}>
                      {inspectData.recentEvents.length > 0 ? (
                        <ul className="space-y-2.5">
                          {inspectData.recentEvents.map((event) => {
                            const isActor =
                              event.actorUserId === inspectCandidate.id;
                            return (
                              <li
                                key={event.id}
                                className="flex items-start justify-between gap-3"
                              >
                                <span className="min-w-0 text-sm leading-tight">
                                  {formatAuditEventType(event.eventType)}
                                  <span className="text-muted-foreground mt-0.5 block text-xs">
                                    {isActor
                                      ? t("panel.relation.actor")
                                      : t("panel.relation.target")}
                                  </span>
                                </span>
                                <span className="text-muted-foreground shrink-0 text-xs">
                                  {formatDate(event.createdAt)}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          {t("panel.messages.noAuditEvents")}
                        </p>
                      )}
                    </DetailSection>

                    <DetailSection
                      title={t("panel.actions.moderation")}
                      className="space-y-2"
                    >
                      {inspectCandidate.id === currentUserId ? (
                        <p className="text-muted-foreground text-sm">
                          {t("panel.messages.cannotModerateSelf")}
                        </p>
                      ) : (
                        <>
                          <DangerAction
                            description={
                              inspectCandidate.bannedAt
                                ? t("panel.moderation.unbanDescription")
                                : t("panel.moderation.banDescription")
                            }
                            action={
                              inspectCandidate.bannedAt ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 shrink-0 gap-1.5 px-2.5 text-xs shadow-none"
                                  disabled={
                                    pendingBanUserId === inspectCandidate.id
                                  }
                                  onClick={() =>
                                    void submitUnban(inspectCandidate.id)
                                  }
                                >
                                  {pendingBanUserId === inspectCandidate.id ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <ShieldCheck className="size-3.5" />
                                  )}
                                  {t("panel.actions.unban")}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 shrink-0 gap-1.5 px-2.5 text-xs shadow-none"
                                  onClick={() => {
                                    setBanReasonCode("spam");
                                    setBanReasonDetail("");
                                    setBanCandidate(inspectCandidate);
                                  }}
                                >
                                  <Ban className="size-3.5" />
                                  {t("panel.actions.ban")}
                                </Button>
                              )
                            }
                          />
                          <DangerAction
                            description={t(
                              "panel.moderation.deleteDescription"
                            )}
                            action={
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 shrink-0 gap-1.5 px-2.5 text-xs shadow-none"
                                onClick={() =>
                                  openDeleteCandidate(inspectCandidate)
                                }
                              >
                                <Trash2 className="size-3.5" />
                                {t("panel.actions.delete")}
                              </Button>
                            }
                          />
                        </>
                      )}
                    </DetailSection>
                  </>
                ) : null}
              </div>

              <div className="border-t px-6 py-4">
                <Button asChild variant="outline" className="w-full" size="sm">
                  <Link href="/dashboard/audit" prefetch={false}>
                    <ExternalLink className="size-3.5" />
                    {t("panel.actions.viewFullAuditTrail")}
                  </Link>
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={banCandidate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setBanCandidate(null);
            setBanReasonDetail("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("banDialog.title")}</DialogTitle>
            <DialogDescription>
              {t.rich("banDialog.description", {
                name: banCandidate
                  ? getUserLabel(banCandidate, t("fallback.unnamedUser"))
                  : "",
                strong: (chunks) => (
                  <span className="text-foreground font-medium">{chunks}</span>
                ),
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-muted-foreground text-xs font-medium">
              {t("banDialog.reasonLabel")}
            </label>
            <Select
              value={banReasonCode}
              onValueChange={(value) =>
                setBanReasonCode(value as BanReasonCode)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {banReasonCodes.map((code) => (
                  <SelectItem key={code} value={code}>
                    {getBanReasonLabel(code)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {banReasonCode === "other" && (
            <div className="space-y-2">
              <label
                htmlFor="ban-reason-detail"
                className="text-muted-foreground text-xs font-medium"
              >
                {t("banDialog.reasonDetailLabel")}
              </label>
              <Input
                id="ban-reason-detail"
                value={banReasonDetail}
                onChange={(event) => setBanReasonDetail(event.target.value)}
                placeholder={t("banDialog.reasonPlaceholder")}
                maxLength={500}
              />
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("banDialog.cancel")}</Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={
                !banCandidate ||
                !resolveBanReason() ||
                pendingBanUserId === banCandidate.id
              }
              onClick={() => {
                if (!banCandidate) return;
                void submitBan(banCandidate.id);
              }}
            >
              {banCandidate && pendingBanUserId === banCandidate.id ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("banDialog.banning")}
                </>
              ) : (
                t("banDialog.confirmBan")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteCandidate !== null}
        onOpenChange={(open) => {
          if (!open) closeDeleteCandidate();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
            <DialogDescription>
              {t.rich("deleteDialog.description", {
                name: deleteCandidate
                  ? getUserLabel(deleteCandidate, t("fallback.unnamedUser"))
                  : "",
                strong: (chunks) => (
                  <span className="text-foreground font-medium">{chunks}</span>
                ),
              })}
            </DialogDescription>
          </DialogHeader>

          {deleteCandidate && (
            <div className="grid grid-cols-4 divide-x rounded-md border">
              {[
                {
                  label: t("panel.stats.projects"),
                  value: deleteStats?.projectCount,
                },
                {
                  label: t("panel.stats.shares"),
                  value: deleteStats?.activeShareCount,
                },
                {
                  label: t("panel.stats.gallery"),
                  value: deleteStats?.galleryEntryCount,
                },
                {
                  label: t("panel.stats.apiKeys"),
                  value: deleteStats?.apiKeyCount,
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-0.5 py-3"
                >
                  <span className="text-lg font-semibold tabular-nums">
                    {deleteStatsLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      (value ?? "—")
                    )}
                  </span>
                  <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="text-muted-foreground text-sm">
            {t("deleteDialog.galleryWarning")}
          </p>

          <div className="space-y-2">
            <label
              htmlFor="delete-confirm"
              className="text-muted-foreground text-xs font-medium"
            >
              {t.rich("deleteDialog.confirmLabel", {
                email: deleteCandidate?.email ?? "",
                strong: (chunks) => (
                  <span className="text-foreground font-medium">{chunks}</span>
                ),
              })}
            </label>
            <Input
              id="delete-confirm"
              value={deleteConfirmValue}
              onChange={(event) => setDeleteConfirmValue(event.target.value)}
              placeholder={deleteCandidate?.email ?? ""}
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("deleteDialog.cancel")}</Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={
                !deleteCandidate ||
                !deleteCandidate.email ||
                deleteConfirmValue.trim() !== deleteCandidate.email ||
                pendingDeleteUserId === deleteCandidate.id
              }
              onClick={() => {
                if (!deleteCandidate) return;
                void submitDelete(deleteCandidate);
              }}
            >
              {deleteCandidate && pendingDeleteUserId === deleteCandidate.id ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("deleteDialog.deleting")}
                </>
              ) : (
                t("deleteDialog.confirmDelete")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
