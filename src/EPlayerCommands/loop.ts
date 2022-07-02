import { Queue, QueueRepeatMode } from 'discord-player';
import { GuildMember } from 'discord.js';
import { InteractionCommandBuilder, MessageCommandBuilder, recipleCommandBuilders } from 'reciple';
import { EPlayer } from '../e-player';

export default (Player: EPlayer): recipleCommandBuilders[] => {
    const setLoop = (queue: Queue, modeString: string): boolean => {
        let mode: QueueRepeatMode;

        switch (modeString) {
            case 'TRACK':
                mode = QueueRepeatMode.TRACK;
                break;
            case 'QUEUE':
                mode = QueueRepeatMode.QUEUE;
                break;
            case 'AUTOPLAY':
                mode = QueueRepeatMode.AUTOPLAY;
                break;
            default:
                mode = QueueRepeatMode.OFF;
        }

        return queue.setRepeatMode(mode);
    }

    return [
        new InteractionCommandBuilder()
            .setName('loop')
            .addStringOption(mode => mode
                .setName('mode')
                .setDescription('Set loop mode.')
                .setRequired(true)
                .setChoices(
                    {
                        name: 'Loop currently playing track',
                        value: 'TRACK'
                    },
                    {
                        name: 'Loop current queue',
                        value: 'QUEUE'
                    },
                    {
                        name: 'Autoplay similar tracks',
                        value: 'AUTOPLAY'
                    },
                    {
                        name: 'Turn off loop',
                        value: 'OFF'
                    }
                )
            )
            .setExecute(async command => {
                const interaction = command.interaction;
                const member = interaction.member as GuildMember;
                const guild = interaction.guild;
                if (!guild || !member) return interaction.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const queue = Player.player.getQueue(guild);
                if (!queue || queue.destroyed) return interaction.reply({ embeds: [Player.getMessageEmbed('noQueue')] });

                const mode = interaction.options.getString('mode', true);
                const repeat = setLoop(queue, mode);

                interaction.reply({
                    embeds: [
                        Player.getMessageEmbed(repeat ? 'repeat' : 'error', repeat, mode.toUpperCase(), member.user.tag, member.user.id)
                    ]
                });
            }),
        new MessageCommandBuilder()
            .setName('loop')
            .addAliases('l')
            .addOption(mode => mode
                .setName('mode')
                .setDescription('Set loop mode.')
                .setRequired(true)
                .setValidator(val => ['track', 'queue', 'off', 'autoplay'].some(f => f == val.toLowerCase()))
            )
            .setExecute(async command => {
                const message = command.message;
                const member = message.member;
                const guild = message.guild;
                if (!guild || !member) return message.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const queue = Player.player.getQueue(guild);
                if (!queue || queue.destroyed) return message.reply({ embeds: [Player.getMessageEmbed('noQueue')] });

                const mode = command.options.getValue('mode', true).toUpperCase();
                const repeat = setLoop(queue, mode);

                message.reply({
                    embeds: [
                        Player.getMessageEmbed(repeat ? 'repeat' : 'error', repeat, mode.toUpperCase(), member.user.tag, member.user.id)
                    ]
                });
            })
    ];
}
