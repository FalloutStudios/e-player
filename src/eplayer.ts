import { Collection, Embed, EmbedBuilder, Guild, GuildMember, GuildResolvable, GuildTextBasedChannel } from 'discord.js';
import { AnyCommandBuilder, AnyCommandData, cwd, RecipleClient, RecipleScript } from 'reciple';
import { EPlayerConfig, ePlayerDefaultConfig, EPlayerMetadata } from './EPlayer/config';
import { escapeRegExp, Logger, replaceAll, trimChars } from 'fallout-utility';
import { Player, PlayerOptions, Queue } from 'discord-player';
import { EPlayerMessages, ePlayerMessages } from './EPlayer/messages';
import EPlayerBaseModule from './_eplayer.base';
import { createConfig, createGuildSettingsData, createQueueAndConnect, deleteGuildSettingsData, getOfficialAudio, makePlayCommandEmbed } from './_eplayer.util';
import { PrismaClient } from '@prisma/client';
import { mkdirSync, readdirSync } from 'fs';
import path from 'path';
import yml from 'yaml';
import { GuildSettings } from './EPlayer/classes/GuildSettings';

export type EPlayerCommand = (player: EPlayer) => (AnyCommandBuilder|AnyCommandData)[];

export class EPlayer extends EPlayerBaseModule implements RecipleScript {
    public logger!: Logger;
    public client!: RecipleClient;
    public config: EPlayerConfig = this.getConfig();
    public player!: Player;
    public prisma: PrismaClient = new PrismaClient();
    public settingsCache: Collection<string, GuildSettings> = new Collection();

    public async onStart(client: RecipleClient<boolean>): Promise<boolean> {
        this.client = client;
        this.player = new Player(client, this.config.player);
        this.logger = client.logger.cloneLogger({ loggerName: 'EPlayer' });

        this.loadCommands();

        this.player.on('debug', (queue, message) => this.logger.debug(message));
        this.player.on('connectionError', (queue, error) => this.logger.err(error));
        this.player.on('error', (queue, error) => this.logger.err(error));
        this.player.on('botDisconnect', async queue => {
            this.logger.warn(`Saving queue from ${queue.guild.id}`);
            const cachedQueue = (await this.getGuildSettings(queue.guild.id))?.cachedQueue;

            await (cachedQueue?.cacheCurrentQueue(<Queue<EPlayerMetadata>>(queue)))?.update();
            this.logger.warn(`Saved queue`, ...[...(queue.previousTracks.length > 1 ? [queue.previousTracks[queue.previousTracks.length - 1]] : []), ...queue.tracks].map(t => t.title));
        })

        client.on('guildCreate', async guild => createGuildSettingsData(guild.id));
        client.on('guildDelete', async guild => deleteGuildSettingsData(guild.id));

        return true;
    }

    public async loadCommands(): Promise<void> {
        const dir = path.join(__dirname, 'EPlayer/commands');

        mkdirSync(dir, { recursive: true });

        const files = readdirSync(dir).filter(f => f.endsWith('.js')).map(f => path.join(dir, f));
        for (const file of files) {
            try {
                const commandsFile = await import(file);
                const commands: EPlayerCommand = commandsFile?.default ?? commandsFile;

                this.commands.push(...commands(this));
                this.logger.log(`Loaded ${file}`);
            } catch (err) {
                this.logger.err(`Failed to load ${file}`, err);
            }
        }
    }

    public async play(query: string, guild: Guild, author: GuildMember, textChannel?: GuildTextBasedChannel, options?: PlayerOptions): Promise<EmbedBuilder> {
        if (!query) return this.getMessageEmbed('noSearchQuery');
        if (!guild || !author || !guild.members.me) return this.getMessageEmbed('notInGuild');
        if (!author.voice.channel) return this.getMessageEmbed('notInVoiceChannel');
        if (guild.members.me.voice.channel && author.voice.channel.id !== guild.members.me.voice.channel.id) return this.getMessageEmbed('InDifferentVoiceChannel', false, guild.members.me.voice.channel.toString());
        if (!author.voice.channel.permissionsFor(guild.members.me).has(this.config.requiredBotVoicePermissions)) return this.getMessageEmbed('noVoicePermissions', false, author.voice.channel.toString());

        const results = await this.player.search(query, { requestedBy: author }).catch(() => null);
        if (!results || !(results.playlist?.tracks ?? results.tracks).length) return this.getMessageEmbed('noResults');

        const queue = await createQueueAndConnect(guild, author.voice.channel, {
            ...options,
            metadata: { textChannel }
        }).catch(() => null);

        if (!queue?.connection) {
            if (!queue?.destroyed) queue?.stop();
            return this.getMessageEmbed('cantConnect', false, author.voice.channel.toString());
        }

        const cachedQueue = (await this.getGuildSettings(guild.id))?.cachedQueue;
        const tracks = results.playlist ? results.playlist.tracks : getOfficialAudio(results.tracks);
        const embed = makePlayCommandEmbed(results.playlist ? results.playlist : tracks[0], author.user);

        queue.addTracks([...tracks, ...((cachedQueue?.enabled ? cachedQueue?.getTracks() : null) ?? [])]);

        let error = false;
        if (!queue.playing) await queue.play().catch(err => {
            error = true;
            this.logger.err(err);
        });

        if (!error && cachedQueue?.tracks.length) await cachedQueue?.setTracks([]).update().catch(() => {});
        return error ? this.getMessageEmbed('errorPlaying', false, (results.playlist ? results.playlist : tracks[0]).title) : embed;
    }

