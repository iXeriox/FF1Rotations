# FF1 Rotations Discord Bot

A small, modular Discord.js bot for organising event rotations. Players opt in, administrators select outgoing leaders, and the bot creates even groups while remembering previous teammate pairings to reduce repeat matches.

## Commands

| Command | Who | Purpose |
| --- | --- | --- |
| `/join` | Everyone | Join the player queue. |
| `/leave` | Everyone | Leave the player queue. |
| `/open` | Manage Server | Open the waiting list and enable its join button. |
| `/close` | Manage Server | Close the waiting list and disable new signups. |
| `/addplayer user` | Manage Server | Manually add a member to the open waiting list. |
| `/rotation` | Everyone | View leaders, players, and recorded rounds. |
| `/addleader member` | Manage Server | Give a member the persistent Rotation Leader role. |
| `/removeleader member` | Manage Server | Remove a member's Rotation Leader role. |
| `/group` | Manage Server | Generate groups, publish them, and clear the signup list. |
| `/reset [history]` | Manage Server | Clear signups, optionally also clearing match history. |
| `/commend user` | Everyone | Give one commendation to a teammate from the latest rotation. |
| `/stats user` | Everyone | Show commendations, rotation count, and last rotation time. |
| `/birthday add day month year` | Everyone | Add or update your birthday reminder. |
| `/birthday remove` | Everyone | Delete your saved birthday. |
| `/birthday help` | Everyone | Explain the birthday commands. |
| `/birthdays` | Everyone | Show upcoming birthdays without exposing birth years. |
| `/stream channel channel` | Manage Server | Set the single channel used for all live announcements. |
| `/stream add platform name` | Manage Server | Monitor a TikTok or Twitch user. |
| `/stream remove platform name` | Manage Server | Stop monitoring a streamer. |
| `/stream list` | Manage Server | Show monitored accounts and notification channels. |
| `/stream help` | Manage Server | Explain setup and provider requirements. |

On startup, the bot automatically creates a **Rotation Leader** role and a **Rotations** category containing:

- **#join-rotation** — visible to everyone but read-only, with an embed and button for joining the waiting list. The embed lists queued players in order with Discord-relative wait times, while button confirmations are private.
- **#grouping** — visible to everyone but read-only. Its placeholder embed is replaced with one team embed per leader after `/group`.

Both rotation views use resolved server display names rather than raw Discord mention tokens, so names render consistently on desktop and mobile. The queue uses a numbered, timestamped signup order; grouping uses a polished squad card per leader with a clearly separated leader, roster, and four-player capacity.

The IDs of the generated role, category, channels, and messages are persisted. On restart the bot restores those exact resources, moves its channels back under the Rotations category if necessary, and refreshes both embeds from stored state. It never adopts or overwrites unrelated channels merely because they have the same name; if a managed resource is deleted, the bot creates a replacement.

Leaders are included automatically and never need to join the player queue. After `/group`, all player signups and leaders are cleared and leader roles are removed, ready for the next rotation. Only the immediately previous game's teammate pairings are retained, so the next grouping avoids repeats where possible without permanently penalising older matches. `/reset history:true` can also forget that last game.

Every generated Call of Duty team is capped at four members, including its leader. Each leader therefore supports up to three waiting players. If there are not enough leaders, `/group` explains how many are required and leaves the current signup list untouched.

Each participant may use `/commend` once after a rotation, and the recipient must have been on that participant's latest team. Commendations and participation statistics are retained across rotations and bot restarts.

Waiting lists start closed. An administrator must run `/open` before players can join through either the button or `/join`. `/close` prevents new signups without removing anyone already waiting; players can still use `/leave`. Completing `/group` or using `/reset` closes the list automatically.

Administrators can use `/addplayer user` to add somebody on their behalf while the waiting list is open. Manual additions follow the same duplicate and leader checks as self-service joins, record the time they were added, and immediately refresh the public queue embed.

Birthday reminders are checked at startup and hourly. On a saved birthday, the bot posts a celebratory embed and mention in the configured birthdays channel exactly once that year. The default channel ID is `1545395897347612733`; set `BIRTHDAYS_CHANNEL_ID` to change it.

The bot's Discord status is refreshed hourly. It shows **Rotations: Active** whenever any waiting list is open; otherwise it displays the number of saved birthdays. Opening or closing rotations and adding or removing birthdays refreshes it immediately.

Command and button usage is logged to the console with an ISO timestamp, action/subcommand, user, guild, channel, outcome, and execution time. Failed interactions include the error message, while command option values are deliberately excluded so birthdays and other user-provided values are not leaked into logs.

Set the server's dedicated channel once with `/stream channel`, then add accounts. Live accounts are scanned concurrently every two minutes using lightweight native HTTP requests. A transition to live posts `@everyone`, the streamer name, and a direct stream link in that configured channel. The channel and alert state are persisted, preventing duplicate messages after restarts. TikTok detection uses its public live page and may be affected by TikTok anti-bot changes; Twitch uses the official API and requires `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`. Provider checks are isolated behind adapters so more platforms can be added without changing commands or the scanner.

`/stream` is deliberately visible in Discord's command picker for everyone so it cannot disappear because of Discord's cached command-permission metadata. Its management actions still enforce **Manage Server** permission when executed.

## Setup

1. Install Node.js 20 or newer and run `npm install`.
2. Create an application and bot in the Discord Developer Portal.
3. Copy `.env.example` to `.env`, then add the bot token. The application/client ID is only required by the manual `npm run deploy` command. Set `DISCORD_GUILD_ID` during development for immediate guild command registration.
4. Invite the bot with the `bot` and `applications.commands` scopes. Grant it **Manage Channels**, **Manage Roles**, **View Channels**, **Send Messages**, and **Read Message History**. Keep the bot's role above the generated Rotation Leader role.
5. Run `npm start`. The bot automatically registers or updates all slash commands whenever it connects.

When `DISCORD_GUILD_ID` is set, commands are registered directly in that server. Without it, the bot registers commands directly in every connected server. Both modes make new commands available immediately. On startup, legacy global registrations are removed before the guild commands are synchronized, preventing duplicate commands from appearing. `npm run deploy` remains available for troubleshooting, but normal operation only requires `npm start`.

The default JSON data file is `data/rotations.json`. Set `DATA_FILE` to use another persistent location. Keep that file on a durable volume in production.

## Structure

- `src/commands/` contains one module per command.
- `src/services/grouping.js` contains the grouping and repeat-avoidance algorithm.
- `src/store/rotation-store.js` provides guild-isolated JSON persistence.
- `src/deploy-commands.js` registers commands without coupling deployment to bot startup.

Add another command by exporting its `data` and `execute` members, then including it in `src/commands/index.js`.

## Development

```sh
npm test
npm run check
```
