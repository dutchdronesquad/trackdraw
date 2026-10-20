// Preserve the SDK's default-validator export while sharing the same CSP-safe
// implementation already supplied explicitly by TrackDraw's MCP server.
export { CfWorkerJsonSchemaValidator as AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker";
