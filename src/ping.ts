import { ColorResolvable, Message, MessageEmbed } from 'discord.js';
import { getRandomKey } from 'fallout-utility';
import { InteractionCommandBuilder, MessageCommandBuilder, RecipleClient, RecipleScript } from 'reciple';
import player from './e-player';

export default new (class implements RecipleScript {
    public versions: string[] = ['1.5.x'];
    public category: string = '🪄 Miscellaneous';
    public commands: (MessageCommandBuilder|InteractionCommandBuilder)[] = [];

    public onStart(client: RecipleClient) {
        this.commands = [
            new MessageCommandBuilder()
                .setName('ping')
                .setDescription('Pong!')
                .setExecute(async command => {
                    const message = command.message;
                    const date = new Date();

                    const reply = await message.reply({
                        embeds: [
                            new MessageEmbed()
                                .setAuthor({ name: player.getMessage('loading'), iconURL: client.user?.displayAvatarURL() })
                                .setColor(player.getMessage('embedColor') as ColorResolvable)
                        ]
                    });

                    const latency = reply.createdTimestamp - date.getTime();
                    const apiLatency = command.client.ws.ping;

                    const embed = new MessageEmbed()
                        .setAuthor({ name: 'Pong!', iconURL: client.user?.displayAvatarURL() })
                        .setDescription(`\`\`\`bash\nBot Latency: ${latency}ms\nAPI Latency: ${apiLatency}ms\n\`\`\``)
                        .setColor(player.getMessage('embedColor') as ColorResolvable);

                    reply.edit({ embeds: [embed] });
                }),
                new InteractionCommandBuilder()
                    .setName('ping')
                    .setDescription('Shows bot latency')
                    .setExecute(async command => {
                        const interaction = command.interaction;
                        const date = new Date();

                        await interaction.deferReply();

                        const reply = await interaction.fetchReply() as Message;
                        const latency = reply.createdTimestamp - date.getTime();
                        const apiLatency = command.client.ws.ping;

                        const embed = new MessageEmbed()
                            .setAuthor({ name: 'Pong!', iconURL: client.user?.displayAvatarURL() })
                            .setDescription(`\`\`\`bash\nBot Latency: ${latency}ms\nAPI Latency: ${apiLatency}ms\n\`\`\``)
                            .setColor(player.getMessage('embedColor') as ColorResolvable);

                        await interaction.editReply({ embeds: [embed] });
                    })
            ];

        return true;
    }

    public getEmail(text: string): string {
        const emails: string[] = [
            `${text}@yahoo.com`,
            `${text}iscool@gmail.com`,
            `pretty${text}@outlook.com`,
            `susperson@among.us`,
            `2inchpp@gmail.com`,
            `GFTYtfrtyh@krazy.net`,
            `${text}@among.us`
        ];

        return getRandomKey(emails);
    }

    public getPassword(text: string): string {
        const passwords: string[] = [
            '1234567890',
            'qwertyuiop',
            'asdfghjkl',
            'smallpp123',
            `${text}123`,
            `${text}noob`,
            `${text}notfound`,
            `8==D`,
            `iamnoob`,
        ];

        return getRandomKey(passwords);
    }

    public sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
})();
