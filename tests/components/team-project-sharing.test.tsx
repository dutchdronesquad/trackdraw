// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createDefaultDesign } from "@/lib/track/design";
import { useEditor } from "@/store/editor";
import { createMemoryStorage } from "../helpers/storage";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("view=2d"),
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: { user: { id: "owner", name: "Owner" } } }),
  },
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/components/SidebarDialog", () => ({
  SidebarDialog: ({
    children,
    navItems,
    onItemChange,
  }: {
    children: React.ReactNode;
    navItems: { id: string; label: string }[];
    onItemChange: (id: string) => void;
  }) => (
    <div>
      {navItems.map((item) => (
        <button key={item.id} onClick={() => onItemChange(item.id)}>
          {item.label}
        </button>
      ))}
      {children}
    </div>
  ),
}));
import ShareDialog from "@/components/dialogs/ShareDialog";
const fetched = vi.fn();
beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryStorage());
  vi.stubGlobal("fetch", fetched);
  useEditor.getState().replaceDesign({
    ...createDefaultDesign(),
    id: "private-id",
    title: "Saved team race",
  });
  fetched.mockImplementation(async (_url: string, options?: RequestInit) => ({
    ok: true,
    status: 200,
    json: async () =>
      options?.method
        ? {
            ok: true,
            share: {
              token: "snapshot",
              path: "/share/snapshot",
              expiresAt: null,
              shareType: "published",
              galleryState: null,
            },
          }
        : { ok: true, share: null, shares: [] },
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("explains the public audience and publishes only an explicit saved revision, never the private canvas", async () => {
  render(
    <ShareDialog
      open
      onOpenChange={() => {}}
      teamId="club"
      projectId="race"
      revision={7}
    />
  );
  await screen.findByText("Anyone with the link can view this snapshot.");
  await waitFor(() => expect(fetched).toHaveBeenCalledTimes(1));
  expect(fetched.mock.calls[0][0]).toContain(
    "/api/team-projects/publication?teamId=club&projectId=race"
  );
  fireEvent.click(screen.getByRole("button", { name: "Create link" }));
  await screen.findByRole("button", { name: "Update link" });
  const mutation = fetched.mock.calls.find(
    ([, options]) => options?.method === "POST"
  );
  expect(mutation).toBeTruthy();
  const body = JSON.parse(String(mutation?.[1]?.body));
  expect(body).toEqual({
    action: "publish",
    teamId: "club",
    projectId: "race",
    revision: 7,
    view: "2d",
  });
  expect(localStorage.getItem("trackdraw-anon-share")).toBeNull();
});
it("does not publish an existing snapshot when its dialog opens or its embed tab is selected", async () => {
  fetched.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      ok: true,
      share: {
        token: "stable",
        expiresAt: null,
        shareType: "published",
        galleryState: null,
      },
      shares: [],
    }),
  });
  render(
    <ShareDialog
      open
      onOpenChange={() => {}}
      teamId="club"
      projectId="race"
      revision={7}
    />
  );
  await screen.findByRole("button", { name: "Copy link" });
  fireEvent.click(screen.getByRole("button", { name: "Embed" }));
  await screen.findByRole("button", { name: "Copy code" });
  expect(
    fetched.mock.calls.filter(([, options]) => options?.method === "POST")
  ).toHaveLength(0);
});

it("lists the stored team snapshot without generating or uploading a private canvas preview", async () => {
  fetched.mockImplementation(async (_url: string, options?: RequestInit) => ({
    ok: true,
    status: 200,
    json: async () =>
      options?.method
        ? {
            ok: true,
            share: {
              token: "stable",
              expiresAt: null,
              shareType: "published",
              galleryState: "listed",
              galleryTitle: "Gallery race",
              galleryDescription: "A shared team race",
            },
          }
        : {
            ok: true,
            share: {
              token: "stable",
              expiresAt: null,
              shareType: "published",
              galleryState: null,
            },
            shares: [],
          },
  }));
  render(
    <ShareDialog
      open
      onOpenChange={() => {}}
      teamId="club"
      projectId="race"
      revision={7}
    />
  );
  await screen.findByRole("button", { name: "Copy link" });
  fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
  fireEvent.click(screen.getByRole("button", { name: "Add to gallery" }));
  expect(screen.getByText("Uses the standard TrackDraw image.")).toBeTruthy();
  expect(screen.queryByText("Generating preview...")).toBeNull();
  fireEvent.change(screen.getByRole("textbox", { name: /Description/ }), {
    target: { value: "A shared team race" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add to gallery" }));
  await waitFor(() =>
    expect(
      fetched.mock.calls.some(([, options]) => options?.method === "POST")
    ).toBe(true)
  );
  const mutation = fetched.mock.calls.find(
    ([, options]) => options?.method === "POST"
  );
  expect(JSON.parse(String(mutation?.[1]?.body))).toMatchObject({
    action: "list",
    teamId: "club",
    projectId: "race",
    token: "stable",
    description: "A shared team race",
  });
  expect(JSON.parse(String(mutation?.[1]?.body))).not.toHaveProperty(
    "previewDataUrl"
  );
});

it("keeps a remaining retained link selectable after revoking the selected link", async () => {
  const retained = {
    title: "Older snapshot",
    expiresAt: null,
    shareType: "published",
    galleryState: null,
  };
  fetched.mockImplementation(async (_url: string, options?: RequestInit) => ({
    ok: true,
    status: 200,
    json: async () =>
      options?.method
        ? { ok: true }
        : {
            ok: true,
            share: { ...retained, token: "first" },
            shares: [
              { ...retained, token: "first" },
              { ...retained, token: "second" },
            ],
          },
  }));
  render(
    <ShareDialog
      open
      onOpenChange={() => {}}
      teamId="club"
      projectId="race"
      revision={7}
    />
  );
  fireEvent.click(await screen.findByRole("button", { name: "Revoke" }));
  await screen.findByRole("button", { name: "Create link" });
  expect(
    screen.getByRole("combobox", { name: "Manage published link" })
  ).toBeTruthy();
});
