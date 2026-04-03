import "server-only";

const PLUNK_API_URL = "https://api.useplunk.com/v1/send";

type PlunkRecipient = {
  address: string;
  name?: string | null;
};

type SendPlunkMailOptions = {
  to: PlunkRecipient;
  subject: string;
  htmlBody: string;
  textBody: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function getPlunkConfig() {
  return {
    apiKey: getRequiredEnv("PLUNK_API_KEY"),
    fromEmail: getRequiredEnv("PLUNK_FROM_EMAIL"),
    fromName: getRequiredEnv("PLUNK_FROM_NAME") ?? "TrackDraw",
    replyToEmail: getRequiredEnv("PLUNK_REPLY_TO_EMAIL"),
  };
}

export function isPlunkConfigured() {
  return Boolean(getPlunkConfig().apiKey);
}

export async function sendPlunkMail(options: SendPlunkMailOptions) {
  const config = getPlunkConfig();
  if (!config.apiKey) {
    throw new Error("Missing Plunk configuration. Set PLUNK_API_KEY.");
  }

  const payload = {
    to: options.to.address,
    subject: options.subject,
    body: options.htmlBody,
    subscribed: false,
    name: config.fromName,
    ...(config.fromEmail ? { from: config.fromEmail } : {}),
    ...(config.replyToEmail ? { reply: config.replyToEmail } : {}),
    headers: {
      "X-TrackDraw-Email-Type": "auth-magic-link",
    },
  };

  const response = await fetch(PLUNK_API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    return;
  }

  const errorText = await response.text();
  const plunkHint = errorText.includes("public key")
    ? " Use a Plunk secret/server API key for PLUNK_API_KEY, not a public/browser key."
    : "";
  throw new Error(
    `Plunk send failed with ${response.status}: ${errorText || "unknown error"}${plunkHint}`
  );
}
