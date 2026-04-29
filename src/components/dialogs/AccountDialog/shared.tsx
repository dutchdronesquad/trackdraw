import { LogIn } from "lucide-react";

export function AccountDialogError({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }

  return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-3.5 py-3 text-sm text-rose-600 dark:text-rose-300">
      {error}
    </div>
  );
}

export function AccountDialogLoading() {
  return <p className="text-muted-foreground text-sm">Loading account...</p>;
}

export function AccountDialogNotSignedIn() {
  return (
    <div className="border-border/60 bg-background/70 rounded-2xl border p-5">
      <div className="flex items-start gap-3">
        <span className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
          <LogIn className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Sign in to manage your account</p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Use your email to access cloud-backed account settings and profile
            details.
          </p>
        </div>
      </div>
    </div>
  );
}
