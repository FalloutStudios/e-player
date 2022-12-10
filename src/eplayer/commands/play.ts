import { QueryType } from 'discord-player';
import { GuildMember } from 'discord.js';
import { EPlayer } from '../../eplayer';
import { createSlashCommand, getMessageEmbed, isOfficialSound, play } from '../util';

export default (eplayer: EPlayer) => {
    eplayer.interactionHandlers.push(async interaction => {
        if (!interaction.isAutocomplete() || interaction.commandName !== 'play') return;

        const query = interaction.options.getFocused().trim();
        if (!query.length) return interaction.respond([]);

        const results = (await eplayer.player.search(query, {
            requestedBy: interaction.user
        })).tracks.filter(track => isOfficialSound(track.title)).slice(0, 15);

        await interaction.respond(
            results.map(r => ({
                name: r.title,
                value: r.url
            }))
        );
    });

    return [
        createSlashCommand()
            .setName('play')
            .setDescription('Enter a search term to add the result to queue')
            .addStringOption(search => search
                .setName('search')
                .setDescription('Search song query')
                .setAutocomplete(true)
                .setRequired(true)
            )
            .setExecute(async ({ interaction }) => {
                if (!interaction.inCachedGuild() || !interaction.channel || interaction.channel.isDMBased()) {
                    await interaction.reply({ embeds: [getMessageEmbed('notInGuild')] });
                    return;
                }

                const member = interaction.member as GuildMember;
                const query = interaction.options.getString('search', true);

                await interaction.deferReply();
                const embed = await play(query, member, interaction.channel);

                await interaction.editReply({ embeds: [embed] });
            })
    ];
}
