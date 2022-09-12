import { GuildCachedQueue as GuildCachedQueueModel } from '@prisma/client';
import { Guild, GuildTextBasedChannel, User } from 'discord.js';
import eplayer from '../../eplayer';
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
    requestedBy?: User;
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
    public commandsChannelId: string|null = null;
    public commandsChannel: GuildTextBasedChannel|null = null;

    get guildSettins() { return this._guildSettings; }
    get guild() { return this._guild; }

    constructor(options: GuildCachedQueueOptions<M>) {
        super(options);

        this._guildSettings = options.guildSettings;
        this._guild = options.guildSettings.guild;

        this.id = options.id;
        this.tracks = isObjectArray<GuildCachedQueueTrack>(options.tracks)
            ? options.tracks.map(track => {
                    const requestedBy = this.client.users.cache.get(track.requestedById);
                    return { ...track, requestedBy };
                })
            : [];

        this.commandsChannelId = options.commandsChannelId;

        const possiblyCachedCommandsChannel = this.commandsChannelId ? this.guild.channels.cache.get(this.commandsChannelId) : null;

        this.commandsChannel = possiblyCachedCommandsChannel && possiblyCachedCommandsChannel.isTextBased() && !possiblyCachedCommandsChannel.isDMBased()
            ? possiblyCachedCommandsChannel
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
        this.tracks = isObjectArray<GuildCachedQueueTrack>(newSelfData.tracks)
            ? await Promise.all(newSelfData.tracks.map(async track => {
                    const requestedBy = (this.client.users.cache.get(track.requestedById) ?? await this.client.users.fetch(track.requestedById).catch(() => null)) || undefined;
                    return { ...track, requestedBy };
                }))
            : [];

        this.commandsChannelId = newSelfData.commandsChannelId;

        const fetchCommandChannel = this.commandsChannelId ? await this.guild.channels.fetch(this.commandsChannelId) : null;
        this.commandsChannel = fetchCommandChannel && fetchCommandChannel.isTextBased() && !fetchCommandChannel.isDMBased()
            ? fetchCommandChannel
            : null;

        return this;
    }

    public async update(): Promise<this> {
        await this.prisma.guildCachedQueue.upsert({
            where: { id: this.guild.id },
            create: {
                id: this.guild.id,
                tracks: this.tracks as {}[],
                commandsChannelId: this.commandsChannelId
            },
            update: {
                id: this.guild.id,
                tracks: this.tracks as {}[],
                commandsChannelId: this.commandsChannelId
            }
        });

        return this;
    }

    public async delete(): Promise<void> {
        await this.prisma.guildCachedQueue.delete({
            where: { id: this.guild.id }
        });

        super.delete();
    }

    public static async createIfNotExists(data: Partial<GuildCachedQueueModel> & { id: string; }): Promise<void> {
        const isExists = await eplayer.prisma.guildSettings.count({
            where: { id: data.id }
        });
        if (isExists) return;

        await eplayer.prisma.guildSettings.create({ data });
    }
}
