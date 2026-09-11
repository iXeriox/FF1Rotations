import assert from 'node:assert/strict';
import { mkdtemp, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { acquireInstanceLock, acquireInstanceLocks } from '../src/services/instance-lock.js';

test('prevents two live bot processes from using the same lock', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rotation-lock-'));
  const file = join(directory, 'bot.lock');
  const options = { heartbeatMs: 5, staleMs: 20 };
  const release = await acquireInstanceLock(file, options);
  await new Promise((resolve) => setTimeout(resolve, 40));
  await assert.rejects(acquireInstanceLock(file, options), /active lock.*PID/i);
  await release();

  const releaseAgain = await acquireInstanceLock(file);
  await releaseAgain();
});

test('recovers a stale or malformed instance lock', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rotation-lock-'));
  const file = join(directory, 'bot.lock');
  await writeFile(file, '{not-json');
  const old = new Date(Date.now() - 60_000);
  await utimes(file, old, old);
  const release = await acquireInstanceLock(file, { staleMs: 30_000 });
  await release();
});

test('acquires and releases both storage and token locks', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rotation-lock-'));
  const files = [join(directory, 'data.lock'), join(directory, 'token.lock')];
  const release = await acquireInstanceLocks(files);
  await assert.rejects(acquireInstanceLock(files[0]), /active lock/i);
  await assert.rejects(acquireInstanceLock(files[1]), /active lock/i);
  await release();
  const releases = await Promise.all(files.map((file) => acquireInstanceLock(file)));
  await Promise.all(releases.map((unlock) => unlock()));
});
