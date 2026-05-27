import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/lib/seo";

describe("seo helpers", () => {
  it("escapes JSON-LD characters that can break out of script tags", () => {
    const serialized = serializeJsonLd({
      name: '</script><script>alert("xss")</script>',
      description: "A & B > C",
    });

    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003c/script\\u003e");
    expect(serialized).toContain("\\u0026");
    expect(serialized).toContain("\\u003e");
  });
});
