# FF1 Rotations Discord Bot

A small, modular Discord.js bot for organising event rotations. Players opt in, administrators select outgoing leaders, and the bot creates even groups while remembering previous teammate pairings to reduce repeat matches.

## Commands

| Command | Who | Purpose |
| --- | --- | --- |
| `/join` | Everyone | Join the player queue. |
| `/leave` | Everyone | Leave the player queue. |
| `/rotation` | Everyone | View leaders, players, and recorded rounds. |
| `/addleader member` | Manage Server | Give a member the persistent Rotation Leader role. |
| `/removeleader member` | Manage Server | Remove a member's Rotation Leader role. |
| `/group` | Manage Server | Generate groups, publish them, and clear the signup list. |
| `/reset [history]` | Manage Server | Clear signups, optionally also clearing match history. |
| `/commend user` | Everyone | Give one commendation to a teammate from the latest rotation. |
| `/stats user` | Everyone | Show commendations, rotation count, and last rotation time. |

On startup, the bot automatically creates a **Rotation Leader** role and a **Rotations** category containing:

- **#join-rotation** — visible to everyone but read-only, with an embed and button for joining the waiting list. Button confirmations are private.
- **#grouping** — visible to everyone but read-only. Its placeholder embed is replaced with one team embed per leader after `/group`.

The IDs of the generated role, category, channels, and messages are persisted. On restart the bot restores those exact resources, moves its channels back under the Rotations category if necessary, and refreshes both embeds from stored state. It never adopts or overwrites unrelated channels merely because they have the same name; if a managed resource is deleted, the bot creates a replacement.

Leaders are included automatically and never need to join the player queue. After `/group`, all player signups and leaders are cleared and leader roles are removed, ready for the next rotation. Only the immediately previous game's teammate pairings are retained, so the next grouping avoids repeats where possible without permanently penalising older matches. `/reset history:true` can also forget that last game.

Every generated Call of Duty team is capped at four members, including its leader. Each leader therefore supports up to three waiting players. If there are not enough leaders, `/group` explains how many are required and leaves the current signup list untouched.

Each participant may use `/commend` once after a rotation, and the recipient must have been on that participant's latest team. Commendations and participation statistics are retained across rotations and bot restarts.

## Setup

1. Install Node.js 20 or newer and run `npm install`.
2. Create an application and bot in the Discord Developer Portal.
3. Copy `.env.example` to `.env`, then add the bot token. The application/client ID is only required by the manual `npm run deploy` command. Set `DISCORD_GUILD_ID` during development for immediate guild command registration.
4. Invite the bot with the `bot` and `applications.commands` scopes. Grant it **Manage Channels**, **Manage Roles**, **View Channels**, **Send Messages**, and **Read Message History**. Keep the bot's role above the generated Rotation Leader role.
5. Run `npm start`. The bot automatically registers or updates all slash commands whenever it connects.

When `DISCORD_GUILD_ID` is set, commands are registered directly in that server and appear immediately. Without it, Discord registers them globally, which can take longer to become visible in every server. `npm run deploy` remains available for manual deployment if needed.

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
