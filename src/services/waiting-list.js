export function joinWaitingList(state, userId) {
  if (!state.waitingOpen) return { ok: false, message: 'The rotation waiting list is currently closed.' };
  if (state.leaders.includes(userId)) return { ok: false, message: 'You are a leader and are already included automatically.' };
  if (state.players.includes(userId)) return { ok: false, message: 'You are already in the rotation waiting list.' };
  state.players.push(userId);
  return { ok: true, message: 'You joined the rotation waiting list!' };
}
