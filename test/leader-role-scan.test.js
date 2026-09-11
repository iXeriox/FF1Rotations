import assert from 'node:assert/strict';
import test from 'node:test';
import { removeRoleFromAllMembers } from '../src/ui/rotation-space.js';

test('leader reset scans the guild and removes roles missing from saved state', async () => {
  const removed = [];
  const makeMember = (id, hasRole) => ({
    id,
    roles: {
      cache: { has: () => hasRole },
      remove: async () => { removed.push(id); },
    },
  });
  const members = new Map([
    ['saved-leader', makeMember('saved-leader', true)],
    ['unsaved-leader', makeMember('unsaved-leader', true)],
    ['ordinary-member', makeMember('ordinary-member', false)],
  ]);
  const guild = { members: { fetch: async (id) => (id ? members.get(id) : members) } };
  const role = { id: 'leader-role', members: new Map() };

  const count = await removeRoleFromAllMembers(guild, role, ['saved-leader']);

  assert.equal(count, 2);
  assert.deepEqual(removed.sort(), ['saved-leader', 'unsaved-leader']);
});
