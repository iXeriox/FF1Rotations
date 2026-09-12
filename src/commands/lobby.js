import { SlashCommandBuilder, escapeMarkdown } from 'discord.js';
import { guildOnly } from './helpers.js';

const LOBBY_CODE_PATTERN = /^[A-Za-z0-9_-]+$/;

export default {
  data: new SlashCommandBuilder()
    .setName('lobby')
    .setDescription('Share your current group lobby code.')
    .addStringOption((option) => option
      .setName('code')
      .setDescription('The code your group should use to join in progress.')
      .setMinLength(1)
      .setMaxLength(32)
      .setRequired(true)),
  async execute(interaction, { store, rotationUi }) {
    if (!guildOnly(interaction)) return;
    await interaction.deferReply({ ephemeral: true });
    const code = interaction.options.getString('code', true).trim();
    if (!LOBBY_CODE_PATTERN.test(code)) {
      await interaction.editReply('Lobby codes may only contain letters, numbers, hyphens, and underscores.');
      return;
    }

    const result = await store.update(interaction.guildId, (state) => {
      const groupIndex = state.lastGroups.findIndex(([leaderId]) => leaderId === interaction.user.id);
      if (groupIndex === -1) return { ok: false };
      state.lobbyCodes ??= {};
      state.lobbyCodes[interaction.user.id] = code;
      return { ok: true, groups: structuredClone(state.lastGroups), groupNumber: groupIndex + 1 };
    });
    if (!result.ok) {
      await interaction.editReply('Only a leader from the latest generated groups can set a lobby code.');
      return;
    }

    await rotationUi.publishGroups(interaction.guild, result.groups);
    await interaction.editReply(`Squad ${result.groupNumber}'s lobby code is now **${escapeMarkdown(code)}**.`);
  },
};
