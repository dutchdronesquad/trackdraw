#!/usr/bin/env node
/**
 * Conservative hardcoded UI-copy scan.
 *
 * This complements scripts/i18n_check.mjs. The normal i18n check validates
 * catalog integrity, English fallback safety, and translation-key usage; this
 * scan catches newly introduced literal JSX text and common user-facing props.
 *
 * Keep this check intentionally narrow and allowlisted. A noisy hardcoded-copy
 * scanner gets ignored quickly, so false positives should be resolved either by
 * translating the string or adding a specific allowlist entry with a reason.
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const root = fileURLToPath(new URL("..", import.meta.url));
const scanRoots = [join(root, "src/app"), join(root, "src/components")];
const baselinePath = join(root, "scripts/i18n_hardcoded_allowlist.json");
const updateBaseline = process.argv.includes("--update-baseline");

const userFacingAttributes = new Set([
  "aria-label",
  "alt",
  "description",
  "emptyMessage",
  "emptyText",
  "label",
  "placeholder",
  "subtitle",
  "title",
]);

const metadataProperties = new Set(["applicationName", "description", "title"]);

const technicalTokens = new Set([
  "Alt",
  "Ctrl",
  "Cmd",
  "Del",
  "Enter",
  "Escape",
  "FPV",
  "Q / [",
  "E / ]",
  "Ctrl/Cmd+D",
]);

const allowedLiterals = [
  {
    file: /^src\/components\/ui\/(?:dialog|sheet)\.tsx$/,
    text: /^Close$/,
    reason: "design-system primitive default screen-reader label",
  },
  {
    file: /^src\/components\/ui\/breadcrumb\.tsx$/,
    text: /^More$/,
    reason: "design-system primitive default screen-reader label",
  },
  {
    file: /^src\/components\/ui\/sidebar\.tsx$/,
    text: /^(Sidebar|Displays the mobile sidebar\.|Toggle Sidebar)$/,
    reason: "design-system primitive default labels",
  },
];

function classifyIssue(issue) {
  if (issue.kind.startsWith("metadata")) {
    return {
      group: "metadata-translate",
      priority: "high",
      note: "Hardcoded metadata should be localized or generated from translations.",
    };
  }
  if (/^TrackDraw$/.test(issue.text) && issue.kind.includes("alt")) {
    return {
      group: "intentional-brand-alt",
      priority: "exception",
      note: "Brand-only alt text is intentionally stable unless the image needs descriptive alt copy.",
    };
  }
  if (issue.file.includes("/ui/")) {
    return {
      group: "design-system-exception",
      priority: "exception",
      note: "Design-system primitive default; only translate when the primitive gets app-level i18n context.",
    };
  }
  if (
    /^(Alt|Esc|Enter|Ctrl|Cmd|Del|Q \/ \[|E \/ \]|Ctrl\/Cmd\+D|⌃Z|⌃Y|⌘S)$/.test(
      issue.text
    )
  ) {
    return {
      group: "keyboard-or-unit",
      priority: "exception",
      note: "Keyboard shortcut token; not natural-language copy.",
    };
  }
  if (/^(m|px\/m|x, y|X \(|Y \(|\.json|&nbsp;·&nbsp;)$/.test(issue.text)) {
    return {
      group: "technical-token",
      priority: "exception",
      note: "Unit, file extension, coordinate label, or visual separator.",
    };
  }
  if (
    /^(Texture Debug|No panels registered yet|flip|Developer HUD|Tool|selected|Reset|Close|off|Screenshot Placeholder|Planned Asset)$/.test(
      issue.text
    )
  ) {
    return {
      group: "dev-or-technical-ui",
      priority: "low",
      note: "Developer/debug/technical UI; translate later if exposed to normal users.",
    };
  }
  if (
    issue.file.includes("ExportDialog") ||
    issue.file.includes("ProjectManager") ||
    issue.file.includes("ShareDialog") ||
    issue.file.includes("CompleteProfileDialog") ||
    issue.file.includes("DataTableFacetFilter") ||
    issue.file.includes("MeasurementUnitToggle") ||
    issue.file.includes("ElementPlacementControl")
  ) {
    return {
      group: "product-ui-translate",
      priority: "high",
      note: "Visible product UI copy; prioritize replacing with translation keys.",
    };
  }
  return {
    group: "product-ui-translate",
    priority: "medium",
    note: "Visible product UI copy; translate when touching this surface.",
  };
}

function walkFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (
        entry === "node_modules" ||
        entry === ".next" ||
        entry === "coverage"
      ) {
        continue;
      }
      walkFiles(full, out);
    } else if ([".ts", ".tsx"].includes(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function isHumanText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  if (!/[A-Za-z]/.test(normalized)) return false;
  if (technicalTokens.has(normalized)) return false;
  if (/^[A-Z0-9_./+:[\]\-\s]+$/.test(normalized)) return false;
  return true;
}

function isAllowed(file, text) {
  const rel = relative(root, file);
  return allowedLiterals.some(
    (entry) => entry.file.test(rel) && entry.text.test(text)
  );
}

function issueKey(issue) {
  return `${issue.file}\u0000${issue.kind}\u0000${issue.text}`;
}

function loadBaseline() {
  if (!existsSync(baselinePath)) return [];
  const raw = JSON.parse(readFileSync(baselinePath, "utf8"));
  if (!Array.isArray(raw)) {
    throw new Error("i18n hardcoded baseline must be a JSON array");
  }
  return raw;
}

function baselineCounts(entries) {
  const counts = new Map();
  for (const entry of entries) {
    if (
      typeof entry.file !== "string" ||
      typeof entry.kind !== "string" ||
      typeof entry.text !== "string"
    ) {
      throw new Error("Invalid i18n hardcoded baseline entry");
    }
    const key = issueKey(entry);
    counts.set(key, (counts.get(key) ?? 0) + (entry.count ?? 1));
  }
  return counts;
}

function buildBaseline(issues) {
  const grouped = new Map();
  for (const issue of issues) {
    const key = issueKey(issue);
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      const classification = classifyIssue(issue);
      grouped.set(key, {
        file: issue.file,
        kind: issue.kind,
        text: issue.text,
        count: 1,
        group: classification.group,
        priority: classification.priority,
        note: classification.note,
      });
    }
  }
  return [...grouped.values()].sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return a.text.localeCompare(b.text);
  });
}

function attributeName(name) {
  if (name.type === "JSXIdentifier") return name.name;
  if (name.type === "JSXNamespacedName") {
    return `${name.namespace.name}:${name.name.name}`;
  }
  return undefined;
}

function propertyName(name) {
  if (name.type === "Identifier") return name.name;
  if (name.type === "StringLiteral") return name.value;
  return undefined;
}

function isInsideMetadataContext(ancestors) {
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const current = ancestors[index];
    if (
      current.type === "VariableDeclarator" &&
      current.id.type === "Identifier" &&
      current.id.name === "metadata"
    ) {
      return true;
    }
    if (
      current.type === "FunctionDeclaration" &&
      current.id?.name === "generateMetadata"
    ) {
      return true;
    }
  }
  return false;
}

function isStaticString(node) {
  return (
    node.type === "StringLiteral" ||
    (node.type === "TemplateLiteral" && node.expressions.length === 0)
  );
}

function stringValue(node) {
  if (node.type === "StringLiteral") return node.value;
  return node.quasis[0]?.value.cooked ?? node.quasis[0]?.value.raw ?? "";
}

function metadataPropertyName(node, parent) {
  if (!isStaticString(node)) return undefined;
  if (parent?.type !== "ObjectProperty" || parent.value !== node) {
    return undefined;
  }
  const name = propertyName(parent.key);
  return name && metadataProperties.has(name) ? name : undefined;
}

function addIssue(issues, file, node, kind, text) {
  const normalized = normalizeText(text);
  if (!isHumanText(normalized)) return;
  if (isAllowed(file, normalized)) return;

  issues.push({
    file: relative(root, file),
    line: node.loc?.start.line ?? 1,
    kind,
    text: normalized,
  });
}

function scanFile(file) {
  const content = readFileSync(file, "utf8");
  const sourceFile = parse(content, {
    sourceFilename: file,
    sourceType: "unambiguous",
    plugins: ["typescript", "jsx"],
  });
  const issues = [];
  const ancestors = [];

  function visit(node) {
    if (node.type === "JSXText") {
      addIssue(
        issues,
        file,
        node,
        "JSX text",
        content.slice(node.start, node.end)
      );
    } else if (node.type === "JSXExpressionContainer") {
      if (isStaticString(node.expression)) {
        addIssue(
          issues,
          file,
          node.expression,
          "JSX string expression",
          stringValue(node.expression)
        );
      }
    } else if (node.type === "JSXAttribute") {
      const name = attributeName(node.name);
      if (
        name &&
        userFacingAttributes.has(name) &&
        node.value?.type === "StringLiteral"
      ) {
        addIssue(
          issues,
          file,
          node.value,
          `JSX prop ${name}`,
          node.value.value
        );
      }
    } else if (isStaticString(node) && isInsideMetadataContext(ancestors)) {
      const name = metadataPropertyName(node, ancestors.at(-1));
      if (name) {
        addIssue(
          issues,
          file,
          node,
          `metadata property ${name}`,
          stringValue(node)
        );
      }
    }

    ancestors.push(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child.type === "string") visit(child);
        }
      } else if (value && typeof value.type === "string") {
        visit(value);
      }
    }
    ancestors.pop();
  }

  visit(sourceFile);
  return issues;
}

const files = scanRoots.flatMap((dir) => walkFiles(dir));
const issues = files.flatMap(scanFile).sort((a, b) => {
  if (a.file !== b.file) return a.file.localeCompare(b.file);
  return a.line - b.line;
});

if (updateBaseline) {
  writeFileSync(
    baselinePath,
    `${JSON.stringify(buildBaseline(issues), null, 2)}\n`
  );
  console.log(
    `Updated ${relative(root, baselinePath)} with ${issues.length} known hardcoded-copy occurrence(s).`
  );
  process.exit(0);
}

const baseline = loadBaseline();
const allowedCounts = baselineCounts(baseline);
let allowedIssueCount = 0;
const activeIssues = [];

for (const issue of issues) {
  const key = issueKey(issue);
  const remaining = allowedCounts.get(key) ?? 0;
  if (remaining > 0) {
    allowedCounts.set(key, remaining - 1);
    allowedIssueCount += 1;
  } else {
    activeIssues.push(issue);
  }
}

const staleBaselineEntries = [...allowedCounts.entries()].filter(
  ([, remaining]) => remaining > 0
).length;

for (const issue of activeIssues) {
  console.log(
    `${issue.file}:${issue.line}: ${issue.kind} contains hardcoded copy: ${JSON.stringify(issue.text)}`
  );
}

if (staleBaselineEntries > 0) {
  console.log(
    `\nNote: ${staleBaselineEntries} baseline entr${
      staleBaselineEntries === 1 ? "y is" : "ies are"
    } no longer matched. Run npm run i18n:scan-hardcoded -- --update-baseline after removing translated debt.`
  );
}

console.log(
  `\n${activeIssues.length === 0 ? "✓" : "✗"} i18n hardcoded scan: ${activeIssues.length} new issue(s), ${allowedIssueCount} baseline occurrence(s).`
);

process.exit(activeIssues.length === 0 ? 0 : 1);
