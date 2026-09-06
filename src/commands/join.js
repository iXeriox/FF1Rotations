import { SlashCommandBuilder } from 'discord.js';
import { guildOnly, mention } from './helpers.js';

export default {
  data: new SlashCommandBuilder().setName('join').setDescription('Join the next rotation.'),
  async execute(interaction, { store, rotationUi }) {
    if (!guildOnly(interaction)) return;
    await interaction.deferReply({ ephemeral: true });
    const added = await store.update(interaction.guildId, (state) => {
      if (state.players.includes(interaction.user.id) || state.leaders.includes(interaction.user.id)) return false;
      state.players.push(interaction.user.id);
      return true;
    });
    if (added) await rotationUi.refreshWaiting(interaction.guild);
    await interaction.editReply(added
      ? `${mention(interaction.user.id)} joined the rotation.`
      : 'You are already in the rotation.');
  },
};
