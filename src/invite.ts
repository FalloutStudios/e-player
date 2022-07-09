import { ColorResolvable, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { InteractionCommandBuilder, MessageCommandBuilder, RecipleClient, recipleCommandBuilders, RecipleScript } from 'reciple';
import player from './e-player';

export class Invite implements RecipleScript {
    public versions: string = '1.7.x';
    public commands: recipleCommandBuilders[] = [];
    public category: string = '🪄 Miscellaneous';
    public message!: { embeds: MessageEmbed[], components: MessageActionRow[] };

    public async onStart(): Promise<boolean> {
        this.commands = [
            new InteractionCommandBuilder()
                .setName('invite')
                .setDescription('Get bot invite link.')
                .setExecute(async command => {
                    command.interaction.reply({ ...this.message, ephemeral: true });
                }),
            new MessageCommandBuilder()
                .setName('invite')
                .addAliases('inv')
                .setDescription('Get bot invite link.')
                .setExecute(async command => {
                    command.message.reply({ ...this.message });
                })
        ];

        return true;
    }

    public onLoad(client: RecipleClient): void {
        this.message = {
            embeds: [
                new MessageEmbed()
                    .setColor(player.getMessage('embedColor') as ColorResolvable)
                    .setAuthor({ name: 'Invite', iconURL: client.user?.displayAvatarURL() })
                    .setDescription(`Click the link below to invite me to your server!`)
            ],
            components: [
                new MessageActionRow()
                    .setComponents(
                        new MessageButton()
                            .setStyle('LINK')
                            .setLabel('Bot Invite')
                            .setURL(`https://discord.com/api/oauth2/authorize?client_id=986850355897851914&permissions=274944321856&scope=bot+applications.commands`)
                    )
            ]
        };
    }
}

export default new Invite();
