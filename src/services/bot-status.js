export function getBotStatusText(guildStates) {
  if (guildStates.some((state) => state.waitingOpen)) return 'Rotations: Active';
  const birthdayCount = guildStates.reduce(
    (total, state) => total + Object.keys(state.birthdays ?? {}).length,
    0,
  );
  return `Birthdays: ${birthdayCount}`;
}

export function createBotStatus(client, store) {
  async function refresh() {
    if (!client.user) return null;
    const states = [...client.guilds.cache.keys()].map((guildId) => store.get(guildId));
    const text = getBotStatusText(states);
    client.user.setPresence({
      activities: [{ name: 'FF1 Rotations', state: text, type: 4 }],
      status: 'online',
    });
    return text;
  }

  return { refresh };
}
