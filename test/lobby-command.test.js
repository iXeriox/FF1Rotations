import assert from 'node:assert/strict';
import test from 'node:test';
import lobby from '../src/commands/lobby.js';

test('/lobby updates the generated group and refreshes its public card', async () => {
  const state = { lastGroups: [['leader', 'player']], lobbyCodes: {} };
  let refreshedGuild;
  let response;
  const interaction = {
    guildId: 'guild',
    guild: { id: 'guild' },
    user: { id: 'leader' },
    options: { getString: () => 'ROOM 123' },
    deferReply: async () => {},
    editReply: async (message) => { response = message; },
  };
  const store = {
    update: async (_guildId, updater) => updater(state),
  };
  const rotationUi = {
    refreshGroups: async (guild) => { refreshedGuild = guild; },
  };

  await lobby.execute(interaction, { store, rotationUi });

  assert.equal(state.lobbyCodes.leader, 'ROOM 123');
  assert.equal(refreshedGuild, interaction.guild);
  assert.match(response, /squad card now shows lobby code/i);
});
