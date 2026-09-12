import assert from 'node:assert/strict';
import test from 'node:test';
import { syncCommands } from '../src/services/command-sync.js';

const commands = [
  { data: { toJSON: () => ({ name: 'join', description: 'Join.' }) } },
  { data: { toJSON: () => ({ name: 'group', description: 'Group.' }) } },
];

test('syncs commands immediately to every connected guild by default', async () => {
  const received = [];
  let globalDefinitions;
  const client = {
    application: { commands: {
      fetch: async () => new Map([['old-id', { name: 'join' }]]),
      set: async (definitions) => { globalDefinitions = definitions; },
    } },
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
  assert.deepEqual(globalDefinitions, []);
});

test('syncs commands immediately to the configured development guild', async () => {
  let received;
  const guild = { name: 'Test server', commands: { set: async (definitions) => { received = definitions; } } };
  const client = {
    application: { commands: {
      fetch: async () => new Map([['old-id', { name: 'join' }]]),
      set: async (definitions) => assert.deepEqual(definitions, []),
    } },
    guilds: { cache: new Map(), fetch: async (id) => {
      assert.equal(id, 'guild-id');
      return guild;
    } },
  };

  assert.equal(await syncCommands(client, commands, 'guild-id'), 'Synced 2 commands to Test server.');
  assert.equal(received.length, 2);
});

test('rejects duplicate local command names before registration', async () => {
  const duplicateCommands = [commands[0], commands[0]];
  const client = {
    application: { commands: {
      fetch: async () => assert.fail('should reject before calling Discord'),
      set: async () => assert.fail('should not call Discord'),
    } },
    guilds: { cache: new Map() },
  };
  await assert.rejects(syncCommands(client, duplicateCommands), /duplicate local slash-command names/i);
});

test('does not overwrite global commands when there are none to remove', async () => {
  let guildDefinitions;
  const guild = { name: 'Test server', commands: { set: async (definitions) => {
    guildDefinitions = definitions;
    return new Map(definitions.map((definition, index) => [String(index), definition]));
  } } };
  const client = {
    application: { commands: {
      fetch: async () => new Map(),
      set: async () => assert.fail('empty global commands should not be overwritten'),
    } },
    guilds: { cache: new Map([['guild', guild]]) },
  };

  assert.equal(await syncCommands(client, commands), 'Synced 2 commands to 1 guild.');
  assert.deepEqual(guildDefinitions.map(({ name }) => name), ['join', 'group']);
});
