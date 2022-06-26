import { Player, PlayerInitOptions, PlayerOptions, Queue, Track } from 'discord-player';
import { RecipleClient, recipleCommandBuilders, RecipleScript } from 'reciple';
import { escapeRegExp, Logger, replaceAll, trimChars } from 'fallout-utility';
import path from 'path';
import yml from 'yaml';
import { createConfig } from './_createConfig';
import { Awaitable, ColorResolvable, GuildMember, Message, MessageActionRow, MessageButton, MessageEmbed, TextBasedChannel } from 'discord.js';
import { existsSync, mkdirSync, readdirSync } from 'fs';

export interface EPlayerConfig {
    ignoredCommands: string[];
    nowPlayingMessage: {
        enabled: boolean;
        addButtons: boolean;
        deletedSentPlayedMessage: boolean;
    };
    commandDescriptions: {
        [commandName: string]: string;
    };
    player: PlayerInitOptions;
    settings: PlayerOptions;
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

        this.player.on('connectionError', (queue, error) => this.connectionError(queue as Queue<EPlayerMetadata>, error));
        this.player.on('error', (queue, error) => this.connectionError(queue as Queue<EPlayerMetadata>, error));
        this.player.on('debug', (queue, message) => this.logger.debug(`${queue.id}: ${message}`))
        this.player.on('trackStart', (queue, track) => this.nowPlayingMessage(queue as Queue<EPlayerMetadata>, track))

