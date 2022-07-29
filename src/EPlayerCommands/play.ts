import { EPlayer } from '../e-player';

import { CommandBuilder, MessageCommandBuilder, SlashCommandBuilder } from 'reciple';

export default (player: EPlayer): CommandBuilder[] => {
    return [
        new SlashCommandBuilder()
            .setName('play')
            .addStringOption(query => query
                .setName('search')
                .setDescription('Search for a song to play')
                .setRequired(true)
            )
            .setExecute(async command => {
                command.interaction.reply('Play');
            }),
        new MessageCommandBuilder()
            .setName('play')
            .addOption(query => query
                .setName('search')
                .setDescription('Search for a song to play')
                .setRequired(true)
            )
            .setExecute(async command => {
                command.message.reply('Play');
            })
    ];
}
