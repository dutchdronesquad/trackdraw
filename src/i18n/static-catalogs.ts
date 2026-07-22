import "server-only";

import type { MessageNamespace } from "@/i18n/catalogs";

type LandingMetadata = {
  homeTitle: string;
  homeSocialTitle: string;
  homeDescription: string;
  homeSocialDescription: string;
  studioTitle: string;
  studioSocialTitle: string;
  studioDescription: string;
  studioSocialDescription: string;
};

type LegalMetadata = {
  metaTitle: string;
  metaDescription: string;
};

async function readEnglishNamespace(namespace: MessageNamespace) {
  const [{ readFile }, { join }] = await Promise.all([
    import("node:fs/promises"),
    import("node:path"),
  ]);
  const candidatePaths = [
    join(process.cwd(), "public", "locales", "en", `${namespace}.json`),
    join(process.cwd(), "lang", "en", `${namespace}.json`),
  ];

  for (const candidatePath of candidatePaths) {
    try {
      return JSON.parse(await readFile(candidatePath, "utf8")) as unknown;
    } catch {
      // Try the source catalog when generated public assets are unavailable.
    }
  }

  throw new Error(`Missing static English namespace "${namespace}".`);
}

export async function pickStaticEnglishNamespaces(
  namespaces: readonly MessageNamespace[]
) {
  return Object.fromEntries(
    await Promise.all(
      namespaces.map(async (namespace) => [
        namespace,
        await readEnglishNamespace(namespace),
      ])
    )
  );
}

export async function getStaticLandingMetadata(): Promise<LandingMetadata> {
  const catalog = (await readEnglishNamespace("landing")) as {
    metadata: LandingMetadata;
  };
  return catalog.metadata;
}

export async function getStaticLegalMetadata(
  page: "privacy" | "terms"
): Promise<LegalMetadata> {
  const catalog = (await readEnglishNamespace("legal")) as Record<
    "privacy" | "terms",
    LegalMetadata
  >;
  return catalog[page];
}
