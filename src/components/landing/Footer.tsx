import Link from "next/link";
import Image from "next/image";
import { Github, Heart, Flag } from "lucide-react";
import VersionTag from "@/components/VersionTag";


export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">

        {/* Top grid — mobile: brand full width + 3 cols, md: 4 cols */}
        <div className="mb-10 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">

          {/* Brand — spans 2 cols on mobile */}
          <div className="col-span-2 space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex">
                <Image
                  src="/assets/brand/trackdraw-logo-mono-lightbg.svg"
                  alt="TrackDraw"
                  width={140}
                  height={32}
                  className="block h-8 w-auto dark:hidden"
                />
                <Image
                  src="/assets/brand/trackdraw-logo-mono-darkbg.svg"
                  alt="TrackDraw"
                  width={140}
                  height={32}
                  className="hidden h-8 w-auto dark:block"
                />
              </span>
              <VersionTag />
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Browser-based track designer for FPV race directors. Draw to scale, preview in 3D, share a live link.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground/50">Product</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/studio" className="text-muted-foreground transition-colors hover:text-foreground">
                  Open Studio
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/dutchdronesquad/trackdraw/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Release notes
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground/50">Resources</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="https://github.com/dutchdronesquad/trackdraw/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Report an issue
                </a>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground/50">Connect</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="https://github.com/dutchdronesquad/trackdraw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Github className="size-4 shrink-0" />
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://dutchdronesquad.nl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Flag className="size-4 shrink-0" />
                  Dutch Drone Squad
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()}{" "}
            <a
              href="https://dutchdronesquad.nl"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
              Dutch Drone Squad
            </a>
            . Open source project.
          </p>
          <p className="flex items-center gap-1.5">
            Made with <Heart className="size-3.5 shrink-0 fill-current text-red-500" /> for the FPV community
          </p>
        </div>

      </div>
    </footer>
  );
}
