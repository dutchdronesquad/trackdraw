# Connecting to TrackDraw MCP

Connect your AI assistant to TrackDraw to inspect saved tracks, prepare material lists, compare layouts, create new tracks and review changes before saving them.

## Quick start

MCP lets an AI assistant work with TrackDraw through a conversation: ask for a material list, compare layouts, create a track from your available obstacles, or preview changes to a saved track. You do not need to write code or generate an API key.

These instructions use `https://trackdraw.app/api/mcp`. Client availability depends on your assistant and workspace settings. See the [compatibility matrix](mcp-validation.md#compatibility-matrix) for recorded client tests.

Before connecting, sign in to [TrackDraw](https://trackdraw.app) and save a project to your account if you want the assistant to read it. A project stored only in your browser is not available through MCP.

Use these settings in a client that supports remote MCP with OAuth:

| Setting                       | Value                                                                  |
| ----------------------------- | ---------------------------------------------------------------------- |
| Connection name               | `TrackDraw`                                                            |
| Server URL                    | `https://trackdraw.app/api/mcp`                                        |
| Transport, if requested       | Streamable HTTP                                                        |
| Authentication                | OAuth, using automatic discovery and Dynamic Client Registration (DCR) |
| API key / manual bearer token | None; sign in through the browser authorization flow                   |

Use the complete `/api/mcp` URL without query parameters. It is a protocol endpoint, not a page to open in a browser. Do not substitute `/api/v1`, `/api/auth` or `/sse`. For a different deployment, use its configured origin with the same `/api/mcp` path.

### ChatGPT

The steps below follow the [official OpenAI connection guide](https://developers.openai.com/plugins/deploy/connect-chatgpt) and [plugin quickstart](https://developers.openai.com/plugins/quickstart), checked October 21, 2026. Account and workspace policies control access to custom MCP servers; if the option is missing, check with your workspace administrator.

1. Open **Plugins** in ChatGPT, select **+**, then **Add custom MCP server**.
2. Name it **TrackDraw**, enter `https://trackdraw.app/api/mcp` as the server URL, and choose **OAuth** authentication.
3. Review the warning and select **Create as a plugin**. Complete the TrackDraw browser sign-in and consent when prompted, checking the account, callback host and requested permissions.
4. Install the resulting plugin from your personal plugins.
5. Start a new **Work** chat, type `@` and select **TrackDraw**.
6. Ask: “Check which TrackDraw account is connected and what you can do. Do not change anything.” The assistant should show the connected account and available permissions.
7. Ask: “List my saved TrackDraw projects, including their IDs. Do not change anything.” With project-read permission, the assistant should show your saved cloud projects.

A successful setup returns live account/project results, including an empty list when there are no cloud projects. A conversational answer without a tool call does not verify the connection.

### Claude (web and Desktop)

These steps follow the [official Claude custom connector guide](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp), checked October 21, 2026.

1. Open **Customize → Connectors**, then **+ Add → Add custom connector**.
2. Name it **TrackDraw**, enter `https://trackdraw.app/api/mcp`, and select **Continue**.
3. Review the detected OAuth settings. Choose **Sign in now** and, under **OAuth client**, **Register automatically**. Use automatic registration instead of Claude's published identity. Leave fixed request headers empty.
4. Finish with **Add** and **Connect** if shown. Complete TrackDraw sign-in and review the account and permissions before allowing access.
5. In a new conversation, open **+ → Connectors** and enable **TrackDraw**.
6. Try the two read-only account/project prompts from the ChatGPT section. Check that the account and project results match your TrackDraw account.

For Team/Enterprise, an authorized administrator first adds the connector through **Organization settings → Connectors → Add → Custom → Web**; members then connect individually. Remote connectors run through Anthropic's cloud, including on Desktop: use the public HTTPS endpoint, not localhost or a Desktop local-server configuration.

### Claude Code

For Claude's terminal client, follow the [official Claude Code MCP guide](https://code.claude.com/docs/en/mcp):

```bash
claude mcp add --transport http --scope user trackdraw https://trackdraw.app/api/mcp
```

The user scope makes the connection available across your projects. Start Claude Code, run `/mcp`, select **trackdraw** and follow the authentication flow in your browser. Review TrackDraw consent, then try the same account/project prompts. `claude mcp list` shows connection status; adding the configuration alone does not verify OAuth or tool calls.

### Codex CLI

For a terminal-based assistant, add the same remote endpoint and authorize it through OAuth:

```bash
codex mcp add trackdraw --url https://trackdraw.app/api/mcp
codex mcp login trackdraw --oauth-client-registration dcr
```

Complete TrackDraw sign-in and consent in the browser. Start a Codex session, use `/mcp` to inspect the connection, then try the same two read-only prompts above. The `dcr` option lets the client register automatically with TrackDraw. If your CLI does not recognize the option, check `codex mcp login --help` and the [official Codex MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

### Other MCP clients

Add a **remote HTTP** server using the settings above, then use the client's **Connect**, **Authenticate** or **Sign in** action. Choose a client that supports remote HTTP servers, automatic registration and browser-based OAuth sign-in. Check the [compatibility matrix](mcp-validation.md#compatibility-matrix) for observed client results.

## Things to ask your assistant

Select TrackDraw in your client before sending these prompts. Replace example names with your own project names; if names are ambiguous, select a project by its returned ID.

| Goal                 | Example prompt                                                                                                                                                     | What to expect                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Check the connection | “Which TrackDraw account is connected, and what permissions do you have?”                                                                                          | The connected account and what the assistant is allowed to do.                                         |
| Prepare materials    | “What materials do we need for my most recently updated cloud track? Include sizes, quantities and the setup estimate.”                                            | A material list and setup estimate; missing measurements are not guessed.                              |
| Compare layouts      | “List my tracks so I can select two. Then compare their route length, obstacle counts and setup estimates.”                                                        | A comparison of the two tracks you select; no changes are saved.                                       |
| Create a layout      | “Create a new 30 × 20 metre track with four gates, two flags and six cones, and no other obstacles. Use the TrackDraw catalog and give me the Studio link.”        | A separate project and Studio link to inspect the layout, with any unchecked constraints reported.     |
| Preview an edit      | “In my Club practice project, move gate-1 two metres to the right. Show me the proposed change and validation feedback, and wait for approval before applying it.” | A preview of the proposed change; saving waits for your approval.                                      |
| Recover an MCP edit  | “List the recoverable versions of Club practice. Preview restoring the version before the last MCP edit, and wait for my approval.”                                | A choice of recoverable versions and a restore preview; recovery also retains the version it replaces. |

## Permissions and your projects

Review the permissions on the TrackDraw consent page before connecting. The standard connection requests account information, reading saved projects, creating tracks and applying reviewed edits.

- Read access covers **all current and future owned active cloud projects**. Projects saved only in your browser stay on your device; archived projects are unavailable.
- Creating a track adds a separate project that you can open and adjust in Studio.
- Edits require a preview and your approval before saving. You can move, rotate and rename existing unlocked items; use Studio for other changes.
- If the project changes after a preview, request a fresh preview. Previously applied MCP edits have recoverable versions.
- MCP cannot delete projects, publish tracks or change sharing.

Connect only to an app you trust. Check its identifier and callback host on the consent page as well as its name. Your assistant handles received information under its own policies.

### Disconnect an assistant

To stop access, open **Connected apps** in TrackDraw account settings or [manage connected apps](https://trackdraw.app/mcp/connections) and select **Disconnect**. This revokes the app's tokens, including renewable access. Removing the plugin from an assistant is not a substitute for checking TrackDraw's connected apps.

## Setup troubleshooting

| Symptom                                                    | What to check                                                                                                                                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint returns 404                                       | Use the complete `https://trackdraw.app/api/mcp` URL. If it still returns 404, report the unavailable endpoint to TrackDraw.                                                                                        |
| Browser shows an error when opening the MCP URL            | Configure that URL in the assistant instead. MCP uses authenticated protocol requests; browser navigation does not test the connection.                                                                             |
| Registration fails or asks for credentials you do not have | Choose OAuth and automatic registration. Do not enter a REST API key or invent a client ID or secret.                                                                                                               |
| Sign-in or consent expires                                 | Restart connection from the assistant and complete sign-in and consent on the same TrackDraw environment.                                                                                                           |
| Connected, but no projects appear                          | Check the authorized account and environment, project-read permission, and whether the project is saved to the cloud. Archived projects and browser-only projects are unavailable.                                  |
| Read tools work, but create/edit tools are missing         | Reconnect and explicitly approve the needed permissions. Existing grants are not expanded by refreshing a token.                                                                                                    |
| ChatGPT still shows an old tool list                       | Open its custom connection in Plugins, select Refresh, then start a new conversation, following the [official refresh instructions](https://developers.openai.com/plugins/deploy/connect-chatgpt#refresh-metadata). |
| An edit conflicts with a newer save                        | Read the current project again and request a fresh preview. Do not force an older proposal over newer work.                                                                                                         |
| HTTP 429                                                   | Wait for `Retry-After`; reconnecting does not reset the hourly request budget.                                                                                                                                      |
| HTTP 503 / Cloudflare 1102                                 | The server could not complete the request. Try again later; if it persists, report the failing tool to TrackDraw. Changing OAuth credentials does not resolve a server resource limit.                              |

For protocol details, tool schemas and contributor testing, see the [MCP validation and technical reference](mcp-validation.md#technical-reference).
