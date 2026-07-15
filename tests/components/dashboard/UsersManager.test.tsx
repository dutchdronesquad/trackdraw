// @vitest-environment happy-dom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import DashboardUsersManager from "@/components/dashboard/UsersManager";
import type { AdminUser } from "@/lib/account/admin-users";

function createUser(index: number): AdminUser {
  return {
    id: `user-${index}`,
    name: `User ${index}`,
    email: `user-${index}@trackdraw.local`,
    image: null,
    role: "user",
    createdAt: `2026-07-${String(index).padStart(2, "0")}T10:00:00.000Z`,
    updatedAt: `2026-07-${String(index).padStart(2, "0")}T10:00:00.000Z`,
    lastLoginAt: null,
    projectCount: 0,
    bannedAt: null,
    banReason: null,
  };
}

describe("DashboardUsersManager", () => {
  afterEach(cleanup);

  it("paginates accounts and resets to the first page when searching", async () => {
    const user = userEvent.setup();
    const users = Array.from({ length: 12 }, (_, index) =>
      createUser(index + 1)
    );

    render(
      <DashboardUsersManager currentUserId="user-1" initialUsers={users} />
    );

    expect(screen.getByText("Page 1 of 2")).toBeTruthy();
    expect(screen.getByText("User 10")).toBeTruthy();
    expect(screen.queryByText("User 11")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Next page" }));

    expect(screen.getByText("Page 2 of 2")).toBeTruthy();
    expect(screen.getByText("User 11")).toBeTruthy();

    await user.type(
      screen.getByPlaceholderText("Search by name or email..."),
      "User 12"
    );

    expect(screen.getByText("Page 1 of 1")).toBeTruthy();
    expect(screen.getByText("User 12")).toBeTruthy();
    expect(screen.queryByText("User 11")).toBeNull();
  });

  it("applies role filters before paginating", async () => {
    const user = userEvent.setup();
    const users = Array.from({ length: 12 }, (_, index) =>
      createUser(index + 1)
    );
    users[11] = { ...users[11], role: "admin" };

    render(
      <DashboardUsersManager currentUserId="user-1" initialUsers={users} />
    );

    await user.click(screen.getByRole("button", { name: "Role" }));
    await user.click(screen.getByRole("button", { name: "Admin 1" }));

    expect(screen.getByText("Page 1 of 1")).toBeTruthy();
    expect(screen.getByText("User 12")).toBeTruthy();
    expect(screen.queryByText("User 1")).toBeNull();
    expect(screen.getByText("Showing 1 of 12 accounts.")).toBeTruthy();
  });
});
