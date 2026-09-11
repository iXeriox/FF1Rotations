import { SlashCommandBuilder } from 'discord.js';
import { addStream, removeStream, streamUrl } from '../services/streams.js';
import { guildOnly, requireAdmin } from './helpers.js';

const platformOption = (option) => option.setName('platform').setDescription('Streaming platform.').setRequired(true)
  .addChoices({ name: 'TikTok', value: 'tiktok' }, { name: 'Twitch', value: 'twitch' });

export default {
  data: new SlashCommandBuilder().setName('stream').setDescription('Manage live-stream notifications.')
    .setDefaultMemberPermissions('32')
    .addSubcommand((command) => command.setName('add').setDescription('Monitor a TikTok or Twitch user in this channel.')
      .addStringOption(platformOption)
      .addStringOption((option) => option.setName('name').setDescription('TikTok or Twitch username.').setRequired(true)))
    .addSubcommand((command) => command.setName('remove').setDescription('Stop monitoring a user.')
      .addStringOption(platformOption)
      .addStringOption((option) => option.setName('name').setDescription('TikTok or Twitch username.').setRequired(true)))
    .addSubcommand((command) => command.setName('list').setDescription('List monitored streams.'))
    .addSubcommand((command) => command.setName('help').setDescription('Explain stream notifications.')),
  async execute(interaction, { store, streamScanner }) {
    if (!guildOnly(interaction) || !requireAdmin(interaction)) return;
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'help') {
      await interaction.reply({ content: 'Use `/stream add` in the channel where notifications should appear. TikTok works without credentials; Twitch requires `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`.', ephemeral: true });
      return;
    }
    if (subcommand === 'list') {
      const streams = Object.values(store.get(interaction.guildId).streams);
      const content = streams.length
        ? streams.map((stream) => `• **${stream.platform}** — [${stream.name}](${streamUrl(stream.platform, stream.name)}) in <#${stream.channelId}>`).join('\n')
        : 'No streams are currently being monitored.';
      await interaction.reply({ content, ephemeral: true });
      return;
    }
    const platform = interaction.options.getString('platform', true);
    const name = interaction.options.getString('name', true);
    const result = await store.update(interaction.guildId, (state) => (
      subcommand === 'add'
        ? addStream(state, platform, name, interaction.channelId)
        : removeStream(state, platform, name)
    ));
    await interaction.reply({
      content: result.ok
        ? (subcommand === 'add' ? `Now monitoring **${result.stream.name}** on **${result.stream.platform}** in this channel.` : 'That stream was removed.')
        : result.message,
      ephemeral: true,
    });
    if (result.ok && subcommand === 'add') void streamScanner.scan().catch(console.error);
  },
};
