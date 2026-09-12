import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  escapeMarkdown,
} from 'discord.js';

export const JOIN_BUTTON_ID = 'rotation:join';

function waitingFields(state, displayNames) {
  if (!state.players.length) return [{ name: 'Waiting (0)', value: '_Nobody is waiting yet._' }];
  const fields = [];
  let value = '';
  let displayed = 0;
  for (const [index, userId] of state.players.entries()) {
    const queuedAt = state.playerQueuedAt?.[userId];
    const name = displayNames.get(userId) ?? 'Unknown member';
    const line = `${index + 1}. **${name}**\n\n└ Joined ${queuedAt ? `<t:${queuedAt}:R>` : '_before time tracking_'}\n\n`;
    if (value.length + line.length > 900) {
      fields.push({ name: fields.length ? 'Waiting — continued' : `Waiting (${state.players.length})`, value });
      value = '';
    }
    if (fields.length === 5) break;
    value += line;
    displayed += 1;
  }
  if (value) fields.push({ name: fields.length ? 'Waiting — continued' : `Waiting (${state.players.length})`, value });
  if (displayed < state.players.length) {
    fields.push({ name: 'More players', value: `...and ${state.players.length - displayed} more waiting.` });
  }
  return fields;
}

export function waitingEmbed(guild, state, displayNames) {
  const embed = new EmbedBuilder()
    .setColor(state.waitingOpen ? 0x57f287 : 0xed4245)
    .setTitle(`Player Queue  •  ${state.waitingOpen ? 'OPEN ✅' : 'CLOSED 🔒'}`)
    .setDescription(state.waitingOpen
      ? 'Use the button below to reserve your place in the next rotation. Rotation Leaders are included automatically.'
      : 'The next rotation is not accepting players yet. This page will update when an administrator opens signups.')
    .addFields(waitingFields(state, displayNames))
    .setFooter({ text: `${state.players.length} player${state.players.length === 1 ? '' : 's'} waiting  •  Listed in signup order` })
    .setTimestamp();
  const iconURL = guild.iconURL();
  embed.setAuthor({ name: `${guild.name}  •  Rotations`, ...(iconURL ? { iconURL } : {}) });
  return embed;
}

const joinComponents = (waitingOpen) => [new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId(JOIN_BUTTON_ID).setLabel(waitingOpen ? 'Join rotation' : 'Waiting list closed')
    .setEmoji(waitingOpen ? '✅' : '🔒').setStyle(ButtonStyle.Success).setDisabled(!waitingOpen),
)];

const groupingPlaceholder = () => new EmbedBuilder()
  .setColor(0xfee75c)
  .setTitle('Rotation groups')
  .setDescription('No groups have been generated yet. An administrator can use `/group` when everyone is ready.');

const squadIcons = ['1️⃣', '2️⃣', '3️⃣'];

export const groupEmbeds = (groups, displayNames) => groups.map((group, index) => {
  const leader = displayNames.get(group[0]) ?? 'Unknown member';
  const players = group.slice(1);
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`SQUAD ${String(index + 1).padStart(2, '0')}`)
    .setDescription('Your team for the latest Call of Duty rotation.')
    .addFields(
      { name: '👑  TEAM LEADER', value: `**${leader}**` },
      {
        name: '🎮  SQUAD MEMBERS',
        value: players.length
          ? players.map((userId, playerIndex) => `${squadIcons[playerIndex] ?? '•'}  **${displayNames.get(userId) ?? 'Unknown member'}**`).join('\n')
          : '_No additional players assigned._',
      },
    )
    .setFooter({ text: `${group.length} / 4 members  •  Squad ${index + 1} of ${groups.length}` });
});

async function resolveDisplayNames(guild, userIds, mockUsers = {}) {
  const entries = await Promise.all([...new Set(userIds)].map(async (userId) => {
    if (mockUsers[userId]) return [userId, escapeMarkdown(mockUsers[userId].displayName)];
    const member = guild.members.cache.get(userId) ?? await guild.members.fetch(userId).catch(() => null);
    const name = member?.displayName ?? member?.user?.username ?? 'Unknown member';
    return [userId, escapeMarkdown(name)];
  }));
  return new Map(entries);
}

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

export async function replaceGroupingMessage(channel, messageIds) {
  await Promise.all([...new Set(messageIds.filter(Boolean))].map(async (messageId) => {
    const message = await getMessage(channel, messageId);
    if (message) await message.delete();
  }));
  return channel.send({ embeds: [groupingPlaceholder()] });
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
    const displayNames = await resolveDisplayNames(guild, [...current.players, ...current.lastGroups.flat()], current.mockUsers);
    joinMessage ??= await joinChannel.send({ embeds: [waitingEmbed(guild, current, displayNames)], components: joinComponents(current.waitingOpen) });
    let groupingMessage = await getMessage(groupingChannel, current.ui.groupingMessageId);
    const currentGroupEmbeds = groupEmbeds(current.lastGroups, displayNames);
    groupingMessage ??= await groupingChannel.send({
      embeds: currentGroupEmbeds.length ? currentGroupEmbeds.slice(0, 10) : [groupingPlaceholder()],
    });

    await joinMessage.edit({ embeds: [waitingEmbed(guild, current, displayNames)], components: joinComponents(current.waitingOpen) });
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
    const displayNames = await resolveDisplayNames(guild, state.players, state.mockUsers);
    await ui.joinMessage.edit({ embeds: [waitingEmbed(guild, state, displayNames)], components: joinComponents(state.waitingOpen) });
  }

  async function publishGroups(guild, groups) {
    const ui = await ensure(guild);
    const displayNames = await resolveDisplayNames(guild, groups.flat(), store.get(guild.id).mockUsers);
    const embeds = groupEmbeds(groups, displayNames);
    await ui.groupingMessage.edit({
      content: `Groups generated <t:${Math.floor(Date.now() / 1000)}:R>`,
      embeds: embeds.slice(0, 10),
    });
  }

  async function resetGroups(guild) {
    const ui = await ensure(guild);
    const state = store.get(guild.id);
    const messageIds = [state.ui.groupingMessageId, ...(state.ui.groupMessageIds ?? [])];
    const groupingMessage = await replaceGroupingMessage(ui.groupingChannel, messageIds);
    await store.update(guild.id, (latest) => {
      latest.ui.groupingMessageId = groupingMessage.id;
      latest.ui.groupMessageIds = [];
    });
    return groupingMessage;
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

  async function clearAllLeaderRoles(guild) {
    const { leaderRole } = await ensure(guild);
    // Fetching the entire member list relies on the privileged Guild Members
    // intent and can wait for a gateway chunk until Discord.js times out. Role
    // deletion is atomic on Discord and guarantees that the assignment is
    // removed from cached and uncached members alike.
    await leaderRole.delete('Development rotation reset');
    await store.update(guild.id, (state) => { delete state.ui.leaderRoleId; });
    const replacement = await ensure(guild);
    return replacement.leaderRole;
  }

  async function resetJoinRotation(guild) {
    const current = store.get(guild.id);
    const channel = current.ui.joinChannelId
      ? await guild.channels.fetch(current.ui.joinChannelId).catch(() => null)
      : null;
    const message = channel ? await getMessage(channel, current.ui.joinMessageId) : null;
    if (message) await message.delete();
    await store.update(guild.id, (state) => { delete state.ui.joinMessageId; });
    return ensure(guild);
  }

  return {
    ensure, publishGroups, refreshWaiting, resetGroups, clearLeaderRoles, clearAllLeaderRoles, resetJoinRotation,
  };
}
