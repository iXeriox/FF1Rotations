import { randomUUID } from 'node:crypto';
import { SlashCommandBuilder } from 'discord.js';
import { guildOnly, mention } from './helpers.js';

export const DEVELOPER_USER_ID = '375368296347729921';

const label = (state, id) => state.mockUsers?.[id] ? `**${state.mockUsers[id]}** _(mock)_` : mention(id);
const list = (state, ids) => ids.length ? ids.map((id) => label(state, id)).join(', ') : '_None_';
const waitingList = (state) => state.players.length
  ? state.players.map((id, index) => `${index + 1}. ${label(state, id)} — <t:${state.playerQueuedAt?.[id] ?? 0}:R>`).join('\n')
  : '_No players are waiting._';
const previousTeams = (state) => state.lastGroups.length
  ? state.lastGroups.map((team, index) => `**Team ${index + 1}**\n${team.map((id, playerIndex) => `${playerIndex ? '•' : '👑'} ${label(state, id)}`).join('\n')}`).join('\n\n')
  : '_No previous game has been recorded._';

const subcommand = (builder, name, description) => builder.addSubcommand((option) => option.setName(name).setDescription(description));
const mockNames = ['Crimson Falcon', 'Nova Ranger', 'Ghost Viper', 'Pixel Reaper', 'Echo Wolf', 'Rapid Badger'];

function createMockUser(state, type) {
  const id = `mock:${randomUUID()}`;
  const name = `${mockNames[Math.floor(Math.random() * mockNames.length)]} ${String(Object.keys(state.mockUsers ?? {}).length + 1).padStart(2, '0')}`;
  state.mockUsers ??= {};
  state.mockUsers[id] = name;
  if (type === 'randomleader') state.leaders.push(id);
  else {
    state.players.push(id);
    state.playerQueuedAt ??= {};
    state.playerQueuedAt[id] = Math.floor(Date.now() / 1000);
  }
  return { id, name };
}

let data = new SlashCommandBuilder().setName('dev').setDescription('Developer-only rotation diagnostics and controls.');
data = subcommand(data, 'reset-waiting', 'Remove every player from the waiting list.');
data = subcommand(data, 'open', 'Open the waiting list.');
data = subcommand(data, 'close', 'Close the waiting list.');
data = subcommand(data, 'clear-leaders', 'Clear saved leaders and remove every Rotation Leader role.');
data = subcommand(data, 'waiting-list', 'Show the current waiting list.');
data = subcommand(data, 'leader-list', 'Show the current saved leader list.');
data = subcommand(data, 'previous-game', 'Show teams from the previous game.');
data.addSubcommandGroup((group) => group.setName('add').setDescription('Add generated test members.')
  .addSubcommand((option) => option.setName('randomuser').setDescription('Add a randomly named mock player.'))
  .addSubcommand((option) => option.setName('randomleader').setDescription('Add a randomly named mock leader.')));

export default {
  data,
  async execute(interaction, { store, rotationUi, botStatus }) {
    if (!guildOnly(interaction)) return;
    if (interaction.user.id !== DEVELOPER_USER_ID) {
      await interaction.reply({ content: 'This command is restricted to the bot developer.', ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const action = interaction.options.getSubcommand();
    const actionGroup = interaction.options.getSubcommandGroup(false);

    if (actionGroup === 'add') {
      let mock;
      await store.update(interaction.guildId, (state) => { mock = createMockUser(state, action); });
      await rotationUi.refreshWaiting(interaction.guild);
      await interaction.editReply(`Added mock ${action === 'randomleader' ? 'leader' : 'player'} **${mock.name}** for testing.`);
      return;
    }

    if (action === 'waiting-list' || action === 'leader-list' || action === 'previous-game') {
      const state = store.get(interaction.guildId);
      const content = action === 'waiting-list'
        ? `**Waiting list (${state.players.length}) — ${state.waitingOpen ? 'OPEN' : 'CLOSED'}**\n${waitingList(state)}`
        : action === 'leader-list'
          ? `**Leaders (${state.leaders.length})**\n${list(state, state.leaders)}`
          : `**Previous game**\n${previousTeams(state)}`;
      await interaction.editReply(content.length > 2_000 ? `${content.slice(0, 1_980)}\n…list truncated` : content);
      return;
    }

    if (action === 'clear-leaders') {
      const current = store.get(interaction.guildId);
      await store.update(interaction.guildId, (state) => { state.leaders = []; });
      const result = await rotationUi.clearLeaderRolesDetailed(interaction.guild, current.leaders);
      await rotationUi.refreshWaiting(interaction.guild);
      const failures = result.failed.length
        ? `\n⚠️ Could not remove the role from: ${result.failed.map(({ id }) => mention(id)).join(', ')}. Check the bot's **Manage Roles** permission and role position.`
        : '';
      await interaction.editReply(`Cleared the saved leader list and removed ${result.removed.length} leader role${result.removed.length === 1 ? '' : 's'}.${failures}`);
      return;
    }

    await store.update(interaction.guildId, (state) => {
      if (action === 'reset-waiting') {
        state.players = [];
        state.playerQueuedAt = {};
      } else {
        state.waitingOpen = action === 'open';
      }
    });
    await rotationUi.refreshWaiting(interaction.guild);
    await botStatus.refresh();
    const messages = {
      'reset-waiting': 'The waiting list has been emptied.',
      open: 'The waiting list is now open.',
      close: 'The waiting list is now closed.',
    };
    await interaction.editReply(messages[action]);
  },
};
