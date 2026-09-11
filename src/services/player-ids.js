export function normalizeCallOfDutyId(value) {
  const id = value.replace(/\s+/g, '');
  if (id.length < 2 || id.length > 64) {
    return { ok: false, message: 'Your Call of Duty ID must be between 2 and 64 characters after spaces are removed.' };
  }
  if (/[\u0000-\u001f\u007f]/.test(id)) {
    return { ok: false, message: 'Your Call of Duty ID contains unsupported characters.' };
  }
  if (!/^[\p{L}\p{N}_.#-]+$/u.test(id)) {
    return { ok: false, message: 'Use only letters, numbers, periods, underscores, hyphens, and #.' };
  }
  return { ok: true, id };
}

export function setCallOfDutyId(state, userId, value) {
  const result = normalizeCallOfDutyId(value);
  if (!result.ok) return result;
  state.callOfDutyIds ??= {};
  state.callOfDutyIds[userId] = result.id;
  return result;
}
