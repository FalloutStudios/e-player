import { GuildCachedQueue as GuildCachedQueueModel } from '@prisma/client';
import { Queue, RawTrackData, Track } from 'discord-player';
import { Guild, GuildTextBasedChannel, normalizeArray, RestOrArray } from 'discord.js';
import eplayer from '../../eplayer';
import { isObjectArray } from '../../_eplayer.util';
import { EPlayerMetadata } from '../config';
import { Base, BaseOptions } from './Base';
import { GuildSettings } from './GuildSettings';

export interface GuildCachedQueueOptions<M extends EPlayerMetadata = EPlayerMetadata> extends BaseOptions,GuildCachedQueueModel {
    guildSettings: GuildSettings<M>;
}

export class GuildCachedQueue<M extends EPlayerMetadata = EPlayerMetadata> extends Base {
    private _guildSettings: GuildSettings<M>;
    private _guild: Guild;

    public id: string;
    public enabled: boolean = true;
    public tracks: RawTrackData[] = [];
    public commandsChannelId: string|null = null;
    public commandsChannel: GuildTextBasedChannel|null = null;

    get guildSettings() { return this._guildSettings; }
    get guild() { return this._guild; }

    constructor(options: GuildCachedQueueOptions<M>) {
        super(options);

        this._guildSettings = options.guildSettings;
        this._guild = options.guildSettings.guild;

        this.id = options.id;
        this.enabled = options.enabled;
        this.tracks = isObjectArray<RawTrackData>(options.tracks) ? options.tracks : [];
        this.commandsChannelId = options.commandsChannelId;

        const possiblyCachedCommandsChannel = this.commandsChannelId ? this.guild.channels.cache.get(this.commandsChannelId) : null;

        this.commandsChannel = possiblyCachedCommandsChannel && possiblyCachedCommandsChannel.isTextBased() && !possiblyCachedCommandsChannel.isDMBased()
            ? possiblyCachedCommandsChannel
            : null;
    }

    public setEnabled(enabled: boolean): this {
        this.enabled = enabled;
        return this;
    }

    public setCommandsChannel(channel?: GuildTextBasedChannel): this {
        this.commandsChannelId = channel?.id ?? null;
        this.commandsChannel = channel ?? null;
        return this;
    }

    public setTracks(...tracks: RestOrArray<RawTrackData|Track>): this {
        this.tracks = normalizeArray(tracks).map(t => tracks instanceof Track ? GuildCachedQueue.parseTrack(t) : t) as RawTrackData[];
        return this;
    }

    public cacheCurrentQueue(queue?: Queue<M>): this {
        if (!this.guildSettings.queue && !queue) throw new Error(`No queue for ${this.guild.id}`);

        this.setCommandsChannel((queue ?? this.guildSettings.queue)?.metadata?.textChannel);
        this.setTracks((queue ?? this.guildSettings.queue)?.tracks ?? []);

        return this;
    }

    public async clear(): Promise<void> {
        this.setCommandsChannel();
        this.setTracks();

        await this.update();
    }

    public getTracks(): Track[] {
        return this.tracks.map(track => new Track(this.player.player, track));
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
        this.enabled = newSelfData.enabled;
        this.tracks = isObjectArray<RawTrackData>(newSelfData.tracks) ? newSelfData.tracks: [];
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
        const isExists = await eplayer.prisma.guildCachedQueue.count({
            where: { id: data.id }
        });
        if (isExists) return;

        await eplayer.prisma.guildCachedQueue.create({
            data: {
                ...data,
                tracks: data.tracks as {}[]|undefined ?? []
            }
        });
    }

    public static parseTrack(track: Track|RawTrackData): RawTrackData {
        if (!(track instanceof Track)) return track;

        return track.raw;
    }
}
