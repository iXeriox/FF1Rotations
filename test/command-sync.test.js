import assert from 'node:assert/strict';
import test from 'node:test';
import { syncCommands, syncCommandsWithRetry } from '../src/services/command-sync.js';

const commands = [
  { data: { toJSON: () => ({ name: 'join', description: 'Join.' }) } },
  { data: { toJSON: () => ({ name: 'group', description: 'Group.' }) } },
];

test('syncs commands immediately to every connected guild by default', async () => {
  const received = [];
  let globalDefinitions;
  const client = {
    application: { commands: { set: async (definitions) => { globalDefinitions = definitions; } } },
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
    application: { commands: { set: async (definitions) => assert.deepEqual(definitions, []) } },
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
    application: { commands: { set: async () => assert.fail('should not call Discord') } },
    guilds: { cache: new Map() },
  };
  await assert.rejects(syncCommands(client, duplicateCommands), /duplicate local slash-command names/i);
});

test('retries transient command registration failures', async () => {
  let calls = 0;
  const guild = { commands: { set: async () => {
    calls += 1;
    if (calls < 3) throw new Error('temporary Discord failure');
  } } };
  const client = {
    application: { commands: { set: async () => {} } },
    guilds: { cache: new Map([['guild', guild]]) },
  };

  const message = await syncCommandsWithRetry(client, commands, undefined, { attempts: 3, delayMs: 1 });

  assert.equal(calls, 3);
  assert.match(message, /synced 2 commands/i);
});
