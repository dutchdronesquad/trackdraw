// @vitest-environment happy-dom

import type React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import PublicGalleryGrid from "@/components/gallery/PublicGalleryGrid";
import type { PublicGalleryEntry } from "@/lib/server/gallery";

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

vi.mock("next/image", () => ({
  default: ({
    alt,
    fill: _fill,
    unoptimized: _unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    unoptimized?: boolean;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

vi.mock("@/hooks/useMeasurementUnitSystem", () => ({
  useMeasurementUnitSystem: () => ({ unitSystem: "metric" }),
}));

function galleryEntry(
  overrides: Partial<PublicGalleryEntry> = {}
): PublicGalleryEntry {
  const id = overrides.id ?? "entry-1";

  return {
    id,
    shareToken: `token-${id}`,
    ownerUserId: "user-1",
    galleryState: "listed",
    galleryTitle: `Track ${id}`,
    galleryDescription: `Description for ${id}`,
    galleryPreviewImage: `/previews/${id}.png`,
    galleryPublishedAt: "2026-01-15T10:00:00.000Z",
    moderationHiddenAt: null,
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-15T10:00:00.000Z",
    ownerName: "Race Pilot",
    shareTitle: null,
    fieldWidth: 40,
    fieldHeight: 25,
    shapeCount: 8,
    ...overrides,
  };
}

describe("PublicGalleryGrid", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the empty gallery state when there are no public tracks", () => {
    render(<PublicGalleryGrid entries={[]} />);

    expect(screen.getByText("No tracks yet.")).toBeTruthy();
    expect(
      screen.getByText(
        /Gallery listings will appear here once TrackDraw pilots/
      )
    ).toBeTruthy();
  });

  it("renders canonical share links, featured tracks, and recent pagination", async () => {
    const user = userEvent.setup();
    const entries = [
      galleryEntry({
        id: "featured",
        shareToken: "featured-token",
        galleryState: "featured",
        galleryTitle: "Featured club race",
      }),
      ...Array.from({ length: 13 }, (_, index) =>
        galleryEntry({
          id: `recent-${index + 1}`,
          shareToken: `recent-token-${index + 1}`,
          galleryTitle: `Recent track ${index + 1}`,
        })
      ),
    ];

    render(
      <PublicGalleryGrid entries={entries} mediaBaseUrl="https://media.test" />
    );

    expect(screen.getByRole("heading", { name: "Featured" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Recent" })).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /Featured club race/ })
        .getAttribute("href")
    ).toBe("/share/featured-token");
    expect(screen.getByAltText("Recent track 1").getAttribute("src")).toBe(
      "https://media.test/previews/recent-1.png"
    );
    expect(screen.queryByText("Recent track 13")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(screen.getByText("Recent track 13")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("falls back to the TrackDraw mark when a preview image fails", () => {
    render(
      <PublicGalleryGrid
        entries={[
          galleryEntry({
            galleryTitle: "Fallback preview",
            galleryPreviewImage: "https://cdn.test/preview.png",
          }),
        ]}
      />
    );

    const image = screen.getByAltText("Fallback preview");
    fireEvent.error(image);

    expect(screen.queryByAltText("Fallback preview")).toBeNull();
    expect(screen.getByText("Fallback preview")).toBeTruthy();
  });
});
