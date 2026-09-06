# FF1 Rotations Discord Bot

A small, modular Discord.js bot for organising event rotations. Players opt in, administrators select outgoing leaders, and the bot creates even groups while remembering previous teammate pairings to reduce repeat matches.

## Commands

| Command | Who | Purpose |
| --- | --- | --- |
| `/join` | Everyone | Join the player queue. |
| `/leave` | Everyone | Leave the player queue. |
| `/rotation` | Everyone | View leaders, players, and recorded rounds. |
| `/addleader member` | Manager | Give a member the persistent Rotation Leader role. |
| `/removeleader member` | Manager | Remove a member's Rotation Leader role. |
| `/group` | Manager | Generate groups, publish them, and clear the signup list. |
| `/reset [history]` | Manager | Clear signups, optionally also clearing match history. |

On startup, the bot automatically creates a **Rotation Leader** role and a **Rotations** category containing:

- **#join-rotation** — visible to everyone but read-only, with an embed and button for joining the waiting list. Button confirmations are private.
- **#grouping** — visible to everyone but read-only. Its placeholder embed is replaced with one team embed per leader after `/group`.

Leaders are included automatically and never need to join the player queue. After `/group`, all player signups and leaders are cleared and leader roles are removed, ready for the next rotation. Only the immediately previous game's teammate pairings are retained, so the next grouping avoids repeats where possible without permanently penalising older matches. `/reset history:true` can also forget that last game.

## Setup

1. Install Node.js 20 or newer and run `npm install`.
2. Create an application and bot in the Discord Developer Portal.
3. Copy `.env.example` to `.env`, then add the bot token and application/client ID. Set `DISCORD_GUILD_ID` during development for immediate guild command deployment.
4. Invite the bot with the `bot` and `applications.commands` scopes. Grant it **Manage Channels**, **Manage Roles**, **View Channels**, **Send Messages**, and **Read Message History**. Keep the bot's role above the generated Rotation Leader role.
5. Run `npm run deploy` once to register the slash commands.
6. Run `npm start`.

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
