import { AnyCommandBuilder, MessageCommandBuilder, SlashCommandBuilder } from 'reciple';
import { EmbedBuilder, GuildMember, GuildTextBasedChannel } from 'discord.js';
import ePlayer, { EPlayer, EPlayerMetadata } from '../e-player';
import { QueryType } from 'discord-player';
import util from '../util';

export async function play(query: string, member?: GuildMember|null, textChannel?: GuildTextBasedChannel): Promise<EmbedBuilder> {
    if (!query) return ePlayer.getMessageEmbed('noSearchQueryProvided');
    if (!member || !textChannel?.guild) return ePlayer.getMessageEmbed('notInGuild');
    if (!member.voice.channel) return ePlayer.getMessageEmbed('notInVoiceChannel');

    const guild = member.guild;
    if (guild.members.me?.voice.channel && member.voice.channel.id !== guild.members.me.voice.channel.id) {
        return ePlayer.getMessageEmbed('notInBotVoiceChannel');
    }

    const queue = ePlayer.player.createQueue<EPlayerMetadata>(guild, { metadata: { textChannel: textChannel } });
    const song = await ePlayer.player.search(query, { requestedBy: member, searchEngine: QueryType.AUTO }).catch(() => null);

    if (!song || !(song.playlist?.tracks ?? song.tracks).length) return ePlayer.getMessageEmbed('noResultsFound');

    const connection = !queue.connection ? await queue.connect(member.voice.channel).catch(() => guild.members.me?.voice.channel ? true : false) : true;
    if (!connection) {
        if (!queue.destroyed) queue.stop();
        return ePlayer.getMessageEmbed('cantConnectToVoiceChannel', false, `${member.voice.channel}`, member.voice.channelId!);
    }

    const embed = new EmbedBuilder();
    const data = song.playlist || song.tracks[0];

    embed.setAuthor({ name: song.playlist ? (song.playlist.type == "album" ? `Album` : `Playlist`) : `Track`, iconURL: util.client.user.displayAvatarURL() });
    embed.setFooter({ text: `Requested by ${member.user.tag}`, iconURL: member.user.displayAvatarURL() });
    embed.setColor(ePlayer.getMessage('embedColor'));
    embed.setDescription(data.description || ' ');
    embed.setTitle(data.title);
    embed.setURL(data.url);

    if (ePlayer.config.bigSearchResultThumbnails) {
        embed.setImage(data.thumbnail);
    } else {
        embed.setThumbnail(data.thumbnail);
    }

    if (!queue.playing) await queue.play();

    return embed;
}

export default (): AnyCommandBuilder[] => {
    return [
        new SlashCommandBuilder()
            .setName('play')
            .addStringOption(query => query
                .setName('search')
                .setDescription('Search for a song to play')
                .setRequired(true)
            )
            .setHalt(halt => util.haltCommand(halt))
            .setExecute(async command => {
                const interaction = command.interaction;
                const query = interaction.options.getString('search', true);

                await interaction.deferReply();
                const embed = await play(query, interaction.member as GuildMember, interaction.channel as GuildTextBasedChannel);

                interaction.editReply({ embeds: [embed] });
            }),
        new MessageCommandBuilder()
            .setName('play')
            .addOption(query => query
                .setName('search')
                .setDescription('Search for a song to play')
                .setRequired(true)
            )
            .setHalt(halt => util.haltCommand(halt))
            .setExecute(async command => {
                const message = command.message;
                const query = util.unescape(command.command.args.join(' '));
                const reply = await message.reply({ embeds: [ePlayer.getMessageEmbed('loading')] });
                const embed = await play(query, message.member, message.channel as GuildTextBasedChannel);

                reply.edit({ embeds: [embed] });
            })
    ];
}
