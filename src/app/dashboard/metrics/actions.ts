"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { hasCapability } from "@/lib/server/authorization";
import { getProductInsights } from "@/lib/server/metrics";
import { getLocalizationDemandMetrics } from "@/lib/server/localization-demand";
import type { GrowthCustomRange } from "@/lib/metrics-growth";

export async function loadLocalizationDemand(range: GrowthCustomRange) {
  const user = await getCurrentUserFromHeaders(new Headers(await headers()));
  if (!user || !hasCapability(user.role, "admin.metrics.read")) {
    throw new Error("Forbidden");
  }
  const parsed = z
    .object({ from: z.string(), to: z.string() })
    .strict()
    .parse(range);
  return getLocalizationDemandMetrics(new Date(), parsed);
}

export async function loadProductInsights(range: GrowthCustomRange) {
  const user = await getCurrentUserFromHeaders(new Headers(await headers()));
  if (!user || !hasCapability(user.role, "admin.metrics.read"))
    throw new Error("Forbidden");
  const parsed = z
    .object({ from: z.string(), to: z.string() })
    .strict()
    .parse(range);
  return getProductInsights(parsed);
}
