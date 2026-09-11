import assert from 'node:assert/strict';
import test from 'node:test';
import { birthdaysDue, removeBirthday, setBirthday, upcomingBirthdays, validateBirthday } from '../src/services/birthdays.js';

const state = () => ({ birthdays: {}, birthdayAnnouncements: {} });

test('validates real dates and sensible birth years', () => {
  assert.equal(validateBirthday(29, 2, 2000, 2026), null);
  assert.match(validateBirthday(29, 2, 2001, 2026), /valid calendar date/i);
  assert.match(validateBirthday(1, 1, 2027, 2026), /between 1900 and 2026/i);
});

test('adds, updates, and removes a birthday', () => {
  const guild = state();
  assert.equal(setBirthday(guild, 'user', 4, 7, 1990, 2026).ok, true);
  assert.deepEqual(guild.birthdays.user, { day: 4, month: 7, year: 1990 });
  assert.equal(setBirthday(guild, 'user', 5, 8, 1990, 2026).ok, true);
  assert.deepEqual(guild.birthdays.user, { day: 5, month: 8, year: 1990 });
  assert.equal(removeBirthday(guild, 'user'), true);
  assert.equal(removeBirthday(guild, 'user'), false);
});

test('sorts birthdays by their next UTC occurrence', () => {
  const guild = state();
  setBirthday(guild, 'later', 20, 9, 1990, 2026);
  setBirthday(guild, 'tomorrow', 12, 9, 1990, 2026);
  setBirthday(guild, 'next-year', 1, 1, 1990, 2026);
  const upcoming = upcomingBirthdays(guild, new Date('2026-09-11T12:00:00Z'));
  assert.deepEqual(upcoming.map(({ userId }) => userId), ['tomorrow', 'later', 'next-year']);
  assert.equal(upcoming[0].daysUntil, 1);
});

test('returns each birthday once per calendar year', () => {
  const guild = state();
  setBirthday(guild, 'user', 11, 9, 1990, 2026);
  assert.deepEqual(birthdaysDue(guild, new Date('2026-09-11T12:00:00Z')), [{ userId: 'user', age: 36 }]);
  guild.birthdayAnnouncements.user = 2026;
  assert.deepEqual(birthdaysDue(guild, new Date('2026-09-11T15:00:00Z')), []);
  assert.deepEqual(birthdaysDue(guild, new Date('2027-09-11T12:00:00Z')), [{ userId: 'user', age: 37 }]);
});
