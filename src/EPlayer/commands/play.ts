import { AnyCommandData, CommandBuilderType } from 'reciple';
import { EPlayer } from '../../eplayer';

export default (player: EPlayer) => {
    const commands: AnyCommandData[] = [
        {
            type: CommandBuilderType.SlashCommand,
            name: 'play',
            description: 'Play some music',
            async execute(command) {
                const interaction = command.interaction;

                interaction.reply('No music bitch');
            }
        }
    ];

    return commands;
}
