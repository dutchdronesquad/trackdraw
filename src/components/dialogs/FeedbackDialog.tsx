"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Bug,
  Check,
  Copy,
  ExternalLink,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { DesktopModal } from "@/components/DesktopModal";
import { MobileDrawer } from "@/components/MobileDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  buildFeedbackIssueBody,
  buildFeedbackIssueUrl,
  getFeedbackDiagnostics,
  type FeedbackCategory,
} from "@/lib/feedback";
import { cn } from "@/lib/utils";

type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const categoryIcons = {
  bug: Bug,
  idea: Lightbulb,
  question: HelpCircle,
} satisfies Record<FeedbackCategory, typeof Bug>;

export default function FeedbackDialog({
  open,
  onOpenChange,
}: FeedbackDialogProps) {
  const t = useTranslations("dialogs.feedback");
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [steps, setSteps] = useState("");
  const [includeContext, setIncludeContext] = useState(true);
  const [copied, setCopied] = useState(false);

  const diagnostics = useMemo(
    () =>
      getFeedbackDiagnostics(
        pathname,
        typeof navigator === "undefined" ? "" : navigator.userAgent,
        isMobile
      ),
    [isMobile, pathname]
  );

  const issueInput = category
    ? {
        category,
        title,
        details,
        steps,
        diagnostics: includeContext ? diagnostics : undefined,
      }
    : null;
  const preview = issueInput ? buildFeedbackIssueBody(issueInput) : "";
  const canContinue = Boolean(title.trim() && details.trim());

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCategory(null);
      setTitle("");
      setDetails("");
      setSteps("");
      setIncludeContext(true);
      setCopied(false);
    }
    onOpenChange(nextOpen);
  };

  const selectCategory = (nextCategory: FeedbackCategory) => {
    setCategory(nextCategory);
  };

  const copyReport = async () => {
    if (!issueInput || !canContinue) return;
    await navigator.clipboard.writeText(`${title.trim()}\n\n${preview}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const openGitHub = () => {
    if (!issueInput || !canContinue) return;
    window.open(
      buildFeedbackIssueUrl(issueInput),
      "_blank",
      "noopener,noreferrer"
    );
  };

  const categoryPicker = (
    <div className="space-y-2">
      {(["bug", "idea", "question"] as const).map((item) => {
        const Icon = categoryIcons[item];
        return (
          <button
            key={item}
            type="button"
            onClick={() => selectCategory(item)}
            className="border-border/60 hover:bg-muted/45 flex min-h-16 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors"
          >
            <span className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">
                {t(`categories.${item}.title`)}
              </span>
              <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                {t(`categories.${item}.description`)}
              </span>
            </span>
          </button>
        );
      })}
      <p className="text-muted-foreground px-1 pt-1 text-xs leading-relaxed">
        {t("privateLater")}
      </p>
    </div>
  );

  const form = category ? (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setCategory(null)}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        {t("back")}
      </button>

      <div className="space-y-1.5">
        <label htmlFor="feedback-title" className="text-xs font-medium">
          {t("titleLabel")}
        </label>
        <Input
          id="feedback-title"
          value={title}
          maxLength={160}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t(`categories.${category}.titlePlaceholder`)}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="feedback-details" className="text-xs font-medium">
          {t("detailsLabel")}
        </label>
        <textarea
          id="feedback-details"
          value={details}
          maxLength={4000}
          onChange={(event) => setDetails(event.target.value)}
          placeholder={t(`categories.${category}.detailsPlaceholder`)}
          className="border-input placeholder:text-muted-foreground focus-visible:ring-ring min-h-28 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
        />
      </div>

      {category === "bug" ? (
        <div className="space-y-1.5">
          <label htmlFor="feedback-steps" className="text-xs font-medium">
            {t("stepsLabel")}
          </label>
          <textarea
            id="feedback-steps"
            value={steps}
            maxLength={2500}
            onChange={(event) => setSteps(event.target.value)}
            placeholder={t("stepsPlaceholder")}
            className="border-input placeholder:text-muted-foreground focus-visible:ring-ring min-h-20 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
          />
        </div>
      ) : null}

      <button
        type="button"
        role="checkbox"
        aria-checked={includeContext}
        onClick={() => setIncludeContext((current) => !current)}
        className="border-border/60 bg-muted/20 flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left"
      >
        <span
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
            includeContext
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border bg-background"
          )}
        >
          {includeContext ? <Check className="size-3" /> : null}
        </span>
        <span>
          <span className="block text-xs font-medium">{t("contextLabel")}</span>
          <span className="text-muted-foreground mt-0.5 block text-[11px] leading-relaxed">
            {t("contextDescription", diagnostics)}
          </span>
        </span>
      </button>

      <div className="space-y-1.5">
        <p className="text-xs font-medium">{t("previewLabel")}</p>
        <pre className="border-border/60 bg-muted/20 text-muted-foreground max-h-44 overflow-auto rounded-xl border p-3 font-sans text-[11px] leading-relaxed whitespace-pre-wrap">
          {preview || t("previewEmpty")}
        </pre>
      </div>

      <div className="border-border/60 border-t pt-4">
        <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
          {t("publicWarning")}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => void copyReport()}
            disabled={!canContinue}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? t("copied") : t("copy")}
          </Button>
          <Button type="button" onClick={openGitHub} disabled={!canContinue}>
            <ExternalLink />
            {t("openGitHub")}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  const content = category ? form : categoryPicker;
  const subtitle = category ? t("formSubtitle") : t("subtitle");

  return isMobile ? (
    <MobileDrawer
      open={open}
      onOpenChange={handleOpenChange}
      title={t("title")}
      subtitle={subtitle}
      repositionInputs
      bodyClassName="pb-8"
    >
      {content}
    </MobileDrawer>
  ) : (
    <DesktopModal
      open={open}
      onOpenChange={handleOpenChange}
      title={t("title")}
      subtitle={subtitle}
      maxWidth="max-w-xl"
      panelClassName="max-h-[90vh] overflow-y-auto"
    >
      {content}
    </DesktopModal>
  );
}
