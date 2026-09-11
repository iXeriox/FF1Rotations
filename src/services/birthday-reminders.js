import { EmbedBuilder } from 'discord.js';
import { birthdaysDue } from './birthdays.js';

export async function sendBirthdayReminders(client, store, channelId, now = new Date()) {
  if (!channelId) return 0;
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased() || !channel.guild) return 0;
  const state = store.get(channel.guild.id);
  const due = birthdaysDue(state, now);
  if (!due.length) return 0;

  const description = due.map(({ userId, age }) => `🎂 Happy **${age}${ordinal(age)} birthday** to <@${userId}>!`).join('\n');
  await channel.send({
    content: due.map(({ userId }) => `<@${userId}>`).join(' '),
    embeds: [new EmbedBuilder().setColor(0xff73fa).setTitle('Happy Birthday! 🎉').setDescription(description)],
  });
  await store.update(channel.guild.id, (latest) => {
    for (const { userId } of due) latest.birthdayAnnouncements[userId] = now.getUTCFullYear();
  });
  return due.length;
}

function ordinal(number) {
  const remainder = number % 100;
  if (remainder >= 11 && remainder <= 13) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' })[number % 10] ?? 'th';
}
