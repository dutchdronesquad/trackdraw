"use client";
import { useCallback, useEffect, useRef } from "react";
import { ArrowLeft, ChevronRight, Plus, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { TeamCommand, TeamDetails, TeamOverview } from "@/lib/teams";
import { teamRequest, TeamRequestError } from "./team-client";
import { Invitations } from "./Invitations";
import { useTeamDialogState } from "./TeamDialogState";
import { TeamManagement } from "./TeamManagement";
import { TeamForms } from "./TeamForms";
import { TeamEmptyState } from "./TeamEmptyState";
import { TeamAvatar } from "./TeamAvatar";
import { TeamActions } from "./TeamActions";

export function TeamsView() {
  const t = useTranslations("dialogs.teams");
  const {
    screen,
    setScreen,
    overview,
    setOverview,
    team,
    setTeam,
    selected,
    setSelected,
    setName,
    busy,
    setBusy,
    error,
    setError,
    notice,
    setNotice,
    setRenameDraft,
    setEmail,
    setRole,
    setConfirm,
    setDeleteConfirmation,
  } = useTeamDialogState();
  const heading = useRef<HTMLHeadingElement>(null);
  const initialSelection = useRef(selected);
  const requestVersion = useRef(0);
  const mounted = useRef(false);
  const load = useCallback(
    async (preferred?: string) => {
      const data = await teamRequest<TeamOverview>();
      setOverview(data);
      const id = data.teams.some((item) => item.id === preferred)
        ? preferred
        : undefined;
      setSelected(id ?? "");
      if (id) {
        const detail = await teamRequest<{ team: TeamDetails }>({ teamId: id });
        setTeam(detail.team);
      } else {
        setTeam(null);
        setScreen("overview");
      }
    },
    [setOverview, setSelected, setTeam, setScreen]
  );
  useEffect(() => {
    let cancelled = false;
    const version = requestVersion.current;
    void teamRequest<TeamOverview>()
      .then(async (data) => {
        if (cancelled || version !== requestVersion.current) return;
        setOverview(data);
        const id = initialSelection.current;
        if (id && data.teams.some((item) => item.id === id)) {
          // Refresh live rights when the responsive portal remounts; never retain a stale roster.
          setTeam((current) =>
            current &&
            data.teams.find((item) => item.id === id)?.role === "owner"
              ? current
              : null
          );
          const detail = await teamRequest<{ team: TeamDetails }>({
            teamId: id,
          });
          if (!cancelled && version === requestVersion.current)
            setTeam(detail.team);
        } else if (id) {
          setSelected("");
          setTeam(null);
          setScreen("overview");
        }
      })
      .catch(() => {
        if (!cancelled && version === requestVersion.current) {
          setTeam(null);
          setError("failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [setOverview, setError, setSelected, setTeam, setScreen]);
  useEffect(() => {
    if (mounted.current) heading.current?.focus({ preventScroll: true });
    mounted.current = true;
  }, [screen]);
  function navigate(next: typeof screen) {
    if (busy) return;
    setError(null);
    setNotice(false);
    setConfirm(null);
    setScreen(next);
  }
  async function choose(id: string) {
    if (busy) return;
    requestVersion.current += 1;
    setSelected(id);
    setRenameDraft(null);
    setEmail("");
    setRole("editor");
    setConfirm(null);
    setTeam(null);
    setBusy(true);
    setError(null);
    setNotice(false);
    setScreen("detail");
    try {
      setTeam((await teamRequest<{ team: TeamDetails }>({ teamId: id })).team);
    } catch (e) {
      setError(e instanceof TeamRequestError ? e.code : "failed");
    } finally {
      setBusy(false);
    }
  }
  async function command(input: TeamCommand) {
    if (busy) return;
    requestVersion.current += 1;
    setBusy(true);
    setError(null);
    setNotice(false);
    try {
      const result = await teamRequest<{ teamId: string }>({ command: input });
      await load(result.teamId);
      setConfirm(null);
      if (input.action === "create") setName("");
      if (input.action === "rename" || input.action === "create")
        setRenameDraft(null);
      if (input.action === "invite") setEmail("");
      if (["invite", "rename", "create", "accept"].includes(input.action))
        setScreen("detail");
      setNotice(true);
    } catch (e) {
      const code = e instanceof TeamRequestError ? e.code : "failed";
      if (code === "not_found" || code === "unauthorized") {
        setTeam(null);
        setScreen("overview");
      }
      setError(code);
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    if (busy) return;
    requestVersion.current += 1;
    setBusy(true);
    setError(null);
    setTeam(null);
    try {
      await load(selected);
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  }
  const form =
    screen === "create" || screen === "rename" || screen === "invite";
  const title =
    screen === "overview"
      ? t("title")
      : screen === "create"
        ? t("createTitle")
        : screen === "rename"
          ? t("renameTitle")
          : screen === "invite"
            ? t("inviteTitle")
            : (team?.name ?? t("title"));
  const received =
    overview?.invitations.filter(
      (item) =>
        item.status === "pending" ||
        item.status === "expired" ||
        item.status === "sending"
    ) ?? [];
  return (
    <div className="space-y-5" aria-busy={busy}>
      {screen !== "overview" && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-2 h-8 gap-2 rounded-lg px-2.5 text-xs"
          disabled={busy}
          onClick={() =>
            navigate(
              screen === "invite" || screen === "rename" ? "detail" : "overview"
            )
          }
        >
          <ArrowLeft className="size-4" />
          {screen === "invite" || screen === "rename"
            ? (team?.name ?? t("title"))
            : t("title")}
        </Button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {screen === "create" && (
            <div className="bg-brand-primary/8 text-brand-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
              <UsersRound className="size-5" aria-hidden="true" />
            </div>
          )}
          {screen === "detail" && team && (
            <TeamAvatar name={team.name} square />
          )}
          <div
            className={screen === "overview" ? "min-w-0 md:hidden" : "min-w-0"}
          >
            <h2
              ref={heading}
              tabIndex={-1}
              className="text-foreground text-[15px] leading-snug font-semibold tracking-[-0.01em] break-words outline-none"
            >
              {title}
            </h2>
            {screen === "overview" && (
              <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
                {t("description")}
              </p>
            )}
            {screen === "create" && (
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {t("createDescription")}
              </p>
            )}
            {screen === "invite" && team && (
              <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
                {t("inviteDescription", { team: team.name })}
              </p>
            )}
          </div>
          {screen === "detail" && team && (
            <>
              {" "}
              <TeamActions label={t("teamActions")} busy={busy}>
                <DropdownMenuItem onSelect={() => void refresh()}>
                  {t("refresh")}
                </DropdownMenuItem>
                {team.role === "owner" ? (
                  <>
                    <DropdownMenuItem onSelect={() => navigate("rename")}>
                      {t("renameTitle")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={() => {
                        setDeleteConfirmation("");
                        setConfirm("delete");
                      }}
                    >
                      {t("lifecycle.deleteAction")}
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => setConfirm("leave")}
                  >
                    {t("leave")}
                  </DropdownMenuItem>
                )}
              </TeamActions>{" "}
            </>
          )}
        </div>
        {overview && overview.teams.length > 0 && screen === "overview" && (
          <Button
            className="ml-auto h-8 rounded-lg px-2.5"
            disabled={busy}
            onClick={() => navigate("create")}
          >
            <Plus className="size-4" />
            {t("create")}
          </Button>
        )}
        {screen === "detail" && team && (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {team.role === "owner" && (
              <Button
                className="h-8 w-full rounded-lg px-2.5 sm:w-auto"
                disabled={busy}
                onClick={() => navigate("invite")}
              >
                <Plus className="size-4" />
                {t("inviteMember")}
              </Button>
            )}
          </div>
        )}
      </div>
      {error && (
        <div className="space-y-3">
          <p className="text-destructive text-sm" role="alert">
            {t(`errors.${error}`)}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void refresh()}
          >
            {t("refresh")}
          </Button>
        </div>
      )}
      {notice && (
        <p className="text-muted-foreground text-sm" role="status">
          {t("saved")}
        </p>
      )}
      {!overview ? (
        !error && (
          <p className="text-muted-foreground text-sm">{t("loading")}</p>
        )
      ) : (
        <>
          {screen === "overview" && (
            <div className="flex flex-col">
              {received.length > 0 && (
                <section aria-label={t("invitations")} className="mb-5">
                  <h3 className="text-muted-foreground border-border/60 border-b pb-3 text-sm font-medium">
                    {t("invitations")}
                  </h3>
                  <Invitations
                    items={received}
                    busy={busy}
                    onAccept={(id) =>
                      void command({ action: "accept", invitationId: id })
                    }
                  />
                </section>
              )}
              {overview.teams.length === 0 ? (
                <TeamEmptyState
                  busy={busy}
                  onCreate={() => navigate("create")}
                  hasInvitations={received.length > 0}
                />
              ) : (
                <ul className="divide-border/60 border-border/60 divide-y border-y">
                  {overview.teams.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="hover:bg-muted/40 focus-visible:ring-ring flex w-full cursor-pointer items-center gap-3 rounded-sm py-3 text-left transition-colors outline-none focus-visible:ring-2 disabled:cursor-wait disabled:opacity-50"
                        disabled={busy}
                        onClick={() => void choose(item.id)}
                      >
                        <TeamAvatar name={item.name} square />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium break-words">
                            {item.name}
                          </span>
                          <span className="text-muted-foreground mt-0.5 block text-xs">
                            {t(`roles.${item.role}`)}
                          </span>
                        </span>
                        <ChevronRight className="text-muted-foreground mr-1 size-4 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {screen === "detail" &&
            (team ? (
              <TeamManagement
                team={team}
                busy={busy}
                onCommand={(input) => void command(input)}
              />
            ) : (
              !error && (
                <p className="text-muted-foreground text-sm">{t("loading")}</p>
              )
            ))}
          {form && (screen === "create" || team?.role === "owner") && (
            <TeamForms
              onCommand={(input) => void command(input)}
              onCancel={() =>
                navigate(screen === "create" ? "overview" : "detail")
              }
            />
          )}
        </>
      )}
    </div>
  );
}
