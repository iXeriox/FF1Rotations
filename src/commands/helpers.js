import { PermissionFlagsBits } from 'discord.js';

export const mention = (id) => `<@${id}>`;

export function requireAdmin(interaction) {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  void interaction.reply({ content: 'You need the **Manage Server** permission to use this command.', ephemeral: true });
  return false;
}

export function guildOnly(interaction) {
  if (interaction.guildId) return true;
  void interaction.reply({ content: 'Rotation commands can only be used in a server.', ephemeral: true });
  return false;
}
