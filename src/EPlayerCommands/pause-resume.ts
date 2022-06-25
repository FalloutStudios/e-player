import { GuildMember } from 'discord.js';
import { InteractionCommandBuilder, MessageCommandBuilder, recipleCommandBuilders, RecipleInteractionCommandExecute, RecipleMessageCommandExecute } from 'reciple';
import { EPlayer } from '../e-player';

export default (Player: EPlayer): recipleCommandBuilders[] => {
    const pauseMessageCommand = async (command: RecipleMessageCommandExecute) => {
        const message = command.message;
        const member = message.member;
        const guild = message.guild;

        if (!guild || !member) return message.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

        const queue = Player.player.getQueue(guild);
        if (!queue || queue.destroyed) return message.reply({ embeds: [Player.getMessageEmbed('noQueue')] });

        const pause = Player.pauseToggle(queue);
        if (pause == 'ERROR') return message.reply({ embeds: [Player.getMessageEmbed('error')] });

        message.reply({
            embeds: [
                Player.getMessageEmbed(pause == 'PAUSED' ? 'pause' : 'resume', true, queue.nowPlaying().title, member.user.tag, member.user.id)
            ]
        });
    };

    const pauseInteractionCommand = async (command: RecipleInteractionCommandExecute) => {
        const interaction = command.interaction;
        const member = interaction.member as GuildMember;
        const guild = interaction.guild;

        if (!guild || !member) return interaction.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

        const queue = Player.player.getQueue(guild);
        if (!queue || queue.destroyed) return interaction.reply({ embeds: [Player.getMessageEmbed('noQueue')] });

        const pause = Player.pauseToggle(queue);
        if (pause == 'ERROR') return interaction.reply({ embeds: [Player.getMessageEmbed('error')] });

        interaction.reply({
            embeds: [
                Player.getMessageEmbed(pause == 'PAUSED' ? 'pause' : 'resume', true, queue.nowPlaying().title, member.user.tag, member.user.id)
            ]
        });
    };

    return [
        new InteractionCommandBuilder()
            .setName('pause')
            .setExecute(async command => pauseInteractionCommand(command)),
        new InteractionCommandBuilder()
            .setName('resume')
            .setExecute(async command => pauseInteractionCommand(command)),
        new MessageCommandBuilder()
            .setName('pause')
            .setExecute(async command => pauseMessageCommand(command)),
        new MessageCommandBuilder()
            .setName('resume')
            .setExecute(async command => pauseMessageCommand(command)),
    ];
}
