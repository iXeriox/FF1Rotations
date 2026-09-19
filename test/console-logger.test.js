import assert from 'node:assert/strict';
import test from 'node:test';
import { createConsoleLogger } from '../src/services/console-logger.js';

const interaction = {
  channelId: 'channel',
  commandName: 'stream',
  customId: null,
  guildId: 'guild',
  isButton: () => false,
  isChatInputCommand: () => true,
  options: { getSubcommand: () => 'add' },
  user: { id: 'user' },
};

test('logs guild conversations in a compact single-line format', () => {
  const messages = [];
  const logger = createConsoleLogger(
    { info: (message) => messages.push(message) },
    () => new Date('2026-09-19T15:30:00Z'),
  );

  logger.chatMessage({
    author: { id: 'user-id', username: 'username' },
    channel: { name: 'general' },
    channelId: 'channel-id',
    content: 'First line\nSecond line',
    member: { displayName: 'Display Name' },
  });

  assert.equal(messages[0], '2026-09-19T15:30:00.000Z [general] - <Display Name> First line Second line');
});

test('warns once when Discord does not provide message content', () => {
  const messages = [];
  const warnings = [];
  const logger = createConsoleLogger({
    info: (message) => messages.push(message),
    warn: (message) => warnings.push(message),
  }, () => new Date('2026-09-19T15:30:00Z'));
  const message = {
    author: { id: 'user-id', username: 'username' },
    channel: { name: 'general' },
    content: '',
  };

  logger.chatMessage(message);
  logger.chatMessage(message);

  assert.match(messages[0], /\[general\] - <username> \[no text content\]/);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Enable the Message Content Intent/);
});

test('logs command lifecycle context without command option values', () => {
  const messages = [];
  const output = {
    info: (message) => messages.push(message),
    error: (message) => messages.push(message),
  };
  const logger = createConsoleLogger(output, () => new Date('2026-09-11T12:00:00Z'));
  logger.interactionStarted(interaction);
  logger.interactionCompleted(interaction, 12.6);
  logger.interactionFailed(interaction, 14.2, new Error('test failure'));

  assert.match(messages[0], /^\[2026-09-11T12:00:00\.000Z\].*started.*action="\/stream add"/);
  assert.match(messages[1], /completed.*user=user.*guild=guild.*channel=channel.*duration_ms=13/);
  assert.match(messages[2], /failed.*duration_ms=14.*error="test failure"/);
  assert.ok(messages.every((message) => !message.includes('tiktok_username')));
});

test('logs stream checks, alerts, failures, and scan totals with server context', () => {
  const messages = [];
  const output = { info: (message) => messages.push(message), error: (message) => messages.push(message) };
  const logger = createConsoleLogger(output, () => new Date('2026-09-14T12:00:00Z'));
  logger.streamScanStarted(2, 3);
  logger.streamChecked({ guildId: 'guild', platform: 'twitch', name: 'creator', live: false, durationMs: 12.6 });
  logger.streamAlerted({ guildId: 'guild', platform: 'twitch', name: 'creator', channelId: 'alerts' });
  logger.streamCheckFailed({ guildId: 'guild', platform: 'tiktok', name: 'broken', error: new Error('HTTP 403') });
  logger.streamScanCompleted(3, 1, 99.6);

  assert.match(messages[0], /scan_started guilds=2 streams=3/);
  assert.match(messages[1], /checked guild=guild platform=twitch name=creator live=false duration_ms=13/);
  assert.match(messages[2], /alert_sent guild=guild.*channel=alerts/);
  assert.match(messages[3], /check_failed guild=guild platform=tiktok name=broken error="HTTP 403"/);
  assert.match(messages[4], /scan_completed streams=3 alerts=1 duration_ms=100/);
});
