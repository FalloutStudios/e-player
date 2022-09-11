import { GuildCachedQueue } from '@prisma/client';
import { Queue } from 'discord-player';
import { Guild, GuildTextBasedChannel } from 'discord.js';
import { EPlayerMetadata } from '../config';
import { GuildSettings } from './GuildSettings';

export interface CachedQueueOptions extends Omit<GuildCachedQueue, 'tracks'> {
    tracks: CachedQueueTrack[];
}

export interface CachedQueueTrack {
    source: string;
    origin: string;
    title: string;
    description: string;
    requestedById: string;
}

export class CachedQueue<M extends any = EPlayerMetadata> {
    public guildSettings: GuildSettings<M>;
    public guild: Guild;
    public queue: Queue<M>;
    public guildId: string;
    public tracks: CachedQueueTrack[];
    public textChannelId: string|null;
    public textChannel: GuildTextBasedChannel|null;
    public expireAt: Date;

    constructor(guildSettings: GuildSettings<M>, options: CachedQueueOptions) {
        this.guildSettings = guildSettings;
        this.guild = guildSettings.guild;
        this.queue = guildSettings.queue;
        this.guildId = options.guildId;
        this.tracks = options.tracks;
        this.textChannelId = options.textChannelId;
        this.expireAt = options.expireAt;

        const channel = this.textChannelId ? guildSettings.guild.channels.cache.get(this.textChannelId) : null;
        if (!channel || !channel.isTextBased()) throw new Error('Couldn\'t find ' + this.textChannelId);

        this.textChannel = channel;
    }
}
