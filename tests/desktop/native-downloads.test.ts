// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { installNativeDownloads } from "../../experiments/tauri-desktop/renderer/native/downloads.mjs";

it.each(["click", "dispatchEvent"])(
  "exports a detached anchor via %s even when its object URL is immediately revoked",
  async (method) => {
    const create = URL.createObjectURL;
    const revoke = URL.revokeObjectURL;
    const click = HTMLAnchorElement.prototype.click;
    const save = vi.fn().mockResolvedValue(null); // Cancelling native save is valid.
    const error = vi.fn();
    URL.createObjectURL = vi.fn(() => "blob:desktop-export");
    URL.revokeObjectURL = vi.fn();
    const uninstall = installNativeDownloads(save, error);
    try {
      const bytes = new Uint8Array([37, 80, 68, 70]);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const anchor = document.createElement("a");
      anchor.download = "race-pack.pdf";
      anchor.href = URL.createObjectURL(blob);
      if (method === "click") anchor.click();
      else anchor.dispatchEvent(new MouseEvent("click"));
      URL.revokeObjectURL(anchor.href);
      await vi.waitFor(() =>
        expect(save).toHaveBeenCalledWith({
          name: "race-pack.pdf",
          bytes: [...bytes],
        })
      );
      expect(error).not.toHaveBeenCalled();
    } finally {
      uninstall();
      URL.createObjectURL = create;
      URL.revokeObjectURL = revoke;
      HTMLAnchorElement.prototype.click = click;
    }
  }
);
