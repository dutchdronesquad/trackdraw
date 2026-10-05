// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguagePicker } from "@/components/LanguagePicker";
import { useLocaleStore } from "@/store/locale";
import common from "@lang/en-US/common.json";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

describe("LanguagePicker", () => {
  beforeEach(() => {
    refresh.mockReset();
    useLocaleStore.setState({ locale: "en" });
  });

  afterEach(() => cleanup());

  it.each(["compact", "full"] as const)(
    "selects Spanish in the %s picker",
    async (variant) => {
      const user = userEvent.setup();
      render(
        <NextIntlClientProvider locale="en" messages={{ common }}>
          <LanguagePicker variant={variant} />
        </NextIntlClientProvider>
      );
      const trigger = screen.getByRole("combobox", { name: "Language" });
      trigger.focus();
      await user.keyboard("{ArrowDown}");
      await user.click(screen.getByRole("option", { name: "Español" }));
      expect(useLocaleStore.getState().locale).toBe("es");
      expect(document.cookie).toContain("trackdraw-locale=es");
      expect(trigger.textContent).toContain("ES");
      if (variant === "full") expect(trigger.textContent).toContain("Español");
      expect(refresh).toHaveBeenCalledOnce();
    }
  );
});
