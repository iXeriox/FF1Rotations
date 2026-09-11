import { EmbedBuilder, escapeMarkdown } from 'discord.js';

export async function announceCallOfDutyId(client, channelId, user, callOfDutyId) {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased()) return false;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({ name: user.displayName ?? user.username, iconURL: user.displayAvatarURL() })
    .setTitle('Activision ID Updated')
    .setDescription(`${user} has added their Call of Duty ID.`)
    .addFields({ name: 'Activision ID', value: `**${escapeMarkdown(callOfDutyId)}**` })
    .setTimestamp();
  await channel.send({
    content: `${user}`,
    embeds: [embed],
    allowedMentions: { users: [user.id] },
  });
  return true;
}
