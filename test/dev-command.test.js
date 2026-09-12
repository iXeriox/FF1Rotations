import assert from 'node:assert/strict';
import test from 'node:test';
import dev, { DEVELOPER_USER_ID } from '../src/commands/dev.js';

test('registers all private development subcommands without admin permissions', () => {
  const command = dev.data.toJSON();
  assert.equal(command.name, 'dev');
  assert.equal(command.default_member_permissions, undefined);
  assert.deepEqual(command.options.map(({ name }) => name), [
    'reset-join-rotations', 'clear-waiting', 'reset-grouping', 'close',
    'open', 'add-mock-user', 'add-mock-leader', 'clear-leaders',
  ]);
});

test('rejects anyone other than the configured developer before deferring', async () => {
  let response;
  await dev.execute({
    guildId: 'guild',
    user: { id: `${DEVELOPER_USER_ID}0` },
    reply: async (value) => { response = value; },
  }, {});
  assert.deepEqual(response, {
    content: 'This command is restricted to the bot developer.',
    ephemeral: true,
  });
});
