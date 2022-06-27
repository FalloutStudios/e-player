import { GuildMember } from 'discord.js';
import { InteractionCommandBuilder, MessageCommandBuilder, recipleCommandBuilders } from 'reciple';
import { EPlayer } from '../e-player';

export default (Player: EPlayer): recipleCommandBuilders[] => {
    return [
        new InteractionCommandBuilder()
            .setName('previous')
            .setExecute(async command => {
                const interaction = command.interaction;
                const member = interaction.member as GuildMember;
                const guild = interaction.guild;
                if (!guild || !member) return interaction.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const queue = Player.player.getQueue(guild);
                if (!queue || queue.destroyed) return interaction.reply({ embeds: [Player.getMessageEmbed('noQueue')] });
                if (member.voice.channelId !== guild.me?.voice.channelId) return interaction.reply({ embeds: [Player.getMessageEmbed('InDifferentVoiceChannel')] });

                await interaction.deferReply();
                await queue.back();

                interaction.editReply({ embeds: [Player.getMessageEmbed('previous', true, member.user.tag, member.user.id)] });
            }),
        new MessageCommandBuilder()
            .setName('previous')
            .setExecute(async command => {
                const message = command.message;
                const member = message.member;
                const guild = message.guild;
                if (!guild || !member) return message.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const queue = Player.player.getQueue(guild);
                if (!queue || queue.destroyed) return message.reply({ embeds: [Player.getMessageEmbed('noQueue')] });
                if (member.voice.channelId !== guild.me?.voice.channelId) return message.reply({ embeds: [Player.getMessageEmbed('InDifferentVoiceChannel')] });

                const reply = await message.reply({ embeds: [Player.getMessageEmbed('loading')] });
                await queue.back();

                reply.edit({ embeds: [Player.getMessageEmbed('previous', true, member.user.tag, member.user.id)] });
            })
    ];
}
