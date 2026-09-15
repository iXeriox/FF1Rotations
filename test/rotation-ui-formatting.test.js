import assert from 'node:assert/strict';
import test from 'node:test';
import { groupEmbeds, replaceLeaderRoleAssignments, waitingEmbed } from '../src/ui/rotation-space.js';

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

test('replaces previous Rotation Leader assignments with the next leaders', async () => {
  const changes = [];
  const member = (id, hasRole = false) => ({
    roles: {
      cache: new Map(hasRole ? [['role', {}]] : []),
      add: async () => changes.push(`add:${id}`),
      remove: async () => changes.push(`remove:${id}`),
    },
  });
  const guild = { members: { cache: new Map([
    ['old', member('old', true)],
    ['kept', member('kept', true)],
    ['new', member('new')],
  ]), fetch: async () => null } };

  await replaceLeaderRoleAssignments(guild, { id: 'role' }, ['old', 'kept'], ['kept', 'new']);
  assert.deepEqual(changes.sort(), ['add:kept', 'add:new', 'remove:old']);
});
