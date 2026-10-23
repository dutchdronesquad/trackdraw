"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Circle,
  CalendarDays,
  Folder,
  ChevronRight,
  Info,
  Loader2,
  Search,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
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
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ToneBadge from "@/components/dashboard/ToneBadge";
import UserAvatar from "@/components/UserAvatar";
import { TeamSuccession } from "@/components/teams/TeamSuccession";
import type { AdminTeam, AdminTeamMember } from "@/lib/admin-teams";
import { cn } from "@/lib/utils";

export default function TeamsManager() {
  const t = useTranslations("dashboard.teams"),
    common = useTranslations("common");
  const mobile = useIsMobile();
  const [now, setNow] = useState(Date.now);
  const [teams, setTeams] = useState<AdminTeam[]>([]),
    [search, setSearch] = useState(""),
    [attention, setAttention] = useState(false),
    [cursor, setCursor] = useState(""),
    [next, setNext] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminTeam | null>(null),
    [members, setMembers] = useState<AdminTeamMember[]>([]);
  const [loading, setLoading] = useState(true),
    [detailLoading, setDetailLoading] = useState(false),
    [listError, setListError] = useState(false),
    [detailError, setDetailError] = useState(false),
    [revision, setRevision] = useState(0);
  const [changing, setChanging] = useState(false),
    [target, setTarget] = useState(""),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [changeError, setChangeError] = useState(false);
  const submitLock = useRef(false),
    trigger = useRef<HTMLButtonElement | null>(null);
  const selectedId = selected?.id;
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setListError(false);
      void fetch(
        `/api/admin/teams?${new URLSearchParams({ search, after: cursor, attention: attention ? "1" : "0" })}`,
        { cache: "no-store", signal: controller.signal }
      )
        .then(async (response) => {
          if (!response.ok) throw new Error("failed");
          const data = await response.json();
          if (!controller.signal.aborted) {
            setTeams(data.teams);
            setNext(data.next);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setListError(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, attention, cursor, revision]);
  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    void fetch(
      `/api/admin/teams?${new URLSearchParams({ teamId: selectedId })}`,
      { cache: "no-store", signal: controller.signal }
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("failed");
        const data = await response.json();
        if (!controller.signal.aborted) {
          setMembers(data.members);
          setDetailError(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setDetailError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [selectedId, revision]);
  useEffect(() => {
    const focus = () => {
      setNow(Date.now());
      if (!submitLock.current && document.visibilityState !== "hidden")
        refresh();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [refresh]);
  // Keep the inspected summary current after focus refreshes and owner corrections.
  const current = teams.find((team) => team.id === selectedId) ?? selected;
  const status = (team: AdminTeam) => (
    <ToneBadge
      className="gap-1 rounded-full px-2.5 py-1 text-xs font-medium tracking-normal normal-case"
      tone={
        team.state === "open"
          ? "amber"
          : team.state === "recovery"
            ? "sky"
            : "neutral"
      }
    >
      <Circle className="size-2 fill-current stroke-none" aria-hidden="true" />
      {t(`status.${team.state}`)}
    </ToneBadge>
  );
  const close = () => {
    if (!changing) {
      setSelected(null);
      setMembers([]);
      trigger.current?.focus();
    }
  };
  async function changeOwner() {
    if (!current || !target || !reason.trim() || submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    setChangeError(false);
    try {
      const response = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: current.id,
          ownerId: current.ownerId,
          targetId: target,
          reason,
        }),
      });
      if (!response.ok) throw new Error("failed");
      setSelected({
        ...current,
        ownerId: target,
        ownerName: members.find((m) => m.id === target)?.name ?? null,
        state: "active",
        deadline: null,
      });
      setChanging(false);
      setTarget("");
      setReason("");
      toast.success(t("ownerChanged"));
      refresh();
      window.dispatchEvent(new Event("trackdraw:team-access-changed"));
    } catch {
      setChangeError(true);
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }
  const detail = current && (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-6">
        <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 border-b py-4 text-sm">
          <span className="flex items-center gap-2">
            <Users className="size-4" />
            {t("memberCount", { count: current.memberCount })}
          </span>
          <span className="flex items-center gap-2">
            <Folder className="size-4" />
            {t("projectCount", { count: current.projectCount })}
          </span>
          {current.deadline && (
            <span className="flex items-center gap-2">
              <CalendarDays className="size-4" />
              {t(
                current.state === "recovery" ? "recoveryEnds" : "ownerRemoval",
                { date: new Date(current.deadline).toLocaleDateString() }
              )}
            </span>
          )}
        </div>
        <section className="border-b pt-5 pb-0">
          <h3 className="mb-3 text-lg font-semibold">{t("members")}</h3>
          {detailLoading ? (
            <p
              className="text-muted-foreground flex items-center gap-2 text-sm"
              role="status"
            >
              <Loader2 className="size-4 animate-spin" />
              {t("loading")}
            </p>
          ) : detailError ? (
            <p className="text-destructive text-sm" role="alert">
              {t("failed")}{" "}
              <Button variant="ghost" size="sm" onClick={refresh}>
                {t("retry")}
              </Button>
            </p>
          ) : (
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-0">{t("name")}</TableHead>
                  <TableHead className="w-24">{t("role")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="py-2.5 pl-0">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={m.name}
                          className={cn(
                            "size-8 text-xs",
                            m.role === "owner"
                              ? "bg-muted text-muted-foreground"
                              : m.role === "editor"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200"
                                : "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200"
                          )}
                        />
                        <span className="min-w-0 break-words whitespace-normal">
                          {m.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{t(`roles.${m.role}`)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
        <div className="py-5 empty:hidden">
          <TeamSuccession
            key={`${current.id}-${revision}`}
            admin
            teamId={current.id}
            onChange={refresh}
          />
        </div>
      </div>
      <div className="shrink-0 space-y-3 border-t px-6 py-5">
        <Button
          variant="outline"
          className="border-primary text-primary hover:bg-primary/5 hover:text-primary h-11 px-5 text-base shadow-none"
          disabled={
            detailLoading ||
            detailError ||
            !members.some((m) => m.canOwn) ||
            (current.state === "recovery" &&
              !!current.deadline &&
              Date.parse(current.deadline) <= now)
          }
          onClick={() => {
            setTarget("");
            setReason("");
            setChangeError(false);
            setChanging(true);
          }}
        >
          {t("changeOwner")}
        </Button>
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Info className="size-4 shrink-0" />
          {t("auditHint")}
        </p>
      </div>
    </>
  );
  const title = current && (
    <div className="space-y-3">
      <span className="block truncate pr-8 text-2xl font-bold">
        {current.name}
      </span>
      {status(current)}
    </div>
  );
  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-[32px] leading-tight font-bold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-base">{t("intro")}</p>
        </div>
        <div className="relative max-w-lg">
          <Search className="text-muted-foreground pointer-events-none absolute top-3.5 left-3.5 size-4" />
          <Input
            className="h-11 pl-10 text-base shadow-none md:text-base"
            aria-label={t("search")}
            placeholder={t("search")}
            value={search}
            maxLength={200}
            onChange={(e) => {
              setSearch(e.target.value);
              setCursor("");
            }}
          />
        </div>
        <Tabs
          value={attention ? "attention" : "all"}
          onValueChange={(value) => {
            setAttention(value === "attention");
            setCursor("");
          }}
        >
          <TabsList className="h-auto w-full justify-start gap-5 rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              className="data-[state=active]:border-primary data-[state=active]:text-primary rounded-none border-b-2 border-transparent px-1 pb-3 text-[15px] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              value="all"
            >
              {t("all")}
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:border-primary data-[state=active]:text-primary rounded-none border-b-2 border-transparent px-1 pb-3 text-[15px] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              value="attention"
            >
              {t("attention")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {listError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("failed")}{" "}
            <Button variant="ghost" onClick={refresh}>
              {t("retry")}
            </Button>
          </p>
        ) : (
          <div aria-busy={loading} className={cn(loading && "opacity-60")}>
            <Table className="text-[15px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("team")}</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    {t("owner")}
                  </TableHead>
                  <TableHead className="hidden text-right tabular-nums sm:table-cell">
                    {t("members")}
                  </TableHead>
                  <TableHead className="hidden text-right tabular-nums sm:table-cell">
                    {t("projects")}
                  </TableHead>
                  <TableHead>{t("statusLabel")}</TableHead>
                  <TableHead className="w-8">
                    <span className="sr-only">{t("details")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow
                    key={team.id}
                    className="data-[state=selected]:bg-primary/5"
                    data-state={selectedId === team.id ? "selected" : undefined}
                  >
                    <TableCell className="py-4 font-medium">
                      <Button
                        variant="link"
                        className="text-foreground h-auto max-w-64 justify-start p-0 text-left text-[15px] font-normal whitespace-normal hover:no-underline"
                        onClick={(event) => {
                          trigger.current = event.currentTarget;
                          setDetailLoading(true);
                          setDetailError(false);
                          setMembers([]);
                          setSelected(team);
                        }}
                      >
                        {team.name}
                      </Button>
                      <p className="text-muted-foreground mt-1 text-xs sm:hidden">
                        {team.ownerName || t("noOwner")}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {team.ownerName || t("noOwner")}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {team.memberCount}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {team.projectCount}
                    </TableCell>
                    <TableCell>{status(team)}</TableCell>
                    <TableCell>
                      <ChevronRight className="text-muted-foreground size-4" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!teams.length && (
              <p
                role="status"
                className="text-muted-foreground py-10 text-center text-sm"
              >
                {t(loading ? "loading" : "empty")}
              </p>
            )}
          </div>
        )}
        {(cursor || next) && (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!cursor || loading}
              onClick={() => setCursor("")}
            >
              {t("firstPage")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!next || loading}
              onClick={() => {
                if (next) setCursor(next);
              }}
            >
              {t("nextPage")}
            </Button>
          </div>
        )}
      </div>
      {mobile ? (
        <Drawer
          open={!!current}
          onOpenChange={(open) => {
            if (!open) close();
          }}
        >
          <DrawerContent className="h-[88dvh] data-[vaul-drawer-direction=bottom]:max-h-[88dvh]">
            <DrawerHeader className="relative border-b px-6 py-5 text-left">
              <DrawerTitle asChild>
                <div>{title}</div>
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                {t("details")}
              </DrawerDescription>
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={common("actions.close")}
                  className="absolute top-4 right-3"
                >
                  <X className="size-4" />
                </Button>
              </DrawerClose>
            </DrawerHeader>
            {detail}
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet
          open={!!current}
          onOpenChange={(open) => {
            if (!open) close();
          }}
        >
          <SheetContent
            className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
            onInteractOutside={(event) => {
              if (changing) event.preventDefault();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              trigger.current?.focus();
            }}
          >
            <SheetHeader className="shrink-0 px-6 pt-10 pb-2 text-left">
              <SheetTitle asChild>
                <div>{title}</div>
              </SheetTitle>
              <SheetDescription className="sr-only">
                {t("details")}
              </SheetDescription>
            </SheetHeader>
            {detail}
          </SheetContent>
        </Sheet>
      )}
      <Dialog
        open={changing}
        onOpenChange={(open) => {
          if (!busy) setChanging(open);
        }}
      >
        <DialogContent role="alertdialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("changeOwner")}</DialogTitle>
            <DialogDescription>
              {t("changeDescription", { team: current?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="team-new-owner">
                {t("newOwner")}
              </label>
              <Select value={target} onValueChange={setTarget} disabled={busy}>
                <SelectTrigger id="team-new-owner" className="h-9 w-full">
                  <SelectValue placeholder={t("chooseEditor")} />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter((m) => m.canOwn)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="team-owner-reason"
              >
                {t("reason")}
              </label>
              <Input
                id="team-owner-reason"
                className="h-9"
                value={reason}
                maxLength={1000}
                disabled={busy}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              {t("changeConsequence")}
            </p>
            {changeError && (
              <p role="alert" className="text-destructive text-sm">
                {t("changeFailed")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setChanging(false)}
            >
              {common("actions.cancel")}
            </Button>
            <Button
              disabled={busy || !target || !reason.trim()}
              onClick={() => void changeOwner()}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t("changeOwner")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
