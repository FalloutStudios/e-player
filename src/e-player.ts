import { Awaitable, EmbedBuilder, GuildTextBasedChannel, PermissionResolvable } from 'discord.js';
import { AnyCommandBuilder, CommandBuilderType, RecipleClient, RecipleScript } from 'reciple';
import { escapeRegExp, Logger, replaceAll, trimChars } from 'fallout-utility';
import { Player, PlayerOptions, Queue } from 'discord-player';
import { createConfig } from './_createConfig';
import { mkdirSync, readdirSync } from 'fs';
import BaseModule from './_BaseModule';
import path from 'path';
import yml from 'yaml';
import ms from 'ms';

export interface EPlayerConfig {
    playerOptions: PlayerOptions;
    bigSearchResultThumbnails: boolean;
    bigNowPlayingThumbnails: boolean;
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

export interface EPlayerMetadata {
    textChannel?: GuildTextBasedChannel;
}

export type EPlayerCommandModule = (Player: EPlayer) => Awaitable<(AnyCommandBuilder)[]>;

export class EPlayer extends BaseModule implements RecipleScript {
    public config: EPlayerConfig = EPlayer.getConfig();
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

        this.player.on('debug', (_queue, message) => this.logger.debug(message));
        this.player.on('error', (queue, err) => this.connectionError(queue as Queue<EPlayerMetadata>, err))

        return true;
    }

    public onLoad(): void {

        this.commands = this.commands.map(command => {
            const commandOptions = this.config.commandOptions[command.name];

            if (commandOptions.cooldown) command.setCooldown(typeof commandOptions.cooldown == 'string' ? ms(commandOptions.cooldown) : commandOptions.cooldown);
            if (commandOptions.description) command.setDescription(commandOptions.description);
            if (commandOptions.requiredBotPermissions) command.setRequiredBotPermissions(...commandOptions.requiredBotPermissions);
            if (commandOptions.requiredMemberPermissions) command.setRequiredMemberPermissions(...commandOptions.requiredMemberPermissions);

            if(command.type == CommandBuilderType.MessageCommand) {
                if (commandOptions.messageCommandAliases) command.aliases = commandOptions.messageCommandAliases;

                command.setValidateOptions(true);
            }

            return command;
        });

        this.logger.log(`Loaded E Player!`);
    }

    public pauseToggle(queue: Queue) {
        if (queue.connection.paused) {
            return queue.setPaused(false) ? 'PAUSED' : 'ERROR';
        } else {
            return queue.setPaused(true) ? 'RESUMED' : 'ERROR';
        }
    }

    public async connectionError(queue: Queue<EPlayerMetadata>, err: Error): Promise<void> {
        const textChannel = queue.metadata?.textChannel;

        if (!queue.destroyed && queue.tracks.length) queue.skip();
        if (textChannel) textChannel.send({ embeds: [this.getMessageEmbed('botInternalError', false, String(err))] });
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
            bigNowPlayingThumbnails: false,
            bigSearchResultThumbnails: true,
            playerOptions: {
                autoSelfDeaf: true,
                initialVolume: 100,
                leaveOnEmpty: true,
                leaveOnStop: true,
                leaveOnEnd: true,
                leaveOnEmptyCooldown: 60 * 1000,
                spotifyBridge: true,
                ytdlOptions: {}
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
            loading: 'Loading...',
            noSearchQueryProvided: 'Enter a search query.',
            noResultsFound: 'No results found.',
            notInGuild: 'You are not in a guild.',
            notInVoiceChannel: 'You are not in a voice channel.',
            notInBotVoiceChannel: 'You are not in the voice channel I\'m in.',
            cantConnectToVoiceChannel: 'description:Can\'t connect to {0}',
            botInternalError: `An error occurred`,
            commandCooldown: `description:Wait for \`{0}\` cooldown.`,
            commandError: `An error occurred while executing this command.`,
            commandInvalidArguments: `description:Invalid arguments given to option(s): {0}`,
            commandMissingArguments: `description:Missing required command arguments: {0}`,
            commandNoBotPermissions: `I don't have enough permissions to execute this command.`,
            commandNoMemberPermissions: `You do not have enough permissions to execute this command.`
        };
    }
}

export default new EPlayer();
