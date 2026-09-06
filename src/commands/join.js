import { SlashCommandBuilder } from 'discord.js';
import { guildOnly, mention } from './helpers.js';

export default {
  data: new SlashCommandBuilder().setName('join').setDescription('Join the next rotation.'),
  async execute(interaction, { store }) {
    if (!guildOnly(interaction)) return;
    const added = await store.update(interaction.guildId, (state) => {
      if (state.players.includes(interaction.user.id) || state.leaders.includes(interaction.user.id)) return false;
      state.players.push(interaction.user.id);
      return true;
    });
    await interaction.reply(added
      ? `${mention(interaction.user.id)} joined the rotation.`
      : { content: 'You are already in the rotation.', ephemeral: true });
  },
};
