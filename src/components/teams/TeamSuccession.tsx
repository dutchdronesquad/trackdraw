"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronDown, Circle, CircleDot, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import ToneBadge from "@/components/dashboard/ToneBadge";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";
import type { SuccessionCase, SuccessionCommand } from "@/lib/team-succession";
const expired = (c: SuccessionCase) =>
  c.state === "recovery" && !!c.purgeAt && Date.parse(c.purgeAt) <= Date.now();
export function TeamSuccession({
  teamId,
  admin = false,
  onChange,
}: {
  teamId?: string;
  admin?: boolean;
  onChange?: () => void;
}) {
  const t = useTranslations("dialogs.teams.succession");
  const [cases, setCases] = useState<SuccessionCase[]>([]),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<SuccessionCommand | null>(null),
    [reason, setReason] = useState("");
  const submitting = useRef(false);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(
        `/api/teams/succession?${new URLSearchParams({ ...(admin ? { admin: "1" } : {}), ...(teamId ? { teamId } : {}) })}`,
        { cache: "no-store", credentials: "same-origin", signal }
      );
      if (!response.ok) throw new Error("failed");
      const body = await response.json();
      if (!signal?.aborted) {
        setCases(body.cases ?? []);
        setError(false);
      }
    },
    [teamId, admin]
  );
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      if (!submitting.current && document.visibilityState !== "hidden")
        void load(controller.signal).catch(() => {
          if (!controller.signal.aborted) setError(true);
        });
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("trackdraw:team-access-changed", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("trackdraw:team-access-changed", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);
  async function submit() {
    if (!pending || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(false);
    try {
      const response = await fetch("/api/teams/succession", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pending, reason }),
      });
      if (!response.ok) throw new Error("failed");
      await load();
      setPending(null);
      setReason("");
      toast.success(t("saved"));
      onChange?.();
      window.dispatchEvent(new Event("trackdraw:team-access-changed"));
    } catch {
      setError(true);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  if (!cases.length && !error) return null;
  return (
    <section aria-label={t("title")} className="space-y-4">
      <h3 className={admin ? "text-xl font-semibold" : "text-sm font-semibold"}>
        {t("title")}
      </h3>
      {error && !pending && (
        <p role="alert" className="text-destructive text-sm">
          {t("failed")}{" "}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setError(false);
              void load().catch(() => setError(true));
            }}
          >
            {t("retry")}
          </Button>
        </p>
      )}
      {cases.map((c) => (
        <div key={c.id} className="space-y-4">
          {!teamId && <p className="font-medium">{c.teamName}</p>}
          {!admin && c.state !== "resolved" && (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t(c.state === "recovery" ? "recovery" : "risk", {
                date: new Date(c.purgeAt ?? c.removalAt).toLocaleDateString(),
              })}
            </p>
          )}
          {c.state === "recovery" && (
            <p className="text-muted-foreground text-sm">{t("readOnly")}</p>
          )}
          {expired(c) && (
            <p className="text-muted-foreground text-sm">
              {t("deadlinePassed")}
            </p>
          )}
          {!admin && c.state !== "resolved" && (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("firstCompleted")}
            </p>
          )}
          {!admin && c.canApply && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy || expired(c)}
              onClick={() => setPending({ caseId: c.id, action: "apply" })}
            >
              {t("apply")}
            </Button>
          )}
          <ul className="space-y-3">
            {c.applications
              .filter(
                (a) => !a.withdrawnAt && a.eligible && c.state !== "resolved"
              )
              .map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p
                      className={
                        admin
                          ? "text-base font-medium break-words"
                          : "text-sm font-medium break-words"
                      }
                    >
                      {t("requestedBy", { name: a.name })}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {new Date(a.requestedAt).toLocaleDateString()}
                    </p>
                    {admin && !a.responseAt ? (
                      <div className="space-y-2 pt-2">
                        <ToneBadge
                          tone="sky"
                          className="gap-1 rounded-full px-2.5 py-1 text-sm font-medium tracking-normal normal-case"
                        >
                          <Circle
                            className="size-2 fill-current stroke-none"
                            aria-hidden="true"
                          />
                          {t("awaitingDelivery")}
                        </ToneBadge>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {t("deliveryPeriod")}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        {a.responseAt
                          ? t("response", {
                              date: new Date(a.responseAt).toLocaleDateString(),
                            })
                          : t("sending")}
                      </p>
                    )}
                  </div>
                  {!admin && a.userId === c.viewerId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy || expired(c)}
                      onClick={() =>
                        setPending({ caseId: c.id, action: "withdraw" })
                      }
                    >
                      {t("withdraw")}
                    </Button>
                  )}
                </li>
              ))}
          </ul>
          {!admin && (
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t.rich("support", {
                link: (chunks) => (
                  <a
                    className="underline underline-offset-4"
                    href="mailto:info@trackdraw.app"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </p>
          )}
          {admin &&
            c.state !== "resolved" &&
            c.applications.some((a) => !a.withdrawnAt && a.eligible) && (
              <ol
                className="text-muted-foreground before:bg-border relative flex justify-between gap-3 py-3 text-xs before:absolute before:top-5 before:right-2 before:left-2 before:h-px"
                aria-label={t("title")}
              >
                {[t("requestReceived"), t("waitingPeriod"), t("transfer")].map(
                  (label, index) => (
                    <li
                      className="relative flex min-w-0 flex-1 flex-col gap-2 first:items-start last:items-end last:text-right [&:nth-child(2)]:items-center [&:nth-child(2)]:text-center"
                      key={label}
                    >
                      {index === 0 ? (
                        <Circle className="text-primary bg-background relative size-4" />
                      ) : index === 1 &&
                        c.applications.some(
                          (a) => !a.withdrawnAt && a.eligible && a.responseAt
                        ) ? (
                        <CircleDot className="text-primary bg-background relative size-4" />
                      ) : (
                        <Circle className="bg-background relative size-4" />
                      )}
                      <span>{label}</span>
                    </li>
                  )
                )}
              </ol>
            )}
          {admin && c.notices && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="h-auto w-full justify-between gap-3 py-3 text-left text-sm font-normal shadow-none"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Mail className="size-4 shrink-0" />
                    <span className="font-medium">{t("deliveryTitle")}</span>
                  </span>
                  <span className="text-muted-foreground ml-auto text-sm">
                    {t("pendingNotices", {
                      count: c.notices.filter((n) => !n.sentAt).length,
                    })}
                  </span>
                  <ChevronDown className="size-4 shrink-0" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-4">
                {c.notices
                  .filter((n) => !n.sentAt)
                  .map((n) => (
                    <div key={n.id} className="space-y-2 text-xs">
                      <p className="break-all">{n.recipient}</p>
                      <p className="text-muted-foreground">
                        {t(n.uncertain ? "uncertain" : "queued", {
                          event: t(`events.${n.event}`),
                        })}
                      </p>
                      <code className="text-muted-foreground block break-all">
                        {n.deliveryKey}
                      </code>
                      {n.uncertain === 1 && (
                        <div className="flex flex-wrap gap-2">
                          {(["confirm-notice", "retry-notice"] as const).map(
                            (action) => (
                              <Button
                                key={action}
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() =>
                                  setPending({
                                    caseId: c.id,
                                    action,
                                    noticeId: n.id,
                                  })
                                }
                              >
                                {t(action)}
                              </Button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      ))}
      <ConfirmationDialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setPending(null);
            setReason("");
            setError(false);
          }
        }}
        busy={busy}
        destructive={false}
        title={pending ? t(pending.action) : t("title")}
        confirmLabel={pending ? t(pending.action) : t("title")}
        description={
          <span className="space-y-3">
            <span className="block">
              {t(`confirm.${pending?.action ?? "apply"}`)}
            </span>
            {pending &&
              ["confirm-notice", "retry-notice"].includes(pending.action) && (
                <Input
                  aria-label={t("reason")}
                  placeholder={t("reason")}
                  value={reason}
                  maxLength={1000}
                  onChange={(e) => setReason(e.target.value)}
                />
              )}
          </span>
        }
        error={error ? t("failed") : null}
        onConfirm={() => {
          if (
            pending &&
            ["confirm-notice", "retry-notice"].includes(pending.action) &&
            !reason.trim()
          ) {
            setError(true);
            return;
          }
          void submit();
        }}
      />
    </section>
  );
}
