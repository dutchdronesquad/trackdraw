import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/landing/Footer";
import { PublicSiteHeader } from "@/components/landing/PublicSiteHeader";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How TrackDraw handles account, project, sharing, gallery, API, and operational data.",
  alternates: {
    canonical: "/privacy",
  },
};

const effectiveDate = "May 28, 2026";

type BodyItem = string | { intro: string; list: string[] };

const sections: { title: string; body: BodyItem[] }[] = [
  {
    title: "What this policy covers",
    body: [
      "This Privacy Policy explains how Dutch Drone Squad handles your data when you use trackdraw.app and its hosted features. This policy is intended to be clear and practical, but it is not a substitute for legal advice.",
    ],
  },
  {
    title: "Information we process",
    body: [
      {
        intro: "TrackDraw processes the following categories of information:",
        list: [
          "Account information — email address, display name, sign-in state, and authentication metadata.",
          "Project and track data — layouts, obstacle configurations, project names, and timestamps.",
          "Sharing and gallery data — share tokens, gallery titles, preview images, and visibility state.",
          "API data — key metadata, expiry state, and identifiers needed to serve requests.",
          "Operational and security data — audit logs, authentication events, and error states.",
        ],
      },
    ],
  },
  {
    title: "How we use information",
    body: [
      "TrackDraw uses this information to provide and improve the product, protect accounts and the service, and display public content when you choose to publish it. Usage data helps TrackDraw debug failures, maintain security logs, and verify that core product flows are working.",
    ],
  },
  {
    title: "Public content",
    body: [
      "If you publish a share or list a track in the gallery, the content and metadata you provide can become public. Unlisted, expired, or revoked links are intended to stay out of search results, but anyone with an active link may still view the shared layout until it expires or is revoked.",
    ],
  },
  {
    title: "Service providers",
    body: [
      "TrackDraw uses service providers for hosting, storage, authentication, and email — including Cloudflare for infrastructure. These providers process information only as needed to run TrackDraw and keep the service available. Some operate outside the European Economic Area; where that is the case, TrackDraw relies on standard contractual clauses or other approved transfer mechanisms under applicable data protection law.",
    ],
  },
  {
    title: "Cookies and local storage",
    body: [
      "TrackDraw uses functional cookies and browser storage for sign-in sessions, theme preference, local projects, editor state, and other product features. These are used to make the application work, not to build advertising profiles. If analytics or marketing cookies are added in the future, this policy will be updated before that change ships.",
    ],
  },
  {
    title: "Data retention",
    body: [
      "Local projects stay on your device until you remove them or clear browser storage. Cloud projects, shares, and account data remain stored until you delete or remove them where the product allows it. Some operational and security records may be kept for longer when needed to protect the service, comply with legal obligations, or restore reliable operation.",
    ],
  },
  {
    title: "Your choices and rights",
    body: [
      "You can use core editing without an account. If you create an account, you can manage your account, projects, and shared content from within the product. Depending on where you live, you may have rights to access, correct, delete, or export personal data. For European Economic Area users, these rights are described by the GDPR. To exercise them, contact Dutch Drone Squad using the details below.",
    ],
  },
  {
    title: "Changes to this policy",
    body: [
      "TrackDraw may update this policy when the product or how it handles data changes. Material changes will be reflected here before or when they ship.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <PublicSiteHeader currentPage="legal" />

      <main>
        <section className="border-border/40 border-b">
          <div className="mx-auto w-full max-w-4xl px-6 py-14 sm:py-20">
            <p className="text-brand-primary text-[11px] font-semibold tracking-[0.2em] uppercase">
              Legal
            </p>
            <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-normal sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground mt-5 max-w-2xl text-sm leading-7">
              Effective {effectiveDate}. This page explains how TrackDraw
              handles data for accounts, projects, sharing, gallery publishing,
              embeds, and API access.
            </p>
          </div>
        </section>

        <section>
          <div className="mx-auto w-full max-w-4xl px-6 py-12 sm:py-16">
            <div className="space-y-10">
              {sections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-xl font-semibold tracking-normal">
                    {section.title}
                  </h2>
                  <div className="text-muted-foreground mt-3 space-y-3 text-sm leading-7">
                    {section.body.map((item, i) =>
                      typeof item === "string" ? (
                        <p key={i}>{item}</p>
                      ) : (
                        <div key={i} className="space-y-2">
                          <p>{item.intro}</p>
                          <ul className="list-disc space-y-1.5 pl-5">
                            {item.list.map((li) => (
                              <li key={li}>{li}</li>
                            ))}
                          </ul>
                        </div>
                      )
                    )}
                  </div>
                </section>
              ))}

              <section className="border-border/50 bg-muted/18 rounded-2xl border p-6">
                <h2 className="text-xl font-semibold tracking-normal">
                  Contact
                </h2>
                <p className="text-muted-foreground mt-3 text-sm leading-7">
                  For privacy questions or requests, email{" "}
                  <span className="text-foreground font-medium">
                    info@trackdraw.app
                  </span>
                  . Please include &ldquo;Privacy&rdquo; in the subject so the
                  message is easier to spot.
                </p>
              </section>

              <p className="text-muted-foreground text-sm leading-7">
                See also the{" "}
                <Link
                  href="/terms"
                  className="text-brand-primary hover:text-brand-primary/85 font-medium transition-colors"
                >
                  Terms of Service
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
