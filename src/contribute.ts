import { InteractionCommandBuilder, MessageCommandBuilder, RecipleClient, recipleCommandBuilders, RecipleScript } from 'reciple';
import { ColorResolvable, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import player from './e-player';

export class Contribute implements RecipleScript {
    public versions: string | string[] = ['1.6.x'];
    public commands?: recipleCommandBuilders[] = [];
    public category: string = '🪄 Miscellaneous';

    public onStart(client: RecipleClient): boolean {
        this.commands = [
            new MessageCommandBuilder()
                .setName('contribute')
                .addAliases('github')
                .setDescription('Contribute to this bot.')
                .setExecute(async command => command.message.reply(this.getMessage(client))),
            new InteractionCommandBuilder()
                .setName('contribute')
                .setDescription('Contribute to this bot.')
                .setExecute(async command => command.interaction.reply(this.getMessage(client)))
        ];

        return true;
    }

    public getMessage(client: RecipleClient) {
        return {
            embeds: [
                new MessageEmbed()
                    .setAuthor({ name: `Contribute`, iconURL: client.user?.displayAvatarURL() })
                    .setColor(player.getMessage('embedColor') as ColorResolvable)
                    .setTitle(`${client.user?.username} is open source!`)
                    .setThumbnail(`https://avatars.githubusercontent.com/u/88924248?s=200&v=4`)
                    .setDescription(`Click the link below to view source code.`)
            ],
            components: [
                new MessageActionRow()
                    .setComponents(
                        new MessageButton()
                            .setLabel(`View Source Code`)
                            .setEmoji(`<:github:857030640100442133>`)
                            .setURL('https://github.com/FalloutStudios/e-player')
                            .setStyle('LINK')
                    )
            ]
        };
    }
}

export default new Contribute();
