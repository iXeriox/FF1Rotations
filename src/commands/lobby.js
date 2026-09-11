import { SlashCommandBuilder, escapeMarkdown } from 'discord.js';
import { guildOnly } from './helpers.js';
import { setLobbyCode } from '../services/lobby-codes.js';

export default {
  data: new SlashCommandBuilder().setName('lobby').setDescription('Add the lobby code to the team you led.')
    .addStringOption((option) => option.setName('code').setDescription('The private lobby code for your squad.').setMaxLength(100).setRequired(true)),
  async execute(interaction, { store, rotationUi }) {
    if (!guildOnly(interaction)) return;
    await interaction.deferReply({ ephemeral: true });
    const value = interaction.options.getString('code', true);
    const result = await store.update(interaction.guildId, (state) => (
      setLobbyCode(state, interaction.user.id, value)
    ));
    if (result.ok) await rotationUi.refreshGroups(interaction.guild);
    await interaction.editReply(result.ok
      ? `Your squad card now shows lobby code **${escapeMarkdown(result.code)}**.`
      : result.message);
  },
};
