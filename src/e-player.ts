import { Player, PlayerInitOptions, Queue } from 'discord-player';
import { RecipleClient, recipleCommandBuilders, RecipleScript } from 'reciple';
import { escapeRegExp, Logger, replaceAll, trimChars } from 'fallout-utility';
import path from 'path';
import yml from 'yaml';
import { createConfig } from './_createConfig';
import { Awaitable, ColorResolvable, MessageEmbed, TextBasedChannel } from 'discord.js';
import { existsSync, mkdirSync, readdirSync } from 'fs';

export interface EPlayerConfig {
    ignoredCommands: string[];
    commandDescriptions: {
        [commandName: string]: string;
    },
    player: PlayerInitOptions;
    messages: {
        [messageKey: string]: string;
    }
}

export interface EPlayerMetadata {
    textChannel: TextBasedChannel;
}

export type PlayerCommandModule = (Player: EPlayer) => Awaitable<(recipleCommandBuilders)[]>;

export class EPlayer implements RecipleScript {
    public versions: string | string[] = ['1.5.x'];
    public config: EPlayerConfig = EPlayer.getConfig();
    public commands: recipleCommandBuilders[] = [];
    public modules: PlayerCommandModule[] = [];
    public client!: RecipleClient;
    public logger!: Logger;
    public player!: Player;

    public async onStart(client: RecipleClient): Promise<boolean> {
        this.client = client;
        this.logger = this.client.logger.cloneLogger();
        this.logger.defaultPrefix = 'EPlayer';
        this.player = new Player(this.client, this.config.player);

        this.logger.log(`Starting E Player...`);
        await this.loadCommands();

        this.commands = this.commands.map(c => c.setDescription(this.config.commandDescriptions[c.name] ?? EPlayer.getDefaultCommandDescriptions()[c.name] ?? 'No description provided'));
        this.commands = this.commands.filter(c => !this.config.ignoredCommands.some(i => i.toLowerCase() == c.name.toLowerCase()));

        return true;
    }

    public async onLoad(): Promise<void> {
        this.logger.log(`Loaded E Player!`);
    }

    public pauseToggle(queue: Queue): 'PAUSED'|'RESUMED'|'ERROR' {
        if (queue.setPaused(true)) {
            return 'PAUSED';
        } else if (queue.setPaused(false)) {
            return 'RESUMED';
        } else {
            return 'ERROR';
        }
    }

    public getMessageEmbed(messageKey: string, positive: boolean = false, ...placeholders: string[]): MessageEmbed {
        let message = this.getMessage(messageKey, ...placeholders);
        const embed = new MessageEmbed()
            .setColor((
                positive
                ? this.getMessage('embedColor')
                : this.getMessage('errorEmbedColor')
            ) as ColorResolvable);

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

    public getMessage(messageKey: string, ...placeholders: string[]): string {
        let message = this.config.messages[messageKey] ?? EPlayer.getDefaultMessages()[messageKey] ?? messageKey;
        if (!placeholders?.length) return message;

        for (let i=0; i < placeholders.length; i++) {
            message = replaceAll(message, [`{${i}}`, `%${i}%`].map(p => escapeRegExp(p)), [placeholders[i], placeholders[i]]);
        }

        return message;
    }

    public async loadCommands(): Promise<void> {
        const commandDir = path.join(__dirname, 'EPlayerCommands/');
        if (!existsSync(commandDir)) mkdirSync(commandDir, { recursive: true });

        const commandFiles = readdirSync(commandDir)
            .filter(f => f.endsWith('.js') || f.endsWith('.ts'))
            .map(f => path.join(__dirname, 'EPlayerCommands/', f));

        this.logger.log(`${commandFiles.length} Player command module(s) found!`);

        for (const commandFile of commandFiles) {
            this.logger.debug(`Loading ${commandFile}`);

            try {
                const commandInit = require(commandFile);
                const command: PlayerCommandModule|undefined  = typeof commandInit?.default == 'undefined' ? commandInit : commandInit.default;
                if (typeof command == 'undefined') throw new Error('Command is undefined');

                this.commands.push(...(await command(this)));
                this.modules.push(command);

                this.logger.debug(`Loaded ${commandFile}`);
            } catch (err) {
                this.logger.error(`Error loading player command module ${commandFile}`);
                this.logger.error(err);
            }
        }
    }

    public static getConfig(): EPlayerConfig {
        const configPath = path.join(process.cwd(), 'config/EPlayer/config.yml');
        const defaultConfig: EPlayerConfig = {
            ignoredCommands: [],
            commandDescriptions: this.getDefaultCommandDescriptions(),
            player: {
                connectionTimeout: 10000
            },
            messages: this.getDefaultMessages()
        };

        return yml.parse(createConfig(configPath, defaultConfig));
    }

    public static getDefaultCommandDescriptions(): EPlayerConfig["commandDescriptions"] {
        return {
            play: "Play"
        };
    }

    public static getDefaultMessages(): EPlayerConfig["messages"] {
        return {
            embedColor: 'ORANGE',
            errorEmbedColor: 'RED',
            loading: 'Please wait...',
            noQueryProvided: 'Enter a search query or link',
            notInVoiceChannel: 'Join a voice channel',
            InDifferentVoiceChannel: 'You are not in my current voice channel',
            noResults: 'No results found',
            cantConnectToVoiceChannel: 'Cant connect to voice channel',
            notAMember: 'Command not available',
            unknownError: 'Unknown error occurred',
            trackNotFound: 'Track not found',
            isRequired: 'description:\`{0}\` is required',
            error: 'Error occurred',
            noQueue: 'No queue available',
            clear: 'description:<@{2}> cleared `{0} track(s)`',
            skip: 'description:<@{2}> skipped **{0}**',
            pause: 'description:<@{2}> paused **{0}**',
            resume: 'description:<@{2}> resumed **{0}**',
            removeTrack: `description:<@{2}> removed **{0}** from queue`,
            shuffle: `description:<@{1}> shuffled the queue`,
            stop: `description:<@{1}> stopped the player`
        };
    }
}

export default new EPlayer();
