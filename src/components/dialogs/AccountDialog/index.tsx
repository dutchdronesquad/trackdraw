"use client";

import { accountInteractionClassName } from "./interaction-style";
import type { ApiKeyProjectAccess } from "@/lib/api/project-access";

import { useEffect, useState } from "react";
import {
  Plug,
  UsersRound,
  ChartNoAxesColumn,
  ShieldCheck,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { authClient, type AuthPasskey } from "@/lib/auth-client";
import { TeamAccountDialog } from "@/components/teams/TeamAccountDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { ApiKeyActions } from "./ApiKeyActions";
import { AccountApiKeysView } from "./ApiKeysView";
import { IntegrationNavigation } from "./IntegrationNavigation";
import { McpConnectionGuideLink } from "@/components/mcp/connection-guide-link";
import { McpConnectionsContent } from "@/components/mcp/connections";
import { AccountDangerView } from "./DangerView";
import { AccountProfileView } from "./ProfileView";
import { AccountSecurityView } from "./SecurityView";
import { studioDialogUrl } from "@/lib/editor/dialog-links";
import { ProductAnalyticsControl } from "@/components/ProductAnalyticsControl";
import { TeamDialogState } from "@/components/teams/TeamDialogState";
import { TeamsView } from "@/components/teams/TeamsView";
import { AccountDialogNotSignedIn } from "./shared";
import type {
  AccountApiKey,
  AccountDialogProps,
  AccountDialogView,
  CreatedAccountApiKey,
} from "./types";

export default function AccountDialog({
  open,
  onOpenChange,
  initialView = "profile",
  view: controlledView,
  onViewChange,
}: AccountDialogProps) {
  const t = useTranslations("dialogs");
  const tCommon = useTranslations("common");
  const tTeams = useTranslations("dialogs.teams");
  const { data, isPending } = authClient.useSession();
  const isMobile = useIsMobile();
  const user = data?.user ?? null;
  const userId = user?.id ?? null;
  const [localView, setView] = useState<AccountDialogView>(initialView);
  const view = controlledView ?? localView;
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [emailEditOpen, setEmailEditOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passkeyReauthRequired, setPasskeyReauthRequired] = useState(false);
  const [passkeys, setPasskeys] = useState<AuthPasskey[]>([]);
  const [passkeysLoading, setPasskeysLoading] = useState(false);
  const [passkeysLoaded, setPasskeysLoaded] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [editingPasskeyId, setEditingPasskeyId] = useState<string | null>(null);
  const [passkeyDraftNames, setPasskeyDraftNames] = useState<
    Record<string, string>
  >({});
  const [deletingPasskeyId, setDeletingPasskeyId] = useState<string | null>(
    null
  );
  const [apiKeys, setApiKeys] = useState<AccountApiKey[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [apiKeysLoaded, setApiKeysLoaded] = useState(false);
  const [apiKeyName, setApiKeyName] = useState("");
  const [apiKeyExpiryDays, setApiKeyExpiryDays] = useState("90");
  const [apiKeyProjectAccess, setApiKeyProjectAccess] =
    useState<ApiKeyProjectAccess>({ mode: "all" });
  const [apiKeyDraftOpen, setApiKeyDraftOpen] = useState(false);
  const [creatingApiKey, setCreatingApiKey] = useState(false);
  const [createdApiKey, setCreatedApiKey] =
    useState<CreatedAccountApiKey | null>(null);
  const [deletingApiKeyId, setDeletingApiKeyId] = useState<string | null>(null);
  const [apiKeyEditDraft, setApiKeyEditDraft] = useState<{
    keyId: string;
    projectAccess: ApiKeyProjectAccess;
  } | null>(null);
  const [updatingApiKey, setUpdatingApiKey] = useState(false);

  useEffect(() => {
    if (!open) return;
    // oxlint-disable-next-line react/set-state-in-effect -- initialize dialog-local form state
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setEmailEditOpen(false);
    setDeleteConfirmation("");
    setSaving(false);
    setChangingEmail(false);
    setDeleting(false);
    setError(null);
    setPasskeyReauthRequired(false);
    setPasskeys([]);
    setPasskeysLoading(false);
    setPasskeysLoaded(false);
    setPasskeyLoading(false);
    setEditingPasskeyId(null);
    setPasskeyDraftNames({});
    setDeletingPasskeyId(null);
    setApiKeys([]);
    setApiKeysLoading(false);
    setApiKeysLoaded(false);
    setApiKeyName("");
    setApiKeyExpiryDays("90");
    setApiKeyProjectAccess({ mode: "all" });
    setApiKeyDraftOpen(false);
    setCreatingApiKey(false);
    setCreatedApiKey(null);
    setDeletingApiKeyId(null);
    setApiKeyEditDraft(null);
    setView(initialView);
  }, [initialView, open, user?.email, user?.name]);

  useEffect(() => {
    if (!open || !userId || view !== "security" || passkeysLoaded) return;

    let cancelled = false;

    const loadPasskeys = async () => {
      setPasskeysLoading(true);
      try {
        const items = await authClient.passkey.list();
        if (cancelled) return;
        setPasskeys(items);
        setPasskeysLoaded(true);
        setPasskeyDraftNames(
          Object.fromEntries(items.map((item) => [item.id, item.name ?? ""]))
        );
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : t("account.errors.loadPasskeysFailed")
        );
      } finally {
        if (!cancelled) {
          setPasskeysLoading(false);
        }
      }
    };

    void loadPasskeys();

    return () => {
      cancelled = true;
    };
  }, [open, passkeysLoaded, userId, view, t]);

  useEffect(() => {
    if (!open || !userId || view !== "apiKeys" || apiKeysLoaded) return;

    let cancelled = false;

    const loadApiKeys = async () => {
      setApiKeysLoading(true);
      try {
        const response = await fetch("/api/account/api-keys", {
          credentials: "same-origin",
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          apiKeys?: AccountApiKey[];
          error?: string;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(
            payload.error ?? t("account.errors.loadApiKeysFailed")
          );
        }

        if (cancelled) return;
        setApiKeys(payload.apiKeys ?? []);
        setApiKeysLoaded(true);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : t("account.errors.loadApiKeysFailed")
        );
      } finally {
        if (!cancelled) {
          setApiKeysLoading(false);
        }
      }
    };

    void loadApiKeys();

    return () => {
      cancelled = true;
    };
  }, [apiKeysLoaded, open, userId, view, t]);

  const handleSave = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError(t("account.errors.profileNameRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await authClient.updateProfileName(normalizedName);
      toast.success(t("account.success.profileUpdated"));
      onOpenChange(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("account.errors.profileUpdateFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (deleteConfirmation.trim().toUpperCase() !== "DELETE") {
      setError(t("account.errors.deleteConfirmRequired"));
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await authClient.deleteUser();
      window.location.href = "/studio";
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t("account.errors.deleteFailed")
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleChangeEmail = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const currentEmail = user?.email?.trim().toLowerCase() ?? "";

    if (!normalizedEmail) {
      setError(t("account.errors.emailRequired"));
      return;
    }

    if (normalizedEmail === currentEmail) {
      setError(t("account.errors.emailSame"));
      return;
    }

    setChangingEmail(true);
    setError(null);

    try {
      await authClient.changeEmail({
        newEmail: normalizedEmail,
        callbackURL: "/studio",
      });
      setEmailEditOpen(false);
      toast.success(
        "Check your inbox to complete the email change. You may need to confirm from your current email first and then verify the new one."
      );
    } catch (changeEmailError) {
      setError(
        changeEmailError instanceof Error
          ? changeEmailError.message
          : t("account.errors.emailChangeFailed")
      );
    } finally {
      setChangingEmail(false);
    }
  };

  const hasEmailChanged =
    email.trim().toLowerCase() !== (user?.email ?? "").trim().toLowerCase();
  const hasNameChanged = name.trim() !== (user?.name ?? "").trim();

  const handleAddPasskey = async () => {
    setPasskeyLoading(true);
    setError(null);
    setPasskeyReauthRequired(false);

    try {
      const createdPasskey = await authClient.passkey.add({
        name:
          user?.name?.trim() ||
          user?.email?.trim() ||
          `TrackDraw passkey ${passkeys.length + 1}`,
      });

      const nextPasskeys = createdPasskey
        ? [...passkeys, createdPasskey]
        : await authClient.passkey.list();
      setPasskeys(nextPasskeys);
      setPasskeyDraftNames(
        Object.fromEntries(
          nextPasskeys.map((item) => [item.id, item.name ?? ""])
        )
      );
      toast.success(t("account.success.passkeyAdded"));
    } catch (passkeyError) {
      const message =
        passkeyError instanceof Error
          ? passkeyError.message
          : t("account.errors.passkeyAddFailed");

      if (message === "Session is not fresh") {
        setPasskeyReauthRequired(true);
        return;
      }

      setError(message);
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handlePasskeyReauthenticate = () => {
    if (typeof window === "undefined") return;

    const callbackUrl = new URL(window.location.href);

    const loginUrl = new URL("/login", window.location.origin);
    loginUrl.searchParams.set(
      "callbackURL",
      studioDialogUrl(callbackUrl.href, "account", "security")
    );

    window.location.href = loginUrl.toString();
  };

  const handleRenamePasskey = async (passkeyId: string) => {
    const nextName = passkeyDraftNames[passkeyId]?.trim();
    if (!nextName) {
      setError(t("account.errors.passkeyNameRequired"));
      return;
    }

    setPasskeyLoading(true);
    setError(null);

    try {
      const updated = await authClient.passkey.update({
        id: passkeyId,
        name: nextName,
      });
      setPasskeys((current) =>
        current.map((item) => (item.id === passkeyId ? updated : item))
      );
      setEditingPasskeyId(null);
      toast.success(t("account.success.passkeyRenamed"));
    } catch (passkeyError) {
      setError(
        passkeyError instanceof Error
          ? passkeyError.message
          : t("account.errors.passkeyRenameFailed")
      );
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleDeletePasskey = async (passkeyId: string) => {
    const passkey = passkeys.find((item) => item.id === passkeyId);
    const confirmed = window.confirm(
      `Remove ${passkey?.name?.trim() || "this passkey"} from your TrackDraw account?\n\nIt may still appear on this device until you remove it from your password manager or device settings.`
    );
    if (!confirmed) {
      return;
    }

    setDeletingPasskeyId(passkeyId);
    setError(null);

    try {
      await authClient.passkey.remove(passkeyId);
      setPasskeys((current) => current.filter((item) => item.id !== passkeyId));
      setEditingPasskeyId((current) =>
        current === passkeyId ? null : current
      );
      toast.success(
        "Passkey removed from your TrackDraw account. It may still appear on this device until you remove it from your password manager or device settings."
      );
    } catch (passkeyError) {
      setError(
        passkeyError instanceof Error
          ? passkeyError.message
          : t("account.errors.passkeyRemoveFailed")
      );
    } finally {
      setDeletingPasskeyId(null);
    }
  };

  const refreshApiKeys = () => {
    setApiKeysLoaded(false);
    setCreatedApiKey(null);
    setError(null);
  };

  const handleCreateApiKey = async (
    projectAccess: ApiKeyProjectAccess,
    writeAccess = false
  ) => {
    const name = apiKeyName.trim();
    if (!name) {
      setError(t("account.errors.apiKeyNameRequired"));
      return false;
    }

    setCreatingApiKey(true);
    setError(null);

    try {
      const response = await fetch("/api/account/api-keys", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name,
          expiresInDays: Number.parseInt(apiKeyExpiryDays, 10),
          projectAccess,
          ...(writeAccess ? { writeAccess: true } : {}),
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        apiKey?: CreatedAccountApiKey;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.apiKey) {
        throw new Error(
          payload.error ?? t("account.errors.apiKeyCreateFailed")
        );
      }

      setCreatedApiKey(payload.apiKey);
      setApiKeys((current) => [payload.apiKey as AccountApiKey, ...current]);
      setApiKeyName("");
      setApiKeyExpiryDays("90");
      toast.success(t("account.success.apiKeyCreated"));
      return true;
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : t("account.errors.apiKeyCreateFailed")
      );
      return false;
    } finally {
      setCreatingApiKey(false);
    }
  };

  const handleUpdateApiKeyAccess = async (
    keyId: string,
    projectAccess: ApiKeyProjectAccess
  ) => {
    setUpdatingApiKey(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/account/api-keys/${encodeURIComponent(keyId)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ projectAccess }),
        }
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        apiKey?: AccountApiKey;
      };
      if (!response.ok || !payload.ok || !payload.apiKey) throw new Error();
      const updated = payload.apiKey;
      setApiKeys((current) =>
        current.map((item) => (item.id === keyId ? updated : item))
      );
      setCreatedApiKey((current) =>
        current?.id === keyId ? { ...current, ...updated } : current
      );
      toast.success(t("account.success.apiKeyAccessUpdated"));
      return true;
    } catch {
      setError(t("account.errors.apiKeyUpdateFailed"));
      return false;
    } finally {
      setUpdatingApiKey(false);
    }
  };

  const handleCopyApiKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toast.success(t("account.success.apiKeyCopied"));
    } catch {
      setError("Could not copy the API key from this browser.");
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    setDeletingApiKeyId(keyId);
    setError(null);

    try {
      const response = await fetch(
        `/api/account/api-keys/${encodeURIComponent(keyId)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.error ?? t("account.errors.apiKeyRevokeFailed")
        );
      }

      setApiKeys((current) => current.filter((item) => item.id !== keyId));
      setCreatedApiKey((current) => (current?.id === keyId ? null : current));
      toast.success(t("account.success.apiKeyRevoked"));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t("account.errors.apiKeyRevokeFailed")
      );
    } finally {
      setDeletingApiKeyId(null);
    }
  };

  const passkeySupported =
    typeof window !== "undefined" && typeof PublicKeyCredential !== "undefined";

  const profileContent = (
    <AccountProfileView
      isPending={isPending}
      isMobile={isMobile}
      user={user}
      name={name}
      saving={saving}
      changingEmail={changingEmail}
      hasNameChanged={hasNameChanged}
      error={error}
      onNameChange={setName}
      onResetError={() => setError(null)}
      onSave={handleSave}
    />
  );

  const securityContent = (
    <AccountSecurityView
      isPending={isPending}
      isMobile={isMobile}
      user={user}
      email={email}
      emailEditOpen={emailEditOpen}
      changingEmail={changingEmail}
      hasEmailChanged={hasEmailChanged}
      passkeySupported={passkeySupported}
      passkeys={passkeys}
      passkeysLoading={passkeysLoading}
      passkeyLoading={passkeyLoading}
      editingPasskeyId={editingPasskeyId}
      passkeyDraftNames={passkeyDraftNames}
      deletingPasskeyId={deletingPasskeyId}
      error={error}
      passkeyReauthRequired={passkeyReauthRequired}
      onEmailChange={setEmail}
      onEmailEditOpenChange={setEmailEditOpen}
      onResetError={() => setError(null)}
      onChangeEmail={handleChangeEmail}
      onAddPasskey={handleAddPasskey}
      onPasskeyReauthenticate={handlePasskeyReauthenticate}
      onEditingPasskeyIdChange={setEditingPasskeyId}
      onPasskeyDraftNamesChange={setPasskeyDraftNames}
      onRenamePasskey={(passkeyId) => void handleRenamePasskey(passkeyId)}
      onDeletePasskey={(passkeyId) => void handleDeletePasskey(passkeyId)}
    />
  );

  const dangerContent = (
    <AccountDangerView
      isPending={isPending}
      user={user}
      deleteConfirmation={deleteConfirmation}
      deleting={deleting}
      error={error}
      onDeleteConfirmationChange={setDeleteConfirmation}
      onDeleteUser={handleDeleteUser}
    />
  );

  const privacyContent = <ProductAnalyticsControl embedded />;

  const apiKeysContent = (
    <AccountApiKeysView
      isPending={isPending}
      isMobile={isMobile}
      user={user}
      apiKeys={apiKeys}
      apiKeysLoading={apiKeysLoading}
      apiKeyName={apiKeyName}
      apiKeyExpiryDays={apiKeyExpiryDays}
      projectAccess={apiKeyProjectAccess}
      onProjectAccessChange={setApiKeyProjectAccess}
      draftOpen={apiKeyDraftOpen}
      onDraftOpenChange={setApiKeyDraftOpen}
      creatingApiKey={creatingApiKey}
      createdApiKey={createdApiKey}
      deletingApiKeyId={deletingApiKeyId}
      error={error}
      onApiKeyNameChange={setApiKeyName}
      onApiKeyExpiryDaysChange={setApiKeyExpiryDays}
      onCreateApiKey={handleCreateApiKey}
      onUpdateApiKeyAccess={handleUpdateApiKeyAccess}
      editDraft={apiKeyEditDraft}
      onEditDraftChange={(draft) => {
        setApiKeyEditDraft(draft);
        setError(null);
      }}
      updatingApiKey={updatingApiKey}
      onCopyApiKey={(key) => void handleCopyApiKey(key)}
      onDeleteApiKey={(keyId) => void handleDeleteApiKey(keyId)}
      onRefreshApiKeys={refreshApiKeys}
    />
  );

  const navItems = [
    {
      id: "profile" as AccountDialogView,
      label: tCommon("labels.profile"),
      icon: <UserRound className="size-4" />,
    },
    {
      id: "security" as AccountDialogView,
      label: t("account.nav.security"),
      icon: <ShieldCheck className="size-4" />,
    },
    {
      id: "privacy" as AccountDialogView,
      label: t("account.nav.privacy"),
      icon: <ChartNoAxesColumn className="size-4" />,
    },
    {
      id: "connectedApps" as AccountDialogView,
      label: t("account.nav.integrations"),
      icon: <Plug className="size-4" />,
    },
    ...(user
      ? [
          {
            id: "teams" as AccountDialogView,
            label: tTeams("title"),
            icon: <UsersRound className="size-4" />,
          },
        ]
      : []),
    ...(isMobile
      ? [
          {
            id: "danger" as AccountDialogView,
            label: t("account.nav.danger"),
            icon: <ShieldAlert className="size-4" />,
            tone: "danger" as const,
          },
        ]
      : []),
  ];

  const contentMap: Record<
    AccountDialogView,
    { title: string; description: string; content: React.ReactNode }
  > = {
    profile: {
      title: t("account.panels.profile.title"),
      description: t("account.panels.profile.description"),
      content: profileContent,
    },
    security: {
      title: t("account.panels.security.title"),
      description: t("account.panels.security.description"),
      content: securityContent,
    },
    privacy: {
      title: t("account.panels.privacy.title"),
      description: t("account.panels.privacy.description"),
      content: privacyContent,
    },
    apiKeys: {
      title: t("account.panels.integrations.title"),
      description: t("account.panels.integrations.description"),
      content: apiKeysContent,
    },
    connectedApps: {
      title: t("account.panels.integrations.title"),
      description: t("account.panels.integrations.description"),
      content: user ? (
        <McpConnectionsContent key={user.id} />
      ) : (
        <AccountDialogNotSignedIn />
      ),
    },
    teams: {
      title: tTeams("title"),
      description: tTeams("description"),
      content: user ? (
        <TeamsView key={user.id} />
      ) : (
        <AccountDialogNotSignedIn />
      ),
    },
    danger: {
      title: t("account.panels.danger.title"),
      description: t("account.panels.danger.description"),
      content: dangerContent,
    },
  };

  const current = contentMap[view];

  return (
    <TeamDialogState key={userId ?? "signed-out"}>
      <TeamAccountDialog
        open={open}
        onOpenChange={onOpenChange}
        eyebrow={t("account.dialog.eyebrow")}
        title={tCommon("labels.account")}
        mobileSubtitle={
          view === "teams" ? undefined : t("account.dialog.mobileSubtitle")
        }
        navItems={navItems}
        activeItem={view === "apiKeys" ? "connectedApps" : view}
        onItemChange={(id) => {
          if (onViewChange) onViewChange(id as AccountDialogView);
          else setView(id as AccountDialogView);
          setError(null);
        }}
        sidebarFooter={
          !isMobile ? (
            <button
              type="button"
              aria-current={view === "danger" ? "page" : undefined}
              onClick={() => {
                if (onViewChange) onViewChange("danger");
                else setView("danger");
                setError(null);
              }}
              className={cn(
                "focus-visible:ring-ring flex h-9 w-full items-center gap-2.5 rounded-xl border border-transparent px-2 text-left text-[13px] text-rose-700 transition-colors outline-none hover:border-rose-500/20 hover:bg-rose-500/8 focus-visible:ring-2 dark:text-rose-300",
                view === "danger" && "border-rose-500/20 bg-rose-500/8"
              )}
            >
              <ShieldAlert className="size-4" aria-hidden="true" />
              {t("account.nav.danger")}
            </button>
          ) : undefined
        }
        contentTitle={current.title}
        contentDescription={current.description}
        contentActions={
          user && !isMobile ? (
            view === "apiKeys" ? (
              <ApiKeyActions
                loading={apiKeysLoading}
                onRefresh={refreshApiKeys}
              />
            ) : view === "connectedApps" ? (
              <McpConnectionGuideLink />
            ) : undefined
          ) : undefined
        }
        contentBodyClassName={accountInteractionClassName}
        maxWidth="max-w-6xl"
        height="h-[43rem] max-h-[calc(100dvh-2.5rem)]"
        mobileHeight="h-[92dvh]"
      >
        {(view === "apiKeys" || view === "connectedApps") && (
          <IntegrationNavigation
            view={view}
            onViewChange={(next) => {
              if (onViewChange) onViewChange(next);
              else setView(next);
              setError(null);
            }}
          />
        )}
        {view === "connectedApps" && user && isMobile && (
          <div className="mb-6 flex justify-end">
            <McpConnectionGuideLink />
          </div>
        )}
        {current.content}
      </TeamAccountDialog>
    </TeamDialogState>
  );
}
