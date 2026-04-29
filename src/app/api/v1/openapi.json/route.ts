import { NextResponse } from "next/server";
import { trackdrawOpenApiSchema } from "@/lib/api/openapi";

export function GET() {
  return NextResponse.json(trackdrawOpenApiSchema, {
    headers: {
      "cache-control": "public, max-age=300",
    },
  });
}
