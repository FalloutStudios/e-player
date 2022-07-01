import { RecipleClient, RecipleScript } from 'reciple';
import { Logger } from 'fallout-utility';
import { User, MessageEmbed } from 'discord.js';
import path from 'path';
import yml from 'yaml';
import { createConfig } from './_createConfig';

export interface NoCrashConfig {
    ownerId: string;
    reportToOwner: boolean;
    preventCrash: boolean;
}

export class NoCrash implements RecipleScript {
    public versions: string[] = ['1.6.x'];
    public config: NoCrashConfig = NoCrash.getConfig();
    public logger?: Logger;
    public owner?: User;
    public onStart() {
        return true;
    }

    public async onLoad(client: RecipleClient) {
        this.logger = client.logger.cloneLogger();
        this.logger.defaultPrefix = 'NoCrash';

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

        if (!this.config.reportToOwner || !this.config.ownerId) return;

        const embed = new MessageEmbed()
            .setAuthor({ name: this.config.preventCrash ? 'Crash Detected!' : 'Uncaught Exception' })
            .setColor('RED')
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
