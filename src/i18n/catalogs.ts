import "server-only";

import i18nPolicy from "@lang/i18n-policy.json";
import { defaultLocale, type SupportedLocale } from "@/lib/i18n/locales";

const catalogNamespaces = [
  "common",
  "dashboard",
  "dialogs",
  "editor",
  "exportPdf",
  "inspector",
  "landing",
  "legal",
  "login",
  "setupEstimate",
  "shapes",
  "share",
] as const;

export type MessageNamespace = (typeof catalogNamespaces)[number];

type AssetsBinding = {
  fetch(input: Request): Promise<Response>;
};

type CloudflareAssetsContext = {
  env?: {
    ASSETS?: AssetsBinding;
  };
};

const englishOnlyNamespaceSet = new Set<MessageNamespace>(
  i18nPolicy.englishOnlyNamespaces as MessageNamespace[]
);

const catalogCache = new Map<
  SupportedLocale,
  Promise<Record<MessageNamespace, unknown>>
>();
const namespaceCache = new Map<string, Promise<unknown>>();
let cloudflareAssetsBindingPromise: Promise<AssetsBinding | undefined> | null =
  null;
const ASSET_REQUEST_ORIGIN = "https://assets.local";

async function getCloudflareAssetsBinding() {
  if (cloudflareAssetsBindingPromise) {
    return cloudflareAssetsBindingPromise;
  }

  cloudflareAssetsBindingPromise = resolveCloudflareAssetsBinding();
  return cloudflareAssetsBindingPromise;
}

async function resolveCloudflareAssetsBinding() {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = (await getCloudflareContext({
      async: true,
    })) as CloudflareAssetsContext;
    return env?.ASSETS;
  } catch {
    return undefined;
  }
}

async function readNamespaceFromCloudflareAssets(assetPath: string) {
  const assets = await getCloudflareAssetsBinding();
  if (!assets) return undefined;

  try {
    const response = await assets.fetch(
      new Request(`${ASSET_REQUEST_ORIGIN}/${assetPath}`)
    );
    if (!response.ok) return undefined;
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

async function readJsonFile(pathParts: string[]) {
  try {
    const [{ readFile }, { join }] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
    ]);
    const contents = await readFile(join(process.cwd(), ...pathParts), {
      encoding: "utf8",
    });
    return JSON.parse(contents) as unknown;
  } catch {
    return undefined;
  }
}

async function readNamespaceFromGeneratedAsset(assetPath: string) {
  return readJsonFile(["public", assetPath]);
}

async function readNamespaceFromSourceFile(
  locale: SupportedLocale,
  namespace: MessageNamespace
) {
  return readJsonFile(["lang", locale, `${namespace}.json`]);
}

async function readNamespaceAsset(
  locale: SupportedLocale,
  namespace: MessageNamespace
) {
  const assetPath = `locales/${locale}/${namespace}.json`;
  return (
    (await readNamespaceFromCloudflareAssets(assetPath)) ??
    (await readNamespaceFromSourceFile(locale, namespace)) ??
    (await readNamespaceFromGeneratedAsset(assetPath))
  );
}

function getNamespaceMessages(
  locale: SupportedLocale,
  namespace: MessageNamespace
) {
  const resolvedLocale = englishOnlyNamespaceSet.has(namespace)
    ? defaultLocale
    : locale;
  const cacheKey = `${resolvedLocale}:${namespace}`;

  let namespacePromise = namespaceCache.get(cacheKey);
  if (!namespacePromise) {
    namespacePromise = readNamespaceWithFallback(resolvedLocale, namespace);
    namespaceCache.set(cacheKey, namespacePromise);
  }
  return namespacePromise;
}

async function readNamespaceWithFallback(
  locale: SupportedLocale,
  namespace: MessageNamespace
) {
  const messages = await readNamespaceAsset(locale, namespace);
  if (messages !== undefined) return messages;

  if (locale !== defaultLocale) {
    const fallbackMessages = await readNamespaceAsset(defaultLocale, namespace);
    if (fallbackMessages !== undefined) return fallbackMessages;
  }

  throw new Error(
    `Missing i18n namespace "${namespace}" for locale "${locale}" and fallback locale "${defaultLocale}".`
  );
}

export function getCatalogForLocale(locale: SupportedLocale) {
  const cachedCatalog = catalogCache.get(locale);
  if (cachedCatalog) {
    return cachedCatalog;
  }

  const catalog = Promise.all(
    catalogNamespaces.map(async (namespace) => [
      namespace,
      await getNamespaceMessages(locale, namespace),
    ])
  ).then(
    (entries) =>
      Object.fromEntries(entries) as Record<MessageNamespace, unknown>
  );
  catalogCache.set(locale, catalog);
  return catalog;
}

export async function pickCatalogNamespaces(
  locale: SupportedLocale,
  namespaces: readonly MessageNamespace[]
) {
  return Object.fromEntries(
    await Promise.all(
      namespaces.map(async (namespace) => [
        namespace,
        await getNamespaceMessages(locale, namespace),
      ])
    )
  );
}
