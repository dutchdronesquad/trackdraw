// @ts-ignore `.open-next/worker.js` is generated at build time
import { default as handler } from "./.open-next/worker.js";
import { cleanupExpiredApiKeys } from "./src/lib/server/api-key-retention";
import { cleanupExpiredShares } from "./src/lib/server/share-retention";

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

  async scheduled(
    _controller: ScheduledController,
    env: WorkerEnv,
    ctx: WorkerExecutionContext
  ) {
    ctx.waitUntil(
      Promise.all([cleanupExpiredShares(env.DB), cleanupExpiredApiKeys(env.DB)])
    );
  },
};

export default worker;
