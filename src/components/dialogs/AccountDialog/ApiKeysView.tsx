import {
  Braces,
  Clipboard,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AccountDialogError,
  AccountDialogLoading,
  AccountDialogNotSignedIn,
} from "./shared";
import type { AccountApiKey, CreatedAccountApiKey } from "./types";
import { formatDate, getPermissionLabel } from "./utils";

type ApiKeysViewProps = {
  isPending: boolean;
  isMobile: boolean;
  user: unknown;
  apiKeys: AccountApiKey[];
  apiKeysLoading: boolean;
  apiKeyName: string;
  apiKeyExpiryDays: string;
  creatingApiKey: boolean;
  createdApiKey: CreatedAccountApiKey | null;
  deletingApiKeyId: string | null;
  error: string | null;
  onApiKeyNameChange: (value: string) => void;
  onApiKeyExpiryDaysChange: (value: string) => void;
  onCreateApiKey: () => void;
  onCopyApiKey: (key: string) => void;
  onDeleteApiKey: (keyId: string) => void;
  onRefreshApiKeys: () => void;
};

export function AccountApiKeysView({
  isPending,
  isMobile,
  user,
  apiKeys,
  apiKeysLoading,
  apiKeyName,
  apiKeyExpiryDays,
  creatingApiKey,
  createdApiKey,
  deletingApiKeyId,
  error,
  onApiKeyNameChange,
  onApiKeyExpiryDaysChange,
  onCreateApiKey,
  onCopyApiKey,
  onDeleteApiKey,
  onRefreshApiKeys,
}: ApiKeysViewProps) {
  if (isPending) {
    return <AccountDialogLoading />;
  }

  if (!user) {
    return <AccountDialogNotSignedIn />;
  }

  return (
    <div className="space-y-6">
      <div className="border-border/60 space-y-4 border-b pb-5">
        <div
          className={cn(
            "grid gap-x-3 gap-y-2 sm:grid-cols-[1fr_9rem_auto]",
            isMobile && "grid-cols-1"
          )}
        >
          <span
            id="api-key-name-label"
            className="order-1 block text-sm font-medium"
          >
            Key name
          </span>
          <span
            id="api-key-expiry-label"
            className="order-3 mt-1 block text-sm font-medium sm:order-2 sm:mt-0"
          >
            Expires
          </span>
          <span aria-hidden="true" className="hidden sm:order-3 sm:block" />

          <Input
            aria-labelledby="api-key-name-label"
            type="text"
            value={apiKeyName}
            onChange={(event) => onApiKeyNameChange(event.target.value)}
            className="order-2 h-8 rounded-lg px-2.5 shadow-none sm:order-4"
            placeholder="Overlay integration"
            maxLength={64}
          />

          <div className="order-4 sm:order-5">
            <Select
              value={apiKeyExpiryDays}
              onValueChange={onApiKeyExpiryDaysChange}
            >
              <SelectTrigger
                aria-labelledby="api-key-expiry-label"
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border bg-transparent pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            onClick={onCreateApiKey}
            disabled={creatingApiKey || !apiKeyName.trim()}
            className="order-5 h-8 rounded-lg px-2.5 sm:order-6 sm:w-auto"
          >
            {creatingApiKey ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create
          </Button>
        </div>

        {createdApiKey ? (
          <div className="space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-4">
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                API key created
              </p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                This secret is shown once. Store it before closing this dialog.
              </p>
            </div>
            <div
              className={cn(
                "flex items-center gap-2",
                isMobile && "flex-col items-stretch"
              )}
            >
              <code className="border-border/60 bg-background/80 min-w-0 flex-1 overflow-x-auto rounded-xl border px-3 py-2 text-xs">
                {createdApiKey.key}
              </code>
              <Button
                type="button"
                variant="outline"
                onClick={() => onCopyApiKey(createdApiKey.key)}
                className={cn("h-8 rounded-lg px-2.5", isMobile && "w-full")}
              >
                <Clipboard className="size-4" />
                Copy
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <div
          className={cn(
            "flex items-center justify-between gap-3",
            isMobile && "items-stretch"
          )}
        >
          <div>
            <p className="text-sm font-medium">Active API keys</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Keys use bearer authentication for `/api/v1`.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onRefreshApiKeys}
            disabled={apiKeysLoading}
            className="h-8 shrink-0 rounded-lg px-2.5"
          >
            <RefreshCw
              className={cn("size-4", apiKeysLoading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>

        {apiKeysLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <LoaderCircle className="size-4 animate-spin" />
            Loading API keys...
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="bg-muted/20 border-border/60 rounded-2xl border px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="bg-background flex size-9 shrink-0 items-center justify-center rounded-xl">
                <Braces className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">No API keys yet</p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  Create one to connect external tools to your account projects.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((apiKey) => {
              const isDeleting = deletingApiKeyId === apiKey.id;

              return (
                <div
                  key={apiKey.id}
                  className="bg-muted/20 border-border/60 rounded-2xl border px-4 py-4"
                >
                  <div
                    className={cn(
                      "flex items-start justify-between gap-4",
                      isMobile && "flex-col"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="bg-background flex size-8 shrink-0 items-center justify-center rounded-xl">
                          <Braces className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {apiKey.name?.trim() || "Unnamed API key"}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {apiKey.start ?? "td_..."} · expires{" "}
                            {formatDate(apiKey.expiresAt)}
                          </p>
                        </div>
                      </div>
                      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                        {getPermissionLabel(apiKey.permissions)} · last used{" "}
                        {formatDate(apiKey.lastRequest)}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onDeleteApiKey(apiKey.id)}
                      disabled={isDeleting}
                      className={cn(
                        "text-muted-foreground hover:text-foreground h-8 rounded-lg px-2.5",
                        isMobile && "w-full justify-center"
                      )}
                    >
                      {isDeleting ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                      Revoke
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AccountDialogError error={error} />
    </div>
  );
}
