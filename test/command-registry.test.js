import assert from 'node:assert/strict';
import test from 'node:test';
import { commands } from '../src/commands/index.js';

test('exports a visible stream command with all management subcommands', () => {
  const stream = commands.find((command) => command.data.name === 'stream')?.data.toJSON();
  assert.ok(stream, 'stream command must be in the deployed registry');
  assert.equal(stream.default_member_permissions, undefined);
  assert.deepEqual(stream.options.map(({ name }) => name), ['add', 'remove', 'channel', 'list', 'help']);
});

test('exports the developer command in the deployed registry', () => {
  const dev = commands.find((command) => command.data.name === 'dev')?.data.toJSON();
  assert.ok(dev, 'dev command must be in the deployed registry');
  assert.deepEqual(dev.options.map(({ name }) => name), [
    'reset-join-rotations', 'clear-waiting', 'reset-grouping', 'close',
    'open', 'add-mock-user', 'add-mock-leader', 'group', 'clear-leaders',
  ]);
});

test('exports the lobby command in the deployed registry', () => {
  const lobby = commands.find((command) => command.data.name === 'lobby')?.data.toJSON();
  assert.ok(lobby, 'lobby command must be in the deployed registry');
  assert.deepEqual(lobby.options.map(({ name }) => name), ['code']);
});
