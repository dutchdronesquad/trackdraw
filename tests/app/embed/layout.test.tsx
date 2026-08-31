// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/LanguageProvider", () => ({
  default: ({
    namespaces,
    children,
  }: {
    namespaces: readonly string[];
    children: React.ReactNode;
  }) => (
    <div data-testid="language-provider" data-namespaces={namespaces.join(",")}>
      {children}
    </div>
  ),
}));

import EmbedLayout from "@/app/embed/layout";

describe("embed layout", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps embed messages scoped to the share namespace", () => {
    render(
      <EmbedLayout>
        <div>Embed content</div>
      </EmbedLayout>
    );

    expect(
      screen.getByTestId("language-provider").getAttribute("data-namespaces")
    ).toBe("common,editor,share");
  });
});
