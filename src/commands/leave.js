import { SlashCommandBuilder } from 'discord.js';
import { guildOnly, mention } from './helpers.js';

export default {
  data: new SlashCommandBuilder().setName('leave').setDescription('Leave the next rotation.'),
  async execute(interaction, { store, rotationUi }) {
    if (!guildOnly(interaction)) return;
    const removed = await store.update(interaction.guildId, (state) => {
      const before = state.players.length;
      state.players = state.players.filter((id) => id !== interaction.user.id);
      return before !== state.players.length;
    });
    if (removed) await rotationUi.refreshWaiting(interaction.guild);
    await interaction.reply(removed
      ? `${mention(interaction.user.id)} left the rotation.`
      : { content: 'You are not currently in the player queue.', ephemeral: true });
  },
};
