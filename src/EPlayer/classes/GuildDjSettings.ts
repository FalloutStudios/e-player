import { GuildDjSettings as GuildDjSettingsModel } from '@prisma/client';
import { Guild, PermissionsBitField } from 'discord.js';
import { isStringArray } from '../../_eplayer.util';
import { EPlayerMetadata } from '../config';
import { Base, BaseOptions } from './Base';
import { GuildSettings } from './GuildSettings';

export interface GuildDjSettingsOptions<M extends any = EPlayerMetadata> extends BaseOptions,GuildDjSettingsModel {
    guildSettings: GuildSettings<M>;
}

export class GuildDjSettings<M extends any = EPlayerMetadata> extends Base {
    private _guildSettings: GuildSettings<M>;
    private _guild: Guild;

    public id: string;
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
        this.requiredPermissions = new PermissionsBitField(options.requiredPermissions);
        this.allowedRoles = isStringArray(options.allowedRoles) ? options.allowedRoles : [];
        this.allowedUsers = isStringArray(options.allowedUsers) ? options.allowedUsers : [];
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

    public async delete(): Promise<void> {
        await this.prisma.guildDjSettings.delete({
            where: { id: this.guild.id }
        });

        super.delete();
    }
}