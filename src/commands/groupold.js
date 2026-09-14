import { SlashCommandBuilder } from 'discord.js';
import { generateAndPublishGroups } from './group.js';
import { guildOnly, requireAdmin } from './helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('groupold')
    .setDescription('Create groups using Rotation Leaders selected by an administrator.')
    .setDefaultMemberPermissions('32'),
  async execute(interaction, dependencies) {
    if (!guildOnly(interaction) || !requireAdmin(interaction)) return;
    await interaction.deferReply({ ephemeral: true });
    await generateAndPublishGroups(interaction, dependencies, { useSelectedLeaders: true });
  },
};
