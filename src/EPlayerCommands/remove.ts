import { Queue, Track } from 'discord-player';
import { GuildMember } from 'discord.js';
import { isNumber } from 'fallout-utility';
import { InteractionCommandBuilder, MessageCommandBuilder, recipleCommandBuilders } from 'reciple';
import { EPlayer } from '../e-player';

export default (Player: EPlayer): recipleCommandBuilders[] => {
    const removeTrack = (queue: Queue, track: number): string|Track => {
        track =  track - 1 < 0 ? 0 : track - 1;
        if (track > queue.tracks.length) return 'trackNotFound';

        return queue.remove(track);
    }

    return [
        new InteractionCommandBuilder()
            .setName('remove')
            .addNumberOption(skipTo => skipTo
                .setName('track-id')
                .setDescription('Track to remove')
                .setRequired(true)
                .setMinValue(1)
            )
            .setExecute(async command => {
                const interaction = command.interaction;
                const member = interaction.member as GuildMember;
                const guild = interaction.guild;
                const track = interaction.options.getNumber('track-id', true);
                if (!guild || !member) return interaction.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const queue = Player.player.getQueue(guild);
                if (!queue || queue.destroyed) return interaction.reply({ embeds: [Player.getMessageEmbed('noQueue')] });
                if (member.voice.channelId !== guild.me?.voice.channelId) return interaction.reply({ embeds: [Player.getMessageEmbed('InDifferentVoiceChannel')] });

                const removedTrack = removeTrack(queue, track);
                if (typeof removedTrack == 'string') return interaction.reply({ embeds: [Player.getMessageEmbed(removedTrack)] });

                interaction.reply({
                    embeds: [
                        Player.getMessageEmbed(!!removedTrack ? 'removeTrack' : 'error', !!removedTrack, removedTrack.title, member.user.tag, member.user.id)
                    ]
                });
            }),
        new MessageCommandBuilder()
            .setName('remove')
            .setValidateOptions(true)
            .addOption(skipTo => skipTo
                .setName('track-id')
                .setDescription('Track to remove')
                .setRequired(true)
                .setValidator((val) => isNumber(val) && Number(val) >= 1)
            )
            .setExecute(async command => {
                const message = command.message;
                const member = message.member;
                const guild = message.guild;
                const track = isNumber(command.command.args[0]) ? Number(command.command.args[0]) : undefined;

                if (!track) return message.reply({ embeds: [Player.getMessageEmbed('isRequired', false, 'track-id')] });
                if (!guild || !member) return message.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const queue = Player.player.getQueue(guild);
                if (!queue || queue.destroyed) return message.reply({ embeds: [Player.getMessageEmbed('noQueue')] });
                if (member.voice.channelId !== guild.me?.voice.channelId) return message.reply({ embeds: [Player.getMessageEmbed('InDifferentVoiceChannel')] });

                const removedTrack = removeTrack(queue, track);
                if (typeof removedTrack == 'string') return message.reply({ embeds: [Player.getMessageEmbed(removedTrack)] });

                message.reply({
                    embeds: [
                        Player.getMessageEmbed(!!removedTrack ? 'removeTrack' : 'error', !!removedTrack, removedTrack.title, member.user.tag, member.user.id)
                    ]
                });
            })
    ];
}
