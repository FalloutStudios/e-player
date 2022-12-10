import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import yml from 'yaml';
import { Awaitable, EmbedBuilder, GuildMember, normalizeArray, RestOrArray, TextBasedChannel, User } from 'discord.js';
import eplayer, { EPlayerMetadata } from '../eplayer';
import { AnyCommandBuilder, AnyCommandData, MessageCommandBuilder, path, SlashCommandBuilder } from 'reciple';
import messages from './messages';
import { escapeRegExp, replaceAll, trimChars } from 'fallout-utility';
import { PlayerOptions, Playlist, Track } from 'discord-player';
import playdl from 'play-dl';

export async function play(query: string, author: GuildMember, textChannel?: TextBasedChannel, options?: PlayerOptions): Promise<EmbedBuilder> {
    if (!query) return getMessageEmbed('noSearchQuery', false);

    const guild = author.guild;
    const me = guild.members.me;

    if (!guild || !me) return getMessageEmbed('notInGuild', false);
    if (!author.voice.channel) return getMessageEmbed('notInVoiceChannel', false);
    if (me.voice.channel && author.voice.channel.id !== me.voice.channel.id) return getMessageEmbed('inDifferentVoiceChannel', false);
    if (!author.voice.channel.permissionsFor(me).has(eplayer.config.requiredVoiceChannelPermissions)) return getMessageEmbed('noVoiceChannelPermissions');

    const results = await eplayer.player.search(query, { requestedBy: author }).catch(() => null);
    const tracks = results?.playlist ? results.playlist.tracks : results?.tracks.filter(track => isOfficialSound(track.title));

    if (!tracks || !tracks?.length) return getMessageEmbed('noSearchResults');

    const queue = eplayer.player.createQueue<EPlayerMetadata>(guild, {
        ...eplayer.config.player,
        ...options,
        metadata: {textChannel}
    });

    const connection = queue.connection ?? await queue.connect(author.voice.channel).catch(() => null);

    if (!connection) {
        if (!queue.destroyed) queue.stop();

        return getMessageEmbed('cantConnectVoiceChannel', false, author.voice.channel.toString());
    }

    queue.addTracks(tracks);

    let playError = false;

    if (!queue.playing) await queue.play().catch(() => playError = true);

    return playError ? getMessageEmbed('playbackError', false, (results?.playlist ?? tracks[0]).title) : createQueueEmbed(results?.playlist ?? tracks[0], author.user);
}

export function createQueueEmbed(details: Track|Playlist, requestedBy: User, embed?: EmbedBuilder): EmbedBuilder {
    embed = embed ?? new EmbedBuilder().setColor(getMessage('embedColor'));

    embed
        .setURL(details.url)
        .setTitle(details.title)
        .setThumbnail(details.thumbnail)
        .setDescription(details.description || ' ')
        .setAuthor({ name: typeof details.author === 'string' ? details.author : details.author.name })
        .setFooter({
            text: `Requested by ${requestedBy.tag}`,
            iconURL: requestedBy.displayAvatarURL()
        });

    return embed;
}

export function getMessageEmbed<K extends keyof typeof messages>(key: K, positive: boolean = true, ...placeholders: RestOrArray<string>): EmbedBuilder {
    const originalMessage = getMessage(key, ...normalizeArray(placeholders));
    let message: string = (originalMessage as any)?.toString !== undefined  ? (originalMessage as any).toString() : String(originalMessage);

    const embed = new EmbedBuilder()
        .setColor(positive ? getMessage('embedColor') : getMessage('errorEmbedColor'));

    if (message.toLowerCase().startsWith('description:')) {
        message = `\n${trimChars(message, 'description:')}`;
    } else if (message.toLowerCase().startsWith('author:')) {
        message = replaceAll(trimChars(message, 'author:'), '\n', '\\n');
    }

    if (message.includes('\n')) {
        embed.setDescription(message);
    } else {
        embed.setAuthor({ name: message, iconURL: eplayer.client.user?.displayAvatarURL() })
    }

    return embed;
}

export function getMessage<K extends keyof typeof messages>(key: K, ...placeholders: RestOrArray<string>): (typeof messages)[K] {
    let message = messages[key];

    placeholders = normalizeArray(placeholders);

    if (placeholders.length && typeof message === 'string') {
        for (let i=0; i < placeholders.length; i++) {
            message = replaceAll(message, [`{${i}}`, `%${i}%`].map(p => escapeRegExp(p)), [placeholders[i], placeholders[i]]) as (typeof messages)[K];
        }
    }

    return message;
}

export async function loadCommandFiles(dir: string, filter?: (file: string) => Awaitable<boolean>): Promise<(AnyCommandBuilder|AnyCommandData)[]> {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        return [];
    }

    const files = readdirSync(dir).filter(file => filter ? filter(file) : file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs')).map(file => path.join(dir, file));
    const commands: (AnyCommandBuilder|AnyCommandData)[] = [];

    for (const file of files) {
        try {
            const resolve = await import((path.isAbsolute(file) ? 'file://' : '') + file);
            const command = resolve?.default
                ? typeof resolve.default === 'function'
                    ? resolve.default
                    : resolve.default?.default
                : resolve;

            if (typeof command !== 'function') throw new Error('Default export is not a function');

            commands.push(...await command(eplayer));
        } catch (err) {
            eplayer.logger.err(`Couldn't load command: ${file}`, err);
        }
    }

    return commands;
}

export function createYmlFile<T extends {}|[]>(file: string, contents: T): T {
    if (existsSync(file)) {
        const contents = readFileSync(file, 'utf-8');

        return yml.parse(contents);
    }

    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, yml.stringify(contents));

    return contents;
}

export function createSlashCommand(builder?: SlashCommandBuilder): SlashCommandBuilder {
    return (builder ?? new SlashCommandBuilder())
        .setCooldown(3000)
        .setDMPermission(false);
}

export function createMessageCommand(builder?: MessageCommandBuilder): MessageCommandBuilder {
    return (builder ?? new MessageCommandBuilder())
        .setCooldown(3000)
        .setAllowExecuteInDM(false);
}

export function isOfficialSound(title: string): boolean {
    title = title.toLowerCase().trim();
    return title.toLowerCase().includes('lyric') || title.toLowerCase().includes('official') && ['sound', 'video', 'music', 'visualizer'].some(keyword => title.includes(keyword));
}
