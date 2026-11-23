// @vitest-environment happy-dom

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
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

vi.mock("@/components/SidebarDialog", () => ({
  SidebarDialog: ({
    navItems,
    onItemChange,
    children,
  }: import("@/components/SidebarDialog").SidebarDialogProps) => (
    <div>
      <nav>
        {navItems.map((item) => (
          <button key={item.id} onClick={() => onItemChange(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>
      {children}
    </div>
  ),
}));

vi.mock("next/dynamic", () => ({
  default:
    () =>
    ({
      onCapture,
      onFailure,
    }: {
      onCapture: (url: string) => void;
      onFailure: () => void;
    }) => (
      <div>
        <button onClick={() => onCapture("data:image/png;base64,AAAA")}>
          Capture preview
        </button>
        <button onClick={onFailure}>Fail preview</button>
      </div>
    ),
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
      expect(toast.error).toHaveBeenCalledWith(
        "Could not create share link",
        expect.objectContaining({
          description:
            "TrackDraw could not publish the current snapshot. Check your connection and try again; export JSON if you need to hand it off now.",
        })
      );
    });
    expect(screen.queryByLabelText("share-url-input")).toBeNull();
    expect(localStorage.getItem("trackdraw-anon-share")).toBeNull();
  });
  async function openPublicationForm(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Gallery" }));
    await user.click(
      await screen.findByRole("button", {
        name: "Publish in gallery",
      })
    );
  }

  function mockPreviewConversion() {
    vi.stubGlobal(
      "Image",
      class {
        onload?: () => void;
        naturalWidth = 960;
        naturalHeight = 540;
        set src(_value: string) {
          queueMicrotask(() => this.onload?.());
        }
      }
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/webp;base64,AAAA"
    );
  }

  it("creates the share and listing in one confirmation with an optional description", async () => {
    const user = userEvent.setup();
    mockPreviewConversion();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (_url, init) => {
      if (init?.method === "POST")
        return Response.json({
          ok: true,
          share: {
            token: "new-gallery",
            path: "/share/new-gallery",
            shareType: "published",
            expiresAt: null,
          },
        });
      if (init?.method === "PATCH")
        return Response.json({
          ok: true,
          share: {
            galleryState: "listed",
            galleryTitle: "Shared copy",
            galleryDescription: "",
            expiresAt: null,
          },
        });
      return Response.json({ ok: true, share: null });
    });
    renderShareDialog("project-1");
    await openPublicationForm(user);
    expect(screen.getByDisplayValue("Shared copy")).toBeTruthy();
    expect(screen.getByLabelText(/Description \(optional\)/)).toBeTruthy();
    expect(
      screen.getByText(/Publishing makes the current design/)
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Capture preview" }));
    await user.click(
      screen.getByRole("button", { name: "Publish in gallery" })
    );
    expect(
      await screen.findByRole("link", { name: "View published track" })
    ).toHaveProperty("pathname", "/share/new-gallery");
    const mutations = fetchMock.mock.calls.filter(([, init]) =>
      ["POST", "PATCH"].includes(init?.method ?? "")
    );
    expect(mutations.map(([url]) => url)).toEqual([
      "/api/shares",
      "/api/shares/new-gallery",
    ]);
    expect(JSON.parse(String(mutations[1][1]?.body))).toMatchObject({
      action: "list",
      description: "",
      previewDataUrl: "data:image/webp;base64,AAAA",
    });
  });

  it("keeps the form open when publishing fails and never lists a missing share", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(async (_url, init) =>
      init?.method === "POST"
        ? Response.json({ ok: false }, { status: 403 })
        : Response.json({ ok: true, share: null })
    );
    render(
      <ShareDialog
        open
        onOpenChange={vi.fn()}
        projectId="project-1"
        teamId="team-1"
        teamName="Race team"
        revision={4}
      />
    );
    await openPublicationForm(user);
    expect(screen.getByText("Race team", { exact: true })).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Publish in gallery" })
    );
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(
      vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "PATCH")
    ).toHaveLength(0);
    expect(screen.getByDisplayValue("Shared copy")).toBeTruthy();
  });

  it("offers preview recovery and blocks publication without an author", async () => {
    const user = userEvent.setup();
    authState.session!.user.name = "";
    renderShareDialog("project-1");
    await openPublicationForm(user);
    await user.click(screen.getByRole("button", { name: "Fail preview" }));
    expect(screen.getByRole("button", { name: "Retry preview" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Set display name" })).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Publish in gallery",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    await user.click(screen.getByRole("button", { name: "Retry preview" }));
    expect(
      screen.getByRole("button", { name: "Capture preview" })
    ).toBeTruthy();
  });

  it("blocks publishing after a failed status read and offers retry", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    renderShareDialog("project-1");
    await user.click(screen.getByRole("button", { name: "Gallery" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Publish in gallery" })
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("button", {
        name: "Publish in gallery",
      })
    ).toBeTruthy();
  });
  it("requires a fresh preview after the current design changes", async () => {
    const user = userEvent.setup();
    renderShareDialog("project-1");
    await openPublicationForm(user);
    await user.click(screen.getByRole("button", { name: "Capture preview" }));
    expect(
      (
        screen.getByRole("button", {
          name: "Publish in gallery",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false);
    act(() =>
      useEditor.getState().replaceDesign({
        ...useEditor.getState().track.design,
        title: "Changed design",
      })
    );
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Publish in gallery",
          }) as HTMLButtonElement
        ).disabled
      ).toBe(true)
    );
    expect(
      screen.getByRole("button", { name: "Capture preview" })
    ).toBeTruthy();
  });
});
