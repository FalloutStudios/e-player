import { ColorResolvable } from 'discord.js';

export interface BaseMessagesType {
    embedColor: ColorResolvable;
    errorEmbedColor: ColorResolvable;
    [k: string]: any
}

export const defaultMessages = {
    embedColor: 'Red',
    errorEmbedColor: 'Grey',
    unexpectedError: 'An unexpected error occured',
    connectionError: 'A connection error occured',
    noSearchQuery: 'Invalid search term',
    noSearchResults: 'No results found',
    notInGuild: 'You can only use this in a server',
    noVoiceChannelPermissions: 'description:**Bot has no permissions to connect to** {0}',
    notInVoiceChannel: 'You need to be in a voice channel',
    inDifferentVoiceChannel: 'I\'m already in another voice channel',
    cantConnectVoiceChannel: 'description:**Unable to connect to** {0}',
    playbackError: 'description:Couldn\'t play **{0}**'
} satisfies BaseMessagesType;

export type Messages = typeof defaultMessages & BaseMessagesType;
export default defaultMessages;
