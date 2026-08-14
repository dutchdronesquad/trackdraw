// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import landing from "../../../lang/en-US/landing.json";

vi.mock("next/link", () => ({
  default: ({
    children,
    prefetch,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    prefetch?: boolean;
  }) => (
    <a {...props} data-prefetch={String(prefetch)}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

vi.mock("@/components/VersionTag", () => ({
  default: () => null,
}));

import { Footer } from "@/components/landing/Footer";

describe("Footer", () => {
  it("does not prefetch repeated legal links from persistent public surfaces", () => {
    render(
      <NextIntlClientProvider locale="en-US" messages={{ landing }}>
        <Footer />
      </NextIntlClientProvider>
    );

    expect(
      screen
        .getByRole("link", { name: /privacy/i })
        .getAttribute("data-prefetch")
    ).toBe("false");
    expect(
      screen.getByRole("link", { name: /terms/i }).getAttribute("data-prefetch")
    ).toBe("false");
  });
});
