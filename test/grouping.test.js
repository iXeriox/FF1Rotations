import assert from 'node:assert/strict';
import test from 'node:test';
import { createGroups, createPairHistory, recordGroups } from '../src/services/grouping.js';

test('creates balanced groups headed by leaders', () => {
  const groups = createGroups(['p1', 'p2', 'p3', 'p4', 'p5'], ['l1', 'l2'], {}, () => 0.5);
  assert.deepEqual(groups.map((group) => group[0]), ['l1', 'l2']);
  assert.ok(Math.abs(groups[0].length - groups[1].length) <= 1);
  assert.deepEqual(new Set(groups.flat()), new Set(['l1', 'l2', 'p1', 'p2', 'p3', 'p4', 'p5']));
});

test('avoids a previous teammate when an equally sized group is available', () => {
  const groups = createGroups(['p1'], ['l1', 'l2'], { 'l1:p1': 4 }, () => 0.5);
  assert.deepEqual(groups, [['l1'], ['l2', 'p1']]);
});

test('records every pair in a completed group', () => {
  const counts = {};
  recordGroups([['a', 'b', 'c']], counts);
  assert.deepEqual(counts, { 'a:b': 1, 'a:c': 1, 'b:c': 1 });
  recordGroups([['b', 'a']], counts);
  assert.equal(counts['a:b'], 2);
});

test('requires at least one leader', () => {
  assert.throws(() => createGroups(['p1'], [], {}), /at least one leader/i);
});

test('caps every Call of Duty team at four members including its leader', () => {
  const groups = createGroups(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], ['l1', 'l2'], {}, () => 0.5);
  assert.deepEqual(groups.map((group) => group.length), [4, 4]);
});

test('rejects grouping when there are not enough leaders for four-player teams', () => {
  assert.throws(
    () => createGroups(['p1', 'p2', 'p3', 'p4'], ['leader'], {}),
    /limited to 4; add at least 2 leaders/i,
  );
});

test('creates a fresh history containing only the latest game', () => {
  const previousHistory = { 'old-a:old-b': 7 };
  const latestHistory = createPairHistory([['leader', 'player']]);

  assert.deepEqual(previousHistory, { 'old-a:old-b': 7 });
  assert.deepEqual(latestHistory, { 'leader:player': 1 });
});
