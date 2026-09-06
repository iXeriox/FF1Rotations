# FF1 Rotations Discord Bot

A small, modular Discord.js bot for organising event rotations. Players opt in, administrators select outgoing leaders, and the bot creates even groups while remembering previous teammate pairings to reduce repeat matches.

## Commands

| Command | Who | Purpose |
| --- | --- | --- |
| `/join` | Everyone | Join the player queue. |
| `/leave` | Everyone | Leave the player queue. |
| `/rotation` | Everyone | View leaders, players, and recorded rounds. |
| `/leader add member` | Manage Server | Add a manually approved leader. |
| `/leader remove member` | Manage Server | Remove a leader. |
| `/group [clear_queue]` | Manage Server | Generate balanced groups and record teammate history. |
| `/reset [history]` | Manage Server | Clear signups, optionally also clearing match history. |

By default, `/reset` preserves pairing history so future `/group` runs can avoid repeatedly matching the same people. Leaders are not also placed in the ordinary player queue.

## Setup

1. Install Node.js 20 or newer and run `npm install`.
2. Create an application and bot in the Discord Developer Portal.
3. Copy `.env.example` to `.env`, then add the bot token and application/client ID. Set `DISCORD_GUILD_ID` during development for immediate guild command deployment.
4. Invite the bot with the `bot` and `applications.commands` scopes. It only needs permission to view and send messages in the rotations channel.
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
