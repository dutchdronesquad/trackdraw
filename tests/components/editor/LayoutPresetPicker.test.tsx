// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LayoutPresetPicker } from "@/components/editor/LayoutPresetPicker";
import { layoutPresets } from "@/lib/planning/layout-presets";

vi.mock("@/components/MobileDrawer", () => ({
  MobileDrawer: ({
    children,
    open,
    pinnedContent,
    title,
  }: {
    children: React.ReactNode;
    open: boolean;
    pinnedContent?: React.ReactNode;
    title: string;
  }) =>
    open ? (
      <section aria-label={title} data-testid="mobile-drawer">
        {pinnedContent}
        {children}
      </section>
    ) : null,
}));

function getPresetButton(presetName: string) {
  const button = screen
    .getAllByRole("button")
    .find((element) => element.textContent?.includes(presetName));

  if (!button) {
    throw new Error(`Preset button not found: ${presetName}`);
  }

  return button;
}

describe("LayoutPresetPicker", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not mount the desktop picker while closed", () => {
    render(
      <LayoutPresetPicker
        open={false}
        onOpenChange={vi.fn()}
        selectedPresetId={null}
        onSelectPreset={vi.fn()}
      />
    );

    expect(screen.queryByText("Layout presets")).toBeNull();
  });

  it("shows the selected desktop preset and returns the chosen preset id", async () => {
    const user = userEvent.setup();
    const onSelectPreset = vi.fn();
    const selectedPreset = layoutPresets[0];
    const nextPreset = layoutPresets[1];

    render(
      <LayoutPresetPicker
        open
        onOpenChange={vi.fn()}
        selectedPresetId={selectedPreset.id}
        onSelectPreset={onSelectPreset}
      />
    );

    expect(
      screen.getByText(`Current preset: ${selectedPreset.name}`)
    ).toBeTruthy();

    await user.click(getPresetButton(nextPreset.name));

    expect(onSelectPreset).toHaveBeenCalledWith(nextPreset.id);
  });

  it("keeps selected preset context visible in the mobile drawer", async () => {
    const user = userEvent.setup();
    const onSelectPreset = vi.fn();
    const selectedPreset = layoutPresets[0];
    const nextPreset = layoutPresets[1];

    render(
      <LayoutPresetPicker
        mobile
        open
        onOpenChange={vi.fn()}
        selectedPresetId={selectedPreset.id}
        onSelectPreset={onSelectPreset}
      />
    );

    expect(screen.getByTestId("mobile-drawer")).toBeTruthy();
    expect(
      screen.getByText(`Current preset: ${selectedPreset.name}`)
    ).toBeTruthy();

    await user.click(getPresetButton(nextPreset.name));

    expect(onSelectPreset).toHaveBeenCalledWith(nextPreset.id);
  });
});
