import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { guildOnly } from './helpers.js';
import { upcomingBirthdays } from '../services/birthdays.js';

export default {
  data: new SlashCommandBuilder().setName('birthdays').setDescription('Show upcoming server birthdays.'),
  async execute(interaction, { store }) {
    if (!guildOnly(interaction)) return;
    const upcoming = upcomingBirthdays(store.get(interaction.guildId));
    const shown = upcoming.slice(0, 30);
    const description = shown.length
      ? shown.map(({ userId, day, month, next, daysUntil }) => (
        `<@${userId}> — **${day}/${month}** • <t:${Math.floor(next.getTime() / 1000)}:R>${daysUntil === 0 ? ' 🎂' : ''}`
      )).join('\n')
      : '_No birthdays have been added yet._';
    const embed = new EmbedBuilder()
      .setColor(0xff73fa)
      .setTitle('Upcoming birthdays 🎂')
      .setDescription(description)
      .setFooter({ text: upcoming.length > shown.length ? `Showing 30 of ${upcoming.length} birthdays` : `${upcoming.length} saved birthday${upcoming.length === 1 ? '' : 's'}` });
    await interaction.reply({ embeds: [embed] });
  },
};
