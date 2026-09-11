import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { RotationStore } from '../src/store/rotation-store.js';

test('persists isolated guild state', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rotations-'));
  const file = join(directory, 'state.json');
  const store = new RotationStore(file);
  await store.load();
  await store.update('guild-a', (state) => {
    state.players.push('player');
    state.playerQueuedAt.player = 123456;
    state.waitingOpen = true;
    state.lastGroups = [['leader', 'player']];
    state.lobbyCodes.leader = 'ABC123';
    state.ui = { categoryId: 'category', joinChannelId: 'join-channel' };
    state.birthdays.player = { day: 11, month: 9, year: 1990 };
    state.streams['twitch:player'] = { platform: 'twitch', name: 'player', channelId: 'alerts', isLive: false };
    state.streamNotificationChannelId = 'live-announcements';
    state.callOfDutyIds.player = 'Player#1234567';
  });

  const reloaded = new RotationStore(file);
  await reloaded.load();
  assert.deepEqual(reloaded.get('guild-a').players, ['player']);
  assert.equal(reloaded.get('guild-a').playerQueuedAt.player, 123456);
  assert.equal(reloaded.get('guild-a').waitingOpen, true);
  assert.deepEqual(reloaded.get('guild-a').lastGroups, [['leader', 'player']]);
  assert.equal(reloaded.get('guild-a').lobbyCodes.leader, 'ABC123');
  assert.equal(reloaded.get('guild-a').ui.categoryId, 'category');
  assert.deepEqual(reloaded.get('guild-a').birthdays.player, { day: 11, month: 9, year: 1990 });
  assert.equal(reloaded.get('guild-a').streams['twitch:player'].channelId, 'alerts');
  assert.equal(reloaded.get('guild-a').streamNotificationChannelId, 'live-announcements');
  assert.equal(reloaded.get('guild-a').callOfDutyIds.player, 'Player#1234567');
  assert.deepEqual(reloaded.get('guild-b').players, []);
  const contents = await readFile(file, 'utf8');
  assert.doesNotThrow(() => JSON.parse(contents));
});

test('serializes concurrent updates without losing players', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rotations-'));
  const store = new RotationStore(join(directory, 'state.json'));
  await store.load();

  await Promise.all(Array.from({ length: 20 }, (_, index) => store.update('guild', async (state) => {
    await new Promise((resolve) => setTimeout(resolve, index % 3));
    state.players.push(`player-${index}`);
  })));

  assert.equal(store.get('guild').players.length, 20);
  assert.deepEqual(store.get('guild').ui, {});
});

test('uses collision-free temporary files across store instances', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rotations-'));
  const file = join(directory, 'state.json');
  const first = new RotationStore(file);
  const second = new RotationStore(file);
  await Promise.all([first.load(), second.load()]);

  await Promise.all([
    ...Array.from({ length: 10 }, (_, index) => first.update('guild', (state) => state.players.push(`first-${index}`))),
    ...Array.from({ length: 10 }, (_, index) => second.update('guild', (state) => state.players.push(`second-${index}`))),
  ]);

  const contents = await readFile(file, 'utf8');
  assert.doesNotThrow(() => JSON.parse(contents));
  assert.deepEqual((await readdir(directory)).filter((name) => name.endsWith('.tmp')), []);
});
