import { SlashCommandBuilder } from 'discord.js';
import { joinWaitingList } from '../services/waiting-list.js';
import { guildOnly, mention, requireAdmin } from './helpers.js';

export default {
  data: new SlashCommandBuilder().setName('addplayer').setDescription('Manually add a member to the rotation waiting list.')
    .setDefaultMemberPermissions('32')
    .addUserOption((option) => option.setName('user').setDescription('The member to add.').setRequired(true)),
  async execute(interaction, { store, rotationUi }) {
    if (!guildOnly(interaction) || !requireAdmin(interaction)) return;
    await interaction.deferReply({ ephemeral: true });
    const user = interaction.options.getUser('user', true);
    if (user.bot) {
      await interaction.editReply('Bots cannot join rotations.');
      return;
    }

    const result = await store.update(interaction.guildId, (state) => joinWaitingList(state, user.id));
    if (result.ok) await rotationUi.refreshWaiting(interaction.guild);
    await interaction.editReply(result.ok
      ? `${mention(user.id)} was added to the rotation waiting list.`
      : result.message);
  },
};
