"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";
import { parseAccountRole, type AccountRole } from "@/lib/account-roles";

type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  image?: string | null;
  role?: AccountRole;
};

type AuthSessionData = {
  session: {
    id: string;
  };
  user: AuthUser;
};

type SessionHookResult = {
  data: AuthSessionData | null;
  isPending: boolean;
  error: Error | null;
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
const DEV_AUTH_ROLE_KEY = "trackdraw-dev-auth-role";
const DEV_AUTH_EVENT = "trackdraw-dev-auth-change";
let devSessionCache: AuthSessionData | null = null;
let devSessionCacheLoaded = false;
let resolvedRoleCache: { userId: string; role: AccountRole } | null = null;
let resolvedRoleRequest:
  | {
      userId: string;
      promise: Promise<AccountRole>;
    }
  | null = null;

type DevAuthProfileRecord = {
  id: string;
  email: string;
  name: string | null;
};

type ChangeEmailOptions = {
  newEmail: string;
  callbackURL?: string;
};

export type AuthPasskey = {
  id: string;
  name?: string;
  publicKey: string;
  userId: string;
  credentialID: string;
  counter: number;
  deviceType: string;
  backedUp: boolean;
  transports?: string;
  createdAt: string | Date;
  aaguid?: string;
};

function getAuthBaseUrl() {
  if (typeof window !== "undefined") {
    return new URL("/api/auth", window.location.origin).toString();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL("/api/auth", siteUrl).toString();
}

function getAuthEndpointUrl(path: string) {
  return new URL(path.replace(/^\/+/, ""), `${getAuthBaseUrl()}/`);
}

const betterAuthClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  plugins: [magicLinkClient(), passkeyClient()],
});

export function isDevAuthShimEnabled() {
  return process.env.NODE_ENV === "development";
}

