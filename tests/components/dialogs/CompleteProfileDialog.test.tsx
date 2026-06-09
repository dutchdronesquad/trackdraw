// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import CompleteProfileDialog from "@/components/dialogs/CompleteProfileDialog";

const mobileState = vi.hoisted(() => ({
  isMobile: false,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mobileState.isMobile,
}));

vi.mock("@/components/MobileDrawer", () => ({
  MobileDrawer: ({
    children,
    open,
    title,
  }: {
    children: React.ReactNode;
    open: boolean;
    title: string;
  }) =>
    open ? (
      <section aria-label={title} data-testid="mobile-drawer">
        {children}
      </section>
    ) : null,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

function renderCompleteProfile(
  overrides: Partial<React.ComponentProps<typeof CompleteProfileDialog>> = {}
) {
  const props: React.ComponentProps<typeof CompleteProfileDialog> = {
    open: true,
    onOpenChange: vi.fn(),
    email: "pilot@example.com",
    currentName: null,
    onSave: vi.fn(async () => undefined),
    ...overrides,
  };

  render(<CompleteProfileDialog {...props} />);
  return props;
}

describe("CompleteProfileDialog", () => {
  afterEach(() => {
    cleanup();
    mobileState.isMobile = false;
    vi.clearAllMocks();
  });

  it("saves a trimmed display name and closes the dialog", async () => {
    const user = userEvent.setup();
    const props = renderCompleteProfile();

    await user.type(screen.getByLabelText("Display name"), "  Race Pilot  ");
    await user.click(screen.getByRole("button", { name: "Save name" }));

    await waitFor(() => {
      expect(props.onSave).toHaveBeenCalledWith("Race Pilot");
    });
    expect(toast.success).toHaveBeenCalledWith("Profile updated");
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps saving disabled until a visible name is entered", async () => {
    const user = userEvent.setup();
    renderCompleteProfile();
    const input = screen.getByLabelText("Display name");
    const saveButton = screen.getByRole("button", { name: "Save name" });

    expect((saveButton as HTMLButtonElement).disabled).toBe(true);

    await user.type(input, "   ");
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);

    await user.type(input, "Pilot");
    expect((saveButton as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows account update failures without closing", async () => {
    const user = userEvent.setup();
    const props = renderCompleteProfile({
      onSave: vi.fn(async () => {
        throw new Error("Name update failed");
      }),
    });

    await user.type(screen.getByLabelText("Display name"), "Race Pilot");
    await user.click(screen.getByRole("button", { name: "Save name" }));

    expect(await screen.findByText("Name update failed")).toBeTruthy();
    expect(props.onOpenChange).not.toHaveBeenCalled();
  });

  it("uses the mobile drawer shell on small screens", () => {
    mobileState.isMobile = true;

    renderCompleteProfile({ currentName: "Mobile Pilot" });

    expect(screen.getByTestId("mobile-drawer")).toBeTruthy();
    expect(screen.getByDisplayValue("Mobile Pilot")).toBeTruthy();
  });
});
