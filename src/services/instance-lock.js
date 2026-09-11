import { mkdir, open, readFile, rm } from 'node:fs/promises';
import { dirname } from 'node:path';

function processIsRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

export async function acquireInstanceLock(file) {
  await mkdir(dirname(file), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(file, 'wx');
      try {
        await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
      } catch (error) {
        await handle.close();
        await rm(file, { force: true });
        throw error;
      }
      let released = false;
      return async () => {
        if (released) return;
        released = true;
        await handle.close();
        await rm(file, { force: true });
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const existing = await readFile(file, 'utf8').then(JSON.parse).catch(() => ({}));
      if (processIsRunning(existing.pid)) {
        throw new Error(`Another bot instance is already running with PID ${existing.pid}. Stop duplicate instances before starting this one.`);
      }
      await rm(file, { force: true });
    }
  }
  throw new Error('Could not acquire the bot instance lock.');
}
