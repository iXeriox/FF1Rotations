import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const PATCH_NOTES_URL = 'https://www.callofduty.com/patchnotes';

export const META_MODES = {
  resurgence: {
    name: 'Resurgence',
    description: 'Fast-paced Warzone builds suited to frequent close- and mid-range fights.',
    url: 'https://warzoneloadout.games/',
  },
  'battle-royale': {
    name: 'Battle Royale',
    description: 'Warzone builds for long-range engagements and a close-range secondary.',
    url: 'https://warzoneloadout.games/',
  },
  multiplayer: {
    name: 'Multiplayer',
    description: 'Popular multiplayer weapons and loadouts for standard public matches.',
    url: 'https://codmunity.gg/meta',
  },
  ranked: {
    name: 'Ranked Play',
    description: 'Competitive loadouts to compare against the current Ranked Play restrictions.',
    url: 'https://codmunity.gg/meta',
  },
  zombies: {
    name: 'Zombies',
    description: 'Popular weapons and builds for surviving rounds and completing objectives.',
    url: 'https://codmunity.gg/meta',
  },
};

export default {
  data: new SlashCommandBuilder()
    .setName('meta')
    .setDescription('Find current Call of Duty meta loadouts for a game mode.')
    .addStringOption((option) => option
      .setName('mode')
      .setDescription('The game mode whose meta you want to view.')
      .setRequired(true)
      .addChoices(...Object.entries(META_MODES).map(([value, mode]) => ({ name: mode.name, value })))),
  async execute(interaction) {
    const selected = interaction.options.getString('mode', true);
    const mode = META_MODES[selected];
    if (!mode) {
      await interaction.reply({ content: 'That meta category is not available.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xf4b942)
      .setTitle(`${mode.name} meta`)
      .setURL(mode.url)
      .setDescription(`${mode.description}\n\nMeta rankings change as weapons are balanced, so use the live list below for the latest builds.`)
      .addFields(
        { name: 'Current loadouts', value: `[Open the live ${mode.name} meta](${mode.url})` },
        { name: 'Balance changes', value: `[Read the official Call of Duty patch notes](${PATCH_NOTES_URL})` },
      )
      .setFooter({ text: 'Community loadout rankings are not affiliated with Activision.' });
    await interaction.reply({ embeds: [embed] });
  },
};
