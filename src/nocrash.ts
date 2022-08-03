import { createConfig } from './_createConfig';

import { EmbedBuilder, User } from 'discord.js';
import { Logger } from 'fallout-utility';
import path from 'path';
import { MessageCommandBuilder, RecipleClient, RecipleScript } from 'reciple';
import yml from 'yaml';
import BaseModule from './_BaseModule';

export interface NoCrashConfig {
    ownerId: string;
    reportToOwner: boolean;
    preventCrash: boolean;
}

export class NoCrash extends BaseModule implements RecipleScript {
    public config: NoCrashConfig = NoCrash.getConfig();
    public logger?: Logger;
    public owner?: User;
    protected preventedCrashes: number = 0;
    protected recentPreventedCrash: any;

    public onStart(client: RecipleClient) {
        this.commands = [
            new MessageCommandBuilder()
                .setName('crash-reports')
                .setDescription('Show crash reports info.')
                .setExecute(async command => {
                    const message = command.message;

                    if (message.author.id !== this.owner?.id) {
                        message.reply('You do not have permissions to execute this command.');
                        return;
                    }

                    const err = this.recentPreventedCrash?.stack
                        ? this.recentPreventedCrash.stack
                        : `${this.recentPreventedCrash?.toString()}`;

                    message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setAuthor({ name: `Crash Reports`,iconURL: client.user?.displayAvatarURL() })
                                .setDescription(' ')
                                .addFields(
                                    {
                                        name: `Config`,
                                        value: `\`\`\`json\n${JSON.stringify(this.config, null, 2)}\`\`\``
                                    },
                                    {
                                        name: `Recent Crash Report`,
                                        value: `\`\`\`js\n${this.recentPreventedCrash ? err : 'None'}\n\`\`\``
                                    }
                                )
                                .setFooter({ text: `Prevented Crashes: ${this.preventedCrashes || 'None'}` })
                        ]
                    });
                })
        ];

        return true;
    }

    public async onLoad(client: RecipleClient) {
        this.logger = client.logger.cloneLogger({ loggerName: 'NoCrash' });

        if (this.config.reportToOwner && this.config.ownerId) {
            this.logger.info('Attempting to find owner...');

            const owner = client.users.cache.find(u => u.id == this.config.ownerId || u.tag == this.config.ownerId) || await client.users.fetch(this.config.ownerId).catch(() => undefined) || undefined;
            if (owner) {
                this.logger.info(`Found owner: ${owner.tag}`);
                this.owner = owner;
            } else {
                this.logger.warn(`Could not find owner with id ${this.config.ownerId}`);
            }
        }

        this.logger.warn('Anti Crash Enabled!');

        process.on('uncaughtException', async (err) => {
            await this.reportCrash(err);
            if (!this.config.preventCrash) process.exit(1);
        });
        process.on('unhandledRejection', async (err) => {
            await this.reportCrash(err);
            if (!this.config.preventCrash) process.exit(1);
        });
    }

    public async reportCrash(message: any) {
        this.logger?.error('Crash Detected! Ignore this message if it does not appear to be fatal.');
        this.logger?.error(message);

        this.preventedCrashes++;
        this.recentPreventedCrash = message;

        if (!this.config.reportToOwner || !this.config.ownerId) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: this.config.preventCrash ? 'Crash Detected!' : 'Uncaught Exception' })
            .setColor('Red')
            .setDescription(`**Message:** ${message.message}\n\`\`\`\n${message.stack}\n\`\`\``)
            .setTimestamp();

        await this.owner?.send({ embeds: [embed] }).catch(err => {
            this.logger?.error(`Failed to send crash report to owner: ${err.message}`);
            this.logger?.error(err);
        });
    }

    public static getConfig(): NoCrashConfig {
        const configPath = path.join(process.cwd(), 'config/nocrash/config.yml');
        const defaultConfig = { ownerId: '', reportToOwner: false, preventCrash: true };

        return yml.parse(createConfig(configPath, defaultConfig));
    }
}

export default new NoCrash();
