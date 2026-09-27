export type AccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialView?: AccountDialogView;
  view?: AccountDialogView;
  onViewChange?: (view: AccountDialogView) => void;
  mobile?: boolean;
};

export type AccountDialogView =
  "profile" | "security" | "privacy" | "apiKeys" | "danger";

export type AccountApiKey = {
  id: string;
  name: string | null;
  start: string | null;
  enabled: boolean;
  permissions: Record<string, string[]> | null;
  createdAt: string | null;
  expiresAt: string | null;
  lastRequest: string | null;
};

export type CreatedAccountApiKey = AccountApiKey & {
  key: string;
};
