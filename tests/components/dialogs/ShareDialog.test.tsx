// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ShareDialog from "@/components/dialogs/ShareDialog";
import { createDefaultDesign } from "@/lib/track/design";
import { useEditor } from "@/store/editor";

const authState = vi.hoisted(() => ({
  session: null as {
    user: {
      id: string;
      name: string;
    };
  } | null,
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: authState.session }),
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("view=2d"),
}));

const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
  window,
  "localStorage"
);

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: vi.fn(() => {
      store.clear();
    }),
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
  };
}

function renderShareDialog(projectId: string | null = null) {
  render(
    <ShareDialog open onOpenChange={vi.fn()} hasPath projectId={projectId} />
  );
}

describe("ShareDialog", () => {
  beforeEach(() => {
    useEditor.getState().newProject();
    useEditor.getState().clearHistory();
    authState.session = {
      user: {
        id: "user-1",
        name: "Klaas",
      },
    };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        media: "",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ok: true,
          share: null,
        })
      )
    );
    const design = createDefaultDesign();
    design.title = "Shared copy";
    useEditor.getState().replaceDesign(design);
  });

  afterEach(() => {
    cleanup();
    useEditor.getState().newProject();
    useEditor.getState().clearHistory();
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(
        window,
        "localStorage",
        originalLocalStorageDescriptor
      );
    } else {
      Reflect.deleteProperty(window, "localStorage");
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("explains that local or copied tracks create a separate published link", () => {
    renderShareDialog();

    expect(screen.getByText("New share link")).toBeTruthy();
    expect(
      screen.getByText(
        "This editable copy gets its own durable read-only link. It will not update another project's published link."
      )
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Create new link/i })
    ).toBeTruthy();
  });

  it("explains that account projects update their saved project link", () => {
    renderShareDialog("project-1");

    expect(screen.getByText("Saved project link")).toBeTruthy();
    expect(
      screen.getByText(
        "This saved account project uses one durable read-only link. Updating it keeps the same URL with the latest design."
      )
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Create link/i })).toBeTruthy();
  });
});
