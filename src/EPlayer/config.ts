import { ePlayerMessages, EPlayerMessages } from './messages';
import { PlayerOptions } from 'discord-player';
import { GuildTextBasedChannel, PermissionResolvable } from 'discord.js';

export interface EPlayerConfig {
    largeThumbnails: boolean;
    requiredBotTextPermissions: PermissionResolvable[];
    requiredBotVoicePermissions: PermissionResolvable[];
    player: PlayerOptions;
    messages: EPlayerMessages;
}

export interface EPlayerMetadata {
    textChannel?: GuildTextBasedChannel;
}

export const ePlayerDefaultConfig: EPlayerConfig = {
    largeThumbnails: true,
    requiredBotTextPermissions: [
        'ViewChannel',
        'UseExternalEmojis',
        'SendMessages',
        'ReadMessageHistory'
    ],
    requiredBotVoicePermissions: [
        'Connect',
        'PrioritySpeaker',
        'ViewChannel',
        'Speak',
    ],
    player: {
        autoSelfDeaf: true,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 10000,
        volumeSmoothness: 500,
        ytdlOptions: {
            requestOptions: {
                headers: {
                    cookie: undefined
                }
            }
        }
    },
    messages: ePlayerMessages,
};
