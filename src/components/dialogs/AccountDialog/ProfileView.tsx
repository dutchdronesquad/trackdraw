import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AccountDialogError,
  AccountDialogLoading,
  AccountDialogNotSignedIn,
} from "./shared";
import { getDisplayName } from "./utils";

type ProfileUser = {
  email?: string | null;
  name?: string | null;
};

type ProfileViewProps = {
  isPending: boolean;
  isMobile: boolean;
  user: ProfileUser | null;
  name: string;
  saving: boolean;
  changingEmail: boolean;
  hasNameChanged: boolean;
  error: string | null;
  onNameChange: (name: string) => void;
  onResetError: () => void;
  onSave: () => void;
};

export function AccountProfileView({
  isPending,
  isMobile,
  user,
  name,
  saving,
  changingEmail,
  hasNameChanged,
  error,
  onNameChange,
  onResetError,
  onSave,
}: ProfileViewProps) {
  if (isPending) {
    return <AccountDialogLoading />;
  }

  if (!user) {
    return <AccountDialogNotSignedIn />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span className="bg-foreground text-background flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-medium">
          {user.name?.trim()?.[0]?.toUpperCase() ??
            user.email?.trim()?.[0]?.toUpperCase() ??
            "T"}
        </span>
        <div className="min-w-0">
          <p className="text-base leading-snug font-medium">
            {getDisplayName(user)}
          </p>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {user.email ?? "TrackDraw account"}
          </p>
        </div>
      </div>

      <div className="border-border/60 space-y-4 border-t pt-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Display name</span>
          <Input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Your name"
          />
        </label>

        <div
          className={cn(
            "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
            isMobile && "flex-col gap-2"
          )}
        >
          <Button
            type="button"
            onClick={onSave}
            disabled={saving || changingEmail || !hasNameChanged}
            className={cn(isMobile && "w-full")}
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onNameChange(user.name ?? "");
              onResetError();
            }}
            disabled={saving || changingEmail || !hasNameChanged}
            className={cn(
              isMobile &&
                "text-muted-foreground hover:text-foreground w-full border-0 bg-transparent shadow-none"
            )}
          >
            Reset
          </Button>
        </div>
      </div>

      <AccountDialogError error={error} />
    </div>
  );
}
