import { cleanupExpiredApiKeys } from "@/lib/server/api-key-retention";
import { cleanupExpiredEmbedReferrers } from "@/lib/server/embed-referrer-retention";
import { cleanupExpiredProductEvents } from "@/lib/server/product-event-retention";
import { cleanupExpiredShares } from "@/lib/server/share-retention";

type CleanupPreparedStatement = {
  bind(...values: unknown[]): CleanupPreparedStatement;
  run<T = unknown>(): Promise<T>;
};

type CleanupDatabase = {
  prepare(query: string): CleanupPreparedStatement;
};

export type ScheduledCleanupTaskName =
  "shares" | "api_keys" | "product_events" | "embed_referrers";

export type ScheduledCleanupTask = {
  name: ScheduledCleanupTaskName;
  run: () => Promise<unknown>;
};

type ScheduledCleanupContext = {
  cron: string;
  scheduledTime: number;
};

type ScheduledCleanupLogger = Pick<Console, "error" | "log">;

const MAX_ERROR_MESSAGE_LENGTH = 200;
const EMPTY_ERROR_MESSAGE = "Cleanup task failed without an error message";

type ScheduledCleanupTaskSuccess = {
  event: "scheduled_cleanup_task";
  message: "Scheduled cleanup task completed";
  task: ScheduledCleanupTaskName;
  status: "success";
  deleted_rows: number | null;
  duration_ms: number;
  cron: string;
  scheduled_at: string;
};

type ScheduledCleanupTaskFailure = {
  event: "scheduled_cleanup_task";
  message: "Scheduled cleanup task failed";
  task: ScheduledCleanupTaskName;
  status: "failure";
  deleted_rows: null;
  duration_ms: number;
  cron: string;
  scheduled_at: string;
  error_name: string;
  error_message: string;
};

export type ScheduledCleanupTaskResult =
  ScheduledCleanupTaskSuccess | ScheduledCleanupTaskFailure;

export type ScheduledCleanupReport = {
  event: "scheduled_cleanup_summary";
  message: "Scheduled cleanup completed";
  status: "success" | "partial_failure" | "failure";
  task_count: number;
  succeeded_tasks: number;
  failed_tasks: number;
  deleted_rows: number;
  cron: string;
  scheduled_at: string;
  tasks: ScheduledCleanupTaskResult[];
};

export class ScheduledCleanupError extends Error {
  readonly report: ScheduledCleanupReport;

  constructor(report: ScheduledCleanupReport) {
    super(`${report.failed_tasks} scheduled cleanup task(s) failed`);
    this.name = "ScheduledCleanupError";
    this.report = report;
  }
}

export function createScheduledCleanupTasks(
  db: CleanupDatabase
): ScheduledCleanupTask[] {
  return [
    { name: "shares", run: () => cleanupExpiredShares(db) },
    { name: "api_keys", run: () => cleanupExpiredApiKeys(db) },
    {
      name: "product_events",
      run: () => cleanupExpiredProductEvents(db),
    },
    {
      name: "embed_referrers",
      run: () => cleanupExpiredEmbedReferrers(db),
    },
  ];
}

function getScheduledAt(scheduledTime: number) {
  const date = new Date(scheduledTime);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "unknown";
}

function getDeletedRows(result: unknown) {
  if (typeof result !== "object" || result === null || !("meta" in result)) {
    return null;
  }

  const { meta } = result;
  if (typeof meta !== "object" || meta === null || !("changes" in meta)) {
    return null;
  }

  return typeof meta.changes === "number" && Number.isInteger(meta.changes)
    ? meta.changes
    : null;
}

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    const normalizedMessage = error.message.replace(/\s+/g, " ").trim();
    return {
      error_name: error.name,
      error_message:
        normalizedMessage.slice(0, MAX_ERROR_MESSAGE_LENGTH) ||
        EMPTY_ERROR_MESSAGE,
    };
  }

  return {
    error_name: "UnknownError",
    error_message: "Cleanup task rejected with a non-Error value",
  };
}

export async function runScheduledCleanup(
  context: ScheduledCleanupContext,
  tasks: ScheduledCleanupTask[],
  {
    logger = console,
    now = Date.now,
  }: {
    logger?: ScheduledCleanupLogger;
    now?: () => number;
  } = {}
) {
  const scheduledAt = getScheduledAt(context.scheduledTime);
  const results = await Promise.all(
    tasks.map(async (task): Promise<ScheduledCleanupTaskResult> => {
      const startedAt = now();

      try {
        const result = await task.run();
        return {
          event: "scheduled_cleanup_task",
          message: "Scheduled cleanup task completed",
          task: task.name,
          status: "success",
          deleted_rows: getDeletedRows(result),
          duration_ms: Math.max(0, now() - startedAt),
          cron: context.cron,
          scheduled_at: scheduledAt,
        };
      } catch (error) {
        return {
          event: "scheduled_cleanup_task",
          message: "Scheduled cleanup task failed",
          task: task.name,
          status: "failure",
          deleted_rows: null,
          duration_ms: Math.max(0, now() - startedAt),
          cron: context.cron,
          scheduled_at: scheduledAt,
          ...getErrorDetails(error),
        };
      }
    })
  );

  for (const result of results) {
    const serializedResult = JSON.stringify(result);
    if (result.status === "failure") {
      logger.error(serializedResult);
    } else {
      logger.log(serializedResult);
    }
  }

  const failedTasks = results.filter(
    (result) => result.status === "failure"
  ).length;
  const succeededTasks = results.length - failedTasks;
  const report: ScheduledCleanupReport = {
    event: "scheduled_cleanup_summary",
    message: "Scheduled cleanup completed",
    status:
      failedTasks === 0
        ? "success"
        : succeededTasks === 0
          ? "failure"
          : "partial_failure",
    task_count: results.length,
    succeeded_tasks: succeededTasks,
    failed_tasks: failedTasks,
    deleted_rows: results.reduce(
      (total, result) => total + (result.deleted_rows ?? 0),
      0
    ),
    cron: context.cron,
    scheduled_at: scheduledAt,
    tasks: results,
  };

  const serializedReport = JSON.stringify(report);
  if (failedTasks > 0) {
    logger.error(serializedReport);
    throw new ScheduledCleanupError(report);
  }

  logger.log(serializedReport);
  return report;
}
