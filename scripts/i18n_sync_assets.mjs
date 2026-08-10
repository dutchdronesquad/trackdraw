#!/usr/bin/env node

import {
  mkdirSync,
  rmSync,
  copyFileSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.env.TRACKDRAW_I18N_ROOT
  ? resolve(process.env.TRACKDRAW_I18N_ROOT)
  : fileURLToPath(new URL("..", import.meta.url));
const langDir = join(root, "lang");
const outDir = join(root, "public", "locales");
const i18nPolicy = JSON.parse(
  readFileSync(join(langDir, "i18n-policy.json"), "utf8")
);
const sourceLocale = "en";
const localeDirectories = Object.entries(i18nPolicy.localeDirectories ?? {});
const sourceLocaleDirectory = i18nPolicy.localeDirectories?.[sourceLocale];
const englishOnlyNamespaces = new Set(i18nPolicy.englishOnlyNamespaces ?? []);

function listLocales() {
  return localeDirectories.filter(([, directory]) =>
    statSync(join(langDir, directory)).isDirectory()
  );
}

function listNamespaces(locale) {
  return readdirSync(join(langDir, locale))
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, ""));
}

function isMessageTree(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mergeMessagesWithFallback(fallback, translation) {
  if (typeof fallback === "string") {
    return typeof translation === "string" && translation.trim().length > 0
      ? translation
      : fallback;
  }

  if (Array.isArray(fallback)) {
    const translatedItems = Array.isArray(translation) ? translation : [];
    return fallback.map((fallbackValue, index) =>
      mergeMessagesWithFallback(fallbackValue, translatedItems[index])
    );
  }

  if (!isMessageTree(fallback)) return fallback;

  const translatedTree = isMessageTree(translation) ? translation : {};
  return Object.fromEntries(
    Object.entries(fallback).map(([key, fallbackValue]) => [
      key,
      mergeMessagesWithFallback(fallbackValue, translatedTree[key]),
    ])
  );
}

function loadNamespace(locale, namespace) {
  return JSON.parse(
    readFileSync(join(langDir, locale, `${namespace}.json`), "utf8")
  );
}

rmSync(outDir, { recursive: true, force: true });

for (const [locale, localeDirectory] of listLocales()) {
  const namespaces = listNamespaces(sourceLocaleDirectory).filter(
    (namespace) =>
      locale === sourceLocale || !englishOnlyNamespaces.has(namespace)
  );
  const localeOutDir = join(outDir, localeDirectory);
  mkdirSync(localeOutDir, { recursive: true });

  for (const namespace of namespaces) {
    const destination = join(localeOutDir, `${namespace}.json`);
    if (locale === sourceLocale) {
      copyFileSync(
        join(langDir, localeDirectory, `${namespace}.json`),
        destination
      );
      continue;
    }

    const fallbackMessages = loadNamespace(sourceLocaleDirectory, namespace);
    let translatedMessages;
    try {
      translatedMessages = loadNamespace(localeDirectory, namespace);
    } catch {
      translatedMessages = undefined;
    }
    const mergedMessages = mergeMessagesWithFallback(
      fallbackMessages,
      translatedMessages
    );
    writeFileSync(destination, `${JSON.stringify(mergedMessages, null, 2)}\n`);
  }
}
