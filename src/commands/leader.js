import { SlashCommandBuilder } from 'discord.js';
import { guildOnly, mention, requireAdmin } from './helpers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leader')
    .setDescription('Manage rotation leaders.')
    .setDefaultMemberPermissions('32')
    .addSubcommand((command) => command.setName('add').setDescription('Add a leader.')
      .addUserOption((option) => option.setName('member').setDescription('The new leader.').setRequired(true)))
    .addSubcommand((command) => command.setName('remove').setDescription('Remove a leader.')
      .addUserOption((option) => option.setName('member').setDescription('The leader to remove.').setRequired(true))),
  async execute(interaction, { store }) {
    if (!guildOnly(interaction) || !requireAdmin(interaction)) return;
    const member = interaction.options.getUser('member', true);
    if (member.bot) return interaction.reply({ content: 'Bots cannot lead rotations.', ephemeral: true });
    const adding = interaction.options.getSubcommand() === 'add';
    const changed = await store.update(interaction.guildId, (state) => {
      const exists = state.leaders.includes(member.id);
      if (adding === exists) return false;
      state.leaders = adding ? [...state.leaders, member.id] : state.leaders.filter((id) => id !== member.id);
      if (adding) state.players = state.players.filter((id) => id !== member.id);
      return true;
    });
    await interaction.reply(changed
      ? `${mention(member.id)} was ${adding ? 'added as' : 'removed from'} a rotation leader.`
      : { content: `${member.username} is ${adding ? 'already' : 'not'} a leader.`, ephemeral: true });
  },
};
