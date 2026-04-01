"use client";

import { useSyncExternalStore } from "react";
import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

type AuthSessionData = {
  session: {
    id: string;
  };
  user: AuthUser;
};

type MagicLinkSignInOptions = {
  email: string;
  name?: string;
  callbackURL?: string;
  newUserCallbackURL?: string;
};

type SignOutOptions = {
  fetchOptions?: {
    onSuccess?: () => void;
  };
};

const DEV_AUTH_SESSION_KEY = "trackdraw-dev-auth-session";
const DEV_AUTH_PROFILES_KEY = "trackdraw-dev-auth-profiles";
const DEV_AUTH_EVENT = "trackdraw-dev-auth-change";
let devSessionCache: AuthSessionData | null = null;
let devSessionCacheLoaded = false;

type DevAuthProfileRecord = {
  email: string;
  name: string | null;
};

function getAuthBaseUrl() {
  if (typeof window !== "undefined") {
    return new URL("/api/auth", window.location.origin).toString();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL("/api/auth", siteUrl).toString();
}

const betterAuthClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  plugins: [magicLinkClient()],
});

function isDevAuthShimEnabled() {
  return process.env.NODE_ENV === "development";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readDevAuthProfiles(): Record<string, DevAuthProfileRecord> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(DEV_AUTH_PROFILES_KEY);
    return rawValue
      ? (JSON.parse(rawValue) as Record<string, DevAuthProfileRecord>)
      : {};
  } catch {
    return {};
  }
}

function writeDevAuthProfiles(profiles: Record<string, DevAuthProfileRecord>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DEV_AUTH_PROFILES_KEY, JSON.stringify(profiles));
}

function buildDevSession(options: MagicLinkSignInOptions): AuthSessionData {
  const normalizedEmail = normalizeEmail(options.email);
  const profiles = readDevAuthProfiles();
  const existingProfile = profiles[normalizedEmail];
  const idSource = normalizedEmail || "dev-user";
  const name = options.name?.trim() || existingProfile?.name || null;

  return {
    session: {
      id: `dev-session-${Date.now()}`,
    },
    user: {
      id: `dev-user-${idSource}`,
      email: normalizedEmail,
      name,
      image: null,
    },
  };
}

function readDevSession(): AuthSessionData | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (devSessionCacheLoaded) {
    return devSessionCache;
  }

  try {
    const rawValue = window.localStorage.getItem(DEV_AUTH_SESSION_KEY);
    devSessionCache = rawValue
      ? (JSON.parse(rawValue) as AuthSessionData)
      : null;
    devSessionCacheLoaded = true;
    return devSessionCache;
  } catch {
    devSessionCache = null;
    devSessionCacheLoaded = true;
    return null;
  }
}

function writeDevSession(session: AuthSessionData | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (session) {
    window.localStorage.setItem(DEV_AUTH_SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(DEV_AUTH_SESSION_KEY);
  }

  devSessionCache = session;
  devSessionCacheLoaded = true;
  window.dispatchEvent(new Event(DEV_AUTH_EVENT));
}

function subscribeToDevSession(callback: () => void) {
  window.addEventListener(DEV_AUTH_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(DEV_AUTH_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function useDevSession() {
  const data = useSyncExternalStore(
    subscribeToDevSession,
    readDevSession,
    () => null
  );

  return {
    data,
    isPending: false,
    error: null,
  };
}

export const authClient = {
  useSession() {
    if (isDevAuthShimEnabled()) {
      return useDevSession();
    }

    return betterAuthClient.useSession();
  },
  signIn: {
    async magicLink(options: MagicLinkSignInOptions) {
      if (isDevAuthShimEnabled()) {
        writeDevSession(buildDevSession(options));
        if (typeof window !== "undefined") {
          const nextUrl =
            options.callbackURL || options.newUserCallbackURL || "/studio";
          window.location.href = nextUrl;
        }
        return;
      }

      return betterAuthClient.signIn.magicLink(options);
    },
  },
  async signOut(options?: SignOutOptions) {
    if (isDevAuthShimEnabled()) {
      writeDevSession(null);
      options?.fetchOptions?.onSuccess?.();
      return;
    }

    return betterAuthClient.signOut(options);
  },
  async deleteUser() {
    if (isDevAuthShimEnabled()) {
      const session = readDevSession();
      if (session?.user.email) {
        const profiles = readDevAuthProfiles();
        delete profiles[normalizeEmail(session.user.email)];
        writeDevAuthProfiles(profiles);
      }
      writeDevSession(null);
      return;
    }

    const clientWithDeleteUser = betterAuthClient as typeof betterAuthClient & {
      deleteUser: (input?: { callbackURL?: string }) => Promise<unknown>;
    };

    return clientWithDeleteUser.deleteUser({
      callbackURL: "/studio",
    });
  },
  async updateProfileName(name: string) {
    const normalizedName = name.trim();

    if (isDevAuthShimEnabled()) {
      const session = readDevSession();
      if (!session) {
        throw new Error("No local dev session is available.");
      }

      const nextSession = {
        ...session,
        user: {
          ...session.user,
          name: normalizedName,
        },
      };
      const profiles = readDevAuthProfiles();
      if (session.user.email) {
        profiles[normalizeEmail(session.user.email)] = {
          email: session.user.email,
          name: normalizedName,
        };
        writeDevAuthProfiles(profiles);
      }
      writeDevSession(nextSession);
      return;
    }

    await betterAuthClient.updateUser({
      name: normalizedName,
    });
  },
};
