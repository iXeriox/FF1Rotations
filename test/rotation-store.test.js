import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { RotationStore } from '../src/store/rotation-store.js';

test('persists isolated guild state', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rotations-'));
  const file = join(directory, 'state.json');
  const store = new RotationStore(file);
  await store.load();
  await store.update('guild-a', (state) => state.players.push('player'));

  const reloaded = new RotationStore(file);
  await reloaded.load();
  assert.deepEqual(reloaded.get('guild-a').players, ['player']);
  assert.deepEqual(reloaded.get('guild-b').players, []);
  const contents = await readFile(file, 'utf8');
  assert.doesNotThrow(() => JSON.parse(contents));
});
