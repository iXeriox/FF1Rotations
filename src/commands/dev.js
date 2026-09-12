import { randomInt } from 'node:crypto';
import { SlashCommandBuilder } from 'discord.js';
import { guildOnly } from './helpers.js';
import { generateAndPublishGroups } from './group.js';

export const DEVELOPER_USER_ID = '375368296347729921';

const subcommands = [
  ['reset-join-rotations', 'Recreate the managed join-rotation message.'],
  ['clear-waiting', 'Remove everyone from the waiting list.'],
  ['clear-grouping', 'Empty the grouping chat and restore its required embed.'],
  ['close', 'Close and completely reset the current rotation.'],
  ['open', 'Open the rotation waiting list.'],
  ['add-mock-user', 'Add a randomly generated mock player.'],
  ['add-mock-leader', 'Add a randomly generated mock leader.'],
  ['group', 'Force group generation without an administrator permission check.'],
  ['clear-leaders', 'Clear saved leaders and every Rotation Leader role.'],
];

function mockMember(kind, random = randomInt) {
  const number = random(1_000, 10_000);
  return {
    id: `99999999999999${String(number).padStart(4, '0')}`,
    displayName: `Mock ${kind} ${number}`,
  };
}

async function refresh(interaction, rotationUi, botStatus) {
  await rotationUi.refreshWaiting(interaction.guild);
  await botStatus.refresh();
}

export default {
  data: subcommands.reduce(
    (builder, [name, description]) => builder.addSubcommand((command) => command.setName(name).setDescription(description)),
    new SlashCommandBuilder().setName('dev').setDescription('Private rotation development utilities.'),
  ),
  async execute(interaction, { store, rotationUi, botStatus }) {
    if (!guildOnly(interaction)) return;
    if (interaction.user.id !== DEVELOPER_USER_ID) {
      await interaction.reply({ content: 'This command is restricted to the bot developer.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const action = interaction.options.getSubcommand();
    if (action === 'group') {
      await generateAndPublishGroups(interaction, { store, rotationUi, botStatus });
      return;
    }
    if (action === 'reset-join-rotations') {
      await rotationUi.resetJoinRotation(interaction.guild);
      await interaction.editReply('The join-rotation message was recreated.');
      return;
    }
    if (action === 'clear-waiting') {
      await store.update(interaction.guildId, (state) => {
        state.players = [];
        state.playerQueuedAt = {};
        state.mockUsers = Object.fromEntries(Object.entries(state.mockUsers).filter(([id]) => state.leaders.includes(id)));
      });
      await refresh(interaction, rotationUi, botStatus);
      await interaction.editReply('The waiting list was cleared.');
      return;
    }
    if (action === 'clear-grouping') {
      await store.update(interaction.guildId, (state) => {
        state.lastGroups = [];
        state.lobbyCodes = {};
      });
      await rotationUi.resetGroups(interaction.guild);
      await interaction.editReply('The grouping chat was cleared and its default embed was reposted.');
      return;
    }
    if (action === 'close') {
      await rotationUi.clearAllLeaderRoles(interaction.guild);
      await store.update(interaction.guildId, (state) => {
        state.players = [];
        state.playerQueuedAt = {};
        state.leaders = [];
        state.waitingOpen = false;
        state.lastGroups = [];
        state.lobbyCodes = {};
        state.mockUsers = {};
      });
      await rotationUi.resetGroups(interaction.guild);
      await refresh(interaction, rotationUi, botStatus);
      await interaction.editReply('Rotation closed and reset. All Rotation Leader assignments were cleared.');
      return;
    }
    if (action === 'open') {
      const current = store.get(interaction.guildId);
      const openingNewCycle = !current.waitingOpen;
      if (openingNewCycle) await rotationUi.clearLeaderRoles(interaction.guild, current.leaders);
      await store.update(interaction.guildId, (state) => {
        if (!state.waitingOpen) {
          const previousLeaders = new Set(state.leaders);
          state.leaders = [];
          state.mockUsers = Object.fromEntries(
            Object.entries(state.mockUsers).filter(([id]) => !previousLeaders.has(id)),
          );
        }
        state.waitingOpen = true;
      });
      await refresh(interaction, rotationUi, botStatus);
      await interaction.editReply(openingNewCycle
        ? 'The rotation waiting list is now open. Previous Rotation Leaders were cleared.'
        : 'The waiting list is already open.');
      return;
    }
    if (action === 'clear-leaders') {
      await rotationUi.clearAllLeaderRoles(interaction.guild);
      await store.update(interaction.guildId, (state) => {
        const leaderIds = new Set(state.leaders);
        state.leaders = [];
        state.mockUsers = Object.fromEntries(Object.entries(state.mockUsers).filter(([id]) => !leaderIds.has(id)));
      });
      await rotationUi.refreshWaiting(interaction.guild);
      await interaction.editReply('Cleared all leaders and all Rotation Leader assignments.');
      return;
    }

    const kind = action === 'add-mock-leader' ? 'Leader' : 'Player';
    const mock = mockMember(kind);
    await store.update(interaction.guildId, (state) => {
      state.mockUsers[mock.id] = { displayName: mock.displayName };
      (kind === 'Leader' ? state.leaders : state.players).push(mock.id);
      if (kind === 'Player') state.playerQueuedAt[mock.id] = Math.floor(Date.now() / 1000);
    });
    await rotationUi.refreshWaiting(interaction.guild);
    await interaction.editReply(`Added **${mock.displayName}** as a mock ${kind.toLowerCase()}.`);
  },
};
