import { SlashCommandBuilder } from 'discord.js';
import { guildOnly, mention, requireAdmin } from './helpers.js';

export default {
  data: new SlashCommandBuilder().setName('addleader').setDescription('Give a member the Rotation Leader role.')
    .setDefaultMemberPermissions('32')
    .addUserOption((option) => option.setName('member').setDescription('The new leader.').setRequired(true)),
  async execute(interaction, { store, rotationUi }) {
    if (!guildOnly(interaction) || !requireAdmin(interaction)) return;
    await interaction.deferReply({ ephemeral: true });
    const user = interaction.options.getUser('member', true);
    if (user.bot) return interaction.editReply('Bots cannot lead rotations.');
    const { leaderRole } = await rotationUi.ensure(interaction.guild);
    const member = await interaction.guild.members.fetch(user.id);
    await member.roles.add(leaderRole, `Added by ${interaction.user.tag}`);
    await store.update(interaction.guildId, (state) => {
      if (!state.leaders.includes(user.id)) state.leaders.push(user.id);
      state.players = state.players.filter((id) => id !== user.id);
      if (state.playerQueuedAt) delete state.playerQueuedAt[user.id];
    });
    await rotationUi.refreshWaiting(interaction.guild);
    await interaction.editReply(`${mention(user.id)} is now a Rotation Leader and will be included automatically.`);
  },
};
