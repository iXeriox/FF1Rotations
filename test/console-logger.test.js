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
