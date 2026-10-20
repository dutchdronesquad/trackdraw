// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { McpConsent } from "@/components/mcp/consent";
import { McpConnections } from "@/components/mcp/connections";

vi.mock("next/image", () => ({ default: () => null }));

const request = {
  query: "client_id=app&sig=signed",
  clientId: "app",
  clientName: "Example MCP client",
  callbackHost: "example.com",
  account: "pilot@example.invalid",
  offlineAccess: true,
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MCP consent and connection management", () => {
  it("requires an explicit action and shows requested access and account", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<McpConsent request={request} />);
    expect(screen.getByText("pilot@example.invalid")).toBeTruthy();
    expect(screen.getByText("Example MCP client")).toBeTruthy();
    expect(
      screen.getAllByText(/cannot read, create, edit or publish/)[0]
    ).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("shows create-only boundaries only for explicitly requested draft access", () => {
    render(
      <McpConsent
        request={{
          ...request,
          projectReadAccess: true,
          projectCreateAccess: true,
        }}
      />
    );
    expect(
      screen.getAllByText("Create separate track drafts").length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/cannot edit, delete or publish existing projects/)
        .length
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/This connection cannot create/)).toBeNull();
  });
  it("shows all owned project reads only when explicitly requested", () => {
    render(<McpConsent request={{ ...request, projectReadAccess: true }} />);
    expect(screen.getByText("Read your saved projects")).toBeTruthy();
    expect(
      screen.getAllByText(/current and future saved cloud projects/).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/cannot create, edit, delete or publish/).length
    ).toBeGreaterThan(0);
    expect(
      screen.queryByText(/cannot read, create, edit or publish/)
    ).toBeNull();
  });
  it.each([
    ["Allow connection", true],
    ["Decline", false],
  ] as const)(
    "sends the signed request only after %s",
    async (label, accept) => {
      const fetch = vi.fn(async () =>
        Response.json({ url: "https://example.com/callback?code=approved" })
      );
      vi.stubGlobal("fetch", fetch);
      const assign = vi
        .spyOn(window.location, "assign")
        .mockImplementation(() => {});
      render(<McpConsent request={request} />);
      fireEvent.click(screen.getByRole("button", { name: label }));
      await waitFor(() => expect(assign).toHaveBeenCalled());
      expect(fetch).toHaveBeenCalledWith(
        "/api/auth/oauth2/consent",
        expect.objectContaining({
          body: JSON.stringify({ accept, oauth_query: request.query }),
        })
      );
    }
  );
  it("keeps consent available after a failed request without redirecting", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: "invalid_request" }, { status: 400 })
      )
    );
    const assign = vi
      .spyOn(window.location, "assign")
      .mockImplementation(() => {});
    render(<McpConsent request={request} />);
    fireEvent.click(screen.getByRole("button", { name: "Allow connection" }));
    await screen.findByRole("alert");
    expect(assign).not.toHaveBeenCalled();
    expect(
      screen
        .getByRole("button", { name: "Allow connection" })
        .hasAttribute("disabled")
    ).toBe(false);
  });
  it("disconnects an app and removes its row after the server confirms", async () => {
    const fetch = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetch);
    render(
      <McpConnections
        initialConnections={[
          {
            id: "consent-1",
            clientId: "app",
            name: "Example app",
            createdAt: "2026-10-20",
          },
        ]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    await screen.findByText("No connected apps.");
    expect(fetch).toHaveBeenCalledWith(
      "/api/account/mcp-connections/consent-1",
      { method: "DELETE" }
    );
  });
});
