import { createElement, type ReactElement, type ReactNode } from "react";
import { vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { createTranslator } from "use-intl/core";
import enEditor from "../messages/en/editor.json";

const messages = {
  editor: enEditor,
};

vi.mock("@testing-library/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@testing-library/react")>();

  return {
    ...actual,
    render: (ui: ReactElement, options?: Parameters<typeof actual.render>[1]) =>
      actual.render(ui, {
        wrapper: (({ children }: { children: ReactNode }) =>
          createElement(
            NextIntlClientProvider as never,
            { locale: "en", messages } as never,
            children
          )) as never,
        ...options,
      }),
  };
});

vi.mock("next-intl/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl/server")>();

  return {
    ...actual,
    getTranslations: async (
      namespaceOrOpts?: string | { namespace?: string }
    ) => {
      const namespace =
        typeof namespaceOrOpts === "string"
          ? namespaceOrOpts
          : namespaceOrOpts?.namespace;
      return createTranslator({
        locale: "en",
        messages,
        namespace: namespace as never,
      });
    },
    getLocale: async () => "en",
    getMessages: async () => messages,
  };
});
