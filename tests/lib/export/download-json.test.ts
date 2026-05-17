// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadJsonFile } from "@/lib/export/download-json";

describe("downloadJsonFile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downloads JSON with the requested filename and revokes the object URL", () => {
    const anchorRef: { current: HTMLAnchorElement | null } = { current: null };
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:trackdraw-json");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") {
        anchorRef.current = element as HTMLAnchorElement;
      }
      return element;
    });

    downloadJsonFile("track.json", { title: "Race day layout" });

    expect(anchorRef.current?.download).toBe("track.json");
    expect(anchorRef.current?.href).toBe("blob:trackdraw-json");
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:trackdraw-json");
  });

  it("fails before creating a download when the payload is not exportable", () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    const createObjectURL = vi.spyOn(URL, "createObjectURL");

    expect(() => downloadJsonFile("track.json", circular)).toThrow();
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
