import { SlashCommandBuilder } from 'discord.js';
import { guildOnly, mention, requireAdmin } from './helpers.js';

export default {
  data: new SlashCommandBuilder().setName('removeleader').setDescription('Remove the Rotation Leader role from a member.')
    .setDefaultMemberPermissions('32')
    .addUserOption((option) => option.setName('member').setDescription('The leader to remove.').setRequired(true)),
  async execute(interaction, { store, rotationUi }) {
    if (!guildOnly(interaction) || !requireAdmin(interaction)) return;
    await interaction.deferReply({ ephemeral: true });
    const user = interaction.options.getUser('member', true);
    const { leaderRole } = await rotationUi.ensure(interaction.guild);
    const member = await interaction.guild.members.fetch(user.id);
    await member.roles.remove(leaderRole, `Removed by ${interaction.user.tag}`);
    await store.update(interaction.guildId, (state) => {
      state.leaders = state.leaders.filter((id) => id !== user.id);
    });
    await interaction.editReply(`${mention(user.id)} is no longer a Rotation Leader.`);
  },
};
