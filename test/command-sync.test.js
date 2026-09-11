import assert from 'node:assert/strict';
import test from 'node:test';
import { syncCommands } from '../src/services/command-sync.js';

const commands = [
  { data: { toJSON: () => ({ name: 'join', description: 'Join.' }) } },
  { data: { toJSON: () => ({ name: 'group', description: 'Group.' }) } },
];

test('syncs commands immediately to every connected guild by default', async () => {
  const received = [];
  const client = {
    guilds: {
      cache: new Map([
        ['one', { commands: { set: async (definitions) => received.push(['one', definitions]) } }],
        ['two', { commands: { set: async (definitions) => received.push(['two', definitions]) } }],
      ]),
      fetch: async () => assert.fail('should not fetch a guild'),
    },
  };

  assert.equal(await syncCommands(client, commands), 'Synced 2 commands to 2 guilds.');
  assert.deepEqual(received.map(([guild]) => guild).sort(), ['one', 'two']);
  assert.deepEqual(received[0][1].map(({ name }) => name), ['join', 'group']);
});

test('syncs commands immediately to the configured development guild', async () => {
  let received;
  const guild = { name: 'Test server', commands: { set: async (definitions) => { received = definitions; } } };
  const client = {
    guilds: { cache: new Map(), fetch: async (id) => {
      assert.equal(id, 'guild-id');
      return guild;
    } },
  };

  assert.equal(await syncCommands(client, commands, 'guild-id'), 'Synced 2 commands to Test server.');
  assert.equal(received.length, 2);
});
