import { Queue } from 'discord-player';
import { GuildMember } from 'discord.js';
import { isNumber } from 'fallout-utility';
import { InteractionCommandBuilder, MessageCommandBuilder, recipleCommandBuilders } from 'reciple';
import { EPlayer } from '../e-player';

export default (Player: EPlayer): recipleCommandBuilders[] => {
    const skip = (queue: Queue, track?: number): string|boolean => {
        if (track) track =  track - 1 < 0 ? 0 : track - 1;
        if (track && track > queue.tracks.length) return 'trackNotFound';

        const isSkipped = typeof track !== 'undefined' ? queue.skipTo(track) : queue.skip();
        return isSkipped === undefined ? true : isSkipped;
    }

    return [
        new InteractionCommandBuilder()
            .setName('skip')
            .addNumberOption(skipTo => skipTo
                .setName('skip-to')
                .setDescription('Skip to track number')
                .setMinValue(1)
            )
            .setExecute(async command => {
                const interaction = command.interaction;
                const member = interaction.member as GuildMember;
                const guild = interaction.guild;
                const track = interaction.options.getNumber('skip-to') ?? undefined;
                if (!guild || !member) return interaction.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const queue = Player.player.getQueue(guild);
                if (!queue || queue.destroyed) return interaction.reply({ embeds: [Player.getMessageEmbed('noQueue')] });
                if (member.voice.channelId !== guild.me?.voice.channelId) return interaction.reply({ embeds: [Player.getMessageEmbed('InDifferentVoiceChannel')] });

                const skippedTrack = queue.nowPlaying();
                const skipped = skip(queue, track);

                if (typeof skipped == 'string') return interaction.reply({ embeds: [Player.getMessageEmbed(skipped)] });

                interaction.reply({
                    embeds: [
                        Player.getMessageEmbed(skipped ? 'skip' : 'error', skipped, skippedTrack.title, member.user.tag, member.user.id)
                    ]
                });
            }),
        new MessageCommandBuilder()
            .setName('skip')
            .addAliases('next')
            .setValidateOptions(true)
            .addOption(skipTo => skipTo
                .setName('skip-to')
                .setDescription('Skip to track number')
                .setValidator((val) => isNumber(val) && Number(val) >= 1)
            )
            .setExecute(async command => {
                const message = command.message;
                const member = message.member;
                const guild = message.guild;
                const track = isNumber(command.command.args[0]) ? Number(command.command.args[0]) : undefined;
                if (!guild || !member) return message.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const queue = Player.player.getQueue(guild);
                if (!queue || queue.destroyed) return message.reply({ embeds: [Player.getMessageEmbed('noQueue')] });
                if (member.voice.channelId !== guild.me?.voice.channelId) return message.reply({ embeds: [Player.getMessageEmbed('InDifferentVoiceChannel')] });

                const skippedTrack = queue.nowPlaying();
                const skipped = skip(queue, track);

                if (typeof skipped == 'string') return message.reply({ embeds: [Player.getMessageEmbed(skipped)] });

                message.reply({
                    embeds: [
                        Player.getMessageEmbed(skipped ? 'skip' : 'error', skipped, skippedTrack.title, member.user.tag, member.user.id)
                    ]
                });
            })
    ];
}