        return true;
    }

    public async onLoad(): Promise<void> {
        this.logger.log(`Loaded E Player!`);
    }

    public async nowPlayingMessage(queue: Queue<EPlayerMetadata>, track: Track): Promise<void> {
        this.logger?.debug(`Track started queue ${queue.id} in guild ${queue.guild.name}: ${track.title}`);
        if (!queue.metadata?.textChannel || !this.config.nowPlayingMessage.enabled) return;

        const embed = new MessageEmbed().setColor(this.getMessage('embedColor') as ColorResolvable);

        embed.setAuthor({ name: `Now playing`, iconURL: this.client.user?.displayAvatarURL() });
        embed.setFooter({ text: `Requested by ${track.requestedBy.tag}`, iconURL: track.requestedBy.displayAvatarURL() });
        embed.setThumbnail(track.thumbnail);
        embed.setTitle(track.title);
        embed.setURL(track.url);

        const message = await queue.metadata.textChannel.send({ embeds: [embed], components: [EPlayer.playerButtons()] }).catch(() => {});
        if (!message) return;

        const collector = this.addPlayingCollector(message, track, queue);

        queue.connection.once('start', (a) => {
            if (a.metadata.id === track.id) return;
            collector.stop();

            this.logger?.debug(`Track ended queue ${queue.id} in guild ${queue.guild.name}: ${track.title}`);
        });

        queue.connection.once('finish', (a) => {
            if (a.metadata.id !== track.id) return;
            collector.stop();

            this.logger?.debug(`Track ended queue ${queue.id} in guild ${queue.guild.name}: ${track.title}`);
        });
    }

    public addPlayingCollector(message: Message, track: Track, queue: Queue<EPlayerMetadata>) {
        const collector = message.createMessageComponentCollector({
            filter: (c) => c.customId === 'player-pause-toggle' || c.customId === 'player-skip' || c.customId === 'player-stop'
        });

        collector.on('collect', async (c) => {
            if (queue.destroyed) {
                collector.stop();
                await c.deferUpdate().catch(() => {});
                return;
            }

            if (queue.nowPlaying().id !== track.id) {
                collector.stop();
                await c.deferUpdate().catch(() => {});
                return;
            }

            if ((c.member as GuildMember).voice.channelId !== queue.connection.channel.id) {
                await c.deferUpdate().catch(() => {});
                return;
            }

            await c.deferReply().catch(() => {});

            switch (c.customId) {
                case 'player-pause-toggle':
                    const pause = this.pauseToggle(queue);
                    if (pause == 'ERROR') {
                        c.editReply({ embeds: [this.getMessageEmbed('error')] }).catch(() => {});
                        break;
                    }

                    c.editReply({ embeds: [this.getMessageEmbed(pause == 'PAUSED' ? 'pause' : 'resume', true, track.title, c.user.tag, c.user.id)] }).catch(() => {});
                    break;
                case 'player-skip':
                    const skip = queue.skip();

                    c.editReply({ embeds: [this.getMessageEmbed(skip ? 'skip' : 'error', skip, track.title, c.user.tag, c.user.id)] }).catch(() => {});
                    break;
                case 'player-stop':
                    queue.destroy(true);
                    c.editReply({ embeds: [this.getMessageEmbed('stop', true, c.user.tag, c.user.id)] }).catch(() => {});
            }
        });

        collector.on('end', async () => {
            if (this.config.nowPlayingMessage.deletedSentPlayedMessage) {
                message.delete().catch(() => {});
                return;
            }

            await message.edit({ components: [EPlayer.playerButtons(true)] }).catch(() => {});
        });

        return collector;
    }

    public connectionError(queue: Queue<EPlayerMetadata>, error: Error) {
        const channel = queue.metadata?.textChannel;

        this.logger.debug(`ERROR: Connection Error: ${queue.id}`);
        this.logger.debug(error);

        queue.destroy(true);
        if (channel) channel.send({ embeds: [this.getMessageEmbed('connectionError', false, error.message, error.name)] }).catch(() => {});
    }

    public pauseToggle(queue: Queue): 'PAUSED'|'RESUMED'|'ERROR' {
        if (!queue.connection.paused && queue.setPaused(true)) {
            return 'PAUSED';
        } else if (queue.connection.paused && queue.setPaused(false)) {
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
            nowPlayingMessage: {
                enabled: true,
                addButtons: true,
                deletedSentPlayedMessage: true
            },
            commandDescriptions: this.getDefaultCommandDescriptions(),
            settings: {
                autoSelfDeaf: true,
                disableVolume: true,
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 10000,
                leaveOnEnd: true,
                leaveOnStop: true,
                spotifyBridge: true,
            },
            player: {
                connectionTimeout: 10000
            },
            messages: this.getDefaultMessages()
        };

        return yml.parse(createConfig(configPath, defaultConfig));
    }

    public static getDefaultCommandDescriptions(): EPlayerConfig["commandDescriptions"] {
        return {
            play: "Play media.",
            pause: "Toggle pause currently playing media.",
            resume: "Toggle resume currently playing media.",
            shuffle: "Shuffle tracks in queue.",
            loop: 'Set loop mode for this queue.',
            lyrics: "Search or get lyrics of currently playing media.",
            clear: "Clear tracks in queue.",
            'now-playing': "Show current playing media.",
            remove: "Remove track from queue.",
            stop: "Stop playing and clear queue.",
            queue: "Show queue tracks",
        };
    }

    public static getDefaultMessages(): EPlayerConfig["messages"] {
        return {
            embedColor: '#de111e',
            errorEmbedColor: 'RED',
            loading: 'Please wait...',
            connectionError: 'Bot disconnected due to connection error',
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
            move: 'description:<@{2}> moved **{0}**',
            pause: 'description:<@{2}> paused **{0}**',
            resume: 'description:<@{2}> resumed **{0}**',
            repeat: 'description:<@{2}> set loop mode to `{0}`',
            removeTrack: `description:<@{2}> removed **{0}** from queue`,
            shuffle: `description:<@{1}> shuffled the queue`,
            stop: `description:<@{1}> stopped the player`
        };
    }

    public static playerButtons(disabled: boolean = false): MessageActionRow {
        return new MessageActionRow()
            .setComponents(
                new MessageButton()
                    .setCustomId('player-pause-toggle')
                    .setLabel('Pause/Resume')
                    .setStyle('PRIMARY')
                    .setDisabled(disabled),
                new MessageButton()
                    .setCustomId('player-skip')
                    .setLabel('Skip')
                    .setStyle('SECONDARY')
                    .setDisabled(disabled),
                new MessageButton()
                    .setCustomId('player-stop')
                    .setLabel('Stop')
                    .setStyle('DANGER')
                    .setDisabled(disabled)
            );
    }
}

export default new EPlayer();
