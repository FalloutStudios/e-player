import { Player } from 'discord-player';
import { AnyCommandData, CommandBuilderType } from 'reciple';

export default (player: Player): AnyCommandData[] => {
    return [
        {
            type: CommandBuilderType.SlashCommand,
            name: 'pause',
            description: 'Pause currently playing song',
            async execute(data) {

            }
        },
        {
            type: CommandBuilderType.MessageCommand,
            name: 'pause',
            description: 'Pause currently playing song',
            async execute(data) {

            }
        }
    ];
}
