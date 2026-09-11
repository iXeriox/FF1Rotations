const DAY_MS = 86_400_000;

export function validateBirthday(day, month, year, currentYear = new Date().getUTCFullYear()) {
  if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
    return `Year must be between 1900 and ${currentYear}.`;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return 'Enter a valid calendar date.';
  }
  return null;
}

export function setBirthday(state, userId, day, month, year, currentYear) {
  const error = validateBirthday(day, month, year, currentYear);
  if (error) return { ok: false, message: error };
  state.birthdays[userId] = { day, month, year };
  return { ok: true };
}

export function removeBirthday(state, userId) {
  if (!state.birthdays[userId]) return false;
  delete state.birthdays[userId];
  delete state.birthdayAnnouncements[userId];
  return true;
}

function nextOccurrence({ day, month }, now) {
  for (let year = now.getUTCFullYear(); year <= now.getUTCFullYear() + 8; year += 1) {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCMonth() === month - 1 && date.getUTCDate() === day && date >= now) return date;
  }
  return null;
}

export function upcomingBirthdays(state, now = new Date()) {
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Object.entries(state.birthdays).map(([userId, birthday]) => {
    const next = nextOccurrence(birthday, startOfToday);
    return { userId, ...birthday, next, daysUntil: Math.round((next - startOfToday) / DAY_MS) };
  }).sort((a, b) => a.next - b.next || a.userId.localeCompare(b.userId));
}

export function birthdaysDue(state, now = new Date()) {
  const year = now.getUTCFullYear();
  return Object.entries(state.birthdays)
    .filter(([, birthday]) => birthday.day === now.getUTCDate() && birthday.month === now.getUTCMonth() + 1)
    .filter(([userId]) => state.birthdayAnnouncements[userId] !== year)
    .map(([userId, birthday]) => ({ userId, age: year - birthday.year }));
}
