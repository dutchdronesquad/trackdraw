// @vitest-environment happy-dom

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { useTranslations } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ClientLanguageProvider from "@/i18n/ClientLanguageProvider";
import { useLocaleStore } from "@/store/locale";

const initialMessages = {
  common: {
    labels: {
      language: "Language",
    },
  },
};

function TranslatedLabel() {
  const t = useTranslations("common");
  return <p>{t("labels.language")}</p>;
}

function LegalLabel() {
  const t = useTranslations("legal");
  return <p>{t("title")}</p>;
}

describe("ClientLanguageProvider", () => {
  beforeEach(() => {
    useLocaleStore.setState({ locale: "en" });
    document.documentElement.lang = "en";
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the static English catalog without requesting an asset", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ClientLanguageProvider
        namespaces={["common"]}
        initialMessages={initialMessages}
      >
        <TranslatedLabel />
      </ClientLanguageProvider>
    );

    expect(screen.getByText("Language")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.documentElement.lang).toBe("en");
  });

  it("loads the saved locale from static assets after hydration", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          labels: {
            language: "Taal",
          },
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ClientLanguageProvider
        namespaces={["common"]}
        initialMessages={initialMessages}
      >
        <TranslatedLabel />
      </ClientLanguageProvider>
    );

    act(() => {
      useLocaleStore.getState().setLocale("nl");
    });

    await waitFor(() => {
      expect(screen.getByText("Taal")).toBeTruthy();
      expect(document.documentElement.lang).toBe("nl");
    });

    expect(fetchMock).toHaveBeenCalledWith("/locales/nl/common.json");
  });

  it("keeps English-only namespaces while loading translated assets", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          labels: {
            language: "Taal",
          },
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ClientLanguageProvider
        namespaces={["common", "legal"]}
        initialMessages={{
          ...initialMessages,
          legal: { title: "Legal" },
        }}
      >
        <TranslatedLabel />
        <LegalLabel />
      </ClientLanguageProvider>
    );

    act(() => {
      useLocaleStore.getState().setLocale("nl");
    });

    await waitFor(() => {
      expect(screen.getByText("Taal")).toBeTruthy();
    });

    expect(screen.getByText("Legal")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/locales/nl/common.json");
  });
});
