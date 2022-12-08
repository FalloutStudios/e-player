import { ColorResolvable } from 'discord.js';
import { PlayerOptions, PlayerInitOptions } from 'discord-player';

export interface BaseConfigType {
    embedColor: ColorResolvable;
    errorEmbedColor: ColorResolvable;
    playerOptions: PlayerOptions & PlayerInitOptions;
}

export const defaultConfig = {
    embedColor: 'Red',
    errorEmbedColor: 'Grey',
    playerOptions: {}
} satisfies BaseConfigType;

export type Config = typeof defaultConfig & BaseConfigType;
