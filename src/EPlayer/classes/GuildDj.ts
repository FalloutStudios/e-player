import { GuildDjs } from '@prisma/client';
import { Queue } from 'discord-player';
import { Collection, Guild, GuildMember, PermissionsBitField, Role } from 'discord.js';
import { EPlayerMetadata } from '../config';
import { GuildSettings } from './GuildSettings';

export class GuildDj<M extends any = EPlayerMetadata> {
    public guildSettings: GuildSettings<M>;
    public guild: Guild;
    public queue: Queue<M>;
    public guildId: string;
    public enabled: boolean;
    public allowedRoles: Collection<string, Role>;
    public requiredPermissions?: PermissionsBitField;

    constructor(guildSettings: GuildSettings<M>, options: GuildDjs) {
        this.guildSettings = guildSettings;
        this.queue = guildSettings.queue;
        this.guild = guildSettings.guild;
        this.guildId = options.guildId;
        this.enabled = options.enabled;
        this.allowedRoles = this.guild.roles.cache.filter(role => (options.allowedRoles as string[]).includes(role.id));
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
