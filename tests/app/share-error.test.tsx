// @vitest-environment happy-dom

import type React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShareError from "@/app/share/ShareError";

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

describe("ShareError", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the retired share guidance with rich steps and actions", async () => {
    render(await ShareError());

    expect(
      screen.getByText("This shared track link is no longer supported")
    ).toBeTruthy();
    expect(screen.getByText("Studio").tagName).toBe("STRONG");
    expect(screen.getByText("JSON export").tagName).toBe("STRONG");
    expect(
      screen.getByRole("link", { name: /Open Studio to Import/i })
    ).toHaveProperty("href", expect.stringContaining("/studio"));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
