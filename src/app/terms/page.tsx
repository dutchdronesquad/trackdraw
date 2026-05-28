import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/landing/Footer";
import { PublicSiteHeader } from "@/components/landing/PublicSiteHeader";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms for using TrackDraw, including accounts, projects, public shares, gallery publishing, embeds, and API access.",
  alternates: {
    canonical: "/terms",
  },
};

const effectiveDate = "May 28, 2026";

const sections = [
  {
    title: "Using TrackDraw",
    body: [
      "TrackDraw is a browser-based FPV race track design tool. You may use the core editor without an account, and account-backed features are available when you sign in. These Terms apply to trackdraw.app and all hosted TrackDraw features.",
    ],
  },
  {
    title: "Accounts and security",
    body: [
      "You are responsible for keeping access to your account, email, passkeys, sessions, and API keys secure. Do not share API keys publicly or use another person's account without permission. TrackDraw may revoke sessions, shares, API keys, or account access when needed to protect the service, investigate abuse, comply with legal obligations, or prevent harm to other users.",
    ],
  },
  {
    title: "Your content",
    body: [
      "You keep ownership of the track designs, project data, and other content you create or upload. By saving, publishing, or sharing content through TrackDraw, you give TrackDraw a limited licence to host, process, and deliver that content as needed to provide the service. Do not publish content that you do not have the right to share, that exposes private information without permission, or that is unlawful, abusive, misleading, or harmful.",
    ],
  },
  {
    title: "Public shares, gallery listings, and embeds",
    body: [
      "Published shares, gallery listings, and embeds are intended for read-only review and public or semi-public hand-off. When you list a track in the gallery, its content and metadata may be visible to visitors and search engines. You are responsible for deciding whether a track should be shared publicly.",
      "Do not include private venue details, personal information, or sensitive notes in public content. TrackDraw may hide, unlist, remove, or revoke public content that appears broken, abusive, unlawful, or inconsistent with the product's intended use.",
    ],
  },
  {
    title: "API and integrations",
    body: [
      "API keys are for connecting your own account-backed projects to external tools. You may not use the API to overload the service, bypass access controls, scrape private data, or interfere with other users. External integrations are your responsibility, and TrackDraw may change, limit, or revoke API access when needed for security, reliability, compatibility, or abuse prevention.",
    ],
  },
  {
    title: "Exports and race-day use",
    body: [
      "TrackDraw exports and outputs are planning aids. You are responsible for verifying the real venue, race rules, safety constraints, and final build before use. Experimental outputs may require manual review and adjustment before they are suitable for an event.",
    ],
  },
  {
    title: "Open source and hosted service",
    body: [
      "TrackDraw's source code may be available as open source so the community can inspect, learn from, and contribute to the project. The hosted service at trackdraw.app is separate from the source code. Hosted features depend on third-party services and may be limited, changed, suspended, or offered under paid plans in the future. TrackDraw is provided as-is; features may be updated, limited, paused, or removed, and hosted services may be interrupted by maintenance, infrastructure issues, or provider outages.",
    ],
  },
  {
    title: "No warranties and liability",
    body: [
      "TrackDraw does not promise that any output, export, integration, or shared content will be accurate, available, or suitable for every use case. To the maximum extent allowed by applicable law, TrackDraw is not liable for indirect, incidental, or consequential damages, or for loss of data, event disruption, or safety issues arising from use of the service.",
    ],
  },
  {
    title: "Changes to these Terms",
    body: [
      "TrackDraw may update these Terms when the product or legal requirements change. Continued use after changes means you accept the updated Terms.",
    ],
  },
];

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="text-muted-foreground mt-5 max-w-2xl text-sm leading-7">
              Effective {effectiveDate}. These terms explain the rules for using
              TrackDraw, including accounts, projects, public sharing, gallery
              publishing, embeds, and API access.
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
                    {section.body.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}

              <section className="border-border/50 bg-muted/18 rounded-2xl border p-6">
                <h2 className="text-xl font-semibold tracking-normal">
                  Contact
                </h2>
                <p className="text-muted-foreground mt-3 text-sm leading-7">
                  For questions about these Terms, email{" "}
                  <span className="text-foreground font-medium">
                    info@trackdraw.app
                  </span>
                  . Please include &ldquo;Terms&rdquo; in the subject so the
                  message is easier to spot.
                </p>
              </section>

              <p className="text-muted-foreground text-sm leading-7">
                See also the{" "}
                <Link
                  href="/privacy"
                  className="text-brand-primary hover:text-brand-primary/85 font-medium transition-colors"
                >
                  Privacy Policy
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
