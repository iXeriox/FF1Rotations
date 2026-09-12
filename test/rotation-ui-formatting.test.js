import assert from 'node:assert/strict';
import test from 'node:test';
import { groupEmbeds, replaceGroupingMessage, waitingEmbed } from '../src/ui/rotation-space.js';

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
  assert.match(embed.fields[1].value, /Player Name/);
  assert.equal(embed.footer.text, '2 / 4 members  •  Squad 1 of 1');
  assert.doesNotMatch(JSON.stringify(embed), /<@/);
});

test('grouping reset deletes managed messages and posts a fresh placeholder', async () => {
  const deleted = [];
  let sent;
  const messages = new Map(['main', 'overflow'].map((id) => [id, {
    delete: async () => deleted.push(id),
  }]));
  const channel = {
    messages: { fetch: async (id) => messages.get(id) },
    send: async (payload) => {
      sent = payload;
      return { id: 'replacement' };
    },
  };

  const replacement = await replaceGroupingMessage(channel, ['main', 'overflow', 'main']);
  assert.deepEqual(deleted.sort(), ['main', 'overflow']);
  assert.equal(replacement.id, 'replacement');
  assert.equal(sent.embeds[0].toJSON().title, 'Rotation groups');
});
