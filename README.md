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
| `/group` | Manage Server | Generate groups with randomly selected leaders, publish them, and clear signups. |
| `/groupold` | Manage Server | Generate groups using leaders previously selected with `/addleader`. |
| `/lobby code` | Current group leaders | Publish or update the lobby code shown to their latest squad. |
| `/meta mode` | Everyone | Open current community meta loadouts and official balance notes for a selected game mode. |
| `/reset [history]` | Manage Server | Clear signups, optionally also clearing match history. |
| `/commend user` | Everyone | Give one commendation to a teammate from the latest rotation. |
| `/stats user` | Everyone | Show commendations, rotation count, and last rotation time. |
| `/id id` | Everyone | Add or update your Call of Duty ID for `/stats`. |
| `/birthday add day month year` | Everyone | Add or update your birthday reminder. |
| `/birthday remove` | Everyone | Delete your saved birthday. |
| `/birthday help` | Everyone | Explain the birthday commands. |
| `/birthdays` | Everyone | Show upcoming birthdays without exposing birth years. |
| `/stream channel channel` | Manage Server | Set the single channel used for all live announcements. |
| `/stream add platform name [channel]` | Everyone | Add a stream to monitor, optionally with a dedicated alert channel. |
| `/stream remove platform name` | Manage Server | Stop monitoring a streamer. |
| `/stream route platform name [channel]` | Manage Server | Set a per-stream channel, or omit it to restore the server default. |
| `/stream list` | Manage Server | Show monitored accounts and notification channels. |
| `/stream help` | Manage Server | Explain setup and provider requirements. |
| `/dev …` | Developer `375368296347729921` only | Reset rotation UI/state or add synthetic players and leaders for testing. |

On startup, the bot automatically creates a **Rotation Leader** role and a **Rotations** category containing:

- **#join-rotation** — visible to everyone but read-only, with an embed and button for joining the waiting list. The embed lists queued players in order with Discord-relative wait times, while button confirmations are private.
- **#grouping** — visible to everyone but read-only. Its placeholder embed is replaced with one team embed per leader after `/group`.

Both rotation views use resolved server display names rather than raw Discord mention tokens, so names render consistently on desktop and mobile. Each queue entry displays its number and bold player name on the first line, followed by a cleanly separated relative join time. Grouping uses a polished squad card per leader with a clearly separated leader, roster, and four-player capacity.

Waiting-list clicks and other UI updates are serialized per server. If several
members join or leaders update lobby codes at once, each state mutation and embed
refresh completes in order without creating duplicate channels or stale displays.
Managed Discord roles, channels, and messages are cached after setup, so routine
joins, grouping, lobby-code changes, and leader updates avoid repeating the same
Discord API lookups. Destructive development resets invalidate and rebuild only
the resources they replace.

The IDs of the generated role, category, channels, and messages are persisted. On restart the bot restores those exact resources, moves its channels back under the Rotations category if necessary, and refreshes both embeds from stored state. It never adopts or overwrites unrelated channels merely because they have the same name; if a managed resource is deleted, the bot creates a replacement.

Administrators who want to select leaders manually can use `/addleader` followed
by `/groupold`; those leaders are included automatically and do not join the
player queue. The standard `/group` instead picks one random leader from the queued
players for each squad and does not require `/addleader`. Each selected player is
given the **Rotation Leader** role and cached as a current leader. After grouping,
player signups are cleared while all current rotation leaders remain cached for
the completed squads. On the next `/open`, their roles and cached leader entries
are removed so everyone can join the new queue. Cached guild members are updated
without another API lookup, keeping the transition quick. Only the immediately
previous game's teammate pairings are retained, so the next grouping avoids
repeats where possible without permanently penalising older matches.
`/reset history:true` can also forget that last game.

Every generated Call of Duty team is capped at four members, including its leader. Each leader therefore supports up to three waiting players. If there are not enough leaders, `/group` explains how many are required and leaves the current signup list untouched.

After `/group` publishes the squads, each squad leader can run `/lobby code` to
place a join-in-progress code directly on their squad card. A leader can run the
command again to update the code; non-leaders and leaders from older rotations
cannot change the latest grouping display.

Each participant may use `/commend` once after a rotation, and the recipient must have been on that participant's latest team. Commendations and participation statistics are retained across rotations and bot restarts.

Use `/id id:iXeriox#6447986` to save a Call of Duty ID. Whitespace is removed automatically, and the ID is displayed whenever another member selects that Discord user with `/stats`.

