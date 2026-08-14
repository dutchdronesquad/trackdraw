"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Bug,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { DesktopModal } from "@/components/DesktopModal";
import { MobileDrawer } from "@/components/MobileDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

type CopyStatus = "idle" | "copied" | "failed";

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
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [steps, setSteps] = useState("");
  const [stepsOpen, setStepsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const diagnostics = useMemo(
    () =>
      getFeedbackDiagnostics(
        pathname,
        typeof navigator === "undefined" ? "" : navigator.userAgent,
        isMobile
      ),
    [isMobile, pathname]
  );

  const issueInput = {
    category,
    title,
    details,
    steps: category === "bug" ? steps : "",
    diagnostics: includeContext ? diagnostics : undefined,
  };
  const preview = buildFeedbackIssueBody(issueInput);
  const canContinue = Boolean(title.trim() && details.trim());

  useEffect(() => {
    if (!open) return;

    const focusTarget = window.requestAnimationFrame(() => {
      titleInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(focusTarget);
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCategory("bug");
      setTitle("");
      setDetails("");
      setSteps("");
      setStepsOpen(false);
      setPreviewOpen(false);
      setIncludeContext(true);
      setCopyStatus("idle");
    }
    onOpenChange(nextOpen);
  };

  const copyReport = async () => {
    if (!canContinue) return;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(`${title.trim()}\n\n${preview}`);
      setCopyStatus("copied");
    } catch {
      setPreviewOpen(true);
      setCopyStatus("failed");
    }

    window.setTimeout(() => setCopyStatus("idle"), 3000);
  };

  const openGitHub = () => {
    if (!canContinue) return;
    window.open(
      buildFeedbackIssueUrl(issueInput),
      "_blank",
      "noopener,noreferrer"
    );
  };

  const content = (
    <div className="space-y-4">
      <fieldset>
        <legend className="sr-only">{t("categoryLabel")}</legend>
        <div className="bg-muted/45 grid grid-cols-3 gap-1 rounded-lg p-1">
          {(["bug", "idea", "question"] as const).map((item) => {
            const Icon = categoryIcons[item];
            const selected = item === category;

            return (
              <label
                key={item}
                className={cn(
                  "text-muted-foreground hover:text-foreground focus-within:ring-ring flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors focus-within:ring-2",
                  selected &&
                    "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/8"
                )}
              >
                <input
                  type="radio"
                  name="feedback-category"
                  value={item}
                  checked={selected}
                  onChange={() => setCategory(item)}
                  className="sr-only"
                />
                <Icon className="size-3.5" />
                <span>{t(`categories.${item}.shortTitle`)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="feedback-title" className="text-xs font-medium">
          {t("titleLabel")}
        </label>
        <Input
          ref={titleInputRef}
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
          className="border-input placeholder:text-muted-foreground focus-visible:ring-ring min-h-24 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
        />
      </div>

      {category === "bug" ? (
        <div className="space-y-2">
          <button
            type="button"
            aria-expanded={stepsOpen}
            onClick={() => setStepsOpen((current) => !current)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                stepsOpen && "rotate-180"
              )}
            />
            {stepsOpen ? t("hideSteps") : t("addSteps")}
          </button>
          {stepsOpen ? (
            <div className="space-y-1.5">
              <label htmlFor="feedback-steps" className="sr-only">
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
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-4 py-1">
        <span className="min-w-0">
          <span className="block text-xs font-medium">{t("contextLabel")}</span>
          <span
            id="feedback-context-description"
            className="text-muted-foreground mt-0.5 block text-[11px] leading-relaxed"
          >
            {t("contextDescription", diagnostics)}
          </span>
        </span>
        <Switch
          checked={includeContext}
          onCheckedChange={setIncludeContext}
          aria-label={t("contextLabel")}
          aria-describedby="feedback-context-description"
        />
      </div>

      <div className="border-border/60 border-t pt-3">
        <button
          type="button"
          aria-expanded={previewOpen}
          onClick={() => setPreviewOpen((current) => !current)}
          className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between gap-3 text-left text-xs font-medium transition-colors"
        >
          <span>{previewOpen ? t("hidePreview") : t("previewLabel")}</span>
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              previewOpen && "rotate-180"
            )}
          />
        </button>
        {previewOpen ? (
          <pre className="border-border/60 bg-muted/20 text-muted-foreground mt-2 max-h-36 overflow-auto rounded-lg border p-3 font-sans text-[11px] leading-relaxed whitespace-pre-wrap">
            {canContinue ? preview : t("previewEmpty")}
          </pre>
        ) : null}
      </div>
    </div>
  );

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-xs">
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          {t("publicWarning")}
        </p>
        {copyStatus !== "idle" ? (
          <p
            role="status"
            aria-live="polite"
            className={cn(
              "mt-1 text-[11px] leading-relaxed",
              copyStatus === "failed"
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {copyStatus === "copied" ? t("copiedStatus") : t("copyFailed")}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => void copyReport()}
          disabled={!canContinue}
        >
          {copyStatus === "copied" ? <Check /> : <Copy />}
          {copyStatus === "copied" ? t("copied") : t("copy")}
        </Button>
        <Button type="button" onClick={openGitHub} disabled={!canContinue}>
          <ExternalLink />
          {t("openGitHub")}
        </Button>
      </div>
    </div>
  );

  return isMobile ? (
    <MobileDrawer
      open={open}
      onOpenChange={handleOpenChange}
      title={t("title")}
      subtitle={t("subtitle")}
      repositionInputs
      bodyClassName="pb-4"
      footerContent={
        <div className="border-border/60 bg-card border-t px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {footer}
        </div>
      }
    >
      {content}
    </MobileDrawer>
  ) : (
    <DesktopModal
      open={open}
      onOpenChange={handleOpenChange}
      title={t("title")}
      subtitle={t("subtitle")}
      maxWidth="max-w-lg"
      panelClassName="max-h-[90vh] overflow-y-auto"
    >
      {content}
      <div className="border-border/60 mt-4 border-t pt-4">{footer}</div>
    </DesktopModal>
  );
}
