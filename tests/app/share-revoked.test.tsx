// @vitest-environment happy-dom

import type React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShareRevoked from "@/app/share/ShareRevoked";

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    unoptimized: _unoptimized,
    priority: _priority,
    quality: _quality,
    loader: _loader,
    blurDataURL: _blurDataURL,
    placeholder: _placeholder,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    unoptimized?: boolean;
    priority?: boolean;
    quality?: number;
    loader?: unknown;
    blurDataURL?: string;
    placeholder?: string;
  }) => (
    // oxlint-disable-next-line nextjs/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("ShareRevoked", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders revoked share guidance with recovery steps", async () => {
    render(await ShareRevoked());

    expect(screen.getByText("This share link was revoked")).toBeTruthy();
    expect(screen.getByText("JSON export").tagName).toBe("STRONG");
    expect(
      screen.getByRole("link", { name: /Open Studio to Import/i })
    ).toHaveProperty("href", expect.stringContaining("/studio"));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
