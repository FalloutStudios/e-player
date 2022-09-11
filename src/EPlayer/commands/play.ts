import { ApplicationCommandOptionType, GuildMember } from 'discord.js';
import { AnyCommandData, CommandBuilderType } from 'reciple';
import { EPlayer } from '../../eplayer';

export default (player: EPlayer): AnyCommandData[] => {
    return [
        {
            type: CommandBuilderType.SlashCommand,
            name: 'play',
            description: 'Play some music',
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: 'search',
                    description: 'Search query',
                    required: true
                }
            ],
            async execute(command) {
                const interaction = command.interaction;
                const guild = interaction.guild;
                const member = interaction.member as GuildMember;
                const channel = interaction.channel;
                const query = interaction.options.getString('search', true);

                if (!guild || !member || !channel || channel.isDMBased()) {
                    interaction.reply({ embeds: [player.getMessageEmbed('notInGuild')] });
                    return;
                }

                await interaction.deferReply();

                const embed = await player.play(query, guild, member, channel);
                await interaction.editReply({ embeds: [embed] });
            }
        },
        {
            type: CommandBuilderType.MessageCommand,
            name: 'play',
            aliases: ['p'],
            description: 'Play some music',
            options: [{
                name: 'search',
                description: 'Search query',
                required: true,
            }],
            async execute(command) {
                const message = command.message;
                const guild = message.guild;
                const member = message.member;
                const channel = message.channel;
                const query = command.command.args.join(' ');

                if (!guild || !member || !channel || channel.isDMBased()) {
                    message.reply({ embeds: [player.getMessageEmbed('notInGuild')] });
                    return;
                }

                const reply = await message.reply({ embeds: [player.getMessageEmbed('loading')] });
                const embed = await player.play(query, guild, member, channel);

                await reply.edit({ embeds: [embed] });
            }
        }
    ];
}
