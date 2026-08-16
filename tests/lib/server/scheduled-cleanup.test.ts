import { describe, expect, it, vi } from "vitest";
import {
  ScheduledCleanupError,
  createScheduledCleanupTasks,
  runScheduledCleanup,
  type ScheduledCleanupTask,
} from "@/lib/server/scheduled-cleanup";

vi.mock("server-only", () => ({}));

const scheduledContext = {
  cron: "17 3 * * *",
  scheduledTime: Date.UTC(2026, 6, 23, 3, 17),
};

function createLogger() {
  return {
    log: vi.fn(),
    error: vi.fn(),
  };
}

function parseLogCall(call: unknown[]) {
  return JSON.parse(String(call[0])) as Record<string, unknown>;
}

describe("scheduled cleanup", () => {
  it("runs every retention task and reports each result when one task fails", async () => {
    const logger = createLogger();
    const shares = vi.fn(async () => ({ meta: { changes: 2 } }));
    const apiKeys = vi.fn(async () => {
      throw new Error("D1 API key cleanup failed");
    });
    const productEvents = vi.fn(async () => ({ meta: { changes: 5 } }));
    const tasks: ScheduledCleanupTask[] = [
      { name: "shares", run: shares },
      { name: "api_keys", run: apiKeys },
      { name: "product_events", run: productEvents },
    ];

    const cleanupPromise = runScheduledCleanup(scheduledContext, tasks, {
      logger,
      now: () => 100,
    });

    await expect(cleanupPromise).rejects.toMatchObject({
      name: "ScheduledCleanupError",
      report: {
        status: "partial_failure",
        task_count: 3,
        succeeded_tasks: 2,
        failed_tasks: 1,
        deleted_rows: 7,
      },
    });
    expect(shares).toHaveBeenCalledOnce();
    expect(apiKeys).toHaveBeenCalledOnce();
    expect(productEvents).toHaveBeenCalledOnce();

    const logs = [
      ...logger.log.mock.calls.map(parseLogCall),
      ...logger.error.mock.calls.map(parseLogCall),
    ];
    expect(
      logs.filter((entry) => entry.event === "scheduled_cleanup_task")
    ).toHaveLength(3);
    expect(logs).toContainEqual(
      expect.objectContaining({
        event: "scheduled_cleanup_task",
        task: "api_keys",
        status: "failure",
        error_name: "Error",
        error_message: "D1 API key cleanup failed",
      })
    );
    expect(logs).toContainEqual(
      expect.objectContaining({
        event: "scheduled_cleanup_summary",
        status: "partial_failure",
      })
    );
  });

  it("reports a repeated no-op cleanup as a successful idempotent run", async () => {
    const logger = createLogger();
    const shares = vi
      .fn()
      .mockResolvedValueOnce({ meta: { changes: 3 } })
      .mockResolvedValueOnce({ meta: { changes: 0 } });
    const apiKeys = vi.fn(async () => ({ meta: { changes: 0 } }));
    const productEvents = vi.fn(async () => ({ meta: { changes: 0 } }));
    const tasks: ScheduledCleanupTask[] = [
      { name: "shares", run: shares },
      { name: "api_keys", run: apiKeys },
      { name: "product_events", run: productEvents },
    ];

    const firstReport = await runScheduledCleanup(scheduledContext, tasks, {
      logger,
      now: () => 100,
    });
    const secondReport = await runScheduledCleanup(scheduledContext, tasks, {
      logger,
      now: () => 100,
    });

    expect(firstReport).toMatchObject({
      status: "success",
      failed_tasks: 0,
      deleted_rows: 3,
    });
    expect(secondReport).toMatchObject({
      status: "success",
      failed_tasks: 0,
      deleted_rows: 0,
    });
    expect(shares).toHaveBeenCalledTimes(2);
    expect(apiKeys).toHaveBeenCalledTimes(2);
    expect(productEvents).toHaveBeenCalledTimes(2);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("registers all retention owners in the scheduled task set", async () => {
    const run = vi.fn(async () => ({ meta: { changes: 0 } }));
    const statement = {
      bind: vi.fn(() => statement),
      first: vi.fn(async () => null),
      all: vi.fn(async () => ({ results: [] })),
      run,
    };
    const prepare = vi.fn(() => statement);

    const tasks = createScheduledCleanupTasks({ prepare } as Parameters<
      typeof createScheduledCleanupTasks
    >[0]);

    expect(tasks.map((task) => task.name)).toEqual([
      "shares",
      "api_keys",
      "product_events",
      "embed_referrers",
      "localization_demand",
    ]);
    await Promise.all(tasks.map((task) => task.run()));
    expect(run).toHaveBeenCalledTimes(7);
  });

  it("uses a privacy-safe fallback for non-Error rejections", async () => {
    const logger = createLogger();
    const task: ScheduledCleanupTask = {
      name: "shares",
      run: vi.fn(async () => Promise.reject("sensitive rejection value")),
    };

    await expect(
      runScheduledCleanup(scheduledContext, [task], {
        logger,
        now: () => 100,
      })
    ).rejects.toBeInstanceOf(ScheduledCleanupError);

    const errorLogs = logger.error.mock.calls.map(parseLogCall);
    expect(errorLogs).toContainEqual(
      expect.objectContaining({
        event: "scheduled_cleanup_task",
        error_name: "UnknownError",
        error_message: "Cleanup task rejected with a non-Error value",
      })
    );
    expect(JSON.stringify(errorLogs)).not.toContain(
      "sensitive rejection value"
    );
  });

  it("does not expire raw events while metric backfill is incomplete", async () => {
    const run = vi.fn(async () => ({}));
    const refreshStatement = {
      bind: vi.fn(() => refreshStatement),
      first: vi.fn(async () => null),
      all: vi.fn(async () => ({ results: [] })),
      run,
    };
    const stateStatement = {
      bind: vi.fn(() => stateStatement),
      first: vi.fn(async () => ({
        measured_since: "2026-01-01",
        last_aggregated_day: "2026-06-30",
      })),
      all: vi.fn(async () => ({ results: [] })),
      run,
    };
    const statements = [
      refreshStatement,
      stateStatement,
      ...Array.from({ length: 7 }, () => ({
        bind: vi.fn(function (this: unknown) {
          return this;
        }),
        first: vi.fn(async () => null),
        all: vi.fn(async () => ({ results: [] })),
        run,
      })),
      {
        bind: vi.fn(function (this: unknown) {
          return this;
        }),
        first: vi.fn(async () => null),
        all: vi.fn(async () => ({ results: [] })),
        run,
      },
      {
        bind: vi.fn(function (this: unknown) {
          return this;
        }),
        first: vi.fn(async () => null),
        all: vi.fn(async () => ({ results: [] })),
        run,
      },
    ];
    const prepare = vi.fn(() => {
      const statement = statements.shift();
      if (!statement) throw new Error("Raw retention should not run");
      return statement;
    });
    const productEventsTask = createScheduledCleanupTasks({
      prepare,
    } as Parameters<typeof createScheduledCleanupTasks>[0]).find(
      (task) => task.name === "product_events"
    );

    await expect(productEventsTask?.run()).rejects.toThrow(
      "complete UTC day(s) left to backfill"
    );
    expect(statements).toHaveLength(0);
  });

  it("normalizes, bounds, and defaults Error messages before logging", async () => {
    const logger = createLogger();
    const tasks: ScheduledCleanupTask[] = [
      {
        name: "shares",
        run: vi.fn(async () => {
          throw new Error(`  D1 cleanup failed\n\t${"x".repeat(250)}  `);
        }),
      },
      {
        name: "api_keys",
        run: vi.fn(async () => {
          throw new Error("  \n\t  ");
        }),
      },
    ];

    await expect(
      runScheduledCleanup(scheduledContext, tasks, {
        logger,
        now: () => 100,
      })
    ).rejects.toBeInstanceOf(ScheduledCleanupError);

    const taskLogs = logger.error.mock.calls
      .map(parseLogCall)
      .filter((entry) => entry.event === "scheduled_cleanup_task");
    const normalizedMessage = String(taskLogs[0].error_message);
    expect(normalizedMessage).toHaveLength(200);
    expect(normalizedMessage).toMatch(/^D1 cleanup failed x+$/);
    expect(normalizedMessage).not.toMatch(/[\r\n\t]/);
    expect(taskLogs[1]).toMatchObject({
      task: "api_keys",
      error_message: "Cleanup task failed without an error message",
    });
  });
});
