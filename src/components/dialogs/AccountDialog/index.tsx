"use client";

import { useEffect, useState } from "react";
import { Braces, ShieldCheck, ShieldAlert, UserRound } from "lucide-react";
import { toast } from "sonner";
import { authClient, type AuthPasskey } from "@/lib/auth-client";
import { SidebarDialog } from "@/components/SidebarDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { AccountApiKeysView } from "./ApiKeysView";
import { AccountDangerView } from "./DangerView";
import { AccountProfileView } from "./ProfileView";
import { AccountSecurityView } from "./SecurityView";
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
}: AccountDialogProps) {
  const { data, isPending } = authClient.useSession();
  const isMobile = useIsMobile();
  const user = data?.user ?? null;
  const userId = user?.id ?? null;
  const [view, setView] = useState<AccountDialogView>("profile");
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
  const [creatingApiKey, setCreatingApiKey] = useState(false);
  const [createdApiKey, setCreatedApiKey] =
    useState<CreatedAccountApiKey | null>(null);
  const [deletingApiKeyId, setDeletingApiKeyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
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
    setCreatingApiKey(false);
    setCreatedApiKey(null);
    setDeletingApiKeyId(null);
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
            : "Failed to load passkeys."
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
  }, [open, passkeysLoaded, userId, view]);

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
          throw new Error(payload.error ?? "Failed to load API keys.");
        }

        if (cancelled) return;
        setApiKeys(payload.apiKeys ?? []);
        setApiKeysLoaded(true);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load API keys."
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
  }, [apiKeysLoaded, open, userId, view]);

  const handleSave = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("Please enter the name you want TrackDraw to show.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await authClient.updateProfileName(normalizedName);
      toast.success("Profile updated");
      onOpenChange(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (deleteConfirmation.trim().toUpperCase() !== "DELETE") {
      setError("Type DELETE to confirm account deletion.");
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
          : "Failed to delete your account."
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleChangeEmail = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const currentEmail = user?.email?.trim().toLowerCase() ?? "";

    if (!normalizedEmail) {
      setError("Please enter the email you want to use for TrackDraw.");
      return;
    }

    if (normalizedEmail === currentEmail) {
      setError("Enter a different email address to change it.");
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
          : "Failed to change your email."
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
      toast.success("Passkey added. You can rename or remove it below.");
    } catch (passkeyError) {
      const message =
        passkeyError instanceof Error
          ? passkeyError.message
          : "Failed to add passkey.";

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
    callbackUrl.searchParams.set("account", "security");

    const loginUrl = new URL("/login", window.location.origin);
    loginUrl.searchParams.set(
      "callbackURL",
      `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`
    );

    window.location.href = loginUrl.toString();
  };

  const handleRenamePasskey = async (passkeyId: string) => {
    const nextName = passkeyDraftNames[passkeyId]?.trim();
    if (!nextName) {
      setError("Please enter a passkey name before saving.");
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
      toast.success("Passkey renamed");
    } catch (passkeyError) {
      setError(
        passkeyError instanceof Error
          ? passkeyError.message
          : "Failed to rename passkey."
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
          : "Failed to remove passkey."
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

  const handleCreateApiKey = async () => {
    const name = apiKeyName.trim();
    if (!name) {
      setError("Enter a name for this API key.");
      return;
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
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        apiKey?: CreatedAccountApiKey;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.apiKey) {
        throw new Error(payload.error ?? "Failed to create API key.");
      }

      setCreatedApiKey(payload.apiKey);
      setApiKeys((current) => [payload.apiKey as AccountApiKey, ...current]);
      setApiKeyName("");
      setApiKeyExpiryDays("90");
      toast.success("API key created");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create API key."
      );
    } finally {
      setCreatingApiKey(false);
    }
  };

  const handleCopyApiKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toast.success("API key copied");
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
        throw new Error(payload.error ?? "Failed to revoke API key.");
      }

      setApiKeys((current) => current.filter((item) => item.id !== keyId));
      setCreatedApiKey((current) => (current?.id === keyId ? null : current));
      toast.success("API key revoked");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to revoke API key."
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

  const apiKeysContent = (
    <AccountApiKeysView
      isPending={isPending}
      isMobile={isMobile}
      user={user}
      apiKeys={apiKeys}
      apiKeysLoading={apiKeysLoading}
      apiKeyName={apiKeyName}
      apiKeyExpiryDays={apiKeyExpiryDays}
      creatingApiKey={creatingApiKey}
      createdApiKey={createdApiKey}
      deletingApiKeyId={deletingApiKeyId}
      error={error}
      onApiKeyNameChange={setApiKeyName}
      onApiKeyExpiryDaysChange={setApiKeyExpiryDays}
      onCreateApiKey={handleCreateApiKey}
      onCopyApiKey={(key) => void handleCopyApiKey(key)}
      onDeleteApiKey={(keyId) => void handleDeleteApiKey(keyId)}
      onRefreshApiKeys={refreshApiKeys}
    />
  );

  const navItems = [
    {
      id: "profile" as AccountDialogView,
      label: "Profile",
      icon: <UserRound className="size-4" />,
    },
    {
      id: "security" as AccountDialogView,
      label: "Security",
      icon: <ShieldCheck className="size-4" />,
    },
    {
      id: "apiKeys" as AccountDialogView,
      label: "API keys",
      icon: <Braces className="size-4" />,
    },
    {
      id: "danger" as AccountDialogView,
      label: "Danger zone",
      icon: <ShieldAlert className="size-4" />,
      tone: "danger" as const,
    },
  ];

  const contentMap: Record<
    AccountDialogView,
    { title: string; description: string; content: React.ReactNode }
  > = {
    profile: {
      title: "Your profile",
      description: "Manage the name shown across your TrackDraw account.",
      content: profileContent,
    },
    security: {
      title: "Security",
      description:
        "Manage sign-in methods, account email, and passkeys for your TrackDraw account.",
      content: securityContent,
    },
    apiKeys: {
      title: "API keys",
      description:
        "Create and revoke expiring keys for external TrackDraw integrations.",
      content: apiKeysContent,
    },
    danger: {
      title: "Danger zone",
      description: "Destructive and irreversible account actions.",
      content: dangerContent,
    },
  };

  const current = contentMap[view];

  return (
    <SidebarDialog
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Studio"
      title="Account"
      mobileSubtitle="Manage your TrackDraw account."
      navItems={navItems}
      activeItem={view}
      onItemChange={(id) => {
        setView(id as AccountDialogView);
        setError(null);
      }}
      contentTitle={current.title}
      contentDescription={current.description}
      maxWidth="max-w-4xl"
    >
      {current.content}
    </SidebarDialog>
  );
}
