import { createConfig } from './_createConfig';

import { Player, PlayerOptions } from 'discord-music-player';
import { EmbedBuilder } from 'discord.js';
import { escapeRegExp, Logger, replaceAll, trimChars } from 'fallout-utility';
import path from 'path';
import { RecipleClient, RecipleCommandBuilder, RecipleScript } from 'reciple';
import yml from 'yaml';

export interface EPlayerConfig {
    playerOptions: PlayerOptions;
    commandDescriptions: {
        [commandName: string]: string;
    };
    messages: ReturnType<typeof EPlayer["getDefaultMessages"]>;
}

export class EPlayer implements RecipleScript {
    public versions: string = '^4.0.0';
    public config: EPlayerConfig = EPlayer.getConfig();
    public commands: RecipleCommandBuilder[] = [];
    public client!: RecipleClient<boolean>;
    public logger!: Logger;
    public player!: Player;

    public async onStart(client: RecipleClient<boolean>): Promise<boolean> {
        this.client = client;
        this.logger = this.client.logger.cloneLogger({ loggerName: `E Player` });
        this.player = new Player(this.client, this.config.playerOptions);

        this.logger.log(`Starting E Player...`);

        return true;
    }

    public onLoad(): void {
        this.logger.log(`Loaded E Player!`);
    }

    public getMessageEmbed(messageKey: keyof EPlayerConfig["messages"], positive: boolean = false, ...placeholders: string[]): EmbedBuilder {
        let message = this.getMessage(messageKey, ...placeholders);
        const embed = new EmbedBuilder()
            .setColor(
                positive
                ? this.getMessage('embedColor')
                : this.getMessage('errorEmbedColor')
            );

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

    public getMessage<T extends any = string>(messageKey: keyof EPlayerConfig["messages"], ...placeholders: string[]): T {
        let message = this.config.messages[messageKey] ?? EPlayer.getDefaultMessages()[messageKey] ?? messageKey;
        if (!placeholders?.length) return message as T;

        for (let i=0; i < placeholders.length; i++) {
            message = replaceAll(message, [`{${i}}`, `%${i}%`].map(p => escapeRegExp(p)), [placeholders[i], placeholders[i]]);
        }

        return message as T;
    }

    public static getConfig(): EPlayerConfig {
        const configPath = path.join(process.cwd(), 'config/e-player/config.yml');
        const defaultConfig = this.getDefaultConfig();

        return yml.parse(createConfig(configPath, defaultConfig));
    }

    public static getDefaultConfig(): EPlayerConfig {
        return {
            playerOptions: {
                deafenOnJoin: true,
                leaveOnEmpty: true,
                leaveOnEnd: true,
                leaveOnStop: true,
                quality: 'high',
                timeout: 10000,
                volume: 100
            },
            commandDescriptions: {
                'play': 'Play a song'
            },
            messages: this.getDefaultMessages()
        };
    }

    public static getDefaultMessages() {
        return {
            embedColor: '#de111e',
            errorEmbedColor: '#de111e',
        };
    }
}

export default new EPlayer();
