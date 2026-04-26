"use client";

import { useState } from "react";
import {
  type ColumnDef,
  flexRender,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

function roleBadgeVariant(role: AccountRole): "default" | "muted" | "outline" {
  if (role === "admin") return "default";
  if (role === "moderator") return "muted";
  return "outline";
}

export default function DashboardUsersManager({
  currentUserId,
  initialUsers,
}: DashboardUsersManagerProps) {
  const [users, setUsers] = useState(initialUsers);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState("");
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
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
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
      cell: ({ row }) => (
        <Badge variant={roleBadgeVariant(row.original.role)}>
          {getAccountRoleLabel(row.original.role)}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      meta: { className: "hidden sm:table-cell" },
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
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
      cell: ({ row }) => {
        const user = row.original;
        const draftRole = draftRoles[user.id] ?? user.role;
        const isPending = pendingUserId === user.id;
        const isDirty = draftRole !== user.role;

        return (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    className="min-w-28 justify-between gap-2"
                  />
                }
              >
                {getAccountRoleLabel(draftRole)}
                <ChevronDown className="text-muted-foreground size-3.5" />
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
                    <DropdownMenuRadioItem key={role} value={role}>
                      {getAccountRoleLabel(role)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              variant={isDirty ? "default" : "outline"}
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

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <div className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search by name or email…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full sm:max-w-xs"
          />
        </div>

        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={[
                        "h-9 px-2.5 py-2",
                        (
                          header.column.columnDef.meta as
                            | { className?: string }
                            | undefined
                        )?.className,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={[
                          "px-2.5 py-2",
                          (
                            cell.column.columnDef.meta as
                              | { className?: string }
                              | undefined
                          )?.className,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-muted-foreground h-24 text-center"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-muted-foreground mt-3 text-xs">
          Showing {table.getFilteredRowModel().rows.length} of {users.length}{" "}
          accounts.
        </p>
      </div>
    </div>
  );
}
