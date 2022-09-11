import { Guilds } from '@prisma/client';
import { Queue } from 'discord-player';
import { Guild } from 'discord.js';
import { RecipleClient } from 'reciple';
import eplayer from '../../eplayer';
import { EPlayerMetadata } from '../config';
import { CachedQueue, CachedQueueOptions } from './CachedQueue';
import { GuildDj } from './GuildDj';

export interface GuildSettingsOption extends Guilds {
}

export class GuildSettings<M extends any = EPlayerMetadata> {
    public guild: Guild;
    public queue: Queue<M>;
    public client: RecipleClient<true>;
    public guildId: string;
    public djSettings: GuildDj<M>|null = null;
    public cachedQueue: CachedQueue<M>|null = null;

    constructor(queue: Queue<M>, options: GuildSettingsOption) {
        this.queue = queue;
        this.guild = queue.guild;
        this.client = <RecipleClient<true>>(this.guild.client);
        this.guildId = options.guildId;
    }

    public async fetch(): Promise<this> {
        const guildSettingsData = await eplayer.prisma.guilds.findFirst({
            where: { guildId: this.guildId },
            include: {
                cachedQueue: {
                    where: { guildId: this.guildId },
                },
                djSettings: {
                    where: { guildId: this.guildId },
                }
            }
        });

        this.djSettings = guildSettingsData?.djSettings[0] ? new GuildDj(this, guildSettingsData.djSettings[0]) : null;
        this.cachedQueue = guildSettingsData?.cachedQueue[0] ? new CachedQueue(this, <unknown>(guildSettingsData.cachedQueue[0]) as CachedQueueOptions) : null;
        return this;
    }
}
