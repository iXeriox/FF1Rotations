function pairKey(a, b) {
  return [a, b].sort().join(':');
}

function repeatCost(groups, playerId, pairCounts) {
  return groups.reduce(
    (total, member) => total + (pairCounts[pairKey(member, playerId)] ?? 0),
    0,
  );
}

/** Assign players evenly while preferring teammates they have met least often. */
export function createGroups(players, leaders, pairCounts, random = Math.random) {
  if (!leaders.length) throw new Error('Add at least one leader before creating groups.');

  const shuffled = players
    .filter((id) => !leaders.includes(id))
    .map((id) => ({ id, tieBreaker: random() }))
    .sort((a, b) => a.tieBreaker - b.tieBreaker)
    .map(({ id }) => id);
  const groups = leaders.map((leader) => [leader]);

  for (const player of shuffled) {
    const smallestSize = Math.min(...groups.map((group) => group.length));
    const candidates = groups
      .map((group, index) => ({ index, size: group.length, cost: repeatCost(group, player, pairCounts) }))
      .filter(({ size }) => size === smallestSize)
      .sort((a, b) => a.cost - b.cost || random() - 0.5);
    groups[candidates[0].index].push(player);
  }

  return groups;
}

export function recordGroups(groups, pairCounts) {
  for (const group of groups) {
    for (let first = 0; first < group.length; first += 1) {
      for (let second = first + 1; second < group.length; second += 1) {
        const key = pairKey(group[first], group[second]);
        pairCounts[key] = (pairCounts[key] ?? 0) + 1;
      }
    }
  }
}
