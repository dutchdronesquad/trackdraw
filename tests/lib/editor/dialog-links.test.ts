import { describe, expect, it } from "vitest";
import {
  parseStudioDialog,
  studioDialogNames,
  studioDialogUrl,
} from "@/lib/editor/dialog-links";

describe("studio dialog links", () => {
  it.each(studioDialogNames)("supports %s", (dialog) => {
    expect(parseStudioDialog(new URLSearchParams({ dialog })).dialog).toBe(
      dialog
    );
  });
  it.each(["trackdraw.app", "dev.trackdraw.app"])(
    "preserves context on %s",
    (host) => {
      const href = `https://${host}/studio?view=3d&token=abc#canvas`;
      const path = studioDialogUrl(href, "account", "apiKeys");
      expect(path).toBe(
        "/studio?view=3d&token=abc&dialog=account&section=api-keys#canvas"
      );
      expect(studioDialogUrl(new URL(path, href).href, null)).toBe(
        "/studio?view=3d&token=abc#canvas"
      );
    }
  );
  it.each(["profile", "security", "privacy", "apiKeys", "danger"])(
    "keeps legacy account=%s links",
    (account) => {
      expect(parseStudioDialog(new URLSearchParams({ account }))).toEqual({
        dialog: "account",
        accountView: account,
      });
    }
  );
  it.each(["", "unknown", "toString", "__proto__", "constructor"])(
    "ignores invalid targets: %s",
    (value) => {
      expect(
        parseStudioDialog(new URLSearchParams({ dialog: value })).dialog
      ).toBeNull();
      expect(
        parseStudioDialog(new URLSearchParams({ account: value })).dialog
      ).toBeNull();
      expect(
        parseStudioDialog(
          new URLSearchParams({ dialog: "account", section: value })
        ).accountView
      ).toBe("profile");
    }
  );
  it("gives the canonical dialog precedence over legacy links", () => {
    expect(
      parseStudioDialog(new URLSearchParams("dialog=export&account=security"))
        .dialog
    ).toBe("export");
    expect(
      studioDialogUrl("https://trackdraw.app/studio?account=security", "import")
    ).toBe("/studio?dialog=import");
  });
});
