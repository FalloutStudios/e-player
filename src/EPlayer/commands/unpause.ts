import { GuildMember } from 'discord.js';
import { AnyCommandData, CommandBuilderType } from 'reciple';
import { EPlayer } from '../../eplayer';

export default (player: EPlayer): AnyCommandData[] => {
    return [
        {
            type: CommandBuilderType.SlashCommand,
            name: 'unpause',
            description: 'Resume currently playing song',
            async execute(data) {
                const interaction = data.interaction;
                const member = interaction.member as GuildMember|null;
                const guild = interaction.guild;
                if (!member || !guild) {
                    await interaction.reply({ embeds: [player.getMessageEmbed('notInGuild')] });
                    return;
                }

                const djPermissions = await player.getGuildDj(guild.id);
                if (!djPermissions?.isDjMember(member)) {
                    await interaction.reply({ embeds: [player.getMessageEmbed('noQueuePermissions')] });
                    return;
                }

                const pause = player.togglePause(djPermissions.queue);
                await interaction.reply({
                    embeds: [
                        pause == 'ERROR'
                            ? player.getMessageEmbed('unknownError')
                            : pause == 'PAUSED'
                                ? player.getMessageEmbed('pausedTrack')
                                : player.getMessageEmbed('unpausedTrack')
                    ]
                });
            }
        },
        {
            type: CommandBuilderType.MessageCommand,
            name: 'unpause',
            aliases: ['resume'],
            description: 'Resume currently playing song',
            async execute(data) {
                const message = data.message;
                const member = message.member;
                const guild = message.guild;
                if (!member || !guild) {
                    await message.reply({ embeds: [player.getMessageEmbed('notInGuild')] });
                    return;
                }

                const djPermissions = await player.getGuildDj(guild.id);
                if (!djPermissions?.isDjMember(member)) {
                    await message.reply({ embeds: [player.getMessageEmbed('noQueuePermissions')] });
                    return;
                }

                const pause = player.togglePause(djPermissions.queue);
                await message.reply({
                    embeds: [
                        pause == 'ERROR'
                            ? player.getMessageEmbed('unknownError')
                            : pause == 'PAUSED'
                                ? player.getMessageEmbed('pausedTrack')
                                : player.getMessageEmbed('unpausedTrack')
                    ]
                });
            }
        }
    ];
}
