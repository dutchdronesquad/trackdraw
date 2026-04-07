import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthEmailPreviewFrame } from "@/components/dev/AuthEmailPreviewFrame";
import { cn } from "@/lib/utils";
import {
  type AuthEmailPreviewKey,
  getAuthEmailPreviewContent,
} from "@/lib/server/auth-email";

export const metadata: Metadata = {
  title: "Email Preview",
  robots: {
    index: false,
    follow: false,
  },
};

const previewItems: Array<{
  key: AuthEmailPreviewKey;
  label: string;
  description: string;
}> = [
  {
    key: "magic-link",
    label: "Magic link",
    description: "Primary sign-in email flow",
  },
  {
    key: "verify-email",
    label: "Verify email",
    description: "Rare follow-up verification flow",
  },
  {
    key: "change-email",
    label: "Email change",
    description: "Primary account email change confirmation",
  },
];

function parsePreviewKey(value: string | undefined): AuthEmailPreviewKey {
  return previewItems.some((item) => item.key === value)
    ? (value as AuthEmailPreviewKey)
    : "magic-link";
}

export default async function EmailPreviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ template?: string }>;
}) {
  if (process.env.NEXT_PUBLIC_APP_ENV === "production") {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activeKey = parsePreviewKey(resolvedSearchParams?.template);
  const content = getAuthEmailPreviewContent(activeKey);
  const activeItem =
    previewItems.find((item) => item.key === activeKey) ?? previewItems[0];
  const fromAddress = process.env.PLUNK_FROM_EMAIL ?? "noreply@emails.trackdraw.app";

  return (
    <main className="bg-background relative min-h-screen overflow-hidden px-6 py-8">
      <div className="bg-brand-primary/8 pointer-events-none absolute top-0 -left-32 h-72 w-72 rounded-full blur-3xl" />
      <div className="bg-brand-secondary/8 pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full blur-3xl" />

      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <aside className="bg-card/95 border-border/60 w-full shrink-0 overflow-hidden rounded-[1.75rem] border shadow-sm backdrop-blur-xs lg:sticky lg:top-6 lg:w-84 lg:self-start">
          <div className="border-border/50 border-b bg-linear-to-br from-[#081122] via-[#111827] to-[#0f172a] px-5 py-5 text-white">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-white/62 uppercase">
              Dev Tools
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">
              Auth Email Preview
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Review the current transactional email styling without sending a
              real message.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-medium text-slate-200">
                Non-production only
              </span>
              <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-medium text-slate-200">
                {fromAddress}
              </span>
            </div>
          </div>

          <div className="p-4">
            <p className="text-muted-foreground px-1 text-[11px] font-semibold tracking-[0.16em] uppercase">
              Templates
            </p>
            <div className="mt-5 space-y-2">
              {previewItems.map((item) => (
                <Link
                  key={item.key}
                  href={`/dev/email-preview?template=${item.key}`}
                  className={cn(
                    "block rounded-2xl border px-4 py-3 transition-all",
                    item.key === activeKey
                      ? "border-brand-primary/30 bg-brand-primary/10 text-foreground shadow-sm"
                      : "border-border/60 bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 opacity-80">
                    {item.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 space-y-4">
          <div className="bg-card/95 border-border/60 rounded-[1.75rem] border px-5 py-4 shadow-sm backdrop-blur-xs">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
                  Current Template
                </p>
                <p className="mt-2 text-xl font-semibold tracking-tight">
                  {activeItem.label}
                </p>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {activeItem.description}
                </p>
              </div>
              <div className="min-w-0 lg:max-w-sm">
                <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase">
                  Subject
                </p>
                <p className="mt-1 truncate text-sm font-medium">
                  {content.subject}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card/95 border-border/60 overflow-hidden rounded-[1.75rem] border shadow-sm backdrop-blur-xs">
            <div className="border-border/60 bg-muted/30 flex items-center justify-between border-b px-5 py-3">
              <div>
                <p className="text-foreground text-sm font-medium">
                  HTML Preview
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Approximate inbox rendering for the selected template
                </p>
              </div>
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span className="rounded-full border border-slate-300/70 bg-white px-2.5 py-1 font-medium text-slate-600">
                  Desktop
                </span>
                <span className="rounded-full border border-transparent bg-transparent px-2.5 py-1 font-medium opacity-60">
                  Mobile width
                </span>
              </div>
            </div>
            <div className="bg-[#dfe8f6] p-3 sm:p-5">
              <div className="mx-auto max-w-4xl overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-[#dfe8f6] shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <AuthEmailPreviewFrame
                  title={`${activeKey} email preview`}
                  html={content.htmlBody}
                  className="block w-full bg-[#dfe8f6]"
                />
              </div>
            </div>
          </div>

          <div className="bg-card/95 border-border/60 rounded-[1.75rem] border p-5 shadow-sm backdrop-blur-xs">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
              Plain Text
            </p>
            <pre className="bg-muted/30 text-foreground mt-3 overflow-x-auto rounded-2xl border border-slate-200/70 px-4 py-4 text-sm leading-6 whitespace-pre-wrap">
              {content.textBody}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
