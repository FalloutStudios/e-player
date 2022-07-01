import { ButtonType, OnDisableAction, Pagination, SendAs } from '@ghextercortes/djs-pagination';
import { PaginationButton } from '@ghextercortes/djs-pagination/dist/util/Buttons';
import { Queue } from 'discord-player';
import { ColorResolvable, GuildMember, MessageButton, MessageEmbed, User } from 'discord.js';
import { InteractionCommandBuilder, MessageCommandBuilder, recipleCommandBuilders } from 'reciple';
import { EPlayer } from '../e-player';

export default (Player: EPlayer): recipleCommandBuilders[] => {
    const paginationButtons = new PaginationButton()
            .addButton(ButtonType.FIRST_PAGE, new MessageButton().setCustomId('firstpage').setStyle('SECONDARY').setLabel('First'))
            .addButton(ButtonType.PREVIOUS_PAGE, new MessageButton().setCustomId('previouspage').setStyle('PRIMARY').setLabel('Previous'))
            .addButton(ButtonType.NEXT_PAGE, new MessageButton().setCustomId('nextpage').setStyle('SUCCESS').setLabel('Next'))
            .addButton(ButtonType.LAST_PAGE, new MessageButton().setCustomId('lastpage').setStyle('SECONDARY').setLabel('Last'));

    const getEmbeds = (queue: Queue, author: User): Pagination => {
        let embedDescription = `Playing: **${queue.nowPlaying()?.title || 'none'}**\n`;
        let embeds: MessageEmbed[] = [];
        let page = 1;
        let id = 0;
        let i = 0;

        for (const track of queue.tracks) {
            i++;

            embedDescription += `\n\`${id + 1}.\` **${track.title}** — <@${track?.requestedBy.id}>`;
            id++;

            if (i === 10 || i === queue.tracks.length) {
                i = 0;
                embeds.push(
                    new MessageEmbed()
                        .setAuthor({ name: `Queue`, iconURL: Player.client.user?.displayAvatarURL() })
                        .setDescription(embedDescription)
                        .setColor(Player.getMessage('embedColor') as ColorResolvable)
                        .setFooter({ text: `Page ${page}`, iconURL: author.displayAvatarURL() })
                );
                embedDescription = `Playing: **${queue.nowPlaying().title || 'none'}**\n`;
                page++;
            }
        }

        return new Pagination()
            .setAuthor(author)
            .setOnDisableAction(OnDisableAction.DISABLE_BUTTONS)
            .setButtons(paginationButtons)
            .setTimer(20000)
            .addPages(
                embeds.length
                ? embeds
                : [
                    new MessageEmbed()
                        .setAuthor({ name: `Queue`, iconURL: Player.client.user?.displayAvatarURL() })
                        .setDescription(`${embedDescription}\n*No tracks left*`)
                        .setColor(Player.getMessage('embedColor') as ColorResolvable)
                        .setFooter({ text: `Page 1`, iconURL: author.displayAvatarURL() })
                ]
            );
    }

    return [
        new InteractionCommandBuilder()
            .setName('queue')
            .setExecute(async command => {
                const interaction = command.interaction;
                const member = interaction.member as GuildMember;
                const guild = interaction.guild;

                if (!guild || !member) return interaction.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const queue = Player.player.getQueue(guild);
                if (!queue || queue.destroyed) return interaction.reply({ embeds: [Player.getMessageEmbed('noQueue')] });

                const pagination = getEmbeds(queue, member.user);

                pagination.paginate(interaction, SendAs.REPLY_MESSAGE);
            }),
        new MessageCommandBuilder()
            .setName('queue')
            .setExecute(async command => {
                const message = command.message;
                const member = message.member;
                const guild = message.guild;

                if (!guild || !member) return message.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const queue = Player.player.getQueue(guild);
                if (!queue || queue.destroyed) return message.reply({ embeds: [Player.getMessageEmbed('noQueue')] });

                const pagination = getEmbeds(queue, member.user);

                pagination.paginate(message, SendAs.REPLY_MESSAGE);
            })
    ];
}
