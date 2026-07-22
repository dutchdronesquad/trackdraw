import { describe, expect, it, vi } from "vitest";
import { cleanupExpiredProductEvents } from "@/lib/server/product-event-retention";

describe("product event retention", () => {
  it("removes raw product events after the privacy retention window", async () => {
    const run = vi.fn(async () => ({}));
    const prepare = vi.fn((_sql: string) => ({ run }));

    await cleanupExpiredProductEvents(
      { prepare } as Parameters<typeof cleanupExpiredProductEvents>[0],
      180
    );

    expect(String(prepare.mock.calls[0][0])).toContain("product_events");
    expect(String(prepare.mock.calls[0][0])).toContain("-180 days");
    expect(run).toHaveBeenCalledOnce();
  });
});
