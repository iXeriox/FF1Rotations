import { SlashCommandBuilder } from 'discord.js';
import { guildOnly, mention } from './helpers.js';

export default {
  data: new SlashCommandBuilder().setName('rotation').setDescription('Show the current rotation queue.'),
  async execute(interaction, { store }) {
    if (!guildOnly(interaction)) return;
    const state = store.get(interaction.guildId);
    const list = (ids) => ids.length ? ids.map(mention).join(', ') : '_None_';
    await interaction.reply(`**Leaders (${state.leaders.length})**\n${list(state.leaders)}\n\n**Players (${state.players.length})**\n${list(state.players)}\n\nRounds recorded: ${state.rounds}`);
  },
};
