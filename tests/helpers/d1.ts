import { vi } from "vitest";

export type MockD1Statement = {
  sql: string;
  bind: ReturnType<typeof vi.fn>;
  first: ReturnType<typeof vi.fn>;
  all: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
};

export function createD1Statement(result?: {
  all?: unknown;
  first?: unknown;
  run?: unknown;
}): MockD1Statement {
  const statement: MockD1Statement = {
    sql: "",
    bind: vi.fn(() => statement),
    first: vi.fn(async () => result?.first ?? null),
    all: vi.fn(async () => result?.all ?? { results: [] }),
    run: vi.fn(async () => result?.run ?? {}),
  };

  return statement;
}

export function createD1AllStatement(rows: unknown[]) {
  return createD1Statement({ all: { results: rows } });
}

export function installD1Statements(
  prepare: ReturnType<typeof vi.fn>,
  statements: MockD1Statement[]
) {
  prepare.mockImplementation((sql: string) => {
    const statement = statements.shift();
    if (!statement) {
      throw new Error(`Unexpected SQL: ${sql}`);
    }

    statement.sql = sql;
    return statement;
  });
}
