"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { Button, buttonVariants } from "@/components/ui/button";
import type { TeamInvitation, TeamErrorCode } from "@/lib/teams";
import { teamRequest, TeamRequestError } from "./team-client";
import { Invitations } from "./Invitations";
function InvitationForAccount({ id }: { id: string }) {
  const t = useTranslations("dialogs.teams");
  const [item, setItem] = useState<TeamInvitation | null>(null),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState<TeamErrorCode | null>(null),
    [busy, setBusy] = useState(false),
    [joined, setJoined] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void teamRequest<{ invitation: TeamInvitation }>({ invitationId: id })
      .then((data) => {
        if (cancelled) return;
        setItem(data.invitation);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof TeamRequestError ? e.code : "failed");
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  async function accept() {
    setBusy(true);
    setError(null);
    try {
      await teamRequest({ command: { action: "accept", invitationId: id } });
      setJoined(true);
    } catch (e) {
      setError(e instanceof TeamRequestError ? e.code : "failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <p className="text-destructive mt-5 text-sm" role="alert">
          {t(`errors.${error}`)}
        </p>
      )}
      {!loaded ? (
        <p className="mt-6 text-sm">{t("loading")}</p>
      ) : joined ? (
        <p className="mt-6 text-sm" role="status">
          {t("joined")}
        </p>
      ) : item ? (
        <Invitations
          items={[item]}
          busy={busy}
          onAccept={() => void accept()}
        />
      ) : (
        !error && (
          <p className="text-muted-foreground mt-6 text-sm">
            {t("invitationUnavailable")}
          </p>
        )
      )}
    </>
  );
}
export function InvitationPage({ invitationId }: { invitationId: string }) {
  const t = useTranslations("dialogs.teams"),
    { data, isPending } = authClient.useSession();
  const callbackURL = `/teams/invitation/${encodeURIComponent(invitationId)}`;
  return (
    <main className="bg-background text-foreground min-h-screen px-6 py-12">
      <section className="mx-auto max-w-xl">
        <Link
          href="/studio?dialog=account&section=teams"
          prefetch={false}
          className="text-muted-foreground text-sm underline underline-offset-4"
        >
          {t("back")}
        </Link>
        <h1 className="mt-8 text-3xl font-semibold">{t("invitationTitle")}</h1>
        <p className="text-muted-foreground mt-4 text-sm leading-6">
          {t("invitationHelp")}
        </p>
        {isPending ? (
          <p className="mt-6">{t("loading")}</p>
        ) : data?.user ? (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <p className="text-muted-foreground text-sm break-all">
                {data.user.email}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void authClient.signOut({
                    fetchOptions: {
                      onSuccess: () =>
                        window.location.assign(
                          `/login?${new URLSearchParams({ callbackURL })}`
                        ),
                    },
                  })
                }
              >
                {t("switchAccount")}
              </Button>
            </div>
            <InvitationForAccount key={data.user.id} id={invitationId} />
          </>
        ) : (
          <Link
            href={`/login?${new URLSearchParams({ callbackURL })}`}
            prefetch={false}
            className={buttonVariants({ className: "mt-6" })}
          >
            {t("signIn")}
          </Link>
        )}
      </section>
    </main>
  );
}
