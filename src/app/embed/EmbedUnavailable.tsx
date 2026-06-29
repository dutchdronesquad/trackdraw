import Image from "next/image";
import Link from "next/link";
import { LockKeyhole, Unlink } from "lucide-react";
import { getTranslations } from "next-intl/server";

type EmbedUnavailableReason = "temporary" | "expired" | "revoked" | "missing";

const messageKeyByReason: Record<
  EmbedUnavailableReason,
  { title: string; description: string }
> = {
  temporary: { title: "temporaryTitle", description: "temporaryDescription" },
  expired: { title: "expiredTitle", description: "expiredDescription" },
  revoked: { title: "revokedTitle", description: "revokedDescription" },
  missing: { title: "missingTitle", description: "missingDescription" },
};

export default async function EmbedUnavailable({
  reason,
  shareHref,
}: {
  reason: EmbedUnavailableReason;
  shareHref?: string;
}) {
  const t = await getTranslations("share.embedUnavailable");
  const messageKeys = messageKeyByReason[reason];
  const copy = {
    title: t(messageKeys.title),
    description: t(messageKeys.description),
  };
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
                  {t("openShareLink")}
                </Link>
              ) : null}
              <Link
                href="/login"
                target="_blank"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-lg px-3 text-xs font-medium transition-colors"
              >
                {t("signIn")}
              </Link>
              <Link
                href="/"
                target="_blank"
                className="border-border text-foreground hover:bg-muted inline-flex h-9 items-center rounded-lg border px-3 text-xs font-medium transition-colors"
              >
                {t("brand")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
