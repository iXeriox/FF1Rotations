import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { mention } from '../commands/helpers.js';

export const JOIN_BUTTON_ID = 'rotation:join';

const waitingEmbed = (state) => new EmbedBuilder()
  .setColor(state.waitingOpen ? 0x57f287 : 0xed4245)
  .setTitle(`Rotation waiting list — ${state.waitingOpen ? 'OPEN' : 'CLOSED'}`)
  .setDescription(state.waitingOpen
    ? 'Press **Join rotation** below to enter the waiting list. Leaders are included automatically and do not need to join.'
    : 'Signups are not currently running. An administrator will open the waiting list before the next rotation.')
  .addFields({ name: 'Waiting', value: `${state.players.length} player${state.players.length === 1 ? '' : 's'}`, inline: true })
  .setFooter({ text: 'You will receive a private confirmation when you join.' });

const joinComponents = (waitingOpen) => [new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId(JOIN_BUTTON_ID).setLabel(waitingOpen ? 'Join rotation' : 'Waiting list closed')
    .setEmoji(waitingOpen ? '✅' : '🔒').setStyle(ButtonStyle.Success).setDisabled(!waitingOpen),
)];

const groupingPlaceholder = () => new EmbedBuilder()
  .setColor(0xfee75c)
  .setTitle('Rotation groups')
  .setDescription('No groups have been generated yet. An administrator can use `/group` when everyone is ready.');

const groupEmbeds = (groups) => groups.map((group, index) => new EmbedBuilder()
  .setColor(0x57f287)
  .setTitle(`Team ${index + 1}`)
  .setDescription(`**Leader:** ${mention(group[0])}\n\n**Players**\n${group.length > 1 ? group.slice(1).map(mention).join('\n') : '_No players assigned_'}`));

async function getMessage(channel, messageId) {
  if (!messageId) return null;
  return channel.messages.fetch(messageId).catch(() => null);
}

async function findOrCreateChannel(guild, savedId, name, options) {
  const saved = savedId ? await guild.channels.fetch(savedId).catch(() => null) : null;
  if (saved?.type === ChannelType.GuildText) {
    if (saved.parentId !== options.parent) {
      await saved.setParent(options.parent, { lockPermissions: false, reason: 'Restore the rotation channel to its category' });
    }
    return saved;
  }
  return guild.channels.create({ name, type: ChannelType.GuildText, ...options });
}

async function reconcileOverflowMessages(channel, savedIds, embeds) {
  const ids = [];
  const chunks = [];
  for (let index = 10; index < embeds.length; index += 10) chunks.push(embeds.slice(index, index + 10));

  for (const [index, chunk] of chunks.entries()) {
    let message = await getMessage(channel, savedIds[index]);
    if (message) await message.edit({ embeds: chunk });
    else message = await channel.send({ embeds: chunk });
    ids.push(message.id);
  }
  await Promise.all(savedIds.slice(chunks.length).map(async (messageId) => {
    const message = await getMessage(channel, messageId);
    if (message) await message.delete();
  }));
  return ids;
}

