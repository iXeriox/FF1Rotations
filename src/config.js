import 'dotenv/config';

export function getConfig({ requireClientId = false } = {}) {
  const required = ['DISCORD_TOKEN'];
  if (requireClientId) required.push('DISCORD_CLIENT_ID');
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID,
    birthdaysChannelId: process.env.BIRTHDAYS_CHANNEL_ID ?? '1545395897347612733',
    twitchClientId: process.env.TWITCH_CLIENT_ID,
    twitchClientSecret: process.env.TWITCH_CLIENT_SECRET,
    dataFile: process.env.DATA_FILE ?? './data/rotations.json',
  };
}
