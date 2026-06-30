#!/usr/bin/env node
/**
 * Translation completeness audit.
 *
 * 1. Compares every locale's message files against the `en` baseline and
 *    reports missing/extra keys per namespace.
 * 2. Scans src/** for `useTranslations("namespace")` bindings and the keys
 *    called through them, flagging any key that doesn't resolve in the `en`
 *    catalog (the same class of bug as a runtime MISSING_MESSAGE error).
 *
 * Usage: node scripts/i18n_check.mjs
 * Exits non-zero if any issue is found, so it can be wired into CI.
 */
import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const langDir = join(root, "lang");
const srcDir = join(root, "src");
const baseLocale = "en";
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

function loadNamespace(locale, namespace) {
  const path = join(langDir, locale, `${namespace}.json`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function flatten(obj, prefix = "") {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flatten(value, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

function resolvePath(obj, dottedPath) {
  return dottedPath
    .split(".")
    .reduce(
      (node, segment) =>
        node && typeof node === "object" ? node[segment] : undefined,
      obj
    );
}

// ── Part 1: locale parity ──────────────────────────────────────────────

function checkLocaleParity() {
  const locales = listLocales();
  const otherLocales = locales.filter((l) => l !== baseLocale);
  const baseNamespaces = listNamespaces(baseLocale);
  const localizedBaseNamespaces = baseNamespaces.filter(
    (namespace) => !englishOnlyNamespaces.has(namespace)
  );
  let problems = 0;

  for (const namespace of localizedBaseNamespaces) {
    const baseMessages = flatten(loadNamespace(baseLocale, namespace));
    const baseKeys = new Set(Object.keys(baseMessages));

    for (const locale of otherLocales) {
      let localeMessages;
      try {
        localeMessages = flatten(loadNamespace(locale, namespace));
      } catch {
        console.log(`\n[${locale}] missing namespace file: ${namespace}.json`);
        problems += baseKeys.size;
        continue;
      }
      const localeKeys = new Set(Object.keys(localeMessages));

      const missing = [...baseKeys].filter((k) => !localeKeys.has(k));
      const extra = [...localeKeys].filter((k) => !baseKeys.has(k));

      if (missing.length > 0) {
        console.log(
          `\n[${locale}/${namespace}.json] missing ${missing.length} key(s) present in ${baseLocale}:`
        );
        for (const key of missing) {
          console.log(`  - ${key}  (en: ${JSON.stringify(baseMessages[key])})`);
        }
        problems += missing.length;
      }
      if (extra.length > 0) {
        console.log(
          `\n[${locale}/${namespace}.json] has ${extra.length} extra key(s) not in ${baseLocale} (stale?):`
        );
        for (const key of extra) {
          console.log(`  - ${key}`);
        }
        problems += extra.length;
      }
    }
  }

  // namespace files that exist in a locale but not in en
  for (const locale of otherLocales) {
    const localeNamespaces = listNamespaces(locale);
    const extraNamespaces = localeNamespaces.filter(
      (ns) => !baseNamespaces.includes(ns) && !englishOnlyNamespaces.has(ns)
    );
    for (const ns of extraNamespaces) {
      console.log(
        `\n[${locale}] extra namespace file not in ${baseLocale}: ${ns}.json`
      );
      problems += 1;
    }
  }

  return problems;
}

// ── Part 2: usage scan against en catalog ──────────────────────────────

function walkFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walkFiles(full, out);
    } else if ([".ts", ".tsx"].includes(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

const USE_TRANSLATIONS_RE =
  /const\s+(\w+)\s*=\s*useTranslations\(\s*["'`]([\w.]+)["'`]\s*\)/g;
const GET_TRANSLATIONS_RE =
  /const\s+(\w+)\s*=\s*await\s+getTranslations\(\s*["'`]([\w.]+)["'`]\s*\)/g;

function findTranslatorBindings(content) {
  const bindings = [];
  for (const re of [USE_TRANSLATIONS_RE, GET_TRANSLATIONS_RE]) {
    let match;
    re.lastIndex = 0;
    while ((match = re.exec(content))) {
      bindings.push({
        varName: match[1],
        namespace: match[2],
        index: match.index,
      });
    }
  }
  // Sort by source position so each binding's usage range can be bounded by
  // the next binding of the same variable name (handles the same `const t =
  // useTranslations(...)` name being rebound in separate functions/scopes
  // within one file).
  bindings.sort((a, b) => a.index - b.index);
  return bindings.map((binding, i) => {
    const nextSameVar = bindings
      .slice(i + 1)
      .find((b) => b.varName === binding.varName);
    return {
      ...binding,
      rangeEnd: nextSameVar ? nextSameVar.index : content.length,
    };
  });
}

function findKeyUsages(content, varName, rangeStart, rangeEnd) {
  const re = new RegExp(`\\b${varName}\\(\\s*["'\`]([\\w.]+)["'\`]`, "g");
  const keys = [];
  let match;
  while ((match = re.exec(content))) {
    if (match.index < rangeStart || match.index >= rangeEnd) continue;
    keys.push({ key: match[1], index: match.index });
  }
  return keys;
}

function lineOf(content, index) {
  return content.slice(0, index).split("\n").length;
}

function checkUsages() {
  const enRootKeys = listNamespaces(baseLocale);
  const enCache = new Map();
  const loadEn = (namespace) => {
    const [fileNs, ...rest] = namespace.split(".");
    if (!enRootKeys.includes(fileNs)) return undefined;
    if (!enCache.has(fileNs)) {
      enCache.set(fileNs, loadNamespace(baseLocale, fileNs));
    }
    const fileMessages = enCache.get(fileNs);
    return rest.length > 0
      ? resolvePath(fileMessages, rest.join("."))
      : fileMessages;
  };

  const files = walkFiles(srcDir);
  let problems = 0;

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const bindings = findTranslatorBindings(content);
    if (bindings.length === 0) continue;

    for (const {
      varName,
      namespace,
      index: bindingIndex,
      rangeEnd,
    } of bindings) {
      const namespaceMessages = loadEn(namespace);
      if (namespaceMessages === undefined) {
        console.log(
          `\n${relative(root, file)}: useTranslations("${namespace}") — namespace does not resolve in ${baseLocale} catalog`
        );
        problems += 1;
        continue;
      }

      const usages = findKeyUsages(content, varName, bindingIndex, rangeEnd);
      for (const { key, index } of usages) {
        const resolved = resolvePath(namespaceMessages, key);
        if (resolved === undefined) {
          const line = lineOf(content, index);
          console.log(
            `\n${relative(root, file)}:${line}: ${varName}("${key}") — missing in lang/${baseLocale}/${namespace.split(".")[0]}.json (namespace "${namespace}")`
          );
          problems += 1;
        }
      }
    }
  }

  return problems;
}

const parityProblems = checkLocaleParity();
const usageProblems = checkUsages();

const total = parityProblems + usageProblems;
console.log(
  `\n${total === 0 ? "✓" : "✗"} i18n check: ${parityProblems} locale-parity issue(s), ${usageProblems} unresolved-key usage(s).`
);

process.exit(total === 0 ? 0 : 1);
