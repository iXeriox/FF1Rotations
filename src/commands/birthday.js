import { SlashCommandBuilder } from 'discord.js';
import { guildOnly } from './helpers.js';
import { removeBirthday, setBirthday } from '../services/birthdays.js';

export default {
  data: new SlashCommandBuilder().setName('birthday').setDescription('Manage your birthday reminder.')
    .addSubcommand((command) => command.setName('add').setDescription('Add or update your birthday.')
      .addIntegerOption((option) => option.setName('day').setDescription('Day of the month.').setMinValue(1).setMaxValue(31).setRequired(true))
      .addIntegerOption((option) => option.setName('month').setDescription('Month number.').setMinValue(1).setMaxValue(12).setRequired(true))
      .addIntegerOption((option) => option.setName('year').setDescription('Four-digit birth year.').setMinValue(1900).setRequired(true)))
    .addSubcommand((command) => command.setName('remove').setDescription('Remove your saved birthday.'))
    .addSubcommand((command) => command.setName('help').setDescription('Explain birthday reminders.')),
  async execute(interaction, { store, botStatus }) {
    if (!guildOnly(interaction)) return;
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'help') {
      await interaction.reply({
        content: 'Use `/birthday add` to save your day, month, and year. The bot will mention you in the birthdays channel on the day. Use `/birthday remove` to delete it. `/birthdays` shows upcoming dates.',
        ephemeral: true,
      });
      return;
    }
    if (subcommand === 'remove') {
      const removed = await store.update(interaction.guildId, (state) => removeBirthday(state, interaction.user.id));
      if (removed) await botStatus.refresh();
      await interaction.reply({ content: removed ? 'Your birthday was removed.' : 'You do not have a saved birthday.', ephemeral: true });
      return;
    }

    const day = interaction.options.getInteger('day', true);
    const month = interaction.options.getInteger('month', true);
    const year = interaction.options.getInteger('year', true);
    const result = await store.update(interaction.guildId, (state) => setBirthday(state, interaction.user.id, day, month, year));
    if (result.ok) await botStatus.refresh();
    await interaction.reply({
      content: result.ok ? `Birthday saved as **${day}/${month}/${year}**.` : result.message,
      ephemeral: true,
    });
  },
};
