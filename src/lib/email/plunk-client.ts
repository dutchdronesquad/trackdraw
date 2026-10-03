const PLUNK_API_URL = "https://next-api.useplunk.com/v1/send";

type PlunkRecipient = {
  address: string;
  name?: string | null;
};

export type PlunkMailOptions = {
  to: PlunkRecipient;
  subject: string;
  htmlBody: string;
  textBody: string;
  emailType?: "auth-magic-link" | "account-retention";
  idempotencyKey?: string;
};

export type PlunkEnvironment = {
  PLUNK_API_KEY?: string;
  PLUNK_FROM_EMAIL?: string;
  PLUNK_FROM_NAME?: string;
  PLUNK_REPLY_TO_EMAIL?: string;
};

type PlunkConfig = {
  apiKey: string | null;
  fromEmail: string | null;
  fromName: string;
  replyToEmail: string | null;
};

export type TransactionalMailer = {
  isConfigured(): boolean;
  send(options: PlunkMailOptions): Promise<void>;
};

// Both runtimes provide configuration explicitly; this module reads no secrets
// from globals and has no Next.js-specific dependencies.
export function createPlunkMailer(env: PlunkEnvironment): TransactionalMailer {
  const config = {
    apiKey: env.PLUNK_API_KEY?.trim() || null,
    fromEmail: env.PLUNK_FROM_EMAIL?.trim() || null,
    fromName: env.PLUNK_FROM_NAME?.trim() || "TrackDraw",
    replyToEmail: env.PLUNK_REPLY_TO_EMAIL?.trim() || null,
  };
  return {
    isConfigured: () => Boolean(config.apiKey && config.fromEmail),
    send: (options) => sendPlunkMail(options, config),
  };
}

async function sendPlunkMail(options: PlunkMailOptions, config: PlunkConfig) {
  if (!config.apiKey) {
    throw new Error("Missing Plunk configuration. Set PLUNK_API_KEY.");
  }
  if (!config.fromEmail) {
    throw new Error(
      "Missing Plunk sender configuration. Set PLUNK_FROM_EMAIL to a verified sender address."
    );
  }

  const payload = {
    to: options.to.address,
    subject: options.subject,
    body: options.htmlBody,
    name: config.fromName,
    ...(config.fromEmail ? { from: config.fromEmail } : {}),
    ...(config.replyToEmail ? { reply: config.replyToEmail } : {}),
    headers: {
      "X-TrackDraw-Email-Type": options.emailType ?? "auth-magic-link",
    },
  };

  const response = await fetch(PLUNK_API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...(options.idempotencyKey
        ? { "Idempotency-Key": options.idempotencyKey }
        : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });

  if (response.ok) {
    return;
  }

  const errorText = await response.text();
  if (
    response.status === 409 &&
    options.idempotencyKey &&
    wasAlreadySent(errorText, options.idempotencyKey)
  )
    return;
  const plunkHint = errorText.includes("public key")
    ? " Use a Plunk secret/server API key for PLUNK_API_KEY, not a public/browser key."
    : "";
  throw new Error(
    `Plunk send failed with ${response.status}: ${errorText || "unknown error"}${plunkHint}`
  );
}

// A reused key only proves delivery when Plunk confirms the original send succeeded.
function wasAlreadySent(body: string, key: string) {
  try {
    const result: unknown = JSON.parse(body);
    if (typeof result !== "object" || !result || !("error" in result))
      return false;
    const error = result.error;
    if (
      typeof error !== "object" ||
      !error ||
      !("code" in error) ||
      error.code !== "IDEMPOTENCY_KEY_REUSED" ||
      !("details" in error)
    )
      return false;
    const details = error.details;
    return (
      typeof details === "object" &&
      details !== null &&
      "originalStatusCode" in details &&
      details.originalStatusCode === 200 &&
      "key" in details &&
      details.key === key
    );
  } catch {
    return false;
  }
}
