import assert from 'node:assert/strict';
import test from 'node:test';
import idother from '../src/commands/idother.js';

test('exports the staff-only idother command with required user and Activision ID options', () => {
  const command = idother.data.toJSON();
  assert.equal(command.name, 'idother');
  assert.equal(command.default_member_permissions, '32');
  assert.deepEqual(command.options.map(({ name, type, required }) => ({ name, type, required })), [
    { name: 'user', type: 6, required: true },
    { name: 'activisionid', type: 3, required: true },
  ]);
});

test('idother saves and announces an Activision ID for the selected user', async () => {
  const selectedUser = { id: 'selected', bot: false, toString: () => '<@selected>' };
  const state = {};
  let announced;
  let reply;
  const interaction = {
    guildId: 'guild',
    memberPermissions: { has: () => true },
    options: {
      getUser: () => selectedUser,
      getString: () => ' Player # 123 ',
    },
    deferReply: async () => {},
    editReply: async (message) => { reply = message; },
  };
  await idother.execute(interaction, {
    store: { update: async (_guildId, updater) => updater(state) },
    playerIdAnnouncements: { send: async (user, id) => { announced = [user, id]; return true; } },
  });

  assert.equal(state.callOfDutyIds.selected, 'Player#123');
  assert.deepEqual(announced, [selectedUser, 'Player#123']);
  assert.match(reply.content, /<@selected>.*Player#123/);
});
