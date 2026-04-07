"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Cloud,
  Fingerprint,
  KeyRound,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient, isDevAuthShimEnabled } from "@/lib/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [pending, setPending] = useState(false);
  const [passkeyPending, setPasskeyPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passkeySupported, setPasskeySupported] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (typeof PublicKeyCredential === "undefined") {
      setPasskeySupported(false);
      return;
    }

    setPasskeySupported(true);
    void authClient.preloadPasskeyAutoFill().catch(() => {});
  }, []);

  const handleMagicLinkSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      await authClient.signIn.magicLink({
        email,
        callbackURL: "/studio",
        newUserCallbackURL: "/studio",
      });

      setSuccess("Check your email for a sign-in link.");
    } catch (authError) {
      setError(
        authError instanceof Error ? authError.message : "Failed to sign in"
      );
    } finally {
      setPending(false);
    }
  };

  const handlePasskeySignIn = async () => {
    setPasskeyPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await authClient.signIn.passkey();
      if (response?.error) {
        const rawMessage =
          typeof response.error.message === "string"
            ? response.error.message
            : "";
        const normalizedMessage = rawMessage.toLowerCase();

        if (normalizedMessage.includes("passkey not found")) {
          throw new Error(
            "We couldn’t match that passkey to your TrackDraw account. Try another passkey or use your email sign-in link."
          );
        }

        throw new Error(rawMessage || "Failed to sign in.");
      }
      window.location.href = "/studio";
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Failed to sign in with passkey."
      );
    } finally {
      setPasskeyPending(false);
    }
  };

  return (
    <main className="bg-background text-foreground relative min-h-screen overflow-hidden">
      <div className="bg-brand-primary/10 absolute top-16 left-1/2 hidden h-72 w-72 -translate-x-[135%] rounded-full blur-3xl sm:block" />
      <div className="bg-brand-secondary/10 absolute right-0 bottom-10 hidden h-80 w-80 translate-x-1/4 rounded-full blur-3xl sm:block" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center rounded-sm opacity-90 transition-opacity hover:opacity-100"
            aria-label="Go to homepage"
          >
            <span className="relative block h-8 w-36 sm:h-9 sm:w-40">
              <Image
                src="/assets/brand/trackdraw-logo-mono-lightbg.svg"
                alt="TrackDraw"
                fill
                priority
                unoptimized
                className="object-contain dark:hidden"
                draggable={false}
              />
              <Image
                src="/assets/brand/trackdraw-logo-mono-darkbg.svg"
                alt="TrackDraw"
                fill
                priority
                unoptimized
                className="hidden object-contain dark:block"
                draggable={false}
              />
            </span>
          </Link>

          <Link
            href="/studio"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Back to Studio
          </Link>
        </header>

        <div className="flex flex-1 items-center py-6 sm:py-10">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,28rem)] lg:gap-14">
            <section className="hidden max-w-2xl lg:block">
              <p className="text-muted-foreground flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase">
                <span className="bg-muted-foreground/50 size-1 rounded-full" />
                TrackDraw account
              </p>

              <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Pick up your TrackDraw work wherever you are.
              </h1>

              <p className="text-muted-foreground mt-5 max-w-xl text-sm leading-7 sm:text-[15px]">
                Access your layouts across devices, keep shared tracks tied to
                your account, and jump back in with a simple email link.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="border-border/60 bg-card/70 rounded-2xl border px-4 py-4 backdrop-blur-sm">
                  <Cloud className="text-brand-primary size-4" />
                  <p className="mt-3 text-sm font-medium">Across devices</p>
                  <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                    Pick work back up on another device without changing the
                    editor flow.
                  </p>
                </div>
                <div className="border-border/60 bg-card/70 rounded-2xl border px-4 py-4 backdrop-blur-sm">
                  <ShieldCheck className="text-brand-secondary size-4" />
                  <p className="mt-3 text-sm font-medium">Ownership</p>
                  <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                    Give shared layouts and future account features a clear
                    home.
                  </p>
                </div>
                <div className="border-border/60 bg-card/70 rounded-2xl border px-4 py-4 backdrop-blur-sm">
                  <KeyRound className="text-foreground size-4" />
                  <p className="mt-3 text-sm font-medium">
                    Magic link fallback
                  </p>
                  <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                    Use a passkey when available, or fall back to a sign-in link
                    sent to your email.
                  </p>
                </div>
              </div>
            </section>

            <section className="border-border/70 bg-card/92 relative rounded-3xl border p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:rounded-[1.75rem] sm:p-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Sign in
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Sign in with a passkey on this device, or use your email to
                  receive a magic link without a password.
                </p>
              </div>

              {success ? (
                <div className="mt-6 space-y-4 sm:mt-7" role="status">
                  <div className="border-border/60 bg-background/55 rounded-2xl border px-4 py-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
                        <MailCheck className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-foreground text-sm font-medium">
                          Check your inbox
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                          Your one-time sign-in link was sent to{" "}
                          <span className="text-foreground font-medium">
                            {email}
                          </span>
                          . Open it on this device, or another one, to continue.
                          If it does not show up soon, check your spam folder.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-border/60 bg-background/55 rounded-2xl border px-3.5 py-3">
                    <p className="text-foreground text-sm font-medium">
                      How magic link sign-in works
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                      Each email contains a one-time sign-in link. No password
                      setup, just open the link and TrackDraw signs you in.
                    </p>
                  </div>

                  <Button
                    type="button"
                    className="h-11 w-full"
                    onClick={() => {
                      setSuccess(null);
                      setError(null);
                    }}
                  >
                    Use a different email
                  </Button>
                </div>
              ) : (
                <form
                  className="mt-6 space-y-4 sm:mt-7"
                  onSubmit={handleMagicLinkSignIn}
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full"
                    disabled={
                      passkeyPending ||
                      pending ||
                      passkeySupported !== true ||
                      isDevAuthShimEnabled()
                    }
                    aria-busy={passkeyPending}
                    onClick={handlePasskeySignIn}
                  >
                    <Fingerprint className="mr-2 size-4" />
                    {passkeyPending
                      ? "Opening passkey…"
                      : "Sign in with passkey"}
                  </Button>

                  <div className="flex items-center gap-3">
                    <div className="bg-border h-px flex-1" />
                    <span className="text-muted-foreground text-xs font-medium uppercase">
                      or
                    </span>
                    <div className="bg-border h-px flex-1" />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email webauthn"
                      required
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (emailError) setEmailError(false);
                      }}
                      onBlur={(event) =>
                        setEmailError(
                          event.target.value.length > 0 &&
                            !event.target.validity.valid
                        )
                      }
                      aria-invalid={emailError || undefined}
                      className="dark:bg-background/80 h-11 rounded-xl px-3.5"
                      placeholder="you@example.com"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="h-11 w-full"
                    disabled={pending || passkeyPending}
                    aria-busy={pending}
                  >
                    {pending ? "Sending link…" : "Email me a sign-in link"}
                  </Button>

                  {passkeySupported === false ? (
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      This browser does not currently support passkeys here, so
                      use the magic link fallback.
                    </p>
                  ) : null}
                </form>
              )}

              {error ? (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/8 px-3.5 py-3 text-sm text-rose-600 dark:text-rose-300"
                >
                  {error}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
