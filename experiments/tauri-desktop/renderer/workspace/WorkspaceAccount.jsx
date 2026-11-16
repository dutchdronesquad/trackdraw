import { useEffect, useState } from "react";
import { CircleUserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function WorkspaceAccount() {
  const t = useTranslations("editor.desktopWorkspace.account");
  const bridge = window.trackdrawDesktop;
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState({ status: "signedOut" });
  const [pending, setPending] = useState("account");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bridge.account) return;
    let active = true;
    bridge
      .account()
      .then((result) => {
        if (active) setSession(result);
      })
      .catch((reason) => {
        if (active) setError(reason);
      })
      .finally(() => {
        if (active) setPending("");
      });
    function showAccount() {
      setOpen(true);
    }
    window.addEventListener("desktop:account", showAccount);
    return () => {
      active = false;
      window.removeEventListener("desktop:account", showAccount);
    };
  }, [bridge]);

  if (!bridge.account) return null;

  async function run(operation) {
    setPending(operation);
    setError("");
    try {
      setSession(await bridge[operation]());
    } catch (reason) {
      if (reason !== "cancelled") setError(reason);
    } finally {
      setPending("");
    }
  }

  const initialCheck = pending === "account";
  const browserPending = pending === "signIn";
  const signOutPending = pending === "signOut";
  const offline = session.status === "offline";
  const failure = {
    keychain: t("keychainError"),
    browser: t("browserError"),
    timeout: t("timeout"),
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="desktop-account-button"
          aria-label={t("title")}
          title={t("title")}
        >
          <CircleUserRound aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {session.account ? t("connected") : t("description")}
          </DialogDescription>
        </DialogHeader>
        {session.account && (
          <p className="min-w-0 text-sm break-words">
            {session.account.name && (
              <strong className="block">{session.account.name}</strong>
            )}
            {session.account.email}
          </p>
        )}
        <div role="status" className="text-muted-foreground text-sm">
          {initialCheck && t("checking")}
          {browserPending && t("browserPending")}
          {signOutPending && t("signingOut")}
          {!pending && offline && t("offline")}
          {!pending &&
            session.status === "signedOutOffline" &&
            t("signedOutOffline")}
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {failure[error] ?? t("error")}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {browserPending ? (
            <Button
              variant="outline"
              onClick={() => bridge.cancelSignIn().catch(setError)}
            >
              {t("cancel")}
            </Button>
          ) : session.account ? (
            <>
              {offline && (
                <Button
                  variant="outline"
                  disabled={!!pending}
                  onClick={() => run("account")}
                >
                  {t("retry")}
                </Button>
              )}
              <Button
                variant="outline"
                disabled={!!pending}
                onClick={() => run("signOut")}
              >
                {t("signOut")}
              </Button>
            </>
          ) : (
            <>
              {error && (
                <Button
                  variant="outline"
                  disabled={!!pending}
                  onClick={() => run("account")}
                >
                  {t("retry")}
                </Button>
              )}
              <Button disabled={!!pending} onClick={() => run("signIn")}>
                {t("signIn")}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
