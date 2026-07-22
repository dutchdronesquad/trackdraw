// @ts-ignore `.open-next/worker.js` is generated at build time
import { default as handler } from "./.open-next/worker.js";
import { getEarlyWorkerResponse } from "./src/lib/server/request-guards";
import {
  createScheduledCleanupTasks,
  runScheduledCleanup,
} from "./src/lib/server/scheduled-cleanup";

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  run<T = unknown>(): Promise<T>;
};

type D1Database = {
  prepare(query: string): D1PreparedStatement;
};

type WorkerEnv = {
  DB: D1Database;
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

    return handler.fetch(request, env, ctx);
  },

  async scheduled(controller: ScheduledController, env: WorkerEnv) {
    await runScheduledCleanup(controller, createScheduledCleanupTasks(env.DB));
  },
};

export default worker;
