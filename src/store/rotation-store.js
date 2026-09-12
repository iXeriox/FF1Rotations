import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const emptyGuild = () => ({
  players: [],
  playerQueuedAt: {},
  leaders: [],
  waitingOpen: false,
  lastGroups: [],
  lobbyCodes: {},
  commendationsBy: [],
  userStats: {},
  callOfDutyIds: {},
  birthdays: {},
  birthdayAnnouncements: {},
  streams: {},
  streamNotificationChannelId: null,
  pairCounts: {},
  rounds: 0,
  ui: {},
  mockUsers: {},
});

function compact(value) {
  if (Array.isArray(value)) return value.map(compact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .map(([key, child]) => [key, compact(child)])
    .filter(([, child]) => child !== null
      && child !== false
      && child !== 0
      && child !== ''
      && (!Array.isArray(child) || child.length)
      && (Array.isArray(child) || typeof child !== 'object' || Object.keys(child).length)));
}

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
      this.#data.guilds ??= {};
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
      // Defaults are restored by get(); omitting them keeps the hand-inspectable
      // JSON focused on actual server configuration and rotation data.
      await writeFile(temporaryFile, `${JSON.stringify(compact(this.#data), null, 2)}\n`);
      await rename(temporaryFile, this.#file);
    });
    return this.#writeQueue;
  }
}
