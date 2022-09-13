import fs from 'fs';
import yml from 'yaml';
import path from 'path';
import { AnyCommandHaltData } from 'reciple';
import { GuildSettings } from './EPlayer/classes/GuildSettings';
import { GuildDjSettings } from './EPlayer/classes/GuildDjSettings';
import { GuildCachedQueue } from './EPlayer/classes/GuildCachedQueue';
import eplayer from './eplayer';
import { PlayerOptions, Playlist, Queue, Track } from 'discord-player';
import { EmbedBuilder, Guild, GuildMember, User, VoiceBasedChannel } from 'discord.js';
import { EPlayerMetadata } from './EPlayer/config';

export function createConfig(configPath: string, defaultData: any): string {
    if (fs.existsSync(configPath)) return fs.readFileSync(configPath, 'utf8');

    const filename = path.extname(configPath);
    const data = typeof defaultData === 'object' && (filename == '.yml' || filename == '.yaml') ? yml.stringify(defaultData) : defaultData;

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, typeof data === 'object' ? JSON.stringify(data, null, 2) : `${data}`);
    if (fs.existsSync(configPath)) return fs.readFileSync(configPath, 'utf8');

    throw new Error(`Failed to create config file at ${configPath}`);
}

export async function commandHalt(haltData: AnyCommandHaltData): Promise<boolean|void> {}

export function isStringArray(data: unknown): data is string[] {
    return typeof data === 'object' && Array.isArray(data) && data.every(i => typeof i === 'string');
}

export function isObjectArray<T extends any>(data: unknown): data is T[] {
    return typeof data === 'object' && Array.isArray(data) && data.every(i => typeof i === 'object');
}

export async function createGuildSettingsData(id: string): Promise<void> {
    await GuildSettings.createIfNotExists({ id });
    await GuildDjSettings.createIfNotExists({ id });
    await GuildCachedQueue.createIfNotExists({ id });
}

export async function deleteGuildSettingsData(id: string): Promise<void> {
    const data = await eplayer.getGuildSettings(id);
    if (!data) return;

    await data.delete();
}

export function getOfficialAudio(tracks: Track[]): Track[] {
    const filtered = tracks.filter(track => {
        const title = track.title.toLowerCase();

        return title.includes('official') && title.includes('audio') || title.includes('audio') || title.includes('lyrics');
    });

    return  [filtered.shift() ?? tracks[0]];
}

export async function createQueueAndConnect<M extends EPlayerMetadata = EPlayerMetadata>(guild: Guild, voiceChannel: VoiceBasedChannel, options: PlayerOptions & { metadata?: M }): Promise<Queue<M>> {
    const queue = eplayer.player.createQueue<M>(guild, {
        ...eplayer.config.player,
        ...options
    });

    if (!queue.connection) await queue.connect(voiceChannel);
    return queue;
}

export function makePlayCommandEmbed(details: Track|Playlist, requestedBy: User, embed?: EmbedBuilder): EmbedBuilder {
    embed = embed ?? new EmbedBuilder().setColor(eplayer.getMessage('embedColor'));

    embed
        .setTitle(details.title)
        .setDescription(details.description || ' ')
        .setAuthor({
            name: 'Added',
            iconURL: eplayer.client.user?.displayAvatarURL()
        })
        .setFooter({
            text: `Requested by ${requestedBy.tag}`,
            iconURL: requestedBy.displayAvatarURL()
        });

    if (eplayer.config.largeThumbnails) {
        embed.setImage(details.thumbnail);
    } else {
        embed.setThumbnail(details.thumbnail);
    }

    return embed;
}
