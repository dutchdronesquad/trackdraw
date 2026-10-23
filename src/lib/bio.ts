import { z } from "zod";
import type landing from "@lang/en-US/landing.json";

const destination = z.string().refine((value) => {
  if (/[\s\\]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}, "Use a site-relative path or an HTTPS URL without credentials");

const itemKeys = [
  "intro",
  "studio",
  "gallery",
  "viewer",
  "artwork",
  "instagram",
  "facebook",
  "github",
] as const satisfies readonly (keyof typeof landing.bio.items)[];

const link = z.object({
  id: z.enum(itemKeys),
  href: destination,
});

export const bioConfigSchema = z.object({
  featured: z.array(link),
  links: z.array(link.extend({ primary: z.boolean().optional() })),
  socials: z.array(link),
});

export type BioConfig = z.infer<typeof bioConfigSchema>;

// Ordered editorial content. Copy for each id lives in landing.bio.items.
// Invalid destinations fail prerender rather than reaching the public page.
export const bioConfig: BioConfig = bioConfigSchema.parse({
  featured: [],
  links: [
    { id: "studio", href: "/studio", primary: true },
    { id: "gallery", href: "/gallery" },
    { id: "viewer", href: "https://viewer.trackdraw.app" },
    { id: "artwork", href: "https://designer.trackdraw.app" },
  ],
  socials: [
    { id: "instagram", href: "https://www.instagram.com/trackdraw.app/" },
    { id: "facebook", href: "https://www.facebook.com/trackdraw" },
    { id: "github", href: "https://github.com/dutchdronesquad/trackdraw" },
  ],
});
