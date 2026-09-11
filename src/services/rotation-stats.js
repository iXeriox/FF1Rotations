const emptyStats = () => ({ commendations: 0, rotations: 0, lastRotationAt: null });

export function recordRotation(state, groups, completedAt = Math.floor(Date.now() / 1000)) {
  state.rounds += 1;
  state.lastGroups = groups;
  state.commendationsBy = [];

  for (const userId of new Set(groups.flat())) {
    const stats = state.userStats[userId] ?? emptyStats();
    stats.rotations += 1;
    stats.lastRotationAt = completedAt;
    state.userStats[userId] = stats;
  }
}

export function commendTeammate(state, giverId, recipientId) {
  if (giverId === recipientId) return { ok: false, message: 'You cannot commend yourself.' };
  const team = state.lastGroups.find((group) => group.includes(giverId));
  if (!team) return { ok: false, message: 'You were not part of the latest rotation.' };
  if (!team.includes(recipientId)) return { ok: false, message: 'You can only commend someone from your team in the latest rotation.' };
  if (state.commendationsBy.includes(giverId)) {
    return { ok: false, message: 'You have already used your commendation for the latest rotation.' };
  }

  const stats = state.userStats[recipientId] ?? emptyStats();
  stats.commendations += 1;
  state.userStats[recipientId] = stats;
  state.commendationsBy.push(giverId);
  return { ok: true };
}

export function getUserStats(state, userId) {
  return { ...emptyStats(), ...state.userStats[userId] };
}
