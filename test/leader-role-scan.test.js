import assert from 'node:assert/strict';
import test from 'node:test';
import { removeRoleFromAllMembers, removeRoleFromAllMembersDetailed } from '../src/ui/rotation-space.js';

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

test('leader reset reports members whose role cannot be removed', async () => {
  const member = {
    id: 'blocked-leader',
    roles: {
      cache: { has: () => true },
      remove: async () => { throw new Error('Missing Permissions'); },
    },
  };
  const members = new Map([[member.id, member]]);
  const guild = { members: { fetch: async () => members } };
  const role = { id: 'leader-role', members: new Map() };

  const result = await removeRoleFromAllMembersDetailed(guild, role);

  assert.deepEqual(result.removed, []);
  assert.deepEqual(result.failed, [{ id: 'blocked-leader', error: 'Missing Permissions' }]);
});
