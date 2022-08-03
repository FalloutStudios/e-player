import { EmbedBuilder, GuildMember } from 'discord.js';
import ms from 'ms';
import { AnyCommandHaltData, CommandBuilderType, CommandHaltReason, MessageCommandHaltData, RecipleClient, RecipleScript, SlashCommandHaltData } from 'reciple';
import ePlayer, { EPlayer } from './e-player';
import BaseModule from './_BaseModule';

export class Utility extends BaseModule implements RecipleScript {
    public client!: RecipleClient<true>;
    public player!: EPlayer;

    public onStart(client: RecipleClient<boolean>): boolean {
        this.client = client;

        return true;
    }

    public onLoad() {
        this.player = ePlayer;
    }

    public isMessageCommandHalt(halt: AnyCommandHaltData): halt is MessageCommandHaltData {
        return halt.executeData.builder.type == CommandBuilderType.MessageCommand;
    }

    public isSlashCommandHalt(halt: AnyCommandHaltData): halt is SlashCommandHaltData {
        return halt.executeData.builder.type == CommandBuilderType.SlashCommand;
    }

    public unescape(string: string): string {
        return string.replace(/(?:\\(.))/, '$1');
    }

    public async haltCommand(halt: AnyCommandHaltData): Promise<boolean> {
        const repliable = this.isSlashCommandHalt(halt) ? halt.executeData.interaction : halt.executeData.message;
        const replyBase = { ephemeral: true };

        switch (halt.reason) {
            case CommandHaltReason.Cooldown:
                await repliable.reply({
                    ...replyBase,
                    embeds: [
                        this.player.getMessageEmbed('commandCooldown', true, ms(halt.expireTime - Date.now(), { long: true }))
                    ]
                });
                return true;
            case CommandHaltReason.Error:
                const reply = { ...replyBase, embeds: [this.player.getMessageEmbed('commandError', false, String(halt.error))] };

                if (this.isSlashCommandHalt(halt) && (halt.executeData.interaction.replied || halt.executeData.interaction.deferred)) {
                    await halt.executeData.interaction.followUp(reply);
                } else {
                    await repliable.reply(reply);
                }
                return true;
            case CommandHaltReason.InvalidArguments:
                await repliable.reply({
                    ...replyBase,
                    embeds: [
                        this.player.getMessageEmbed('commandInvalidArguments', false, halt.invalidArguments.map(i => `\`${i}\``).join(' '))
                    ]
                });
                return true;
            case CommandHaltReason.MissingArguments:
                await repliable.reply({
                    ...replyBase,
                    embeds: [
                        this.player.getMessageEmbed('commandMissingArguments', false, halt.missingArguments.map(m => `\`${m}\``).join(' '))
                    ]
                });
                return true;
            case CommandHaltReason.MissingBotPermissions:
                await repliable.reply({
                    ...replyBase,
                    embeds: [
                        this.player.getMessageEmbed('commandNoBotPermissions', false, (repliable.guild?.members.me?.permissions.missing(halt.executeData.builder.requiredBotPermissions) ?? []).map(p => `\`${p}\``).join(' '))
                    ]
                });
                return true;
            case CommandHaltReason.MissingMemberPermissions:
                await repliable.reply({
                    ...replyBase,
                    embeds: [
                        this.player.getMessageEmbed('commandNoMemberPermissions', false, ((repliable.member as GuildMember|null)?.permissions.missing(halt.executeData.builder.requiredMemberPermissions) ?? []).map(p => `\`${p}\``).join(' '))
                    ]
                });
                return true;
        }
    }

    public formatNumber(number: number): string {
        if (number >= 1000000000) return (number / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
        if (number >= 1000000) return (number / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (number >= 1000) return (number / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(number);
    }
}

export default new Utility();
