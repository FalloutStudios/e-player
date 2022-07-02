import { Queue } from 'discord-player';
import { ColorResolvable, GuildMember, MessageEmbed } from 'discord.js';
import { InteractionCommandBuilder, MessageCommandBuilder, recipleCommandBuilders } from 'reciple';
import { EPlayer } from '../e-player';

export default (Player: EPlayer): recipleCommandBuilders[] => {
    const getEmbed = (queue: Queue): MessageEmbed => {
        const embed = new MessageEmbed().setColor(Player.getMessage('embedColor') as ColorResolvable);
        const nowPlaying = queue.nowPlaying();

        embed.setTitle(nowPlaying.title);
        embed.setURL(nowPlaying.url);
        embed.setThumbnail(nowPlaying.thumbnail);
        embed.setDescription(queue.createProgressBar({
            line: '-',
            indicator: '●',
            length: 30,
            timecodes: true
        }))
        embed.setAuthor({
            name: 'Now Playing',
            iconURL: Player.client.user?.displayAvatarURL()
        });
        embed.setFooter({
            text: `Requested by: ${nowPlaying.requestedBy.tag}`,
            iconURL: nowPlaying.requestedBy.displayAvatarURL()
        });

        return embed;
    }

    return [
        new InteractionCommandBuilder()
            .setName('now-playing')
            .setExecute(async command => {
                const interaction = command.interaction;
                const member = interaction.member as GuildMember;
                const guild = interaction.guild;

                if (!guild || !member) return interaction.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const queue = Player.player.getQueue(guild);
                if (!queue || queue.destroyed) return interaction.reply({ embeds: [Player.getMessageEmbed('noQueue')] });

                interaction.reply({ embeds: [getEmbed(queue)] });
            }),
        new MessageCommandBuilder()
            .setName('now-playing')
            .addAliases('np', 'now')
            .setExecute(async command => {
                const message = command.message;
                const member = message.member;
                const guild = message.guild;

                if (!guild || !member) return message.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const queue = Player.player.getQueue(guild);
                if (!queue || queue.destroyed) return message.reply({ embeds: [Player.getMessageEmbed('noQueue')] });

                message.reply({ embeds: [getEmbed(queue)] });
            })
    ];
}
