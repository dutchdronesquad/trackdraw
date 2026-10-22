// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";

afterEach(cleanup);
it("focuses cancel, requires confirmation and blocks dismissal while the request is pending", async () => {
  const confirm = vi.fn();
  const change = vi.fn();
  const props = {
    open: true,
    onOpenChange: change,
    title: "Remove member",
    description: "Their team access stops.",
    confirmLabel: "Remove",
    onConfirm: confirm,
  };
  const user = userEvent.setup();
  const { rerender } = render(<ConfirmationDialog {...props} />);
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Cancel" })
    )
  );
  expect(confirm).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(change).toHaveBeenCalledWith(false);
  change.mockClear();
  await user.click(screen.getByRole("button", { name: "Remove" }));
  expect(confirm).toHaveBeenCalledOnce();
  rerender(<ConfirmationDialog {...props} busy />);
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: "Close" }));
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  await user.click(screen.getByRole("button", { name: "Remove" }));
  expect(change).not.toHaveBeenCalled();
  expect(confirm).toHaveBeenCalledOnce();
});