function readDevAuthRole() {
  if (typeof window === "undefined") {
    return "user" satisfies AccountRole;
  }

  return parseAccountRole(window.localStorage.getItem(DEV_AUTH_ROLE_KEY));
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
  const userId =
    existingProfile?.id || `dev-user-${normalizedEmail || "dev-user"}`;
  const name = options.name?.trim() || existingProfile?.name || null;
  const role = readDevAuthRole();

  return {
    session: {
      id: `dev-session-${Date.now()}`,
    },
    user: {
      id: userId,
      email: normalizedEmail,
      name,
      image: null,
      role,
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
    const parsedSession = rawValue
      ? (JSON.parse(rawValue) as AuthSessionData)
      : null;
    const nextRole = readDevAuthRole();

    devSessionCache = parsedSession
      ? {
          ...parsedSession,
          user: {
            ...parsedSession.user,
            role: nextRole,
          },
        }
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

async function resolveSessionRole(userId: string) {
  if (resolvedRoleCache?.userId === userId) {
    return resolvedRoleCache.role;
  }

  if (resolvedRoleRequest?.userId === userId) {
    return resolvedRoleRequest.promise;
  }

  const promise = fetch("/api/account/session", {
    credentials: "same-origin",
    cache: "no-store",
  })
    .then(async (response) => {
      const payload = (await response.json()) as {
        ok: boolean;
        user?: { role?: AccountRole } | null;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to resolve account session");
      }

      const role = parseAccountRole(payload.user?.role);
      resolvedRoleCache = { userId, role };
      return role;
    })
    .finally(() => {
      if (resolvedRoleRequest?.userId === userId) {
        resolvedRoleRequest = null;
      }
    });

  resolvedRoleRequest = { userId, promise };
  return promise;
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

function useResolvedAuthSession(): SessionHookResult {
  const authSession = betterAuthClient.useSession();
  const [resolvedRole, setResolvedRole] = useState<AccountRole | null>(null);
  const [rolePending, setRolePending] = useState(false);
  const [roleError, setRoleError] = useState<Error | null>(null);

  const userId = authSession.data?.user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setResolvedRole(null);
      setRolePending(false);
      setRoleError(null);
      return;
    }

    if (resolvedRoleCache?.userId === userId) {
      setResolvedRole(resolvedRoleCache.role);
      setRolePending(false);
      setRoleError(null);
      return;
    }

    const currentUserId = userId;
    let cancelled = false;

    async function resolveRole() {
      setRolePending(true);
      setRoleError(null);

      try {
        const role = await resolveSessionRole(currentUserId);

        if (!cancelled) {
          setResolvedRole(role);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setRoleError(
            caughtError instanceof Error
              ? caughtError
              : new Error("Failed to resolve account role")
          );
          setResolvedRole(null);
        }
      } finally {
        if (!cancelled) {
          setRolePending(false);
        }
      }
    }

    void resolveRole();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const data =
    authSession.data?.user && resolvedRole
      ? {
          ...authSession.data,
          user: {
            ...authSession.data.user,
            role: resolvedRole,
          },
        }
      : authSession.data;

  return {
    data,
    isPending: authSession.isPending || rolePending,
    error: authSession.error ?? roleError,
  };
}

export const authClient = {
  useSession() {
    const devSession = useDevSession();
    const authSession = useResolvedAuthSession();
    return isDevAuthShimEnabled() ? devSession : authSession;
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
    async passkey() {
      if (isDevAuthShimEnabled()) {
        throw new Error(
          "Passkeys are unavailable in npm run dev. Use npm run preview to test the real auth flow."
        );
      }

      const clientWithPasskey = betterAuthClient as typeof betterAuthClient & {
        signIn: typeof betterAuthClient.signIn & {
          passkey: (options?: {
            autoFill?: boolean;
            fetchOptions?: {
              onSuccess?: () => void;
              onError?: (context: { error: { message?: string } }) => void;
            };
          }) => Promise<{
            data: unknown;
            error: { message?: string } | null;
          }>;
        };
      };

      return clientWithPasskey.signIn.passkey();
    },
  },
  async preloadPasskeyAutoFill() {
    if (
      isDevAuthShimEnabled() ||
      typeof window === "undefined" ||
      typeof PublicKeyCredential === "undefined" ||
      typeof PublicKeyCredential.isConditionalMediationAvailable !== "function"
    ) {
      return;
    }

    const conditionalUiAvailable =
      await PublicKeyCredential.isConditionalMediationAvailable().catch(
        () => false
      );

    if (!conditionalUiAvailable) {
      return;
    }

    const clientWithPasskey = betterAuthClient as typeof betterAuthClient & {
      signIn: typeof betterAuthClient.signIn & {
        passkey: (options?: { autoFill?: boolean }) => Promise<unknown>;
      };
    };

    await clientWithPasskey.signIn.passkey({
      autoFill: true,
    });
  },
  async signOut(options?: SignOutOptions) {
    if (isDevAuthShimEnabled()) {
      writeDevSession(null);
      options?.fetchOptions?.onSuccess?.();
      return;
    }

    resolvedRoleCache = null;
    resolvedRoleRequest = null;

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

    resolvedRoleCache = null;
    resolvedRoleRequest = null;

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
          id: session.user.id,
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
  async changeEmail(options: ChangeEmailOptions) {
    const normalizedEmail = normalizeEmail(options.newEmail);

    if (!normalizedEmail) {
      throw new Error("Please enter a valid email address.");
    }

    if (isDevAuthShimEnabled()) {
      const session = readDevSession();

      if (!session) {
        throw new Error("No local dev session is available.");
      }

      const currentEmail = normalizeEmail(session.user.email ?? "");

      if (!currentEmail) {
        throw new Error("This account does not have an email address.");
      }

      if (normalizedEmail === currentEmail) {
        throw new Error("Email is the same.");
      }

      const profiles = readDevAuthProfiles();
      const existingProfile = profiles[normalizedEmail];

      if (existingProfile && existingProfile.id !== session.user.id) {
        throw new Error("An account with that email already exists.");
      }

      const currentProfile = profiles[currentEmail];
      delete profiles[currentEmail];
      profiles[normalizedEmail] = {
        id: currentProfile?.id ?? session.user.id,
        email: normalizedEmail,
        name: currentProfile?.name ?? session.user.name ?? null,
      };
      writeDevAuthProfiles(profiles);
      writeDevSession({
        ...session,
        user: {
          ...session.user,
          email: normalizedEmail,
        },
      });
      return;
    }

    const response = await fetch(getAuthEndpointUrl("/change-email"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        newEmail: normalizedEmail,
        callbackURL: options.callbackURL ?? "/studio",
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string } | string;
      message?: string;
    } | null;

    if (!response.ok) {
      const errorMessage =
        typeof payload?.error === "string"
          ? payload.error
          : payload?.error?.message || payload?.message;
      throw new Error(errorMessage ?? "Failed to change email.");
    }
  },
  passkey: {
    async add(options?: {
      name?: string;
      authenticatorAttachment?: "platform" | "cross-platform";
      useAutoRegister?: boolean;
    }) {
      if (isDevAuthShimEnabled()) {
        throw new Error(
          "Passkeys are unavailable in npm run dev. Use npm run preview to test the real auth flow."
        );
      }

      const clientWithPasskey = betterAuthClient as typeof betterAuthClient & {
        passkey: {
          addPasskey: (options?: {
            name?: string;
            authenticatorAttachment?: "platform" | "cross-platform";
            useAutoRegister?: boolean;
          }) => Promise<{
            data: AuthPasskey | null;
            error: { message?: string } | null;
          }>;
        };
      };

      const response = await clientWithPasskey.passkey.addPasskey(options);
      if (response.error) {
        throw new Error(response.error.message ?? "Failed to add passkey.");
      }

      return response.data;
    },
    async list() {
      if (isDevAuthShimEnabled()) {
        return [] as AuthPasskey[];
      }

      const response = await fetch(
        getAuthEndpointUrl("/passkey/list-user-passkeys"),
        {
          method: "GET",
          credentials: "include",
        }
      );

      const payload = (await response.json().catch(() => null)) as
        | AuthPasskey[]
        | { error?: { message?: string } | string; message?: string }
        | null;

      if (!response.ok) {
        const errorMessage = Array.isArray(payload)
          ? null
          : typeof payload?.error === "string"
            ? payload.error
            : payload?.error?.message || payload?.message;
        throw new Error(errorMessage ?? "Failed to load passkeys.");
      }

      return Array.isArray(payload) ? payload : [];
    },
    async update(options: { id: string; name: string }) {
      if (isDevAuthShimEnabled()) {
        throw new Error(
          "Passkeys are unavailable in npm run dev. Use npm run preview to test the real auth flow."
        );
      }

      const response = await fetch(
        getAuthEndpointUrl("/passkey/update-passkey"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(options),
        }
      );

      const payload = (await response.json().catch(() => null)) as {
        passkey?: AuthPasskey;
        error?: { message?: string } | string;
        message?: string;
      } | null;

      if (!response.ok || !payload?.passkey) {
        const errorMessage =
          typeof payload?.error === "string"
            ? payload.error
            : payload?.error?.message || payload?.message;
        throw new Error(errorMessage ?? "Failed to rename passkey.");
      }

      return payload.passkey;
    },
    async remove(id: string) {
      if (isDevAuthShimEnabled()) {
        throw new Error(
          "Passkeys are unavailable in npm run dev. Use npm run preview to test the real auth flow."
        );
      }

      const response = await fetch(
        getAuthEndpointUrl("/passkey/delete-passkey"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        }
      );

      const payload = (await response.json().catch(() => null)) as {
        status?: boolean;
        error?: { message?: string } | string;
        message?: string;
      } | null;

      if (!response.ok || !payload?.status) {
        const errorMessage =
          typeof payload?.error === "string"
            ? payload.error
            : payload?.error?.message || payload?.message;
        throw new Error(errorMessage ?? "Failed to remove passkey.");
      }
    },
  },
};
