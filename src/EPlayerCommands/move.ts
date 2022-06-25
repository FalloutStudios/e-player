import { Queue } from 'discord-player';
import { GuildMember } from 'discord.js';
import { isNumber } from 'fallout-utility';
import { InteractionCommandBuilder, MessageCommandBuilder, recipleCommandBuilders } from 'reciple';
import { EPlayer } from '../e-player';

export default (Player: EPlayer): recipleCommandBuilders[] => {
    const moveTrack = (queue: Queue, trackId: number, moveAfter: number) => {
        const move = queue.tracks[trackId];
        const position = queue.getTrackPosition(moveAfter);

        queue.remove(move);
        queue.insert(move, position);

        return move;
    }

    return [
        new InteractionCommandBuilder()
            .setName('move')
            .addNumberOption(trackId => trackId
                .setName('track-id')
                .setDescription('Track number of the track you want to move.')
                .setMinValue(1)
            )
            .addNumberOption(moveAfter => moveAfter
                .setName('move-after')
                .setDescription('Move the selected track after the specified track id')
                .setMinValue(1)
            )
            .setExecute(async command => {
                const interaction = command.interaction;
                const member = interaction.member as GuildMember;
                const guild = interaction.guild;
                if (!guild || !member) return interaction.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const queue = Player.player.getQueue(guild);
                if (!queue || queue.destroyed) return interaction.reply({ embeds: [Player.getMessageEmbed('noQueue')] });

                let trackId = interaction.options.getNumber('track-id', true);
                let moveAfter = interaction.options.getNumber('move-after', true);

                    trackId = trackId - 1 < 0 ? 0 : trackId - 1;
                    moveAfter = moveAfter - 1 < 0 ? 0 : moveAfter - 1;

                if (trackId > queue.tracks.length || moveAfter > queue.tracks.length) return interaction.reply({
                    embeds: [Player.getMessageEmbed('trackNotFound')]
                });

                const track = moveTrack(queue, trackId, moveAfter);
                interaction.reply({
                    embeds: [Player.getMessageEmbed('move', true, track.title, member.user.tag, member.user.id)]
                })
            }),
        new MessageCommandBuilder()
            .setName('move')
            .setValidateOptions(true)
            .addOption(trackId => trackId
                .setName('track-id')
                .setDescription('Track number of the track you want to move.')
                .setValidator((val) => isNumber(val) && Number(val) >= 1)
                .setRequired(true)
            )
            .addOption(moveAfter => moveAfter
                .setName('move-after')
                .setDescription('Move the selected track after the specified track id')
                .setValidator((val) => isNumber(val) && Number(val) >= 1)
                .setRequired(true)
            )
            .setExecute(async command => {
                const message = command.message;
                const member = message.member;
                const guild = message.guild;
                if (!guild || !member) return message.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const queue = Player.player.getQueue(guild);
                if (!queue || queue.destroyed) return message.reply({ embeds: [Player.getMessageEmbed('noQueue')] });

                let trackId = Number(command.options[0].value);
                let moveAfter = Number(command.options[1].value);

                    trackId = isNumber(trackId) ? trackId : 0;
                    trackId = trackId - 1 < 0 ? 0 : trackId - 1;
                    moveAfter = isNumber(moveAfter) ? moveAfter : 0;
                    moveAfter = moveAfter - 1 < 0 ? 0 : moveAfter - 1;

                if (trackId > queue.tracks.length || moveAfter > queue.tracks.length) return message.reply({
                    embeds: [Player.getMessageEmbed('trackNotFound')]
                });

                const track = moveTrack(queue, trackId, moveAfter);
                message.reply({
                    embeds: [Player.getMessageEmbed('move', true, track.title, member.user.tag, member.user.id)]
                })
            })
    ];
}
