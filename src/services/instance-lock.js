import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rm, stat, utimes } from 'node:fs/promises';
import { dirname } from 'node:path';

const DEFAULT_STALE_MS = 30_000;
const DEFAULT_HEARTBEAT_MS = 5_000;

async function readLock(file) {
  return readFile(file, 'utf8').then(JSON.parse).catch(() => ({}));
}

export async function acquireInstanceLock(file, options = {}) {
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;
  const heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
  const owner = randomUUID();
  await mkdir(dirname(file), { recursive: true });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const handle = await open(file, 'wx');
      try {
        await handle.writeFile(JSON.stringify({ owner, pid: process.pid, startedAt: new Date().toISOString() }));
        await handle.close();
      } catch (error) {
        await handle.close().catch(() => {});
        await rm(file, { force: true });
        throw error;
      }

      const heartbeat = setInterval(async () => {
        const current = await readLock(file);
        if (current.owner !== owner) return;
        const now = new Date();
        await utimes(file, now, now).catch(() => {});
      }, heartbeatMs);
      heartbeat.unref();

      let released = false;
      return async () => {
        if (released) return;
        released = true;
        clearInterval(heartbeat);
        const current = await readLock(file);
        if (current.owner === owner) await rm(file, { force: true });
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const details = await stat(file).catch(() => null);
      const ageMs = details ? Date.now() - details.mtimeMs : 0;
      if (!details || ageMs < staleMs) {
        const current = await readLock(file);
        throw new Error(`Another bot instance owns the active lock${current.pid ? ` (PID ${current.pid})` : ''}. Stop duplicate instances before starting this one.`);
      }
      await rm(file, { force: true });
    }
  }
  throw new Error('Could not acquire the bot instance lock.');
}

export async function acquireInstanceLocks(files, options = {}) {
  const releases = [];
  try {
    for (const file of new Set(files)) releases.push(await acquireInstanceLock(file, options));
  } catch (error) {
    await Promise.all(releases.map((release) => release()));
    throw error;
  }
  return async () => {
    await Promise.all(releases.reverse().map((release) => release()));
  };
}
