import { EPlayer } from '../e-player';

import { GuildMember } from 'discord.js';
import { InteractionCommandBuilder, MessageCommandBuilder, recipleCommandBuilders } from 'reciple';

export default (Player: EPlayer): recipleCommandBuilders[] => {
    return [
        new InteractionCommandBuilder()
            .setName('stop')
            .setExecute(async command => {
                const interaction = command.interaction;
                const guild = interaction.guild;
                const member = interaction.member as GuildMember;
                if (!guild || !member) return interaction.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const queue = Player.player.getQueue(guild);
                if (!queue || queue.destroyed) return interaction.reply({ embeds: [Player.getMessageEmbed('noQueue')] });
                if (member.voice.channelId !== guild.me?.voice.channelId) return interaction.reply({ embeds: [Player.getMessageEmbed('InDifferentVoiceChannel')] });

                queue.stop();
                interaction.reply({ embeds: [Player.getMessageEmbed('stop', true, member.user.tag, member.user.id)] });
            }),
        new MessageCommandBuilder()
            .setName('stop')
            .setExecute(async command => {
                const message = command.message;
                const guild = message.guild;
                const member = message.member;
                if (!guild || !member) return message.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const queue = Player.player.getQueue(guild);
                if (!queue || queue.destroyed) return message.reply({ embeds: [Player.getMessageEmbed('noQueue')] });
                if (member.voice.channelId !== guild.me?.voice.channelId) return message.reply({ embeds: [Player.getMessageEmbed('InDifferentVoiceChannel')] });

                queue.stop();
                message.reply({ embeds: [Player.getMessageEmbed('stop', true, member.user.tag, member.user.id)] });
            })
    ];
}
