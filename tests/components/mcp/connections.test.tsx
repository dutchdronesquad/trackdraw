// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { McpConnectionsContent } from "@/components/mcp/connections";
const connections = [
  {
    id: "consent-a",
    clientId: "client-a",
    name: "Example app",
    createdAt: "2026-10-20T10:00:00Z",
  },
];
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("loads the embedded list and retries a failed request", async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce(new Response("", { status: 503 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ connections })));
  vi.stubGlobal("fetch", request);
  render(<McpConnectionsContent />);
  expect(await screen.findByRole("alert")).toBeTruthy();
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Example app")).toBeTruthy();
  expect(request).toHaveBeenCalledTimes(2);
});
it("requires confirmation and retains the connection when disconnect fails", async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce(new Response("", { status: 503 }))
    .mockResolvedValueOnce(new Response("{}"));
  vi.stubGlobal("fetch", request);
  render(<McpConnectionsContent initialConnections={connections} />);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "Disconnect Example app" })
  );
  expect(request).not.toHaveBeenCalled();
  expect(
    screen.getByRole("alertdialog", { name: "Disconnect Example app?" })
  ).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByText("Example app")).toBeTruthy();
  await user.click(
    screen.getByRole("button", { name: "Disconnect Example app" })
  );
  await user.click(screen.getByRole("button", { name: "Disconnect" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Disconnect" }));
  await waitFor(() =>
    expect(screen.queryByText("Disconnect Example app?")).toBeNull()
  );
  expect(screen.getByText("No connected apps yet")).toBeTruthy();
  expect(request).toHaveBeenLastCalledWith(
    "/api/account/mcp-connections/consent-a",
    { method: "DELETE" }
  );
});
it("cancels the list request when leaving the account view", () => {
  const request = vi.fn(
    (_url: string, _options?: RequestInit) => new Promise<Response>(() => {})
  );
  vi.stubGlobal("fetch", request);
  const { unmount } = render(<McpConnectionsContent />);
  const signal = request.mock.calls[0][1]!.signal as AbortSignal;
  expect(signal.aborted).toBe(false);
  unmount();
  expect(signal.aborted).toBe(true);
});
