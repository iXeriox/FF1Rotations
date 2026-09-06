import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const emptyGuild = () => ({ players: [], leaders: [], pairCounts: {}, rounds: 0 });

export class RotationStore {
  #file;
  #data = { guilds: {} };
  #writeQueue = Promise.resolve();

  constructor(file) {
    this.#file = file;
  }

  async load() {
    try {
      this.#data = JSON.parse(await readFile(this.#file, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  get(guildId) {
    return structuredClone(this.#data.guilds[guildId] ?? emptyGuild());
  }

  async update(guildId, updater) {
    const state = this.get(guildId);
    const result = await updater(state);
    this.#data.guilds[guildId] = state;
    await this.#save();
    return result;
  }

  async #save() {
    this.#writeQueue = this.#writeQueue.then(async () => {
      await mkdir(dirname(this.#file), { recursive: true });
      const temporaryFile = `${this.#file}.tmp`;
      await writeFile(temporaryFile, JSON.stringify(this.#data, null, 2));
      await rename(temporaryFile, this.#file);
    });
    return this.#writeQueue;
  }
}
