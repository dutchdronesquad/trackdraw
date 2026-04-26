// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Section } from "@/components/inspector/shared";

afterEach(() => {
  cleanup();
});

describe("inspector Section", () => {
  it("collapses and expands section content from the heading button", async () => {
    const user = userEvent.setup();

    render(
      <Section title="Inventory">
        <div>Stock controls</div>
      </Section>
    );

    const toggle = screen.getByRole("button", { name: "Inventory" });
    const content = screen.getByText("Stock controls").parentElement;

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(content?.hasAttribute("hidden")).toBe(false);

    await user.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(content?.hasAttribute("hidden")).toBe(true);

    await user.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(content?.hasAttribute("hidden")).toBe(false);
  });

  it("can render as a fixed section when collapsible is disabled", () => {
    render(
      <Section title="Transform" collapsible={false}>
        <div>Position controls</div>
      </Section>
    );

    expect(screen.queryByRole("button", { name: "Transform" })).toBeNull();
    expect(screen.getByText("Position controls")).toBeTruthy();
  });
});
