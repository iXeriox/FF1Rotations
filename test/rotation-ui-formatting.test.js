import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearGroupingChannel, createGuildOperationQueue, groupEmbeds, waitingEmbed,
} from '../src/ui/rotation-space.js';

const names = new Map([['leader-id', 'Leader Name'], ['player-id', 'Player Name']]);

test('queue embed uses display names and relative signup times without raw mentions', () => {
  const embed = waitingEmbed(
    { name: 'FF1', iconURL: () => null },
    { waitingOpen: true, players: ['player-id'], playerQueuedAt: { 'player-id': 123456 } },
    names,
  ).toJSON();
  assert.equal(embed.title, 'Player Queue  •  OPEN ✅');
  assert.equal(embed.fields[0].value, '1. **Player Name**\n\n└ Joined <t:123456:R>\n\n');
  assert.match(embed.fields[0].value, /Player Name.*<t:123456:R>/s);
  assert.doesNotMatch(embed.fields[0].value, /<@/);
});

test('group cards show mobile-safe names, leader, roster, and capacity', () => {
  const embed = groupEmbeds([['leader-id', 'player-id']], names)[0].toJSON();
  assert.equal(embed.title, 'SQUAD 01');
  assert.match(embed.fields[0].value, /Leader Name/);
  assert.equal(embed.fields[1].value, '_Waiting for the leader to use `/lobby`._');
  assert.match(embed.fields[2].value, /Player Name/);
  assert.equal(embed.footer.text, '2 / 4 members  •  Squad 1 of 1');
  assert.doesNotMatch(JSON.stringify(embed), /<@/);
});

test('group cards show the code submitted by their own leader', () => {
  const embed = groupEmbeds(
    [['leader-id', 'player-id']],
    names,
    { 'leader-id': 'JOIN-123' },
  )[0].toJSON();
  assert.equal(embed.fields[1].name, '🔑  LOBBY CODE');
  assert.equal(embed.fields[1].value, '**JOIN-123**');
});

test('grouping reset deletes every page of chat history and posts one fresh placeholder', async () => {
  const deleted = [];
  let sent;
  const firstPage = Array.from({ length: 100 }, (_, index) => ({
    id: `message-${index}`,
    delete: async () => deleted.push(`message-${index}`),
  }));
  const finalMessage = { id: 'oldest', delete: async () => deleted.push('oldest') };
  const channel = {
    id: 'same-channel',
    messages: { fetch: async ({ before }) => new Map(
      (before ? [finalMessage] : firstPage).map((message) => [message.id, message]),
    ) },
    send: async (payload) => {
      sent = payload;
      return { id: 'new-message' };
    },
  };

  const result = await clearGroupingChannel(channel);
  assert.equal(deleted.length, 101);
  assert.equal(result.id, 'new-message');
  assert.equal(sent.embeds[0].toJSON().title, 'Rotation groups');
});

test('rotation UI operations for one guild execute one at a time', async () => {
  const enqueue = createGuildOperationQueue();
  const guild = { id: 'guild' };
  const order = [];
  let releaseFirst;
  const firstGate = new Promise((resolve) => { releaseFirst = resolve; });
  const first = enqueue(guild, async () => {
    order.push('first-start');
    await firstGate;
    order.push('first-end');
  });
  const second = enqueue(guild, async () => { order.push('second'); });

  await new Promise((resolve) => { setImmediate(resolve); });
  assert.deepEqual(order, ['first-start']);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(order, ['first-start', 'first-end', 'second']);
});

test('a failed UI operation does not block the next interaction', async () => {
  const enqueue = createGuildOperationQueue();
  const guild = { id: 'guild' };
  await assert.rejects(enqueue(guild, async () => { throw new Error('Discord failed'); }), /Discord failed/);
  assert.equal(await enqueue(guild, async () => 'recovered'), 'recovered');
});
