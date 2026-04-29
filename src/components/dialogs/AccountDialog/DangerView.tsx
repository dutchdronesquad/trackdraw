import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AccountDialogError,
  AccountDialogLoading,
  AccountDialogNotSignedIn,
} from "./shared";

type DangerViewProps = {
  isPending: boolean;
  user: unknown;
  deleteConfirmation: string;
  deleting: boolean;
  error: string | null;
  onDeleteConfirmationChange: (value: string) => void;
  onDeleteUser: () => void;
};

export function AccountDangerView({
  isPending,
  user,
  deleteConfirmation,
  deleting,
  error,
  onDeleteConfirmationChange,
  onDeleteUser,
}: DangerViewProps) {
  if (isPending) {
    return <AccountDialogLoading />;
  }

  if (!user) {
    return <AccountDialogNotSignedIn />;
  }

  return (
    <div className="space-y-5">
      <p className="text-muted-foreground text-sm leading-relaxed">
        Permanently remove this TrackDraw account and all its account-backed
        data. This action cannot be undone.
      </p>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">
            Type DELETE to confirm
          </span>
          <Input
            type="text"
            value={deleteConfirmation}
            onChange={(event) => onDeleteConfirmationChange(event.target.value)}
            placeholder="DELETE"
            className="h-8 rounded-lg px-2.5 shadow-none"
          />
        </label>

        <AccountDialogError error={error} />

        <div className="flex justify-end pt-1">
          <Button
            type="button"
            variant="destructive"
            onClick={onDeleteUser}
            disabled={
              deleting || deleteConfirmation.trim().toUpperCase() !== "DELETE"
            }
            className="h-8 rounded-lg px-2.5"
          >
            {deleting ? "Deleting..." : "Delete account"}
          </Button>
        </div>
      </div>
    </div>
  );
}
