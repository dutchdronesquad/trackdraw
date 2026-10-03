"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmailPreviewFrame } from "@/components/dev/EmailPreviewFrame";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EmailPreviewFlow } from "@/lib/server/email-preview";
import { cn } from "@/lib/utils";

type EmailPreviewTemplate = {
  key: string;
  label: string;
  description: string;
  subject: string;
  flow: EmailPreviewFlow;
};

type EmailPreviewWorkspaceProps = {
  templates: EmailPreviewTemplate[];
  activeKey: string;
  fromAddress: string;
  recipient: string;
  htmlBody: string;
  textBody: string;
};

const flows: EmailPreviewFlow[] = ["authentication", "retention"];

const flowBadgeClassNames: Record<EmailPreviewFlow, string> = {
  authentication: "border-brand-primary/30 text-brand-primary",
  retention: "border-amber-500/40 text-amber-600 dark:text-amber-400",
};

export default function EmailPreviewWorkspace({
  templates,
  activeKey,
  fromAddress,
  recipient,
  htmlBody,
  textBody,
}: EmailPreviewWorkspaceProps) {
  const t = useTranslations("dashboard.emailPreview");
  const [query, setQuery] = useState("");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const activeTemplate =
    templates.find((template) => template.key === activeKey) ?? templates[0];
  const normalizedQuery = query.trim().toLowerCase();
  const visibleTemplates = templates.filter(
    (template) =>
      !normalizedQuery ||
      `${template.label} ${template.subject}`
        .toLowerCase()
        .includes(normalizedQuery)
  );

  return (
    <div className="grid min-h-190 overflow-hidden rounded-xl border lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside
        aria-label={t("templates.title")}
        className="flex flex-col border-b lg:border-r lg:border-b-0"
      >
        <div className="border-b p-3">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="h-8 pl-8"
            />
          </div>
        </div>
        <nav className="flex-1 py-1">
          {visibleTemplates.length === 0 ? (
            <p className="text-muted-foreground px-4 py-3 text-xs">
              {t("noResults")}
            </p>
          ) : (
            flows.map((flow) => {
              const flowTemplates = visibleTemplates.filter(
                (template) => template.flow === flow
              );
              if (flowTemplates.length === 0) {
                return null;
              }
              return (
                <div key={flow}>
                  <p className="text-muted-foreground flex items-center justify-between px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wider uppercase">
                    <span>{t(`flows.${flow}`)}</span>
                    <span className="tabular-nums">{flowTemplates.length}</span>
                  </p>
                  {flowTemplates.map((template) => {
                    const isActive = template.key === activeKey;
                    return (
                      <Link
                        key={template.key}
                        href={`/dashboard/email-preview?template=${template.key}`}
                        prefetch={false}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex gap-3 border-l-2 px-4 py-2.5 transition-colors",
                          isActive
                            ? "border-brand-primary bg-brand-primary/10"
                            : "hover:bg-muted/50 border-transparent"
                        )}
                      >
                        <span className="bg-brand-primary mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white">
                          TD
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">
                            {template.label}
                          </span>
                          <span className="block truncate text-xs">
                            {template.subject}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {template.description}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              );
            })
          )}
        </nav>
      </aside>

      <Tabs defaultValue="html" className="flex min-w-0 flex-col">
        <div className="flex flex-col gap-2.5 border-b px-5 pt-4 pb-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                flowBadgeClassNames[activeTemplate.flow]
              )}
            >
              {t(`flows.${activeTemplate.flow}`)}
            </span>
            <span className="text-muted-foreground text-xs">
              {activeTemplate.description}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-balance">
            {activeTemplate.subject}
          </h2>
          <dl className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-xs">
            <dt className="text-muted-foreground">{t("from")}</dt>
            <dd className="break-all">{fromAddress}</dd>
            <dt className="text-muted-foreground">{t("to")}</dt>
            <dd className="break-all">{recipient}</dd>
          </dl>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-2.5">
          <TabsList>
            <TabsTrigger value="html">{t("htmlPreview")}</TabsTrigger>
            <TabsTrigger value="text">{t("plainText")}</TabsTrigger>
          </TabsList>
          <div
            role="group"
            aria-label={t("viewport")}
            className="bg-muted text-muted-foreground inline-flex h-9 items-center rounded-lg p-1"
          >
            {(["desktop", "mobile"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={viewport === option}
                onClick={() => setViewport(option)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-medium transition-all",
                  viewport === option && "bg-background text-foreground shadow"
                )}
              >
                {option === "desktop" ? t("desktop") : t("mobileWidth")}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-muted/30 flex-1 p-3 sm:p-5">
          <TabsContent value="html" className="mt-0">
            <div
              className={cn(
                "mx-auto overflow-hidden rounded-xl border bg-[#dfe8f6] shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-[max-width] duration-300",
                viewport === "mobile" ? "max-w-97.5" : "max-w-4xl"
              )}
            >
              <EmailPreviewFrame
                title={`${activeTemplate.label} — ${t("htmlPreview")}`}
                html={htmlBody}
                className="block w-full bg-[#dfe8f6]"
              />
            </div>
          </TabsContent>
          <TabsContent value="text" className="mt-0">
            <p className="text-muted-foreground mx-auto mb-2 max-w-3xl text-xs">
              {t("plainTextHelper")}
            </p>
            <pre className="bg-background text-foreground mx-auto max-w-3xl overflow-x-auto rounded-xl border px-4 py-4 text-sm leading-6 whitespace-pre-wrap">
              {textBody}
            </pre>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
