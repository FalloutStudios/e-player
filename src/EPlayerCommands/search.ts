import { QueryType, Track } from 'discord-player';
import { ColorResolvable, MessageEmbed, User } from 'discord.js';
import { InteractionCommandBuilder, MessageCommandBuilder, recipleCommandBuilders } from 'reciple';
import { EPlayer } from '../e-player';

export default (Player: EPlayer): recipleCommandBuilders[] => {
    const search = async (query: string, requestedBy: User): Promise<MessageEmbed> => {
        query = query.replace(/(?:\\(.))/, '$1');

        const results = await Player.player.search(query, {
            requestedBy,
            searchEngine: QueryType.AUTO
        }).catch(() => ({ tracks: [] as Track[], playlist: null }));

        if (!results.tracks.length || results.playlist && !results.playlist.tracks.length) {
            return Player.getMessageEmbed('noResults');
        }

        const embed = new MessageEmbed().setColor(Player.getMessage('embedColor') as ColorResolvable);

        embed.setAuthor({ name: results.playlist ? `Playlist` : `Tracks`, iconURL: requestedBy.client.user?.displayAvatarURL() });
        embed.setFooter({ text: `Result${!results.playlist ? 's' : ''} for "${query.slice(0, 50)}"`, iconURL: requestedBy.displayAvatarURL() });

        if (results.playlist) {
            embed.setTitle(results.playlist.title);
            embed.setDescription(results.playlist.description ?? ' ');
            embed.addField('Tracks', `${results.tracks.length} ${results.tracks.length > 1 ? 'Tracks' : 'Track'}`, true);
            embed.setThumbnail(results.playlist.thumbnail);
            embed.setURL(results.playlist.url);

            return embed;
        } else {
            embed.setTitle(results.tracks.length > 10 ? `Showing 10 out of ${results.tracks.length} tracks` : `${results.tracks.length} Track(s)`);
            embed.setThumbnail(results.tracks[0].thumbnail);

            let description = '';
            for (const track of results.tracks) {
                description += `[${track.title}](${track.url}) \`${track.duration}\`\n`;
            }

            return embed.setDescription(description);
        }
    };

    return [
        new InteractionCommandBuilder()
            .setName('search')
            .addStringOption(query => query
                .setName('query')
                .setDescription('Search query.')
                .setRequired(true)
            )
            .setExecute(async command => {
                const interaction = command.interaction;
                const member = interaction.member;
                const guild = interaction.guild;
                const query = interaction.options.getString('query', true);
                if (!guild || !member) return interaction.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                await interaction.deferReply();
                const embed = await search(query, member.user as User);

                interaction.reply({ embeds: [embed] });
            }),
        new MessageCommandBuilder()
            .setName('search')
            .addAliases('s', 'find')
            .addOption(query => query
                .setName('query')
                .setDescription('Search query.')
                .setRequired(true)
            )
            .setExecute(async command => {
                const message = command.message;
                const member = message.member;
                const guild = member?.guild;
                const query = command.command.args.join(' ');
                if (!guild || !member) return message.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const reply = await message.reply({ embeds: [Player.getMessageEmbed('loading')] });
                const embed = await search(query, member.user);

                reply.edit({ embeds: [embed] });
            })
    ];
}
