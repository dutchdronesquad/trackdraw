"use client";

import { useState } from "react";
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  accountRoles,
  getAccountRoleLabel,
  type AccountRole,
} from "@/lib/account-roles";
import type { AdminUser } from "@/lib/admin-users";
import DataTable from "@/components/data-table/DataTable";
import DataTableFacetFilter from "@/components/data-table/DataTableFacetFilter";
import { dataTableSortButtonClassName } from "@/components/data-table/DataTableLayout";
import DataTableToolbar from "@/components/data-table/DataTableToolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type DashboardUsersManagerProps = {
  currentUserId: string;
  initialUsers: AdminUser[];
};

function getUserLabel(user: AdminUser) {
  return user.name?.trim() || user.email?.trim() || "Unnamed user";
}

function getSecondaryLabel(user: AdminUser) {
  if (user.name?.trim() && user.email?.trim()) return user.email;
  return user.email?.trim() || user.id;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function roleBadgeClassName(role: AccountRole) {
  if (role === "admin") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
  if (role === "moderator") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-border bg-muted/50 text-muted-foreground";
}

export default function DashboardUsersManager({
  currentUserId,
  initialUsers,
}: DashboardUsersManagerProps) {
  const [users, setUsers] = useState(initialUsers);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<AccountRole[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [draftRoles, setDraftRoles] = useState<Record<string, AccountRole>>(
    Object.fromEntries(initialUsers.map((u) => [u.id, u.role]))
  );

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
        throw new Error(payload.error ?? "Could not update role");
      }

      const updated = payload.user;
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setDraftRoles((prev) => ({ ...prev, [updated.id]: updated.role }));
      toast.success(
        `Updated ${getUserLabel(updated)} to ${getAccountRoleLabel(updated.role)}.`
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not update the selected role."
      );
    } finally {
      setPendingUserId(null);
    }
  };

  const columns: ColumnDef<AdminUser>[] = [
    {
      id: "user",
      accessorFn: (row) => getUserLabel(row),
      meta: { className: "w-[40%] min-w-56" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={dataTableSortButtonClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          User
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const user = row.original;
        const isSelf = user.id === currentUserId;
        return (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {getUserLabel(user)}
              {isSelf && (
                <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                  (you)
                </span>
              )}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {getSecondaryLabel(user)}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      meta: { className: "w-32" },
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={roleBadgeClassName(row.original.role)}
        >
          {getAccountRoleLabel(row.original.role)}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      meta: { className: "hidden w-36 sm:table-cell" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className={dataTableSortButtonClassName}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="text-muted-foreground ml-1 size-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "changeRole",
      header: "Change role",
      meta: { className: "w-56" },
      cell: ({ row }) => {
        const user = row.original;
        const draftRole = draftRoles[user.id] ?? user.role;
        const isPending = pendingUserId === user.id;
        const isDirty = draftRole !== user.role;

        return (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  className="hover:bg-muted hover:text-foreground h-8 min-w-28 cursor-pointer justify-between gap-2 rounded-lg px-2.5 text-xs shadow-none"
                >
                  {getAccountRoleLabel(draftRole)}
                  <ChevronDown className="text-muted-foreground size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuRadioGroup
                  value={draftRole}
                  onValueChange={(val) =>
                    setDraftRoles((prev) => ({
                      ...prev,
                      [user.id]: val as AccountRole,
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
              variant="outline"
              className={cn(
                "hover:bg-muted hover:text-foreground h-8 cursor-pointer rounded-lg px-3 text-xs shadow-none",
                isDirty &&
                  "border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background"
              )}
              onClick={() => void saveRole(user.id)}
              disabled={!isDirty || isPending}
            >
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: users,
    columns,
    state: { globalFilter, sorting },
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
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const rowsForCurrentSearch = table.getRowModel().rows;
  const filteredRows = rowsForCurrentSearch.filter((row) =>
    selectedRoles.length === 0
      ? true
      : selectedRoles.includes(row.original.role)
  );
  const roleFilterOptions = accountRoles.map((role) => ({
    label: getAccountRoleLabel(role),
    value: role,
    count: rowsForCurrentSearch.filter((row) => row.original.role === role)
      .length,
  }));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <DataTableToolbar
          searchValue={globalFilter}
          onSearchChange={setGlobalFilter}
          searchPlaceholder="Search by name or email..."
          className="pb-3"
        >
          <DataTableFacetFilter
            title="Role"
            selected={selectedRoles}
            options={roleFilterOptions}
            onChange={setSelectedRoles}
          />
        </DataTableToolbar>

        <DataTable
          table={table}
          rows={filteredRows}
          columnsLength={columns.length}
          emptyMessage="No users found."
        />

        <p className="text-muted-foreground mt-3 text-xs">
          Showing {filteredRows.length} of {users.length} accounts.
        </p>
      </div>
    </div>
  );
}
