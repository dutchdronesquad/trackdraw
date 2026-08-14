import { describe, expect, it } from "vitest";
import {
  buildFeedbackIssueBody,
  buildFeedbackIssueUrl,
  getFeedbackDiagnostics,
  getRouteFamily,
} from "@/lib/feedback";

describe("feedback GitHub handoff", () => {
  it("reduces paths and user agents to coarse diagnostic context", () => {
    expect(getRouteFamily("/share/private-token")).toBe("share");
    expect(getRouteFamily("/studio")).toBe("studio");
    expect(
      getFeedbackDiagnostics(
        "/embed/private-token",
        "Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36",
        true
      )
    ).toMatchObject({
      routeFamily: "embed",
      browser: "Chrome",
      device: "mobile",
    });
  });

  it("builds a previewable issue without project, account, or share identifiers", () => {
    const input = {
      category: "bug" as const,
      title: "Gate cannot be moved",
      details: "Dragging stops after selecting a gate.",
      steps: "1. Select a gate\n2. Drag it",
      diagnostics: {
        version: "v1.15.0",
        routeFamily: "share",
        browser: "Firefox",
        device: "desktop" as const,
      },
    };

    const body = buildFeedbackIssueBody(input);
    const url = new URL(buildFeedbackIssueUrl(input));

    expect(body).toContain("## Steps to reproduce");
    expect(body).toContain("- Surface: share");
    expect(body).not.toContain("private-token");
    expect(url.origin + url.pathname).toBe(
      "https://github.com/dutchdronesquad/trackdraw/issues/new"
    );
    expect(url.searchParams.get("title")).toBe("Gate cannot be moved");
    expect(url.searchParams.get("body")).toBe(body);
    expect(url.searchParams.get("labels")).toBe("bug");
  });

  it("omits diagnostics when the user disables them", () => {
    const body = buildFeedbackIssueBody({
      category: "idea",
      title: "Add a tool",
      details: "A useful idea.",
    });

    expect(body).toBe("## Idea\n\nA useful idea.");
    expect(body).not.toContain("TrackDraw context");
  });
});
