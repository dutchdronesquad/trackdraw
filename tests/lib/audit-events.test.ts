import { describe, expect, it } from "vitest";
import {
  auditEventTitleKeys,
  auditEventTypes,
  getAuditEventCategory,
} from "@/lib/audit-events";

describe("audit event contract", () => {
  it("classifies every registered event and gives it a display title", () => {
    for (const eventType of Object.values(auditEventTypes)) {
      expect(getAuditEventCategory(eventType)).toMatch(
        /Account|Credentials|Projects|Gallery|Share|Privacy|System/
      );
      expect(auditEventTitleKeys[eventType]).toBeTruthy();
    }
  });
});
