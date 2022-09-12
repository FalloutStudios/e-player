import { GuildDjSettings as GuildDjSettingsModel } from '@prisma/client';
import { Guild, GuildMember, normalizeArray, PermissionResolvable, PermissionsBitField, RestOrArray, RoleResolvable, UserResolvable } from 'discord.js';
import eplayer from '../../eplayer';
import { isStringArray } from '../../_eplayer.util';
import { EPlayerMetadata } from '../config';
import { Base, BaseOptions } from './Base';
import { GuildSettings } from './GuildSettings';

export interface GuildDjSettingsOptions<M extends EPlayerMetadata = EPlayerMetadata> extends BaseOptions,GuildDjSettingsModel {
    guildSettings: GuildSettings<M>;
}

export class GuildDjSettings<M extends EPlayerMetadata = EPlayerMetadata> extends Base {
    private _guildSettings: GuildSettings<M>;
    private _guild: Guild;

    public id: string;
    public enabled: boolean = false;
    public requiredPermissions: PermissionsBitField;
    public allowedRoles: string[] = [];
    public allowedUsers: string[] = [];

    get guildSettins() { return this._guildSettings; }
    get guild() { return this._guild; }

    constructor(options: GuildDjSettingsOptions<M>) {
        super(options);

        this._guildSettings = options.guildSettings;
        this._guild = options.guildSettings.guild;

        this.id = options.id;
        this.enabled = options.enabled;
        this.requiredPermissions = new PermissionsBitField(options.requiredPermissions);
        this.allowedRoles = isStringArray(options.allowedRoles) ? options.allowedRoles : [];
        this.allowedUsers = isStringArray(options.allowedUsers) ? options.allowedUsers : [];
    }

    public isDjMember(member: GuildMember): boolean {
        if (!this.isInValidVoiceChannel(member)) return false;
        if (!this.enabled) return true;

        return this.isPermitted(member.permissions) && (this.isAllowedUser(member) || member.roles.cache.some(role => this.isAllowedRole(role)));
    }

    public isInValidVoiceChannel(member: GuildMember): boolean {
        if (member.guild.id !== this.guild.id) return false;
        if (!member.voice.channel) return false;
        if (this.guild.members.me?.voice.channel && member.voice.channel.id !== this.guild.members.me?.voice.channel.id) return false;
        if (!member.voice.channel.permissionsFor(this.client.user)?.has(this.player.config.requiredBotVoicePermissions)) return false;

        return true;
    }

    public isPermitted(...permissions: RestOrArray<PermissionResolvable>): boolean {
        return !this.enabled || this.enabled && this.requiredPermissions.has(normalizeArray(permissions));
    }

    public isAllowedUser(user: UserResolvable): boolean {
        return !this.enabled || this.enabled && this.allowedUsers.includes(typeof user === 'string' ? user : user.id);
    }

    public isAllowedRole(role: RoleResolvable): boolean {
        return !this.enabled || this.enabled && this.allowedUsers.includes(typeof role === 'string' ? role : role.id);
    }

    public setEnabled(enabled: boolean): this {
        this.enabled = enabled;
        return this;
    }

    public async fetch(): Promise<this> {
        const newSelfData = await this.prisma.guildDjSettings.findFirst({
            where: { id: this.guild.id }
        });

        if (!newSelfData) {
            await this.delete();
            return this;
        }

        this.id = newSelfData.id;
        this.requiredPermissions = new PermissionsBitField(newSelfData.requiredPermissions);
        this.allowedRoles = isStringArray(newSelfData.allowedRoles) ? newSelfData.allowedRoles : [];
        this.allowedUsers = isStringArray(newSelfData.allowedUsers) ? newSelfData.allowedUsers : [];

        return this;
    }

    public async update(): Promise<this> {
        await this.prisma.guildDjSettings.upsert({
            where: { id: this.guild.id },
            create: {
                id: this.id,
                requiredPermissions: this.requiredPermissions.bitfield,
                allowedRoles: this.allowedRoles,
                allowedUsers: this.allowedUsers
            },
            update: {
                id: this.id,
                requiredPermissions: this.requiredPermissions.bitfield,
                allowedRoles: this.allowedRoles,
                allowedUsers: this.allowedUsers
            }
        });

        return this;
    }

    public async delete(): Promise<void> {
        await this.prisma.guildDjSettings.delete({
            where: { id: this.guild.id }
        });

        super.delete();
    }

    public static async createIfNotExists(data: Partial<GuildDjSettingsModel> & { id: string; }): Promise<void> {
        const isExists = await eplayer.prisma.guildDjSettings.count({
            where: { id: data.id }
        });
        if (isExists) return;

        await eplayer.prisma.guildDjSettings.create({
            data: {
                ...data,
                allowedRoles: data.allowedRoles as string[]|undefined ?? [],
                allowedUsers: data.allowedUsers as string[]|undefined ?? []
            }
        });
    }
}
