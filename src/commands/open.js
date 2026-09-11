import { SlashCommandBuilder } from 'discord.js';
import { guildOnly, requireAdmin } from './helpers.js';

export default {
  data: new SlashCommandBuilder().setName('open').setDescription('Open the rotation waiting list.')
    .setDefaultMemberPermissions('32'),
  async execute(interaction, { store, rotationUi, botStatus }) {
    if (!guildOnly(interaction) || !requireAdmin(interaction)) return;
    await interaction.deferReply({ ephemeral: true });
    const current = store.get(interaction.guildId);
    const changed = await store.update(interaction.guildId, (state) => {
      const wasOpen = state.waitingOpen;
      state.waitingOpen = true;
      state.leaders = [];
      return !wasOpen;
    });
    // Open and refresh the queue before the full member scan. Large guilds can
    // take time to fetch, but players should be able to join immediately.
    await rotationUi.refreshWaiting(interaction.guild);
    await botStatus.refresh();
    const removedLeaders = await rotationUi.clearLeaderRoles(interaction.guild, current.leaders);
    const leaderSummary = removedLeaders
      ? ` Removed the Rotation Leader role from ${removedLeaders} previous leader${removedLeaders === 1 ? '' : 's'}.`
      : ' Previous leaders were cleared.';
    await interaction.editReply(`${changed ? 'The rotation waiting list is now open.' : 'The waiting list was already open.'}${leaderSummary}`);
  },
};
