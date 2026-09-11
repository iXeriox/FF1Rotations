import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { acquireInstanceLock } from '../src/services/instance-lock.js';

test('prevents two live bot processes from using the same lock', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rotation-lock-'));
  const file = join(directory, 'bot.lock');
  const release = await acquireInstanceLock(file);
  await assert.rejects(acquireInstanceLock(file), /already running.*PID/i);
  await release();

  const releaseAgain = await acquireInstanceLock(file);
  await releaseAgain();
});

test('recovers a stale or malformed instance lock', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rotation-lock-'));
  const file = join(directory, 'bot.lock');
  await writeFile(file, '{not-json');
  const release = await acquireInstanceLock(file);
  await release();
});
