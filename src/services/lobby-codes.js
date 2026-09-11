export function normalizeLobbyCode(value) {
  const code = value.trim().replace(/\s+/g, ' ');
  if (code.length < 2 || code.length > 64) {
    return { ok: false, message: 'Lobby codes must be between 2 and 64 characters.' };
  }
  if (!/^[\p{L}\p{N} _.#-]+$/u.test(code)) {
    return { ok: false, message: 'Use only letters, numbers, spaces, periods, underscores, hyphens, and #.' };
  }
  return { ok: true, code };
}

export function setLobbyCode(state, leaderId, value) {
  const team = state.lastGroups.find((group) => group[0] === leaderId);
  if (!team) return { ok: false, message: 'Only a leader from the latest rotation can set a lobby code.' };
  const result = normalizeLobbyCode(value);
  if (!result.ok) return result;
  state.lobbyCodes ??= {};
  state.lobbyCodes[leaderId] = result.code;
  return result;
}
