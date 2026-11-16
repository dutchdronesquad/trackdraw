import { useEffect, useState } from "react";
import {
  ChevronDown,
  CircleUserRound,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function useWorkspaceAccount() {
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

  async function openStudio(target) {
    try {
      await bridge.openStudio(target);
    } catch (reason) {
      setError(reason);
      setOpen(true);
    }
  }

  return {
    available: !!bridge.account,
    open,
    setOpen,
    session,
    pending,
    error,
    setError,
    run,
    openStudio,
  };
}

export function WorkspaceAccountMenu({ account }) {
  const t = useTranslations("editor.desktopWorkspace.account");
  if (!account.available) return null;
  const profile = account.session.account;
  if (!profile) {
    return (
      <button
        className="library-profile"
        data-desktop-account-trigger
        onClick={() => account.setOpen(true)}
      >
        <CircleUserRound size={22} aria-hidden="true" />
        <span>
          {account.pending === "account" ? t("checking") : t("menuSignIn")}
        </span>
      </button>
    );
  }

  const name = profile.name || profile.email || t("title");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="library-profile"
          data-desktop-account-trigger
          aria-label={t("menuLabel", { name })}
        >
          <span className="library-profile-avatar" aria-hidden="true">
            {Array.from(name.trim())[0]?.toUpperCase()}
          </span>
          <span className="library-profile-name">{name}</span>
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-w-72 min-w-48">
        <DropdownMenuLabel>
          <span className="block text-sm font-medium wrap-anywhere">
            {name}
          </span>
          {profile.email !== name && (
            <span className="text-muted-foreground block text-xs font-normal wrap-anywhere">
              {profile.email}
            </span>
          )}
          {account.session.status === "offline" && (
            <span className="text-muted-foreground block text-xs font-normal">
              {t("offlineMenu")}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => account.openStudio({ kind: "profile" })}
        >
          <ExternalLink aria-hidden="true" /> {t("profileSettings")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => account.setOpen(true)}>
          <CircleUserRound aria-hidden="true" /> {t("title")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!!account.pending}
          onSelect={() => {
            account.setOpen(true);
            void account.run("signOut");
          }}
        >
          <LogOut aria-hidden="true" /> {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function WorkspaceAccount({ account }) {
  const t = useTranslations("editor.desktopWorkspace.account");
  const bridge = window.trackdrawDesktop;
  const { open, setOpen, session, pending, error, setError, run } = account;
  if (!account.available) return null;
  const initialCheck = pending === "account";
  const browserPending = pending === "signIn";
  const signOutPending = pending === "signOut";
  const offline = session.status === "offline";
  const failure = {
    keychain: t("keychainError"),
    browser: t("browserError"),
    timeout: t("timeout"),
    differentAccount: t("differentAccount"),
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          const trigger = document.querySelector(
            "[data-desktop-account-trigger]"
          );
          if (trigger) {
            event.preventDefault();
            trigger.focus();
          }
        }}
      >
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
              {!offline && !session.account.libraryAccess && (
                <Button disabled={!!pending} onClick={() => run("signIn")}>
                  {t("connectLibrary")}
                </Button>
              )}
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
