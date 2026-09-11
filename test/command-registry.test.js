import assert from 'node:assert/strict';
import test from 'node:test';
import { commands } from '../src/commands/index.js';

test('exports a visible stream command with all management subcommands', () => {
  const stream = commands.find((command) => command.data.name === 'stream')?.data.toJSON();
  assert.ok(stream, 'stream command must be in the deployed registry');
  assert.equal(stream.default_member_permissions, undefined);
  assert.deepEqual(stream.options.map(({ name }) => name), ['add', 'remove', 'channel', 'list', 'help']);
});
