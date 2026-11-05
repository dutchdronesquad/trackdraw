import { AsyncLocalStorage } from "node:async_hooks";
import { env } from "cloudflare:workers";

export const measurements = new AsyncLocalStorage();

// Measure real local D1 metadata, including statements issued by existing services.
export async function getDatabase() {
  const meter = measurements.getStore();
  function statement(sql) {
    let raw = env.DB.prepare(sql);
    async function execute(method) {
      const result = await raw[method]();
      if (meter) {
        meter.statements++;
        meter.rowsRead += result.meta.rows_read ?? 0;
        meter.rowsWritten += result.meta.rows_written ?? 0;
        meter.bindingBytes += new TextEncoder().encode(
          JSON.stringify(result.results ?? [])
        ).length;
      }
      return result;
    }
    return {
      bind(...args) {
        raw = raw.bind(...args);
        return this;
      },
      async first() {
        return (await execute("all")).results[0] ?? null;
      },
      all() {
        return execute("all");
      },
      run() {
        return execute("run");
      },
    };
  }
  return { prepare: statement };
}

export function meter() {
  return {
    statements: 0,
    rowsRead: 0,
    rowsWritten: 0,
    bindingBytes: 0,
    doCalls: 0,
  };
}
