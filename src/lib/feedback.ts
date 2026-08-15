export const feedbackCategories = ["bug", "idea", "question"] as const;

export type FeedbackCategory = (typeof feedbackCategories)[number];

export type FeedbackDiagnostics = {
  version: string;
  routeFamily: string;
  browser: string;
  device: "mobile" | "desktop";
};

const REPOSITORY_ISSUES_URL =
  "https://github.com/dutchdronesquad/trackdraw/issues/new";

function getBrowserFamily(userAgent: string): string {
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  if (/CriOS\//.test(userAgent)) return "Chrome on iOS";
  if (/Chrome\//.test(userAgent)) return "Chrome";
  if (/Safari\//.test(userAgent)) return "Safari";
  return "Other";
}

export function getRouteFamily(pathname: string): string {
  if (pathname === "/studio" || pathname.startsWith("/studio/")) {
    return "studio";
  }
  if (pathname.startsWith("/share/")) return "share";
  if (pathname.startsWith("/embed/")) return "embed";
  if (pathname === "/gallery" || pathname.startsWith("/gallery/")) {
    return "gallery";
  }
  return "other";
}

export function getFeedbackDiagnostics(
  pathname: string,
  userAgent: string,
  mobile: boolean
): FeedbackDiagnostics {
  return {
    version: process.env.NEXT_PUBLIC_APP_VERSION || "dev",
    routeFamily: getRouteFamily(pathname),
    browser: getBrowserFamily(userAgent),
    device: mobile ? "mobile" : "desktop",
  };
}

type FeedbackIssueInput = {
  category: FeedbackCategory;
  title: string;
  details: string;
  steps?: string;
  diagnostics?: FeedbackDiagnostics;
};

const issueLabels: Record<FeedbackCategory, string> = {
  bug: "bug",
  idea: "new-feature",
  question: "help-wanted",
};

const issueHeadings: Record<FeedbackCategory, string> = {
  bug: "Problem",
  idea: "Idea",
  question: "Question",
};

export function buildFeedbackIssueBody({
  category,
  details,
  steps,
  diagnostics,
}: FeedbackIssueInput): string {
  const sections = [`## ${issueHeadings[category]}\n\n${details.trim()}`];

  if (category === "bug" && steps?.trim()) {
    sections.push(`## Steps to reproduce\n\n${steps.trim()}`);
  }

  if (diagnostics) {
    sections.push(
      [
        "## TrackDraw context",
        "",
        `- Version: ${diagnostics.version}`,
        `- Surface: ${diagnostics.routeFamily}`,
        `- Browser: ${diagnostics.browser}`,
        `- Device: ${diagnostics.device}`,
        "",
        "_This context was reviewed before opening GitHub. No project, account, or share data was included._",
      ].join("\n")
    );
  }

  return sections.join("\n\n");
}

export function buildFeedbackIssueUrl(input: FeedbackIssueInput): string {
  const params = new URLSearchParams({
    title: input.title.trim(),
    body: buildFeedbackIssueBody(input),
    labels: issueLabels[input.category],
  });
  return `${REPOSITORY_ISSUES_URL}?${params.toString()}`;
}
