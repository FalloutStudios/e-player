export const ePlayerMessages = {
    embedColor: '#de111e',
    errorEmbedColor: '#de111e',
    loading: 'Please wait...',
    unknownError: 'An error occured',
    errorPlaying: 'description:Error playing **{0}**',
    noQueue: 'No queue',
    noTracks: 'No tracks found',
    noQueuePermissions: 'No permissions to manage queue',
    noSearchQuery: 'Enter a search query',
    noResults: 'No results found',
    cantConnect: 'description:Can\'t connect to {0}',
    notInGuild: 'You are not in guild',
    notInVoiceChannel: 'Join a voice channel',
    pausedTrack: 'description:Paused **{0}**',
    unpausedTrack: 'description:Resumed **{0}**',
    InDifferentVoiceChannel: 'description:You are in different voice channel, use {0}',
    noVoicePermissions: 'description:I don\'t have permissions to play in {0}',
};

export type EPlayerMessages = typeof ePlayerMessages;
