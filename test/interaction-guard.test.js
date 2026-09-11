import assert from 'node:assert/strict';
import test from 'node:test';
import { createInteractionGuard } from '../src/services/interaction-guard.js';

test('allows an interaction ID to be handled only once', () => {
  const guard = createInteractionGuard();
  assert.equal(guard.claim('interaction-1'), true);
  assert.equal(guard.claim('interaction-1'), false);
  assert.equal(guard.claim('interaction-2'), true);
});
