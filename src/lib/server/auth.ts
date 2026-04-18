import "server-only";

import { betterAuth } from "better-auth";
import { passkey } from "@better-auth/passkey";
import { magicLink } from "better-auth/plugins";
import { parseAccountRole, type AccountRole } from "@/lib/account-roles";
import { getSiteUrl } from "@/lib/seo";
import {
  buildChangeEmailConfirmationEmail,
  buildEmailVerificationEmail,
  buildMagicLinkEmail,
} from "@/lib/server/auth-email";
import { getDatabase } from "@/lib/server/db";
import { isPlunkConfigured, sendPlunkMail } from "@/lib/server/plunk";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: AccountRole;
};

type UserRoleRow = {
  role: string | null;
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
    advanced: {
      trustedProxyHeaders: true,
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"],
      },
    },
    user: {
      modelName: "users",
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: async ({ user, newEmail, url, token }) => {
          const currentEmail = user.email;

          if (!currentEmail) {
            throw new Error(
              "Cannot send email change confirmation without a current email."
            );
          }

          console.info("[TrackDraw auth] sendChangeEmailConfirmation", {
            recipient: currentEmail,
            newEmail,
            plunkConfigured: isPlunkConfigured(),
            nodeEnv: process.env.NODE_ENV,
            appEnv: process.env.NEXT_PUBLIC_APP_ENV,
          });

          if (isLocalAuthDeliveryFallbackAllowed() && !isPlunkConfigured()) {
            console.info(
              `[TrackDraw auth] Change email confirmation for ${currentEmail} to ${newEmail}: ${url} (token: ${token})`
            );
            return;
          }

          const emailContent = buildChangeEmailConfirmationEmail(
            url,
            currentEmail,
            newEmail
          );
          await sendPlunkMail({
            to: {
              address: currentEmail,
            },
            subject: emailContent.subject,
            htmlBody: emailContent.htmlBody,
            textBody: emailContent.textBody,
          });
        },
      },
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
    emailVerification: {
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url, token }) => {
        const recipient = user.email;

        if (!recipient) {
          throw new Error(
            "Cannot send verification email without a recipient."
          );
        }

        console.info("[TrackDraw auth] sendVerificationEmail", {
          recipient,
          plunkConfigured: isPlunkConfigured(),
          nodeEnv: process.env.NODE_ENV,
          appEnv: process.env.NEXT_PUBLIC_APP_ENV,
        });

        if (isPlunkConfigured()) {
          const emailContent = buildEmailVerificationEmail(url, recipient);
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
            `[TrackDraw auth] Verification email for ${recipient}: ${url} (token: ${token})`
          );
          return;
        }

        throw new Error(
          `Verification email delivery is not configured for production. Set PLUNK_API_KEY for ${recipient}.`
        );
      },
    },
    plugins: [
      magicLink({
        expiresIn: 600,
        rateLimit: {
          window: 900,
          max: 3,
        },
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
      passkey({
        rpName: "TrackDraw",
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

  const database = await getDatabase();
  const userRole = await database
    .prepare(
      `
        select role
        from users
        where id = ?
        limit 1
      `
    )
    .bind(session.user.id)
    .first<UserRoleRow>();

  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    role: parseAccountRole(userRole?.role),
  };
}
