import "server-only";

import {
  createPlunkMailer,
  type PlunkMailOptions,
} from "@/lib/email/plunk-client";

function getPlunkMailer() {
  return createPlunkMailer({
    PLUNK_API_KEY: process.env.PLUNK_API_KEY,
    PLUNK_FROM_EMAIL: process.env.PLUNK_FROM_EMAIL,
    PLUNK_FROM_NAME: process.env.PLUNK_FROM_NAME,
    PLUNK_REPLY_TO_EMAIL: process.env.PLUNK_REPLY_TO_EMAIL,
  });
}

export function isPlunkConfigured() {
  return getPlunkMailer().isConfigured();
}

export function sendPlunkMail(options: PlunkMailOptions) {
  return getPlunkMailer().send(options);
}
