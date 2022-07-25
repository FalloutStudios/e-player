import { EPlayer } from '../e-player';

import { ColorResolvable, Message, MessageEmbed } from 'discord.js';
import { Client } from 'genius-lyrics';
import { InteractionCommandBuilder, MessageCommandBuilder, recipleCommandBuilders } from 'reciple';

export default (Player: EPlayer): recipleCommandBuilders[] => {
    const genius = new Client();

    const makeBold = (str: string) => str.replace(/\[([^\]]+)\]/g, '**$1**');
    const splitString = (str: string, maxLength: number) => {
        let split = [];
        let i = 0;
        while (i < str.length) {
            split.push(str.substring(i, i += maxLength));
        }

        return split;
    }

    const searchLyrics = async (query: string, command: Message) => {
        const song = await genius.songs.search(query).then(songs => songs.shift()).catch(() => undefined);
        if (!song) return command.edit({ content: ' ', embeds: [Player.getMessageEmbed('noResults')] });

        const fetchedLyrics = await song.lyrics().then(l => splitString(l, 4000)).catch(() => undefined);
        if (!fetchedLyrics) return command.edit({ content: ' ', embeds: [Player.getMessageEmbed('noResults')] });

        const embeds = fetchedLyrics.map((lyrics, i) => {
            const embed = new MessageEmbed()
                .setColor(Player.getMessage('embedColor') as ColorResolvable)
                .setAuthor({ name: song?.artist.name ?? 'unknown artist', iconURL: song?.artist.thumbnail })
                .setThumbnail(song?.thumbnail ?? '')
                .setURL(song?.url ?? '')
                .setFooter({ text: `Lyrics provided by Genius`, iconURL: 'https://images.genius.com/ba9fba1d0cdbb5e3f8218cbf779c1a49.300x300x1.jpg' });

            if (!i) embed.setTitle(makeBold(song?.title ?? query));

            return embed.setDescription(makeBold(lyrics));
        });

        return command.edit({ content: ' ', embeds: embeds.slice(0, 10) });
    }

    return [
        new InteractionCommandBuilder()
            .setName('lyrics')
            .addStringOption(search => search
                .setName('search')
                .setDescription('Search lyrics')
            )
            .setExecute(async command => {
                const interaction = command.interaction;
                const member = interaction.member;
                const guild = interaction.guild;
                const search = interaction.options.getString('search') ?? undefined;
                if (!guild || !member) return interaction.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                await interaction.reply({ embeds: [Player.getMessageEmbed('loading', true)] });
                const reply = await interaction.fetchReply() as Message;

                if (search) return searchLyrics(search, reply);

                const queue = Player.player.getQueue(guild);
                if ((!queue || queue.destroyed) && !search) return reply.edit({ embeds: [Player.getMessageEmbed('noQueue')] });

                const nowPlaying = queue.nowPlaying();
                if (!nowPlaying) return reply.edit({ embeds: [Player.getMessageEmbed('noQueue')] });

                searchLyrics(nowPlaying?.title, reply);
            }),
        new MessageCommandBuilder()
            .setName('lyrics')
            .addAliases('lr')
            .addOption(search => search
                .setName('search')
                .setDescription('Search lyrics')
            )
            .setExecute(async command => {
                const message = command.message;
                const member = message.member;
                const guild = message.guild;
                const search = command.command.args.join(' ') || undefined;
                if (!guild || !member) return message.reply({ embeds: [Player.getMessageEmbed('notAMember')] });

                const reply = await message.reply({ embeds: [Player.getMessageEmbed('loading', true)] });
                if (search) return searchLyrics(search, reply);

                const queue = Player.player.getQueue(guild);
                if (!queue || queue.destroyed && !search) return reply.edit({ embeds: [Player.getMessageEmbed('noQueue')] });

                const nowPlaying = queue.nowPlaying();
                if (!nowPlaying) return reply.edit({ embeds: [Player.getMessageEmbed('noQueue')] });

                searchLyrics(nowPlaying?.title, reply);
            })
    ];
}
