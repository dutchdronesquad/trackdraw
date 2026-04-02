import "server-only";

import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { getSiteUrl } from "@/lib/seo";
import { getDatabase } from "@/lib/server/db";
import { isPlunkConfigured, sendPlunkMail } from "@/lib/server/plunk";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

function getAuthSecret() {
  return process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET ?? null;
}

export function isAuthConfigured() {
  return Boolean(getAuthSecret());
}

function isLocalAuthDeliveryFallbackAllowed() {
  return process.env.NEXT_PUBLIC_APP_ENV !== "production";
}

function getAllowedAuthHosts() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const additionalTrustedOrigins =
    process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "";

  const values = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8787",
    "http://127.0.0.1:8787",
    "http://trackdraw.home.arpa",
    "https://trackdraw.home.arpa",
    configuredSiteUrl,
    ...additionalTrustedOrigins.split(",").map((value) => value.trim()),
  ].filter((value): value is string => Boolean(value));

  return Array.from(
    new Set(
      values.flatMap((value) => {
        try {
          const url = new URL(value);
          return [url.host, url.hostname].filter(Boolean);
        } catch {
          return [value];
        }
      })
    )
  );
}

function getTrustedOrigins() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const additionalTrustedOrigins = (
    process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? ""
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8787",
    "http://127.0.0.1:8787",
    "http://trackdraw.home.arpa",
    "https://trackdraw.home.arpa",
    configuredSiteUrl,
    ...additionalTrustedOrigins,
  ].filter((value): value is string => Boolean(value));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildMagicLinkEmail(url: string) {
  const escapedUrl = escapeHtml(url);

  return {
    subject: "Your TrackDraw sign-in link",
    htmlBody: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin: 0 0 16px;">Sign in to TrackDraw</h2>
        <p style="margin: 0 0 16px;">
          Use the link below to sign in and access your cloud projects.
        </p>
        <p style="margin: 0 0 20px;">
          <a
            href="${escapedUrl}"
            style="display: inline-block; padding: 10px 16px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 8px;"
          >
            Open TrackDraw
          </a>
        </p>
        <p style="margin: 0 0 8px;">If the button does not work, use this link:</p>
        <p style="margin: 0; word-break: break-all;">
          <a href="${escapedUrl}">${escapedUrl}</a>
        </p>
      </div>
    `.trim(),
    textBody: `Sign in to TrackDraw\n\nOpen this link to sign in:\n${url}`,
  };
}

export async function getAuth() {
  const database = await getDatabase();

  return betterAuth({
    database,
    secret: getAuthSecret() ?? undefined,
    baseURL: {
      allowedHosts: getAllowedAuthHosts(),
      fallback: getSiteUrl(),
      protocol: "auto",
    },
    basePath: "/api/auth",
    trustedOrigins: getTrustedOrigins(),
    user: {
      modelName: "users",
      deleteUser: {
        enabled: true,
      },
    },
    session: {
      modelName: "sessions",
    },
    account: {
      modelName: "accounts",
    },
    verification: {
      modelName: "verifications",
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email: recipient, url, token }) => {
          console.info("[TrackDraw auth] sendMagicLink", {
            recipient,
            plunkConfigured: isPlunkConfigured(),
            nodeEnv: process.env.NODE_ENV,
            appEnv: process.env.NEXT_PUBLIC_APP_ENV,
          });

          if (isPlunkConfigured()) {
            const emailContent = buildMagicLinkEmail(url);
            await sendPlunkMail({
              to: {
                address: recipient,
              },
              subject: emailContent.subject,
              htmlBody: emailContent.htmlBody,
              textBody: emailContent.textBody,
            });
            return;
          }

          if (isLocalAuthDeliveryFallbackAllowed()) {
            console.info(
              `[TrackDraw auth] Magic link for ${recipient}: ${url} (token: ${token})`
            );
            return;
          }

          throw new Error(
            `Magic link delivery is not configured for production. Set PLUNK_API_KEY for ${recipient}.`
          );
        },
      }),
    ],
  });
}

export async function getCurrentUserFromHeaders(
  requestHeaders: Headers
): Promise<CurrentUser | null> {
  if (!isAuthConfigured()) {
    return null;
  }

  const session = await (
    await getAuth()
  ).api.getSession({
    headers: requestHeaders,
  });

  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  };
}
