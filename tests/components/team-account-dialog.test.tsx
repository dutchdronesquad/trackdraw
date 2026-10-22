// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { TeamAccountDialog } from "@/components/teams/TeamAccountDialog";
import {
  TeamDialogState,
  useTeamDialogState,
} from "@/components/teams/TeamDialogState";
import type { ReactNode } from "react";
vi.mock("@/components/SidebarDialog", () => ({
  SidebarDialog: ({
    onOpenChange,
    onEscapeKeyDown,
    children,
  }: {
    onOpenChange: (open: boolean) => void;
    onEscapeKeyDown?: (event: KeyboardEvent) => void;
    children: ReactNode;
  }) => (
    <div>
      <button
        onClick={() => {
          const event = new KeyboardEvent("keydown", {
            key: "Escape",
            cancelable: true,
          });
          onEscapeKeyDown?.(event);
          if (!event.defaultPrevented) onOpenChange(false);
        }}
      >
        Escape
      </button>
      {children}
    </div>
  ),
}));
afterEach(cleanup);
it("cancels name editing before the mobile drawer can close, and blocks cancellation while saving", async () => {
  const close = vi.fn();
  function Harness() {
    const state = useTeamDialogState();
    return (
      <TeamAccountDialog
        open
        onOpenChange={close}
        title="Account"
        activeItem="teams"
        navItems={[]}
        onItemChange={() => {}}
      >
        <button
          onClick={() => {
            state.setScreen("detail");
            state.setRenameDraft("Draft");
          }}
        >
          Edit
        </button>
        <button onClick={() => state.setBusy(true)}>Save pending</button>
        <button onClick={() => state.setBusy(false)}>Save failed</button>
        <p>{state.renameDraft ?? "Not editing"}</p>
      </TeamAccountDialog>
    );
  }
  render(
    <TeamDialogState>
      <Harness />
    </TeamDialogState>
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Edit" }));
  await user.click(screen.getByRole("button", { name: "Save pending" }));
  await user.click(screen.getByRole("button", { name: "Escape" }));
  expect(screen.getByText("Draft")).toBeTruthy();
  expect(close).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Save failed" }));
  await user.click(screen.getByRole("button", { name: "Escape" }));
  expect(screen.getByText("Not editing")).toBeTruthy();
  expect(close).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Escape" }));
  expect(close).toHaveBeenCalledWith(false);
});
