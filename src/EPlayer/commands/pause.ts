import { GuildMember } from 'discord.js';
import { AnyCommandData, CommandBuilderType } from 'reciple';
import { EPlayer } from '../../eplayer';

export default (player: EPlayer): AnyCommandData[] => [
    {
        type: CommandBuilderType.SlashCommand,
        name: 'pause',
        description: 'Pause playing queue',
        async execute(data) {
            const interaction = data.interaction;
            const member = interaction.member as GuildMember;
            const guild = interaction.guild;

            if (!member || !guild || !interaction.channel || interaction.channel.isDMBased()) {
                await interaction.reply({ embeds: [player.getMessageEmbed('notInGuild')] });
                return;
            }

            await interaction.deferReply();
            const settings = await player.getGuildSettings(guild.id);

            if (!settings || !settings.djSettings || !settings.cachedQueue) {
                await interaction.editReply({ embeds: [player.getMessageEmbed('unknownError')] });
                return;
            }

            if (!settings.queue) {
                await interaction.editReply({ embeds: [player.getMessageEmbed('noQueue')] });
                return;
            }

            if (!settings.djSettings.isDjMember(member)) {
                await interaction.editReply({ embeds: [player.getMessageEmbed('noQueuePermissions')] });
                return;
            }

            const pauseToggle = player.togglePause(settings.queue);
            const nowPlaying = settings.queue.nowPlaying();

            await interaction.editReply({
                embeds: [
                    player.getMessageEmbed(
                        pauseToggle === 'ERROR'
                            ? 'unknownError'
                            : pauseToggle === 'PAUSED'
                                ? 'pausedTrack'
                                : 'unpausedTrack',
                        true,
                        nowPlaying.title ?? 'song'
                    )
                ]
            });
        }
    }
]
