import assert from 'node:assert/strict';
import test from 'node:test';
import { createBotStatus, getBotStatusText } from '../src/services/bot-status.js';

test('prioritizes an active rotation over the birthday count', () => {
  assert.equal(getBotStatusText([
    { waitingOpen: false, birthdays: { one: {} } },
    { waitingOpen: true, birthdays: { two: {} } },
  ]), 'Rotations: Active');
});

test('counts saved birthdays while rotations are inactive', () => {
  assert.equal(getBotStatusText([
    { waitingOpen: false, birthdays: { one: {}, two: {} } },
    { waitingOpen: false, birthdays: { three: {} } },
  ]), 'Birthdays: 3');
  assert.equal(getBotStatusText([]), 'Birthdays: 0');
});

test('publishes the calculated custom Discord status', async () => {
  let presence;
  const client = {
    guilds: { cache: new Map([['guild', {}]]) },
    user: { setPresence: (value) => { presence = value; } },
  };
  const store = { get: () => ({ waitingOpen: false, birthdays: { one: {} } }) };
  const status = createBotStatus(client, store);

  assert.equal(await status.refresh(), 'Birthdays: 1');
  assert.deepEqual(presence, {
    activities: [{ name: 'FF1 Rotations', state: 'Birthdays: 1', type: 4 }],
    status: 'online',
  });
});
