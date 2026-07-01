export const banReasonCodes = [
  "spam",
  "harassment",
  "tos_violation",
  "fraudulent_content",
  "security_risk",
  "other",
] as const;

export type BanReasonCode = (typeof banReasonCodes)[number];

export function isBanReasonCode(value: unknown): value is BanReasonCode {
  return (
    typeof value === "string" && banReasonCodes.includes(value as BanReasonCode)
  );
}

export function getBanReasonLabel(code: BanReasonCode) {
  switch (code) {
    case "spam":
      return "Spam or abuse";
    case "harassment":
      return "Harassment or abusive behavior";
    case "tos_violation":
      return "Terms of service violation";
    case "fraudulent_content":
      return "Fraudulent or malicious content";
    case "security_risk":
      return "Security risk";
    case "other":
      return "Other";
  }
}
