import { GuildDjs } from '@prisma/client';
import { Queue } from 'discord-player';
import { Collection, Guild, GuildMember, PermissionsBitField, Role } from 'discord.js';
import eplayer from '../../eplayer';
import { EPlayerMetadata } from '../config';

export class GuildDj<M extends any = EPlayerMetadata> {
    public queue: Queue<M>;
    public guild: Guild;
    public guildId: string;
    public enabled: boolean;
    public allowedRoles: Collection<string, Role>;
    public requiredPermissions?: PermissionsBitField;

    constructor(queue: Queue<M>, options: GuildDjs) {
        const guild = eplayer.client.guilds.cache.get(options.guildId);
        if (!guild) throw new Error("Can't find guild " + options.guildId);

        this.queue = queue;
        this.guild = guild;
        this.guildId = guild.id;
        this.enabled = options.enabled;
        this.allowedRoles = guild.roles.cache.filter(role => (options.allowedRoles as string[]).includes(role.id));
        this.requiredPermissions = options.requiredPermissions ? new PermissionsBitField(options.requiredPermissions) : undefined;
    }

    public isDjMember(member: GuildMember): boolean {
        if (!this.enabled) return true;
        if (!member || member.voice.channel?.id !== this.guild.members.me?.voice.channel?.id) return false;
        if (this.allowedRoles.size && member.roles.cache.some((role, key) => this.allowedRoles.has(key))) return true;
        if (!this.requiredPermissions || this.requiredPermissions && member.permissions.has(this.requiredPermissions)) return true;

        if (!this.allowedRoles.size && !this.requiredPermissions) {
            if (this.queue.connection.channel.members.has(member.id)) return true;
        }

        return false;
    }
}
