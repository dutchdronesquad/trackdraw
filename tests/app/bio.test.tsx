// @vitest-environment happy-dom

import { render, screen, cleanup } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import landing from "@lang/en-US/landing.json";
import BioPage from "@/components/bio/BioPage";
import { bioConfig, bioConfigSchema } from "@/lib/bio";

vi.mock("@/components/bio/BioTrackViewer", () => ({
  default: () => <section aria-label="Interactive track" />,
}));

vi.mock("next/image", () => ({
  default: ({
    priority: _priority,
    alt,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
    // A plain image keeps this test independent of Next image optimization.
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={alt ?? ""} />
  ),
}));

afterEach(cleanup);

describe("bio page", () => {
  it("includes useful destinations in server HTML without a client fetch", () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={{ landing }}>
        <BioPage config={bioConfig} />
      </NextIntlClientProvider>
    );
    expect(html).toContain('href="/studio"');
    expect(html).toContain('href="/gallery"');
    expect(html).toContain("No account needed.");
    expect(html).not.toContain('target="_blank"');
  });

  it("renders configured order, accessible links and decorative previews", () => {
    render(<BioPage config={bioConfig} />);
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      [
        ...bioConfig.featured,
        ...bioConfig.links,
        ...bioConfig.socials,
        { href: "/" },
      ].map((item) => item.href)
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "TrackDraw"
    );
    expect(
      screen.getByRole("link", { name: /Open TrackDraw/ }).getAttribute("href")
    ).toBe("/studio");
    for (const link of links) expect(link.textContent?.trim()).toBeTruthy();
    for (const image of document.querySelectorAll("img"))
      expect(image.alt).toBe("");
  });

  it("omits empty editorial sections and supports items without images", () => {
    render(
      <BioPage
        config={{
          featured: [{ id: "intro", href: "/#features" }],
          links: [],
          socials: [],
        }}
      />
    );
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getByRole("region", { name: /spotlight/i })).toBeTruthy();
    expect(document.querySelector('img[src*="screenshots"]')).toBeNull();
    cleanup();
    render(<BioPage config={{ featured: [], links: [], socials: [] }} />);
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    expect(
      screen.getByRole("link", { name: "trackdraw.app" }).getAttribute("href")
    ).toBe("/");
  });

  it.each([
    "javascript:alert(1)",
    "//example.com",
    "/\\example.com",
    "https://user:password@example.com",
    "http://example.com",
    "https://example.com/has space",
  ])("rejects unsafe or malformed destinations: %s", (href) => {
    expect(
      bioConfigSchema.safeParse({
        ...bioConfig,
        links: [{ id: "studio", href }],
      }).success
    ).toBe(false);
  });
});
