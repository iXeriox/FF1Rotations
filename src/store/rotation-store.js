import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const emptyGuild = () => ({
  players: [],
  playerQueuedAt: {},
  leaders: [],
  waitingOpen: false,
  lastGroups: [],
  commendationsBy: [],
  userStats: {},
  birthdays: {},
  birthdayAnnouncements: {},
  streams: {},
  streamNotificationChannelId: null,
  pairCounts: {},
  rounds: 0,
  ui: {},
});

export class RotationStore {
  #file;
  #data = { guilds: {} };
  #writeQueue = Promise.resolve();
  #mutationQueue = Promise.resolve();

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
    return structuredClone({ ...emptyGuild(), ...this.#data.guilds[guildId] });
  }

  update(guildId, updater) {
    const mutation = async () => {
      const state = this.get(guildId);
      const result = await updater(state);
      this.#data.guilds[guildId] = state;
      await this.#save();
      return result;
    };
    this.#mutationQueue = this.#mutationQueue.then(mutation, mutation);
    return this.#mutationQueue;
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
