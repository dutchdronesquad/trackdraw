// @vitest-environment happy-dom

import type React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShareNotFound from "@/app/share/[token]/not-found";

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
    // eslint-disable-next-line @next/next/no-img-element
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

describe("ShareNotFound", () => {
  afterEach(() => {
    cleanup();
  });

  it("explains missing links may be revoked without exposing a separate state", () => {
    render(<ShareNotFound />);

    expect(
      screen.getByText("This shared track could not be opened")
    ).toBeTruthy();
    expect(
      screen.getByText(/may have been revoked by the owner/i)
    ).toBeTruthy();
    expect(screen.getByText(/confirm the share is still active/i)).toBeTruthy();
  });
});
