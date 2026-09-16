import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const PATCH_NOTES_URL = 'https://www.callofduty.com/patchnotes';

const warzoneClasses = [
  ['Assault Rifle', ['XM4', 'CR-56 AMAX']],
  ['SMG', ['C9', 'LC10']],
  ['LMG', ['XMG']],
  ['Marksman Rifle', ['TR2']],
  ['Sniper Rifle', ['HDR']],
  ['Shotgun', ['Maelstrom']],
  ['Pistol', ['Sykov']],
];

const multiplayerClasses = [
  ['Assault Rifle', ['Krig C', 'XM4']],
  ['SMG', ['C9', 'KSV']],
  ['LMG', ['XMG']],
  ['Marksman Rifle', ['AEK-973']],
  ['Sniper Rifle', ['LW3A1 Frostline']],
  ['Shotgun', ['ASG-89']],
  ['Pistol', ['Grekhova']],
];

const zombiesClasses = [
  ['Assault Rifle', ['XM4']],
  ['SMG', ['C9']],
  ['LMG', ['XMG']],
  ['Marksman Rifle', ['Tsarkov 7.62']],
  ['Sniper Rifle', ['LR 7.62']],
  ['Shotgun', ['ASG-89']],
  ['Pistol', ['GS45']],
  ['Special', ['Sirin 9mm']],
];

const loadouts = (classes, codePrefix) => classes.flatMap(([weaponClass, weapons]) => (
  weapons.map((weapon, index) => ({
    weaponClass,
    weapon,
    // These stable, copy-friendly references identify the row when sharing a
    // build in Discord. The live build page remains authoritative for the
    // attachments because in-game import codes expire when builds are updated.
    shareCode: `${codePrefix}-${weapon.replace(/[^A-Z0-9]/gi, '').toUpperCase()}-${index + 1}`,
  }))
));

export const META_MODES = {
  resurgence: {
    name: 'Resurgence',
    description: 'Fast-paced Warzone builds prioritising close- and mid-range fights.',
    url: 'https://warzoneloadout.games/',
    loadouts: loadouts(warzoneClasses, 'RES'),
  },
  'battle-royale': {
    name: 'Battle Royale',
    description: 'Warzone builds pairing ranged consistency with a close-range secondary.',
    url: 'https://warzoneloadout.games/',
    loadouts: loadouts(warzoneClasses, 'BR'),
  },
  multiplayer: {
    name: 'Multiplayer',
    description: 'Strong weapons for standard multiplayer public matches.',
    url: 'https://codmunity.gg/meta',
    loadouts: loadouts(multiplayerClasses, 'MP'),
  },
  ranked: {
    name: 'Ranked Play',
    description: 'Competitive picks; always confirm the current Ranked Play restrictions.',
    url: 'https://codmunity.gg/meta',
    loadouts: loadouts(multiplayerClasses.slice(0, 5), 'RANK'),
  },
  zombies: {
    name: 'Zombies',
    description: 'Strong weapons for surviving rounds and completing objectives.',
    url: 'https://codmunity.gg/meta',
    loadouts: loadouts(zombiesClasses, 'ZOM'),
  },
};

export function metaTable(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const current = grouped.get(row.weaponClass) ?? [];
    current.push(row);
    grouped.set(row.weaponClass, current);
  }
  return [...grouped].map(([weaponClass, weapons]) => ({
    name: weaponClass.toUpperCase(),
    value: weapons.map(({ weapon, shareCode }, index) => (
      `\`${String(index + 1).padStart(2, '0')}\` **${weapon}**\n└ Share code: \`${shareCode}\``
    )).join('\n'),
    inline: true,
  }));
}

export default {
  data: new SlashCommandBuilder()
    .setName('meta')
    .setDescription('Show top Call of Duty weapons by class for a game mode.')
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
      .setDescription(`${mode.description}\n\nTop weapons are listed by class. Copy a share code when discussing a build, then use the live build page for its latest attachments.`)
      .addFields(metaTable(mode.loadouts))
      .addFields(
        { name: 'LIVE BUILDS', value: `[Open current ${mode.name} loadouts](${mode.url})`, inline: false },
        { name: 'BALANCE CHANGES', value: `[Official Call of Duty patch notes](${PATCH_NOTES_URL})`, inline: false },
      )
      .setFooter({ text: 'Meta changes after balance updates • Community rankings are not affiliated with Activision' });
    await interaction.reply({ embeds: [embed] });
  },
};
