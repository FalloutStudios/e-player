import { hasPermissions, MessageCommandBuilder, RecipleClient, recipleCommandBuilders, RecipleScript } from 'reciple';
import { ColorResolvable, GuildMember, MessageEmbed } from 'discord.js';
import player from './e-player';

export class HelpCommand implements RecipleScript {
    public versions: string | string[] = ['1.5.x'];
    public commands: recipleCommandBuilders[] = [];

    public async onStart(client: RecipleClient): Promise<boolean> {
        this.commands = [
            new MessageCommandBuilder()
                .setName('help')
                .setDescription('Show message commands')
                .addOption(filter => filter
                    .setName('filter')
                    .setDescription('Filter commands')
                )
                .setExecute(async command => {
                    const message = command.message;
                    const member = message.member;
                    const filter = command.options[0].value;
                    const embed = this.getCommand(client, filter ?? '') ?? this.getAll(client, filter, member ?? undefined);

                    message.reply({ embeds: [embed], failIfNotExists: false });
                })
        ];

        return true;
    }

    public getAll(client: RecipleClient, filter?: string, member?: GuildMember): MessageEmbed {
        const categories: { [category: string]: MessageCommandBuilder[] } = {};
        const embed = new MessageEmbed()
            .setColor(player.getMessage('embedColor') as ColorResolvable)
            .setAuthor({ name: `Commands`, iconURL: client.user?.displayAvatarURL() })
            .setDescription(`**Prefix:** \`${client.config.prefix}\`\n` + (filter ? `**Results for:** \`${filter}\`\n\n` : '\n'));

        for (const script of Object.values(client.modules) as (RecipleScript & { category?: string })[]) {
            if (!script.category) continue;

            let commands = (script.commands?.filter(c => c.builder == 'MESSAGE_COMMAND' && (filter ? c.name.includes(filter) : true)) as MessageCommandBuilder[]) ?? [];
                commands = !member ? commands : commands.filter(c => hasPermissions(c.name, member.permissions, client.config.permissions.messageCommands));

            if (!commands.length) continue;
            if (!categories[script.category]) {
                categories[script.category] = commands;
            } else {
                categories[script.category].push(...commands);
            }
        }

        for (const category in categories) {
            const commands = categories[category];
            embed.addField(category, commands.map(c => '`'+ c.name +'`').join(' '), false);
        }

        return embed;
    }

    public getCommand(client: RecipleClient, name: string): MessageEmbed|void {
        const command = client.commands.MESSAGE_COMMANDS[name];
        if (!command) return;

        const embed = new MessageEmbed()
            .setColor(player.getMessage('embedColor') as ColorResolvable)
            .setAuthor({ name: `Command Info`, iconURL: client.user?.displayAvatarURL() })
            .setDescription(`**Command:** \`${command.name}\`\n**Description:**\n\`\`\`\n${command.description}\n\`\`\`\n`);

        for (const option of command.options) {
            embed.addField(`**${option.name}** \` ${option.required ? 'REQUIRED' : 'OPTIONAL'} \``, `${option.description}`, true);
        }

        return embed;
    }
}

export default new HelpCommand();
