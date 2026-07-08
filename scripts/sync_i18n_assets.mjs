#!/usr/bin/env node

import {
  mkdirSync,
  rmSync,
  copyFileSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const langDir = join(root, "lang");
const outDir = join(root, "public", "locales");
const sourceLocale = "en";
const i18nPolicy = JSON.parse(
  readFileSync(join(langDir, "i18n-policy.json"), "utf8")
);
const englishOnlyNamespaces = new Set(i18nPolicy.englishOnlyNamespaces ?? []);

function listLocales() {
  return readdirSync(langDir).filter(
    (name) =>
      /^[a-z]{2}(?:-[A-Z]{2})?$/.test(name) &&
      statSync(join(langDir, name)).isDirectory()
  );
}

function listNamespaces(locale) {
  return readdirSync(join(langDir, locale))
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, ""));
}

rmSync(outDir, { recursive: true, force: true });

for (const locale of listLocales()) {
  const namespaces = listNamespaces(locale).filter(
    (namespace) =>
      locale === sourceLocale || !englishOnlyNamespaces.has(namespace)
  );
  const localeOutDir = join(outDir, locale);
  mkdirSync(localeOutDir, { recursive: true });

  for (const namespace of namespaces) {
    copyFileSync(
      join(langDir, locale, `${namespace}.json`),
      join(localeOutDir, `${namespace}.json`)
    );
  }
}
