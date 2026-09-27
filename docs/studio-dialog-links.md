# Studio dialog links

Integrations can link to an existing Studio dialog without creating a separate settings page. Use the same path on `https://trackdraw.app` (production) or `https://dev.trackdraw.app` (development).

For API-key setup, link to `/studio?dialog=account&section=api-keys`. Users create a regular TrackDraw API key using the existing form. Do not instruct them to select a `tracks:read` scope: the profile form does not offer that choice. `/dashboard/api-keys` is an administrative screen and must not be used for personal API-key setup.

## Supported targets

| Query                              | Opens                                        |
| ---------------------------------- | -------------------------------------------- |
| `?dialog=account&section=profile`  | Profile                                      |
| `?dialog=account&section=security` | Email and passkeys                           |
| `?dialog=account&section=privacy`  | Analytics preferences                        |
| `?dialog=account&section=api-keys` | Personal API keys                            |
| `?dialog=account&section=danger`   | Account deletion confirmation                |
| `?dialog=projects`                 | Project manager                              |
| `?dialog=new-project`              | New-project dialog                           |
| `?dialog=import`                   | Import dialog                                |
| `?dialog=export`                   | Export dialog                                |
| `?dialog=share`                    | Sharing dialog for the current local project |
| `?dialog=shortcuts`                | Keyboard shortcuts                           |
| `?dialog=feedback`                 | Feedback form                                |
| `?dialog=presets`                  | Layout preset picker                         |
| `?dialog=commands`                 | Command palette                              |

Opening a dialog does not submit its form, generate/reveal an API key, delete an account, replace a track, import/export a file, publish a share, or send feedback. Project-dependent dialogs use the visitor's current Studio project; the URL does not transfer the sender's project. Conflict resolution, profile-completion prompts and item-specific forms are not public link targets.

## Navigation and sign-in

The URL is the source of truth on both desktop and mobile. Opening a dialog from Studio adds a history entry. Browser Back closes it; Forward reopens it. Switching between dialogs or account sections replaces the current entry. Closing a dialog explicitly removes `dialog`, `section`, and the legacy `account` parameter from the current entry, so refresh stays closed. Closing a directly opened link keeps the visitor in Studio. Other query parameters and the URL fragment are preserved.

Refreshing an open dialog restores its requested target. An unknown dialog is ignored; an unknown or missing account section falls back to Profile. Existing `?account=profile`, `security`, `privacy`, `apiKeys`, and `danger` links remain accepted. A `dialog` parameter takes precedence over a legacy `account` parameter.

Account sections retain normal session checks. Signed-out visitors see a sign-in link whose local `callbackURL` includes the requested dialog and section. After successful sign-in, the existing login flow returns to that URL. No key is created automatically and previously generated secrets are not recoverable through these links.

## DDS rollout

After the TrackDraw change is deployed to the environment used by DDS, change the DDS setup URL from `/studio` to `/studio?dialog=account&section=api-keys`. `TrackDrawConnectionController` derives its origin from `services.trackdraw.url`; keep that environment selection. Update the setup guidance to say that this link opens API-key settings. Do not switch a production integration before its TrackDraw environment supports these links.
