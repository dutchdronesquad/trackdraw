import { getEarlyMcpResponse } from "./mcp/request-guards";
import { getMcpDiscoveryResponse } from "./mcp/oauth-metadata";
import type { AccountDeletionMediaBucket } from "./account-deletion";
import {
  createPlunkMailer,
  type PlunkEnvironment,
} from "../email/plunk-client";
import { getEarlyWorkerResponse } from "./request-guards";
import {
  createScheduledCleanupTasks,
  runScheduledCleanup,
} from "./scheduled-cleanup";
import { addInternalCountryHeader } from "./request-country";

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run<T = unknown>(): Promise<T>;
};

type D1Database = {
  prepare(query: string): D1PreparedStatement;
  batch<T>(statements: D1PreparedStatement[]): Promise<{ results: T[] }[]>;
};

type WorkerEnv = PlunkEnvironment & {
  DB: D1Database;
  MEDIA_BUCKET?: AccountDeletionMediaBucket;
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_APP_ENV?: string;
};

type ScheduledController = {
  cron: string;
  scheduledTime: number;
};

type WorkerExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

export function createTrackDrawWorker<
  T extends {
    fetch(
      request: Request,
      env: WorkerEnv,
      ctx: WorkerExecutionContext
    ): Response | Promise<Response>;
  },
>(handler: T) {
  return {
    ...handler,

    fetch(request: Request, env: WorkerEnv, ctx: WorkerExecutionContext) {
      const earlyResponse = getEarlyWorkerResponse(request);
      if (earlyResponse) return earlyResponse;
      const mcpRejection = getEarlyMcpResponse(
        request,
        env.NEXT_PUBLIC_SITE_URL,
        env.NEXT_PUBLIC_APP_ENV
      );
      if (mcpRejection) return mcpRejection;
      const discovery = getMcpDiscoveryResponse(
        request,
        env.NEXT_PUBLIC_SITE_URL
      );
      if (discovery) return discovery;

      if (new URL(request.url).pathname === "/api/localization-demand") {
        request = addInternalCountryHeader(request);
      }
      return handler.fetch(request, env, ctx);
    },

    async scheduled(controller: ScheduledController, env: WorkerEnv) {
      await runScheduledCleanup(
        controller,
        createScheduledCleanupTasks(
          controller,
          env.DB,
          createPlunkMailer(env),
          env.MEDIA_BUCKET
        )
      );
    },
  };
}
