import { AnyCommandBuilder, AnyCommandData, cwd, RecipleClient, RecipleScript } from 'reciple';
import { escapeRegExp, Logger, replaceAll, trimChars } from 'fallout-utility';
import { EPlayerConfig, ePlayerDefaultConfig } from './EPlayer/config';
import { EPlayerMessages, ePlayerMessages } from './EPlayer/messages';
import { ColorResolvable, EmbedBuilder } from 'discord.js';
import EPlayerBaseModule from './_eplayer.base';
import { createConfig } from './_eplayer.util';
import { mkdirSync, readdirSync } from 'fs';
import { Player } from 'discord-player';
import path from 'path';
import yml from 'yaml';

export type EPlayerCommand = (player: EPlayer) => (AnyCommandBuilder|AnyCommandData)[];

export class EPlayer extends EPlayerBaseModule implements RecipleScript {
    public logger!: Logger;
    public client!: RecipleClient;
    public config: EPlayerConfig = this.getConfig();
    public player!: Player;

    public async onStart(client: RecipleClient<boolean>): Promise<boolean> {
        this.client = client;
        this.player = new Player(client, this.config.player);
        this.logger = client.logger.cloneLogger({ loggerName: 'EPlayer' });

        this.loadCommands();

        return true;
    }

    public async loadCommands(): Promise<void> {
        const dir = path.join(__dirname, 'EPlayer/commands');

        mkdirSync(dir, { recursive: true });

        const files = readdirSync(dir).filter(f => f.endsWith('.js')).map(f => path.join(dir, f));
        for (const file of files) {
            try {
                const commandsFile = await import(file);
                const commands: EPlayerCommand = commandsFile?.default ?? commandsFile;

                this.commands.push(...commands(this));
                this.logger.log(`Loaded ${file}`);
            } catch (err) {
                this.logger.err(`Failed to load ${file}`, err);
            }
        }
    }

    public getMessageEmbed(messageKey: keyof EPlayerMessages, positive: boolean = false, ...placeholders: string[]): EmbedBuilder {
        let message = this.getMessage(messageKey, ...placeholders);
        const embed = new EmbedBuilder()
            .setColor(<ColorResolvable>(
                positive
                ? this.getMessage('embedColor')
                : this.getMessage('errorEmbedColor')
        ));

        if (message.toLowerCase().startsWith('description:')) {
            message = `\n${trimChars(message, 'description:')}`;
        } else if (message.toLowerCase().startsWith('author:')) {
            message = replaceAll(trimChars(message, 'author:'), '\n', '\\n');
        }

        if (message.includes('\n')) {
            embed.setDescription(message);
        } else {
            embed.setAuthor({ name: message, iconURL: this.client.user?.displayAvatarURL() })
        }

        return embed;
    }


    public getMessage(messageKey: keyof EPlayerMessages, ...placeholders: string[]): string {
        let message: string = this.config.messages[messageKey] ?? ePlayerMessages[messageKey] ?? messageKey;
        if (!placeholders?.length) return message;

        for (let i=0; i < placeholders.length; i++) {
            message = replaceAll(message, [`{${i}}`, `%${i}%`].map(p => escapeRegExp(p)), [placeholders[i], placeholders[i]]);
        }

        return message;
    }

    public getConfig(): EPlayerConfig {
        return yml.parse(createConfig(path.join(cwd, 'config/eplayer.yml'), yml.stringify(ePlayerDefaultConfig)));
    }
}

export default new EPlayer();
