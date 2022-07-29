import { createConfig } from './_createConfig';

import { Player, PlayerOptions } from 'discord-music-player';
import { Awaitable, EmbedBuilder, PermissionResolvable } from 'discord.js';
import { escapeRegExp, Logger, replaceAll, trimChars } from 'fallout-utility';
import { mkdirSync, readdirSync } from 'fs';
import ms from 'ms';
import path from 'path';
import { CommandBuilder, CommandBuilderType, RecipleClient, RecipleScript } from 'reciple';
import yml from 'yaml';

export interface EPlayerConfig {
    playerOptions: PlayerOptions;
    commandOptions: {
        [commandName: string]: {
            requiredMemberPermissions?: PermissionResolvable[];
            requiredBotPermissions?: PermissionResolvable[];
            messageCommandAliases?: string[];
            cooldown?: number|string;
            description: string;
        }
    };
    messages: ReturnType<typeof EPlayer["getDefaultMessages"]>;
}

export type EPlayerCommandModule = (Player: EPlayer) => Awaitable<(CommandBuilder)[]>;

export class EPlayer implements RecipleScript {
    public versions: string = '^4.0.0';
    public config: EPlayerConfig = EPlayer.getConfig();
    public commands: CommandBuilder[] = [];
    public commandModules: EPlayerCommandModule[] = [];
    public client!: RecipleClient<boolean>;
    public logger!: Logger;
    public player!: Player;

    public async onStart(client: RecipleClient<boolean>): Promise<boolean> {
        this.client = client;
        this.logger = this.client.logger.cloneLogger({ loggerName: `E Player` });
        this.player = new Player(this.client, this.config.playerOptions);

        this.logger.log(`Starting E Player...`);
        await this.loadCommands();

        return true;
    }

    public onLoad(): void {

        this.commands = this.commands.map(command => {
            const commandOptions = this.config.commandOptions[command.name];

            if (commandOptions.cooldown) command.setCooldown(typeof commandOptions.cooldown == 'string' ? ms(commandOptions.cooldown) : commandOptions.cooldown);
            if (commandOptions.description) command.setDescription(commandOptions.description);
            if (commandOptions.requiredBotPermissions) command.setRequiredBotPermissions(...commandOptions.requiredBotPermissions);
            if (commandOptions.requiredMemberPermissions) command.setRequiredMemberPermissions(...commandOptions.requiredMemberPermissions);

            if(command.builder == CommandBuilderType.MessageCommand) {
                if (commandOptions.messageCommandAliases) command.aliases = commandOptions.messageCommandAliases;

                command.setValidateOptions(true);
            }

            return command;
        });

        this.logger.log(`Loaded E Player!`);
    }

    public async loadCommands(): Promise<EPlayerCommandModule[]> {
        const commandModulesPath = path.join(__dirname, './EPlayerCommands');

        mkdirSync(commandModulesPath, { recursive: true });
        const commandFiles = readdirSync(commandModulesPath)
            .filter(f => f.endsWith('.js'))
            .map(f => path.join(commandModulesPath, f));

        this.logger.log(`${commandFiles.length} Player command module(s) found`);

        for (const commandFile of commandFiles) {
            this.logger.debug(`Loading ${commandFile}`);

            try {
                const commandInit = require(commandFile);
                const command: EPlayerCommandModule|undefined = typeof commandInit?.default == 'undefined' ? commandInit : commandInit.default;
                if (typeof command == 'undefined') throw new Error('Command is undefined');

                this.commands.push(...(await command(this)));
                this.commandModules.push(command);

                this.logger.log(`Loaded ${commandFile}`);
            } catch (err) {
                this.logger.error(`Unable to load ${commandFile}:`);
                this.logger.error(err);
            }
        }

        return this.commandModules;
    }

    public getMessageEmbed(messageKey: keyof EPlayerConfig["messages"], positive: boolean = false, ...placeholders: string[]): EmbedBuilder {
        let message = this.getMessage(messageKey, ...placeholders);
        const embed = new EmbedBuilder()
            .setColor(
                positive
                ? this.getMessage('embedColor')
                : this.getMessage('errorEmbedColor')
            );

        if (message.toLowerCase().startsWith('description:')) {
            message = `\n${trimChars(message, 'description:')}`;
        } else if (message.toLowerCase().startsWith('author:')) {
            message = replaceAll(trimChars(message, 'author:'), '\n', '\\n');
        }

        if (message.includes('\n')) {
            embed.setDescription(message);
        } else {
            embed.setAuthor({ name: message, iconURL: this.client.user?.displayAvatarURL() })
        }

        return embed;
    }

    public getMessage<T extends any = string>(messageKey: keyof EPlayerConfig["messages"], ...placeholders: string[]): T {
        let message = this.config.messages[messageKey] ?? EPlayer.getDefaultMessages()[messageKey] ?? messageKey;
        if (!placeholders?.length) return message as T;

        for (let i=0; i < placeholders.length; i++) {
            message = replaceAll(message, [`{${i}}`, `%${i}%`].map(p => escapeRegExp(p)), [placeholders[i], placeholders[i]]);
        }

        return message as T;
    }

    public static getConfig(): EPlayerConfig {
        const configPath = path.join(process.cwd(), 'config/e-player/config.yml');
        const defaultConfig = this.getDefaultConfig();

        return yml.parse(createConfig(configPath, defaultConfig));
    }

    public static getDefaultConfig(): EPlayerConfig {
        return {
            playerOptions: {
                deafenOnJoin: true,
                leaveOnEmpty: true,
                leaveOnEnd: true,
                leaveOnStop: true,
                quality: 'high',
                timeout: 10000,
                volume: 100
            },
            commandOptions: this.getDefaultCommandOptions(),
            messages: this.getDefaultMessages()
        };
    }

    public static getDefaultCommandOptions(): EPlayerConfig["commandOptions"] {
        return {
            play: {
                description: 'Search for a song to play.'
            }
        };
    }

    public static getDefaultMessages() {
        return {
            embedColor: '#de111e',
            errorEmbedColor: '#de111e',
        };
    }
}

export default new EPlayer();
