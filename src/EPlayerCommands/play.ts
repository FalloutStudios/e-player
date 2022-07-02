import { QueryType } from 'discord-player';
import { ColorResolvable, Guild, GuildMember, MessageEmbed, TextBasedChannel } from 'discord.js';
import { InteractionCommandBuilder, MessageCommandBuilder, recipleCommandBuilders } from 'reciple';
import { EPlayer, EPlayerMetadata } from '../e-player';

export default (Player: EPlayer): recipleCommandBuilders[] => {
    const play = async (query: string, guild: Guild, member: GuildMember, textChannel: TextBasedChannel): Promise<string|MessageEmbed> => {
        if (!query) return 'noQueryProvided';
        if (!member.voice.channel) return 'notInVoiceChannel';
        if (guild.me?.voice.channel && member.voice.channelId !== guild.me.voice.channelId) return 'InDifferentVoiceChannel';

        const search = await Player.player.search(query, {
            requestedBy: member.user,
            searchEngine: QueryType.AUTO
        }).catch(() => undefined);

        if (!search || !(search.playlist?.tracks ?? search.tracks).length) return 'noResults';

        const queue = Player.player.createQueue<EPlayerMetadata>(guild, { ...Player.config.settings, metadata: { textChannel } });
        const connection = !queue.connection || !guild.me?.voice.channel
            ? await queue.connect(member.voice.channel).catch(() => false)
            : true;

        if (!connection) {
            queue.destroy(true);
            return 'cantConnectToVoiceChannel';
        }

        const embed = new MessageEmbed().setColor(Player.getMessage('embedColor') as ColorResolvable);

        if (search.playlist) {
            queue.addTracks(search.playlist.tracks);

            embed.setTitle(search.playlist.title);
            embed.setURL(search.playlist.url);
            embed.setDescription(search.playlist.description ?? ' ');
            embed.setAuthor({
                name: search.playlist.type == 'playlist' ? 'Playlist' : 'Album',
                iconURL: Player.client.user?.displayAvatarURL()
            });

            if (!Player.config.largeThumbnailPlayCommand) {
                embed.setThumbnail(search.playlist.thumbnail);
            } else {
                embed.setImage(search.playlist.thumbnail);
            }
        } else {
            const track = search.tracks[0];
            queue.addTrack(track);

            embed.setTitle(track.title);
            embed.setURL(track.url);
            embed.setDescription(track.description ?? ' ');
            embed.setAuthor({
                name: `Track`,
                iconURL: Player.client.user?.displayAvatarURL()
            });

            if (!Player.config.largeThumbnailPlayCommand) {
                embed.setThumbnail(track.thumbnail);
            } else {
                embed.setImage(track.thumbnail);
            }
        }

        embed.setFooter({
            text: `Requested by ${member.user.tag}`,
            iconURL: member.user.displayAvatarURL()
        });

        if (!queue.playing) queue.play().catch(err => {
            Player.logger.error(`Error while trying to play queue`);
            Player.logger.error(err);
        });

        return embed;
    }

    return [
        new InteractionCommandBuilder()
            .setName('play')
            .addStringOption(query => query
                .setName('query')
                .setDescription('Media to play')
                .setRequired(true)
            )
            .setExecute(async command => {
                const interaction = command.interaction;
                const guild = interaction.guild;
                const member = interaction.member;
                const channel = interaction.channel;
                const query = interaction.options.getString('query', true);
                if (!guild || !member || !channel) return interaction.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                await interaction.deferReply();

                const embed = await play(query, guild, member as GuildMember, channel).catch(err => {
                    Player.logger.error(`An error occured while executing play command:`);
                    Player.logger.error(err);

                    return 'unknownError';
                });

                if (typeof embed == 'string') return interaction.editReply({ embeds: [Player.getMessageEmbed(embed)] });
                interaction.editReply({ embeds: [embed] });
            }),
        new MessageCommandBuilder()
            .setName('play')
            .addAliases('p', 'add')
            .addOption(query => query
                .setName('query')
                .setDescription('Media to play')
                .setRequired(true)
            )
            .setExecute(async command => {
                const message = command.message;
                const guild = message.guild;
                const member = message.member;
                const channel = message.channel;
                const query = command.command.args.join(' ').replace(/(?:\\(.))/, '$1');
                if (!guild || !member || !channel) return message.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const reply = await message.reply({ embeds: [Player.getMessageEmbed('loading', true)] });
                const embed = await play(query, guild, member, channel).catch(err => {
                    Player.logger.error(`An error occured while executing play command:`);
                    Player.logger.error(err);

                    return 'unknownError';
                });

                if (typeof embed == 'string') return reply.edit({ embeds: [Player.getMessageEmbed(embed)] });
                reply.edit({ embeds: [embed] });
            })
    ];
}
