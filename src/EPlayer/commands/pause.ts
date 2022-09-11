import { GuildMember } from 'discord.js';
import { AnyCommandData, CommandBuilderType } from 'reciple';
import { EPlayer } from '../../eplayer';

export default (player: EPlayer): AnyCommandData[] => {
    return [
        {
            type: CommandBuilderType.SlashCommand,
            name: 'pause',
            description: 'Pause currently playing song',
            async execute(data) {
                const interaction = data.interaction;
                const member = interaction.member as GuildMember|null;
                const guild = interaction.guild;
                if (!member || !guild) {
                    await interaction.reply({ embeds: [player.getMessageEmbed('notInGuild')] });
                    return;
                }

                const djPermissions = await player.getGuildDj(guild.id);
                if (!djPermissions?.isDjMember(member)) {
                    await interaction.reply({ embeds: [player.getMessageEmbed('noQueuePermissions')] });
                    return;
                }
            }
        },
        {
            type: CommandBuilderType.MessageCommand,
            name: 'pause',
            description: 'Pause currently playing song',
            async execute(data) {
                const message = data.message;
            }
        }
    ];
}
