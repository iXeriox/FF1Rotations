import 'dotenv/config';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export function getConfig({ requireClientId = false } = {}) {
  const required = ['DISCORD_TOKEN'];
  if (requireClientId) required.push('DISCORD_CLIENT_ID');
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const dataFile = process.env.DATA_FILE ?? './data/rotations.json';
  const tokenFingerprint = createHash('sha256').update(process.env.DISCORD_TOKEN).digest('hex').slice(0, 16);
  return {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID,
    birthdaysChannelId: process.env.BIRTHDAYS_CHANNEL_ID ?? '1545395897347612733',
    activisionIdsChannelId: process.env.ACTIVISION_IDS_CHANNEL_ID ?? '1530580498265538600',
    twitchClientId: process.env.TWITCH_CLIENT_ID,
    twitchClientSecret: process.env.TWITCH_CLIENT_SECRET,
    dataFile,
    instanceLockFile: process.env.INSTANCE_LOCK_FILE ?? `${dataFile}.lock`,
    tokenLockFile: process.env.BOT_TOKEN_LOCK_FILE ?? join(tmpdir(), `ff1rotations-${tokenFingerprint}.lock`),
  };
}
