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
    const result = await store.update(interaction.guildId, (state) => {
      if (state.waitingOpen) return { changed: false, leaders: [] };
      const leaders = [...state.leaders];
      state.leaders = [];
      state.waitingOpen = true;
      return { changed: true, leaders };
    });
    await rotationUi.clearLeaderRoles(interaction.guild, result.leaders);
    await rotationUi.refreshWaiting(interaction.guild);
    await botStatus.refresh();
    await interaction.editReply(result.changed
      ? 'The rotation waiting list is now open. Previous Rotation Leaders can rejoin.'
      : 'The waiting list is already open.');
  },
};
