import "server-only";

import {
  createPlunkMailer,
  type PlunkMailOptions,
} from "@/lib/email/plunk-client";

export function isPlunkConfigured() {
  return createPlunkMailer(process.env).isConfigured();
}

export function sendPlunkMail(options: PlunkMailOptions) {
  return createPlunkMailer(process.env).send(options);
}