    public async playCachedTracks(guild: Guild, author: GuildMember, textChannel?: GuildTextBasedChannel, options?: PlayerOptions): Promise<EmbedBuilder> {
        if (!guild || !author || !guild.members.me) return this.getMessageEmbed('notInGuild');
        if (!author.voice.channel) return this.getMessageEmbed('notInVoiceChannel');
        if (guild.members.me.voice.channel && author.voice.channel.id !== guild.members.me.voice.channel.id) return this.getMessageEmbed('InDifferentVoiceChannel', false, guild.members.me.voice.channel.toString());
        if (!author.voice.channel.permissionsFor(guild.members.me).has(this.config.requiredBotVoicePermissions)) return this.getMessageEmbed('noVoicePermissions', false, author.voice.channel.toString());

        const cachedQueue = (await this.getGuildSettings(guild.id))?.cachedQueue;
        if (!cachedQueue?.tracks.length || !cachedQueue.enabled) return this.getMessageEmbed('noTracks');

        const queue = await createQueueAndConnect(guild, author.voice.channel, {
            ...options,
            metadata: { textChannel }
        }).catch(() => null);

        if (!queue?.connection) {
            if (!queue?.destroyed) queue?.stop();
            return this.getMessageEmbed('cantConnect', false, author.voice.channel.toString());
        }

        const tracks = cachedQueue.getTracks();
        const embed = makePlayCommandEmbed(tracks[0], author.user);

        queue.addTracks(tracks);

        let error = false;
        if (!queue.playing) await queue.play().catch(err => {
            error = true;
            this.logger.err(err);
        });

        if (!error && cachedQueue?.tracks.length) await cachedQueue?.setTracks([]).update().catch(() => {});
        return error ? this.getMessageEmbed('errorPlaying', false, tracks[0].title) : embed;
    }

    public togglePause(queue: Queue): 'PAUSED'|'RESUMED'|'ERROR' {
        if (!queue.connection.paused && queue.setPaused(true)) {
            return 'PAUSED';
        } else if (queue.connection.paused && queue.setPaused(false)) {
            return 'RESUMED';
        }

        return 'ERROR';
    }

    public getQueue<M extends any = EPlayerMetadata>(guild: GuildResolvable): Queue<M>|null {
        return this.player.getQueue(guild) ?? null;
    }

    public getMessageEmbed(messageKey: keyof EPlayerMessages, positive: boolean = false, ...placeholders: string[]): EmbedBuilder {
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


    public getMessage<T extends any = string>(messageKey: keyof EPlayerMessages, ...placeholders: string[]): T {
        let message: string = this.config.messages[messageKey] ?? ePlayerMessages[messageKey] ?? messageKey;
        if (!placeholders?.length) return message as T;

        for (let i=0; i < placeholders.length; i++) {
            message = replaceAll(message, [`{${i}}`, `%${i}%`].map(p => escapeRegExp(p)), [placeholders[i], placeholders[i]]);
        }

        return message as T;
    }

    public async getGuildSettings(guildId: string): Promise<GuildSettings|null> {
        return this.settingsCache.has(guildId) ? this.settingsCache.get(guildId) ?? null : this.fetchGuildSettings(guildId);
    }

    public getConfig(): EPlayerConfig {
        return {
            ...ePlayerDefaultConfig,
            ...yml.parse(createConfig(path.join(cwd, 'config/eplayer.yml'), yml.stringify(ePlayerDefaultConfig)))
        };
    }

    public async fetchGuildSettings(guildId: string, cache: boolean = true): Promise<GuildSettings|null> {
        const guild = this.client.guilds.resolve(guildId);
        if (!guild) return null;

        const guildSettingsData = await this.prisma.guildSettings.findFirst({
            where: { id: guildId },
            include: {
                cachedQueue: {
                    where: { id: guildId }
                },
                djSettings: {
                    where: { id: guildId }
                }
            }
        });

        if (!guildSettingsData) return null;

        const settings = await (new GuildSettings({
            player: this,
            guild: guild,
            ...guildSettingsData,
            djSettingsOptions: { ...guildSettingsData.djSettings[0] },
            cachedQueueOptions: { ...guildSettingsData.cachedQueue[0] }
        })).fetch();

        if (cache) this.settingsCache.set(guildId, settings);
        return settings;
    }
}

export default new EPlayer();
