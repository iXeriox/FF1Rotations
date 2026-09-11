import assert from 'node:assert/strict';
import test from 'node:test';
import addplayer from '../src/commands/addplayer.js';

test('exports the administrator addplayer command with a required user', () => {
  const command = addplayer.data.toJSON();
  assert.equal(command.name, 'addplayer');
  assert.equal(command.default_member_permissions, '32');
  assert.deepEqual(command.options.map(({ name, type, required }) => ({ name, type, required })), [
    { name: 'user', type: 6, required: true },
  ]);
});
