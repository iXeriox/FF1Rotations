import assert from 'node:assert/strict';
import test from 'node:test';
import meta, { META_MODES } from '../src/commands/meta.js';

test('registers the supported meta game modes', () => {
  const command = meta.data.toJSON();
  assert.equal(command.name, 'meta');
  assert.equal(command.default_member_permissions, undefined);
  assert.deepEqual(command.options[0].choices.map(({ name, value }) => ({ name, value })), [
    { name: 'Resurgence', value: 'resurgence' },
    { name: 'Battle Royale', value: 'battle-royale' },
    { name: 'Multiplayer', value: 'multiplayer' },
    { name: 'Ranked Play', value: 'ranked' },
    { name: 'Zombies', value: 'zombies' },
  ]);
});

test('publishes live meta and official patch-note links for the selected mode', async () => {
  let response;
  await meta.execute({
    options: { getString: (name, required) => {
      assert.equal(name, 'mode');
      assert.equal(required, true);
      return 'resurgence';
    } },
    reply: async (value) => { response = value; },
  });

  const embed = response.embeds[0].toJSON();
  assert.equal(embed.title, 'Resurgence meta');
  assert.equal(embed.url, META_MODES.resurgence.url);
  assert.match(embed.fields[0].value, /live Resurgence meta/);
  assert.match(embed.fields[1].value, /callofduty\.com\/patchnotes/);
});

test('rejects an unavailable meta category', async () => {
  let response;
  await meta.execute({
    options: { getString: () => 'unknown' },
    reply: async (value) => { response = value; },
  });
  assert.deepEqual(response, { content: 'That meta category is not available.', ephemeral: true });
});
