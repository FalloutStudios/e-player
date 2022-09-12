import { GuildSettings as GuildSettingsModel } from '@prisma/client';
import { Queue } from 'discord-player';
import { Guild, GuildTextBasedChannel } from 'discord.js';
import { EPlayerMetadata } from '../config';
import { Base, BaseOptions } from './Base';
import { GuildCachedQueue, GuildCachedQueueOptions } from './GuildCachedQueue';
import { GuildDjSettings, GuildDjSettingsOptions } from './GuildDjSettings';

export interface GuildSettingsOptions extends BaseOptions,GuildSettingsModel {
    guild: Guild;
    djSettingsOptions?: Omit<GuildDjSettingsOptions, 'player' | 'guildSettings'>;
    cachedQueueOptions?: Omit<GuildCachedQueueOptions, 'player' | 'guildSettings'>;
}

export class GuildSettings<M extends any = EPlayerMetadata> extends Base {
    private _queue: Queue<M>|null = null;
    private _guild: Guild;

    public id: string;
    public pro: boolean = false;
    public proExpireAt: Date|null = null;
    public commandsChannelId: string|null = null;
    public commandsChannel: GuildTextBasedChannel|null = null;

    public djSettings: GuildDjSettings<M>|null = null;
    public cachedQueue: GuildCachedQueue<M>|null = null;

    get queue() { return this._queue; }
    get guild() { return this._guild; }

    constructor(options: GuildSettingsOptions) {
        super(options);

        this._guild = options.guild;
        this._queue = this.player.getQueue<M>(this._guild);

        this.id = options.id;
        this.pro = options.pro;
        this.proExpireAt = options.proExpireAt;
        this.commandsChannelId = options.commandsChannelId;

        this.djSettings = options.djSettingsOptions
            ? new GuildDjSettings({
                    player: this.player,
                    guildSettings: this,
                    ...options.djSettingsOptions
                })
            : null;

        this.cachedQueue = options.cachedQueueOptions
            ? new GuildCachedQueue<M>({
                    player: this.player,
                    guildSettings: this,
                    ...options.cachedQueueOptions
                })
            : null;

        const possiblyCachedCommandChannel = (this.commandsChannelId ? this.guild.channels.cache.get(this.commandsChannelId) : null) ?? null;

        this.commandsChannel = possiblyCachedCommandChannel && possiblyCachedCommandChannel.isTextBased() && !possiblyCachedCommandChannel.isDMBased()
            ? possiblyCachedCommandChannel
            : null;
    }

    public async fetch(): Promise<this> {
        const newSelfData = await this.prisma.guildSettings.findFirst({
            where: { id: this.guild.id },
            include: {
                djSettings: {
                    where: { id: this.guild.id }
                },
                cachedQueue: {
                    where: { id: this.guild.id }
                }
            }
        });

        if (!newSelfData) {
            await this.delete();
            return this;
        }

        this.id = newSelfData.id;
        this.pro = newSelfData.pro;
        this.proExpireAt = newSelfData.proExpireAt;
        this.commandsChannelId = newSelfData.commandsChannelId;

        this.djSettings = this.djSettings
            ? await this.djSettings.fetch()
            : newSelfData.djSettings.length
                ? new GuildDjSettings({
                        player: this.player,
                        guildSettings: this,
                        ...newSelfData.djSettings[0]
                    })
                : null;

        this.cachedQueue = this.cachedQueue
            ? await this.cachedQueue.fetch()
            : newSelfData.cachedQueue.length
                ? new GuildCachedQueue({
                        player: this.player,
                        guildSettings: this,
                        ...newSelfData.cachedQueue[0]
                    })
                : null;

        const fetchCommandChannel = this.commandsChannelId ? await this.guild.channels.fetch(this.commandsChannelId) : null;
        this.commandsChannel = fetchCommandChannel && fetchCommandChannel.isTextBased() && !fetchCommandChannel.isDMBased()
                ? fetchCommandChannel
                : null;

        return this;
    }

    public async delete(): Promise<void> {
        if (this.djSettings && !this.djSettings.deleted) await this.djSettings.delete();
        if (this.cachedQueue && !this.cachedQueue.deleted) await this.cachedQueue.delete();

        await this.prisma.guildSettings.delete({
            where: { id: this.guild.id },
            include: {
                djSettings: {
                    where: { id: this.guild.id }
                },
                cachedQueue: {
                    where: { id: this.guild.id }
                }
            }
        });

        super.delete();
    }
}
