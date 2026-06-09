// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import ShareDialog from "@/components/dialogs/ShareDialog";
import { createDefaultDesign } from "@/lib/track/design";
import { useEditor } from "@/store/editor";
import {
  createMemoryStorage,
  installWindowStorage,
} from "../../helpers/storage";

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

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

let restoreStorage: (() => void) | null = null;

function renderShareDialog(
  projectId: string | null = null,
  onSharePublished = vi.fn()
) {
  render(
    <ShareDialog
      open
      onOpenChange={vi.fn()}
      hasPath
      projectId={projectId}
      onSharePublished={onSharePublished}
    />
  );
  return { onSharePublished };
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
    restoreStorage = installWindowStorage(createMemoryStorage());
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
    restoreStorage?.();
    restoreStorage = null;
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

  it("creates a separate published link for authenticated local or copied tracks", async () => {
    const user = userEvent.setup();
    const onSharePublished = vi.fn();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      Response.json({
        ok: true,
        share: {
          token: "published-token",
          path: "/share/published-token?view=2d",
          expiresAt: null,
          shareType: "published",
        },
      })
    );

    renderShareDialog(null, onSharePublished);

    await user.click(screen.getByRole("button", { name: /Create new link/i }));

    await waitFor(() => {
      expect(
        screen.getByDisplayValue(/\/share\/published-token\?view=2d/)
      ).toBeTruthy();
    });

    const [, request] = fetchMock.mock.calls.find(
      ([url, init]) => url === "/api/shares" && init?.method === "POST"
    )!;
    expect(JSON.parse(String(request?.body))).toMatchObject({
      view: "2d",
      design: expect.objectContaining({ title: "Shared copy" }),
    });
    expect(JSON.parse(String(request?.body))).not.toHaveProperty("projectId");
    expect(JSON.parse(String(request?.body))).not.toHaveProperty(
      "expiresInDays"
    );
    expect(localStorage.getItem("trackdraw-anon-share")).toContain(
      "published-token"
    );
    expect(onSharePublished).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith("Link created");
  });

  it("creates an account project link with the project id and no expiry", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input).startsWith("/api/shares?projectId=")) {
        return Response.json({ ok: true, share: null });
      }

      if (input === "/api/shares" && init?.method === "POST") {
        return Response.json({
          ok: true,
          share: {
            token: "project-share",
            path: "/share/project-share?view=2d",
            expiresAt: null,
            shareType: "published",
          },
        });
      }

      throw new Error(`Unexpected request: ${String(input)}`);
    });

    renderShareDialog("project-1");

    await user.click(screen.getByRole("button", { name: /^Create link$/i }));

    await waitFor(() => {
      expect(
        screen.getByDisplayValue(/\/share\/project-share\?view=2d/)
      ).toBeTruthy();
    });

    const [, request] = fetchMock.mock.calls.find(
      ([url, init]) => url === "/api/shares" && init?.method === "POST"
    )!;
    const body = JSON.parse(String(request?.body));
    expect(body).toMatchObject({
      projectId: "project-1",
      view: "2d",
      design: expect.objectContaining({ title: "Shared copy" }),
    });
    expect(body).not.toHaveProperty("expiresInDays");
    expect(toast.success).toHaveBeenCalledWith("Link created");
  });

  it("surfaces share creation failures without storing a stale local link", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      Response.json(
        { ok: false, error: "Failed to publish share" },
        { status: 500 }
      )
    );

    renderShareDialog();

    await user.click(screen.getByRole("button", { name: /Create new link/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to publish share");
    });
    expect(screen.queryByLabelText("share-url-input")).toBeNull();
    expect(localStorage.getItem("trackdraw-anon-share")).toBeNull();
  });
});