export function createRotationUi(store) {
  async function ensure(guild) {
    const current = store.get(guild.id);
    let leaderRole = current.ui.leaderRoleId
      ? await guild.roles.fetch(current.ui.leaderRoleId).catch(() => null)
      : null;
    leaderRole ??= await guild.roles.create({ name: 'Rotation Leader', color: 0x57f287, reason: 'Rotation bot setup' });

    let category = current.ui.categoryId
      ? await guild.channels.fetch(current.ui.categoryId).catch(() => null)
      : null;
    category ??= await guild.channels.create({ name: 'Rotations', type: ChannelType.GuildCategory, reason: 'Rotation bot setup' });

    const botId = guild.members.me.id;
    const joinChannel = await findOrCreateChannel(guild, current.ui.joinChannelId, 'join-rotation', {
      parent: category.id,
      topic: 'Join the waiting list for the next rotation.',
      permissionOverwrites: [
        { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
        { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ],
      reason: 'Rotation bot setup',
    });
    const groupingPermissions = [
      { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
      { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    ];
    const groupingChannel = await findOrCreateChannel(guild, current.ui.groupingChannelId, 'grouping', {
      parent: category.id,
      topic: 'Read-only team assignments for the latest rotation.',
      permissionOverwrites: groupingPermissions,
      reason: 'Rotation bot setup',
    });
    if (current.ui.visibilityVersion !== 2) {
      await groupingChannel.edit({
        parent: category.id,
        topic: 'Read-only team assignments for the latest rotation.',
        permissionOverwrites: groupingPermissions,
        reason: 'Make rotation groups visible to everyone',
      });
    }

    let joinMessage = await getMessage(joinChannel, current.ui.joinMessageId);
    joinMessage ??= await joinChannel.send({ embeds: [waitingEmbed(current)], components: joinComponents(current.waitingOpen) });
    let groupingMessage = await getMessage(groupingChannel, current.ui.groupingMessageId);
    const currentGroupEmbeds = groupEmbeds(current.lastGroups);
    groupingMessage ??= await groupingChannel.send({
      embeds: currentGroupEmbeds.length ? currentGroupEmbeds.slice(0, 10) : [groupingPlaceholder()],
    });

    await joinMessage.edit({ embeds: [waitingEmbed(current)], components: joinComponents(current.waitingOpen) });
    await groupingMessage.edit({
      content: currentGroupEmbeds.length ? 'Latest rotation groups' : null,
      embeds: currentGroupEmbeds.length ? currentGroupEmbeds.slice(0, 10) : [groupingPlaceholder()],
    });
    const groupMessageIds = await reconcileOverflowMessages(
      groupingChannel,
      current.ui.groupMessageIds ?? [],
      currentGroupEmbeds,
    );

    await store.update(guild.id, (state) => {
      state.ui = {
        ...state.ui,
        leaderRoleId: leaderRole.id,
        categoryId: category.id,
        joinChannelId: joinChannel.id,
        joinMessageId: joinMessage.id,
        groupingChannelId: groupingChannel.id,
        groupingMessageId: groupingMessage.id,
        groupMessageIds,
        visibilityVersion: 2,
      };
    });
    return { leaderRole, joinChannel, joinMessage, groupingChannel, groupingMessage };
  }

  async function refreshWaiting(guild) {
    const ui = await ensure(guild);
    const state = store.get(guild.id);
    await ui.joinMessage.edit({ embeds: [waitingEmbed(state)], components: joinComponents(state.waitingOpen) });
  }

  async function publishGroups(guild, groups) {
    const ui = await ensure(guild);
    const embeds = groupEmbeds(groups);
    await ui.groupingMessage.edit({
      content: `Groups generated <t:${Math.floor(Date.now() / 1000)}:R>`,
      embeds: embeds.slice(0, 10),
    });
  }

  async function resetGroups(guild) {
    const ui = await ensure(guild);
    const overflowIds = store.get(guild.id).ui.groupMessageIds ?? [];
    await Promise.all(overflowIds.map(async (messageId) => {
      const message = await getMessage(ui.groupingChannel, messageId);
      if (message) await message.delete();
    }));
    await ui.groupingMessage.edit({ content: null, embeds: [groupingPlaceholder()] });
    await store.update(guild.id, (state) => { state.ui.groupMessageIds = []; });
  }

  async function clearLeaderRoles(guild, leaderIds) {
    const { leaderRole } = await ensure(guild);
    await Promise.all(leaderIds.map(async (memberId) => {
      const member = await guild.members.fetch(memberId).catch(() => null);
      if (member?.roles.cache.has(leaderRole.id)) {
        await member.roles.remove(leaderRole, 'Rotation completed');
      }
    }));
  }

  return { ensure, publishGroups, refreshWaiting, resetGroups, clearLeaderRoles };
}
