// @vitest-environment happy-dom

import type React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShareExpired from "@/app/share/ShareExpired";

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

describe("ShareExpired", () => {
  afterEach(() => {
    cleanup();
  });

  it("explains temporary expiry separately from account-published shares", () => {
    render(<ShareExpired />);

    expect(screen.getByText("This share link has expired")).toBeTruthy();
    expect(
      screen.getByText(/Temporary TrackDraw share links expire/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/Account-published project links stay live/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/account-published link for longer-lived read-only/i)
    ).toBeTruthy();
  });
});
