import Image from "next/image";
import Link from "next/link";
import { LockKeyhole, Unlink } from "lucide-react";

type EmbedUnavailableReason = "temporary" | "expired" | "revoked" | "missing";

const copyByReason: Record<
  EmbedUnavailableReason,
  { title: string; description: string }
> = {
  temporary: {
    title: "Embed unavailable",
    description:
      "Embeds are available for published account shares. Open the share link or sign in to publish a durable embed.",
  },
  expired: {
    title: "This embed has expired",
    description:
      "This temporary TrackDraw share is no longer active. Ask the owner to publish a durable account share.",
  },
  revoked: {
    title: "This embed was revoked",
    description:
      "The owner has revoked this TrackDraw share, so the embedded track is no longer available.",
  },
  missing: {
    title: "Track not found",
    description:
      "This TrackDraw embed does not match an active published account share.",
  },
};

export default function EmbedUnavailable({
  reason,
  shareHref,
}: {
  reason: EmbedUnavailableReason;
  shareHref?: string;
}) {
  const copy = copyByReason[reason];
  const Icon = reason === "temporary" ? LockKeyhole : Unlink;

  return (
    <main className="bg-background text-foreground flex min-h-dvh items-center justify-center px-4 py-6">
      <div className="border-border/60 bg-card/80 w-full max-w-md rounded-2xl border px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.10)]">
        <div className="flex items-start gap-3">
          <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="relative h-6 w-28">
              <Image
                src="/assets/brand/trackdraw-logo-color-lightbg.svg"
                alt="TrackDraw"
                fill
                priority
                unoptimized
                className="object-contain dark:hidden"
              />
              <Image
                src="/assets/brand/trackdraw-logo-color-darkbg.svg"
                alt="TrackDraw"
                fill
                priority
                unoptimized
                className="hidden object-contain dark:block"
              />
            </div>
            <h1 className="mt-4 text-base font-semibold">{copy.title}</h1>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              {copy.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {shareHref ? (
                <Link
                  href={shareHref}
                  target="_blank"
                  className="border-border text-foreground hover:bg-muted inline-flex h-9 items-center rounded-lg border px-3 text-xs font-medium transition-colors"
                >
                  Open share link
                </Link>
              ) : null}
              <Link
                href="/login"
                target="_blank"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-lg px-3 text-xs font-medium transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/"
                target="_blank"
                className="border-border text-foreground hover:bg-muted inline-flex h-9 items-center rounded-lg border px-3 text-xs font-medium transition-colors"
              >
                TrackDraw
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
