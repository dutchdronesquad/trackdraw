import { handleMcpRequest } from "@/lib/server/mcp/handler";

export const dynamic = "force-dynamic";

export const POST = handleMcpRequest;
export const GET = handleMcpRequest;
export const DELETE = handleMcpRequest;
export const PUT = handleMcpRequest;
export const PATCH = handleMcpRequest;
export const OPTIONS = handleMcpRequest;
