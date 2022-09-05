import { ePlayerMessages, EPlayerMessages } from './messages';
import { PlayerOptions } from 'discord-player';

export interface EPlayerConfig {
    player: PlayerOptions;
    messages: EPlayerMessages;
}

export const ePlayerDefaultConfig: EPlayerConfig = {
    player: {
        autoSelfDeaf: true,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 10000,
        volumeSmoothness: 500,
    },
    messages: ePlayerMessages,
};
