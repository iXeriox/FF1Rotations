import { SlashCommandBuilder } from 'discord.js';
import { guildOnly, requireAdmin } from './helpers.js';

export default {
  data: new SlashCommandBuilder().setName('open').setDescription('Open the rotation waiting list.')
    .setDefaultMemberPermissions('32'),
  async execute(interaction, { store, rotationUi }) {
    if (!guildOnly(interaction) || !requireAdmin(interaction)) return;
    await interaction.deferReply({ ephemeral: true });
    const changed = await store.update(interaction.guildId, (state) => {
      if (state.waitingOpen) return false;
      state.waitingOpen = true;
      return true;
    });
    await rotationUi.refreshWaiting(interaction.guild);
    await interaction.editReply(changed ? 'The rotation waiting list is now open.' : 'The waiting list is already open.');
  },
};
