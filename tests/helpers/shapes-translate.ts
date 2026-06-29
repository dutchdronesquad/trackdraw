import en from "@lang/en/shapes.json";

/**
 * Minimal English-only translator factory for tests that exercise
 * translation-dependent resolvers/view-models without a
 * NextIntlClientProvider. Supports `{name}` placeholders and basic
 * `{count, plural, one {...} other {...}}` ICU syntax, including placeholders
 * inside plural forms (no nested plurals).
 */
function skipWhitespace(value: string, index: number) {
  let cursor = index;
  while (/\s/.test(value[cursor] ?? "")) cursor += 1;
  return cursor;
}

function readIdentifier(value: string, index: number) {
  const match = /^[A-Za-z_]\w*/.exec(value.slice(index));
  if (!match) return null;
  return { identifier: match[0], end: index + match[0].length };
}

function readBalancedBlock(value: string, openIndex: number) {
  if (value[openIndex] !== "{") return null;

  let depth = 0;
  for (let index = openIndex; index < value.length; index += 1) {
    if (value[index] === "{") {
      depth += 1;
    } else if (value[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          content: value.slice(openIndex + 1, index),
          end: index + 1,
        };
      }
    }
  }

  return null;
}

function parsePluralBlock(
  value: string,
  openIndex: number,
  values: Record<string, unknown>
) {
  let cursor = openIndex + 1;
  const name = readIdentifier(value, cursor);
  if (!name) return null;
  cursor = skipWhitespace(value, name.end);
  if (value[cursor] !== ",") return null;

  cursor = skipWhitespace(value, cursor + 1);
  if (!value.startsWith("plural", cursor)) return null;
  cursor = skipWhitespace(value, cursor + "plural".length);
  if (value[cursor] !== ",") return null;
  cursor += 1;

  const forms: Record<string, string> = {};
  while (cursor < value.length) {
    cursor = skipWhitespace(value, cursor);
    if (value[cursor] === "}") {
      const count = Number(values[name.identifier]);
      const selected = count === 1 ? forms.one : (forms.other ?? forms.one);
      return {
        replacement: (selected ?? "").replace(/#/g, String(count)),
        end: cursor + 1,
      };
    }

    const selector = readIdentifier(value, cursor);
    if (!selector) return null;
    cursor = skipWhitespace(value, selector.end);

    const block = readBalancedBlock(value, cursor);
    if (!block) return null;
    forms[selector.identifier] = block.content;
    cursor = block.end;
  }

  return null;
}

function replacePluralBlocks(value: string, values: Record<string, unknown>) {
  let output = "";
  let cursor = 0;

  while (cursor < value.length) {
    if (value[cursor] === "{") {
      const plural = parsePluralBlock(value, cursor, values);
      if (plural) {
        output += plural.replacement;
        cursor = plural.end;
        continue;
      }
    }

    output += value[cursor];
    cursor += 1;
  }

  return output;
}

export function createTestTranslate(messages: object) {
  return function translate(
    key: string,
    values?: Record<string, unknown>
  ): string {
    const raw = key
      .split(".")
      .reduce<unknown>(
        (node, segment) =>
          typeof node === "object" && node !== null
            ? (node as Record<string, unknown>)[segment]
            : undefined,
        messages
      );

    if (typeof raw !== "string") {
      throw new Error(`Missing test translation for ${key}`);
    }

    let value = raw;

    if (values) {
      value = replacePluralBlocks(value, values);

      value = value.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in values ? String(values[name]) : match
      );
    }

    return value;
  };
}

/**
 * Mirrors lang/en/shapes.json; the `shapes` namespace doesn't use plural
 * syntax.
 */
export const shapesTranslate = createTestTranslate(en);
