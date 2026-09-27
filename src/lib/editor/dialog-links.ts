import type { AccountDialogView } from "@/components/dialogs/AccountDialog/types";

export const studioDialogNames = [
  "account",
  "projects",
  "new-project",
  "import",
  "export",
  "share",
  "shortcuts",
  "feedback",
  "presets",
  "commands",
] as const;
export type StudioDialogName = (typeof studioDialogNames)[number];

const accountSections: Record<string, AccountDialogView> = {
  profile: "profile",
  security: "security",
  privacy: "privacy",
  "api-keys": "apiKeys",
  danger: "danger",
};

export function parseStudioDialog(params: URLSearchParams): {
  dialog: StudioDialogName | null;
  accountView: AccountDialogView;
} {
  const requested = params.get("dialog");
  // Keep existing security reauthentication and account links working.
  const legacy = params.get("account");
  const legacyView =
    legacy === "apiKeys"
      ? "apiKeys"
      : Object.hasOwn(accountSections, legacy ?? "")
        ? accountSections[legacy!]
        : undefined;
  const dialog =
    requested === null && legacyView
      ? "account"
      : (studioDialogNames.find((name) => name === requested) ?? null);
  return {
    dialog,
    accountView:
      requested === null && legacyView
        ? legacyView
        : Object.hasOwn(accountSections, params.get("section") ?? "")
          ? accountSections[params.get("section")!]
          : "profile",
  };
}

export function studioDialogUrl(
  href: string,
  dialog: StudioDialogName | null,
  accountView: AccountDialogView = "profile"
): string {
  const url = new URL(href);
  url.searchParams.delete("account");
  url.searchParams.delete("dialog");
  url.searchParams.delete("section");
  if (dialog) url.searchParams.set("dialog", dialog);
  if (dialog === "account") {
    url.searchParams.set(
      "section",
      accountView === "apiKeys" ? "api-keys" : accountView
    );
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
