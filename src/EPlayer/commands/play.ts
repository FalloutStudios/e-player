import { ApplicationCommandOptionType, GuildMember } from 'discord.js';
import { AnyCommandData, CommandBuilderType } from 'reciple';
import { EPlayer } from '../../eplayer';

export default (player: EPlayer): AnyCommandData[] => [
    {
        type: CommandBuilderType.SlashCommand,
        name: 'play',
        description: 'Play something.',
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: 'search',
                description: 'Search for song or enter a URL',
                required: true
            }
        ],
        async execute(data) {
            const interaction = data.interaction;
            const member = interaction.member as GuildMember;
            const guild = interaction.guild;

            if (!member || !guild || !interaction.channel || interaction.channel.isDMBased()) {
                await interaction.reply({ embeds: [player.getMessageEmbed('notInGuild')] });
                return;
            }

            await interaction.deferReply();

            const embed = await player.play(interaction.options.getString('search', true), guild, member, interaction.channel);

            await interaction.editReply({ embeds: [embed] });
        }
    }
]
