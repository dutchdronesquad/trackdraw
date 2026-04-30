// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountDangerView } from "@/components/dialogs/AccountDialog/DangerView";

function renderDangerView(overrides = {}) {
  return render(
    <AccountDangerView
      deleteConfirmation=""
      deleting={false}
      error={null}
      isPending={false}
      onDeleteConfirmationChange={vi.fn()}
      onDeleteUser={vi.fn()}
      user={{ id: "user-1" }}
      {...overrides}
    />
  );
}

describe("AccountDangerView", () => {
  afterEach(() => {
    cleanup();
  });

  it("states which account-backed data will be removed", () => {
    renderDangerView();

    expect(
      screen.getByText(/account projects, published links, API keys/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/Export anything account-backed that you want to keep/i)
    ).toBeTruthy();
  });

  it("keeps account deletion disabled until DELETE is typed", () => {
    const { rerender } = renderDangerView();

    expect(
      (
        screen.getByRole("button", {
          name: "Delete account",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);

    rerender(
      <AccountDangerView
        deleteConfirmation="DELETE"
        deleting={false}
        error={null}
        isPending={false}
        onDeleteConfirmationChange={vi.fn()}
        onDeleteUser={vi.fn()}
        user={{ id: "user-1" }}
      />
    );

    expect(
      (
        screen.getByRole("button", {
          name: "Delete account",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false);
  });
});
