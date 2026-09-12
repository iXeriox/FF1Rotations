import { SlashCommandBuilder } from 'discord.js';
import { guildOnly, requireAdmin } from './helpers.js';

export default {
  data: new SlashCommandBuilder().setName('open').setDescription('Open the rotation waiting list.')
    .setDefaultMemberPermissions('32'),
  async execute(interaction, { store, rotationUi, botStatus }) {
    if (!guildOnly(interaction) || !requireAdmin(interaction)) return;
    await interaction.deferReply({ ephemeral: true });
    const current = store.get(interaction.guildId);
    if (current.waitingOpen) {
      await interaction.editReply('The waiting list is already open.');
      return;
    }
    await rotationUi.clearLeaderRoles(interaction.guild, current.leaders);
    const changed = await store.update(interaction.guildId, (state) => {
      if (state.waitingOpen) return false;
      const previousLeaders = new Set(state.leaders);
      state.leaders = [];
      state.mockUsers = Object.fromEntries(
        Object.entries(state.mockUsers).filter(([id]) => !previousLeaders.has(id)),
      );
      state.waitingOpen = true;
      return true;
    });
    await rotationUi.refreshWaiting(interaction.guild);
    await botStatus.refresh();
    await interaction.editReply(changed
      ? 'The rotation waiting list is now open. Previous Rotation Leaders were cleared.'
      : 'The waiting list is already open.');
  },
};