Every successful `/id` update also posts a professional announcement mentioning the member in channel `1530580498265538600`. Set `ACTIVISION_IDS_CHANNEL_ID` to use a different channel; if that channel is unavailable, the ID is still saved and the member receives a warning.

Waiting lists start closed. An administrator must run `/open` before players can join through either the button or `/join`. `/close` prevents new signups without removing anyone already waiting; players can still use `/leave`. Completing `/group` or using `/reset` closes the list automatically.

Opening a new waiting-list cycle clears the previous cycle's saved leaders and
removes their **Rotation Leader** roles. Calling `/open` while signups are already
open is a no-op, so it does not remove leaders selected for the active cycle.

Administrators can use `/addplayer user` to add somebody on their behalf while the waiting list is open. Manual additions follow the same duplicate and leader checks as self-service joins, record the time they were added, and immediately refresh the public queue embed.

Birthday reminders are checked at startup and hourly. On a saved birthday, the bot posts a celebratory embed and mention in the configured birthdays channel exactly once that year. The default channel ID is `1545395897347612733`; set `BIRTHDAYS_CHANNEL_ID` to change it.

The bot's Discord status is refreshed hourly. It shows **Rotations: Active** whenever any waiting list is open; otherwise it displays the number of saved birthdays. Opening or closing rotations and adding or removing birthdays refreshes it immediately.

Command and button usage is logged to the console with an ISO timestamp, action/subcommand, user, guild, channel, outcome, and execution time. Failed interactions include the error message, while command option values are deliberately excluded so birthdays and other user-provided values are not leaked into logs.

Set each server's default alert destination once with `/stream channel`, then add
accounts. `/stream add` accepts an optional channel override, and `/stream route`
can change an existing stream's channel or restore the server default. Live
accounts are scanned concurrently every two minutes using lightweight native HTTP
requests. A transition to live posts `@everyone`, the streamer name, and a direct
stream link in that stream's override or the configured server default. The
channel and alert state are persisted, preventing duplicate messages after
restarts. TikTok detection checks its live-room endpoint first and falls back to
hydration data on the public live page; either route may still be affected by
TikTok anti-bot changes. Twitch can read public structured page data without any
keys or IDs. When `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` are configured,
the official API is preferred and the public page remains a fallback. Provider checks are isolated behind
adapters so more platforms can be added without changing commands or the scanner.

Any server member can use `/stream add`; channel defaults, route changes, listings,
and removals remain restricted to members with **Manage Server**. The bot developer
can also set a server default with `/dev default-stream-channel`.

Stream configuration, live state, and alert routing are isolated per server. Each
scan logs its server/stream totals, provider result and duration, sent alert
channel, failures, and final alert count to the console, making missing provider
credentials, unavailable channels, and upstream HTTP errors directly visible.

`/stream` is deliberately visible in Discord's command picker for everyone so it cannot disappear because of Discord's cached command-permission metadata. Its management actions still enforce **Manage Server** permission when executed.

## Setup

1. Install Node.js 20 or newer and run `npm install`.
2. Create an application and bot in the Discord Developer Portal.
3. Copy `.env.example` to `.env`, then add the bot token. The application/client ID is only required by the manual `npm run deploy` command. Set `DISCORD_GUILD_ID` during development for immediate guild command registration.
4. Invite the bot with the `bot` and `applications.commands` scopes. Grant it **Manage Channels**, **Manage Roles**, **Manage Messages**, **View Channels**, **Send Messages**, and **Read Message History**. Keep the bot's role above the generated Rotation Leader role.
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

The private `/dev` command provides `add-stream`, `remove-stream`, `stream-channel`, `default-stream-channel`,
`reset-join-rotations`, `clear-waiting`,
`clear-grouping`, `close`, `open`, `add-mock-user`, `add-mock-leader`, `group`,
and `clear-leaders` subcommands. `/dev group` runs the normal grouping
workflow without requiring Manage Server permission. Discord still displays the command to other users,
but every execution is checked against the developer's user ID. The development
`close` operation empties the queue, clears leaders, closes signups, and deletes
the grouping channel's entire message history before one fresh placeholder is
posted. The channel is preserved and the new message ID is saved automatically.
`/dev clear-grouping` performs that same full grouping-chat cleanup without
resetting the waiting list or leader state.
Leader assignments are cleared atomically by replacing
the managed role, so the operation does not require a privileged full-member scan.

```sh
npm test
npm run check
```
