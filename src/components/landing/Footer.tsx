import Link from "next/link";
import Image from "next/image";
import { Bug, Coffee, Flag, Heart } from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.604-3.369-1.34-3.369-1.34-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.607.069-.607 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}
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
                <span className="relative block h-8 w-35 dark:hidden">
                  <Image
                    src="/assets/brand/trackdraw-logo-mono-lightbg.svg"
                    alt="TrackDraw"
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </span>
                <span className="relative hidden h-8 w-35 dark:block">
                  <Image
                    src="/assets/brand/trackdraw-logo-mono-darkbg.svg"
                    alt="TrackDraw"
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </span>
              </span>
              <VersionTag />
            </div>
            <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
              Browser-based track designer for FPV race directors. Draw to
              scale, preview in 3D, share a read-only link, and keep quick edits
              moving on mobile.
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
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                >
                  <Bug className="size-4 shrink-0" />
                  Report an issue
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/sponsors/klaasnicolaas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                >
                  <Heart className="size-4 shrink-0" />
                  GitHub Sponsors
                </a>
              </li>
              <li>
                <a
                  href="https://ko-fi.com/klaasnicolaas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                >
                  <Coffee className="size-4 shrink-0" />
                  Ko-fi
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
                  <GithubIcon className="size-4 shrink-0" />
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
