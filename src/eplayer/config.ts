import { PlayerOptions, PlayerInitOptions } from 'discord-player';
import { PermissionResolvable } from 'discord.js';
import messages from './messages';

export interface BaseConfigType {
    playerOptions: PlayerOptions & PlayerInitOptions;
    requiredVoiceChannelPermissions: PermissionResolvable;
    messages: typeof messages,
    [k: string]: any
}

export const defaultConfig = {
    playerOptions: {},
    requiredVoiceChannelPermissions: ['Connect', 'Speak'],
    messages,
    e: 'e'
} satisfies BaseConfigType;

export type Config = typeof defaultConfig & BaseConfigType;
export default defaultConfig;
