import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getConsentRequest } from "@/lib/server/mcp/connections";
import { McpConsent } from "@/components/mcp/consent";

export const dynamic = "force-dynamic";

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const values = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    for (const entry of Array.isArray(value)
      ? value
      : value === undefined
        ? []
        : [value])
      query.append(key, entry);
  }
  const request = await getConsentRequest(query.toString(), await headers());
  if (request) return <McpConsent request={request} />;
  const t = await getTranslations("login.mcp");
  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center px-6 py-12">
      <div className="max-w-md space-y-5">
        <h1 className="text-2xl font-semibold">{t("invalidTitle")}</h1>
        <p className="text-muted-foreground text-sm leading-6">
          {t("invalidBody")}
        </p>
        <Link
          href="/studio"
          prefetch={false}
          className="text-brand-primary text-sm"
        >
          {t("backToStudio")}
        </Link>
      </div>
    </main>
  );
}
