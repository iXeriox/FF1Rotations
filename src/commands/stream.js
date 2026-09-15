import { SlashCommandBuilder } from 'discord.js';
import {
  addStream, removeStream, setDefaultStreamChannel, setStreamChannel, streamUrl,
} from '../services/streams.js';
import { guildOnly, requireAdmin } from './helpers.js';

const platformOption = (option) => option.setName('platform').setDescription('Streaming platform.').setRequired(true)
  .addChoices({ name: 'TikTok', value: 'tiktok' }, { name: 'Twitch', value: 'twitch' });

export default {
  data: new SlashCommandBuilder().setName('stream').setDescription('Manage live-stream notifications.')
    .addSubcommand((command) => command.setName('add').setDescription('Monitor a TikTok or Twitch user.')
      .addStringOption(platformOption)
      .addStringOption((option) => option.setName('name').setDescription('TikTok or Twitch username.').setRequired(true))
      .addChannelOption((option) => option.setName('channel').setDescription('Optional alert channel override for this stream.')))
    .addSubcommand((command) => command.setName('remove').setDescription('Stop monitoring a user.')
      .addStringOption(platformOption)
      .addStringOption((option) => option.setName('name').setDescription('TikTok or Twitch username.').setRequired(true)))
    .addSubcommand((command) => command.setName('channel').setDescription('Set the live-announcements channel.')
      .addChannelOption((option) => option.setName('channel').setDescription('Where all live alerts will be posted.').setRequired(true)))
    .addSubcommand((command) => command.setName('route').setDescription('Set a channel override for one monitored stream.')
      .addStringOption(platformOption)
      .addStringOption((option) => option.setName('name').setDescription('TikTok or Twitch username.').setRequired(true))
      .addChannelOption((option) => option.setName('channel').setDescription('Override channel; omit to use the server default.')))
    .addSubcommand((command) => command.setName('list').setDescription('List monitored streams.'))
    .addSubcommand((command) => command.setName('help').setDescription('Explain stream notifications.')),
  async execute(interaction, { store, streamScanner }) {
    if (!guildOnly(interaction)) return;
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'help') {
      await interaction.reply({ content: 'First use `/stream channel` to select the server default, then use `/stream add`. Add an optional channel for one stream, or change it later with `/stream route`. TikTok and Twitch can be checked without credentials; Twitch API credentials are optional and improve reliability.', ephemeral: true });
      return;
    }
    if (subcommand !== 'add' && !requireAdmin(interaction)) return;
    if (subcommand === 'channel') {
      const channel = interaction.options.getChannel('channel', true);
      if (!channel.isTextBased()) {
        await interaction.reply({ content: 'Choose a text-based channel for live announcements.', ephemeral: true });
        return;
      }
      await store.update(interaction.guildId, (state) => setDefaultStreamChannel(state, channel.id));
      await interaction.reply({ content: `Live announcements will now be posted in <#${channel.id}>.`, ephemeral: true });
      return;
    }
    if (subcommand === 'list') {
      const state = store.get(interaction.guildId);
      const streams = Object.values(state.streams);
      const content = streams.length
        ? `**Default announcement channel:** ${state.streamNotificationChannelId ? `<#${state.streamNotificationChannelId}>` : '_Not configured_'}\n\n${streams.map((stream) => `• **${stream.platform}** — [${stream.name}](${streamUrl(stream.platform, stream.name)}) — ${stream.channelId ? `<#${stream.channelId}>` : '_server default_'}`).join('\n')}`
        : 'No streams are currently being monitored.';
      await interaction.reply({ content, ephemeral: true });
      return;
    }
    const platform = interaction.options.getString('platform', true);
    const name = interaction.options.getString('name', true);
    const state = store.get(interaction.guildId);
    const channel = subcommand === 'remove' ? null : interaction.options.getChannel('channel', false);
    if (channel && !channel.isTextBased()) {
      await interaction.reply({ content: 'Choose a text-based channel for live announcements.', ephemeral: true });
      return;
    }
    if (['add', 'route'].includes(subcommand) && !channel && !state.streamNotificationChannelId) {
      await interaction.reply({ content: 'Set a live-announcements channel with `/stream channel` before adding streamers.', ephemeral: true });
      return;
    }
    const result = await store.update(interaction.guildId, (state) => (
      subcommand === 'add' ? addStream(state, platform, name, channel?.id)
        : subcommand === 'route' ? setStreamChannel(state, platform, name, channel?.id)
          : removeStream(state, platform, name)
    ));
    await interaction.reply({
      content: result.ok
        ? (subcommand === 'add' ? `Now monitoring **${result.stream.name}** on **${result.stream.platform}** in ${channel ? `<#${channel.id}>` : "this server's default alert channel"}.`
          : subcommand === 'route' ? `That stream now uses ${channel ? `<#${channel.id}>` : "this server's default alert channel"}.`
            : 'That stream was removed.')
        : result.message,
      ephemeral: true,
    });
    if (result.ok && subcommand === 'add') void streamScanner.scan(interaction.guildId).catch(console.error);
  },
};
