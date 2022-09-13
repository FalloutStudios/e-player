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
                description: 'Search for song or enter a URL'
            }
        ],
        async execute(data) {
            const interaction = data.interaction;
            const member = interaction.member as GuildMember;
            const guild = interaction.guild;
            const query = interaction.options.getString('search');

            if (!member || !guild || !interaction.channel || interaction.channel.isDMBased()) {
                await interaction.reply({ embeds: [player.getMessageEmbed('notInGuild')] });
                return;
            }

            await interaction.deferReply();

            const embed = query
                ? await player.play(query, guild, member, interaction.channel)
                : await player.playCachedTracks(guild, member, interaction.channel);

            await interaction.editReply({ embeds: [embed] });
        }
    }
]
