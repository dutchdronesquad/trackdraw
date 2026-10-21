"use client";
import { useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TeamCommand, TeamDetails, TeamOverview } from "@/lib/teams";
import { teamRequest, TeamRequestError } from "./team-client";
import { Invitations } from "./Invitations";
import { useTeamDialogState } from "./TeamDialogState";
import { TeamManagement } from "./TeamManagement";

export function TeamsView() {
  const t = useTranslations("dialogs.teams");
  const {
    overview,
    setOverview,
    team,
    setTeam,
    selected,
    setSelected,
    name,
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
  } = useTeamDialogState();
  const load = useCallback(
    async (preferred?: string) => {
      const data = await teamRequest<TeamOverview>();
      setOverview(data);
      const id = data.teams.some((item) => item.id === preferred)
        ? preferred
        : data.teams[0]?.id;
      setSelected(id ?? "");
      if (id) {
        const detail = await teamRequest<{ team: TeamDetails }>({ teamId: id });
        setTeam(detail.team);
      } else setTeam(null);
    },
    [setOverview, setSelected, setTeam]
  );
  useEffect(() => {
    let cancelled = false;
    void teamRequest<TeamOverview>()
      .then((data) => {
        if (!cancelled) {
          setOverview(data);
          setSelected((current) =>
            data.teams.some((item) => item.id === current) ? current : ""
          );
          setTeam((current) => {
            if (!current) return null;
            const membership = data.teams.find(
              (item) => item.id === current.id
            );
            return membership
              ? {
                  ...current,
                  ...membership,
                  ...(membership.role !== "owner"
                    ? { members: [], invitations: [] }
                    : {}),
                }
              : null;
          });
        }
      })
      .catch(() => {
        if (!cancelled) setError("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [setOverview, setError, setSelected, setTeam]);
  async function choose(id: string) {
    setSelected(id);
    setRenameDraft(null);
    setEmail("");
    setRole("editor");
    setConfirm(null);
    setTeam(null);
    setBusy(true);
    setError(null);
    try {
      const data = await teamRequest<{ team: TeamDetails }>({ teamId: id });
      setTeam(data.team);
    } catch (e) {
      setError(e instanceof TeamRequestError ? e.code : "failed");
    } finally {
      setBusy(false);
    }
  }
  async function command(input: TeamCommand) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(false);
    try {
      const result = await teamRequest<{ teamId: string }>({ command: input });
      await load(result.teamId);
      if (input.action === "create") setName("");
      if (input.action === "rename" || input.action === "create")
        setRenameDraft(null);
      if (input.action === "invite") setEmail("");
      setNotice(true);
    } catch (e) {
      setTeam(null);
      setError(e instanceof TeamRequestError ? e.code : "failed");
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
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
  return (
    <div className="space-y-6" aria-busy={busy}>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {t(`errors.${error}`)}
        </p>
      )}
      {notice && (
        <p className="text-muted-foreground text-sm" role="status">
          {t("saved")}
        </p>
      )}
      {!overview ? (
        error ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void refresh()}
          >
            {t("refresh")}
          </Button>
        ) : (
          <p className="text-muted-foreground text-sm">{t("loading")}</p>
        )
      ) : !overview.enabled ? (
        <p className="text-muted-foreground text-sm">{t("errors.disabled")}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{t("yourTeams")}</h3>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void refresh()}
            >
              {t("refresh")}
            </Button>
          </div>
          {overview.teams.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
          ) : (
            <label className="block text-sm">
              {t("selectTeam")}
              <select
                className="border-input bg-background mt-2 h-10 w-full rounded-md border px-3"
                value={selected}
                disabled={busy}
                onChange={(e) => void choose(e.target.value)}
              >
                <option value="" disabled>
                  {t("selectTeam")}
                </option>
                {overview.teams.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {t(`roles.${item.role}`)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {team && (
            <TeamManagement
              key={`${team.id}:${team.name}:${team.role}`}
              team={team}
              busy={busy}
              onCommand={(input) => void command(input)}
            />
          )}
          <section className="border-border/60 space-y-3 border-t pt-5">
            <h3 className="text-sm font-semibold">{t("createTitle")}</h3>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void command({ action: "create", name });
              }}
            >
              <label className="block text-sm">
                {t("teamName")}
                <Input
                  className="mt-2"
                  value={name}
                  maxLength={80}
                  required
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <Button type="submit" disabled={busy || !name.trim()}>
                {t("create")}
              </Button>
            </form>
          </section>
          <section className="border-border/60 border-t pt-5">
            <h3 className="text-sm font-semibold">{t("invitations")}</h3>
            <Invitations
              items={overview.invitations.filter(
                (item) => item.status === "pending" || item.status === "expired"
              )}
              busy={busy}
              onAccept={(id) =>
                void command({ action: "accept", invitationId: id })
              }
            />
          </section>
        </>
      )}
    </div>
  );
}
