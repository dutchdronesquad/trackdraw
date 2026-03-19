import Link from "next/link";
import Image from "next/image";
import { Github, Heart, Flag } from "lucide-react";
import VersionTag from "@/components/VersionTag";

export function Footer() {
  return (
    <footer className="border-border bg-muted/20 border-t">
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
                  className="block dark:hidden"
                  style={{ width: "auto", height: "2rem" }}
                />
                <Image
                  src="/assets/brand/trackdraw-logo-mono-darkbg.svg"
                  alt="TrackDraw"
                  width={140}
                  height={32}
                  className="hidden dark:block"
                  style={{ width: "auto", height: "2rem" }}
                />
              </span>
              <VersionTag />
            </div>
            <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
              Browser-based track designer for FPV race directors. Draw to
              scale, preview in 3D, share a read-only link, and keep quick
              edits moving on mobile.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <h3 className="text-foreground/50 text-xs font-semibold tracking-widest uppercase">
              Product
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/studio"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Open Studio
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/dutchdronesquad/trackdraw/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Release notes
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h3 className="text-foreground/50 text-xs font-semibold tracking-widest uppercase">
              Resources
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="https://github.com/dutchdronesquad/trackdraw/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Report an issue
                </a>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div className="space-y-3">
            <h3 className="text-foreground/50 text-xs font-semibold tracking-widest uppercase">
              Connect
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="https://github.com/dutchdronesquad/trackdraw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
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
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                >
                  <Flag className="size-4 shrink-0" />
                  Dutch Drone Squad
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-border text-muted-foreground flex flex-col items-center justify-between gap-3 border-t pt-6 text-sm sm:flex-row">
          <p>
            © {new Date().getFullYear()}{" "}
            <a
              href="https://dutchdronesquad.nl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/70 hover:text-foreground font-medium transition-colors"
            >
              Dutch Drone Squad
            </a>
            . Open source project.
          </p>
          <p className="flex items-center gap-1.5">
            Made with{" "}
            <Heart className="size-3.5 shrink-0 fill-current text-red-500" />{" "}
            for the FPV community
          </p>
        </div>
      </div>
    </footer>
  );
}
