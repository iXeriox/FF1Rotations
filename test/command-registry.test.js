import assert from 'node:assert/strict';
import test from 'node:test';
import { commands } from '../src/commands/index.js';

test('exports a visible stream command with all management subcommands', () => {
  const stream = commands.find((command) => command.data.name === 'stream')?.data.toJSON();
  assert.ok(stream, 'stream command must be in the deployed registry');
  assert.equal(stream.default_member_permissions, undefined);
  assert.deepEqual(stream.options.map(({ name }) => name), ['add', 'remove', 'channel', 'route', 'list', 'help']);
});

test('exports the developer command in the deployed registry', () => {
  const dev = commands.find((command) => command.data.name === 'dev')?.data.toJSON();
  assert.ok(dev, 'dev command must be in the deployed registry');
  assert.deepEqual(dev.options.map(({ name }) => name), [
    'add-stream', 'remove-stream', 'stream-channel', 'default-stream-channel',
    'reset-join-rotations', 'clear-waiting', 'clear-grouping', 'remove-threading', 'close',
    'open', 'add-mock-user', 'add-mock-leader', 'group', 'clear-leaders',
  ]);
});

test('exports the lobby command in the deployed registry', () => {
  const lobby = commands.find((command) => command.data.name === 'lobby')?.data.toJSON();
  assert.ok(lobby, 'lobby command must be in the deployed registry');
  assert.deepEqual(lobby.options.map(({ name }) => name), ['code']);
});

test('exports the meta command in the deployed registry', () => {
  const meta = commands.find((command) => command.data.name === 'meta')?.data.toJSON();
  assert.ok(meta, 'meta command must be in the deployed registry');
  assert.deepEqual(meta.options[0].choices.map(({ value }) => value), [
    'resurgence', 'battle-royale', 'multiplayer', 'ranked', 'zombies',
  ]);
});

test('exports separate random and administrator-selected grouping commands', () => {
  const group = commands.find((command) => command.data.name === 'group')?.data.toJSON();
  const groupold = commands.find((command) => command.data.name === 'groupold')?.data.toJSON();
  assert.ok(group);
  assert.ok(groupold);
  assert.equal(group.default_member_permissions, '32');
  assert.equal(groupold.default_member_permissions, '32');
});
