import { GuildCachedQueue as GuildCachedQueueModel } from '@prisma/client';
import { Guild, GuildTextBasedChannel } from 'discord.js';
import { isObjectArray } from '../../_eplayer.util';
import { EPlayerMetadata } from '../config';
import { Base, BaseOptions } from './Base';
import { GuildSettings } from './GuildSettings';

export interface GuildCachedQueueTrack {
    sourceURL: string;
    displayURL: string;
    playlistURL?: string;
    thumbnail?: string;
    requestedById: string;
    title: string;
}

export interface GuildCachedQueueOptions<M extends any = EPlayerMetadata> extends BaseOptions,GuildCachedQueueModel {
    guildSettings: GuildSettings<M>;
}

export class GuildCachedQueue<M extends any = EPlayerMetadata> extends Base {
    private _guildSettings: GuildSettings<M>;
    private _guild: Guild;

    public id: string;
    public tracks: GuildCachedQueueTrack[] = [];
    public commandChannelId: string|null = null;
    public commandChannel: GuildTextBasedChannel|null = null;

    get guildSettins() { return this._guildSettings; }
    get guild() { return this._guild; }

    constructor(options: GuildCachedQueueOptions<M>) {
        super(options);

        this._guildSettings = options.guildSettings;
        this._guild = options.guildSettings.guild;

        this.id = options.id;
        this.tracks = isObjectArray<GuildCachedQueueTrack>(options.tracks) ? options.tracks : [];
        this.commandChannelId = options.commandsChannelId;

        const possiblyCachedCommandChannel = this.commandChannelId ? this.guild.channels.cache.get(this.commandChannelId) : null;

        this.commandChannel = possiblyCachedCommandChannel && possiblyCachedCommandChannel.isTextBased() && !possiblyCachedCommandChannel.isDMBased()
            ? possiblyCachedCommandChannel
            : null;
    }

    public async fetch(): Promise<this> {
        const newSelfData = await this.prisma.guildCachedQueue.findFirst({
            where: { id: this.guild.id }
        });

        if (!newSelfData) {
            await this.delete();
            return this;
        }

        this.id = newSelfData.id;
        this.tracks = isObjectArray<GuildCachedQueueTrack>(newSelfData.tracks) ? newSelfData.tracks : [];
        this.commandChannelId = newSelfData.commandsChannelId;

        const fetchCommandChannel = this.commandChannelId ? await this.guild.channels.fetch(this.commandChannelId) : null;
        this.commandChannel = fetchCommandChannel && fetchCommandChannel.isTextBased() && !fetchCommandChannel.isDMBased()
            ? fetchCommandChannel
            : null;

        return this;
    }

    public async delete(): Promise<void> {
        await this.prisma.guildCachedQueue.delete({
            where: { id: this.guild.id }
        });

        super.delete();
    }
}
