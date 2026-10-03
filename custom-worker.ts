import type { AccountDeletionMediaBucket } from "./src/lib/server/account-deletion";
import {
  createPlunkMailer,
  type PlunkEnvironment,
} from "./src/lib/email/plunk-client";
// @ts-ignore `.open-next/worker.js` is generated at build time
import { default as handler } from "./.open-next/worker.js";
import { getEarlyWorkerResponse } from "./src/lib/server/request-guards";
import {
  createScheduledCleanupTasks,
  runScheduledCleanup,
} from "./src/lib/server/scheduled-cleanup";
import { addInternalCountryHeader } from "./src/lib/server/request-country";

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run<T = unknown>(): Promise<T>;
};

type D1Database = {
  prepare(query: string): D1PreparedStatement;
};

type WorkerEnv = PlunkEnvironment & {
  DB: D1Database;
  MEDIA_BUCKET?: AccountDeletionMediaBucket;
};

type ScheduledController = {
  cron: string;
  scheduledTime: number;
};

type WorkerExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

const worker = {
  ...handler,

  fetch(request: Request, env: WorkerEnv, ctx: WorkerExecutionContext) {
    const earlyResponse = getEarlyWorkerResponse(request);
    if (earlyResponse) return earlyResponse;

    if (new URL(request.url).pathname === "/api/localization-demand") {
      request = addInternalCountryHeader(request);
    }
    return handler.fetch(request, env, ctx);
  },

  async scheduled(controller: ScheduledController, env: WorkerEnv) {
    await runScheduledCleanup(
      controller,
      createScheduledCleanupTasks(
        env.DB,
        createPlunkMailer(env),
        env.MEDIA_BUCKET
      )
    );
  },
};

export default worker;
