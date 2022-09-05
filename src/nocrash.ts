import { cwd, RecipleClient, RecipleScript } from 'reciple';
import { TextBasedChannel, User } from 'discord.js';
import EPlayerBaseModule from './_eplayer.base';
import { Logger } from 'fallout-utility';
import path from 'path';
import yml from 'yaml';
import { createConfig } from './_eplayer.util';

export interface NoCrashModuleConfig {
    logChannelId: string[];
    dontExitOnError: boolean;
}

export class NoCrashModule extends EPlayerBaseModule implements RecipleScript {
    public logger!: Logger;
    public config: NoCrashModuleConfig = this.getConfig();
    public sendTo: (User|TextBasedChannel)[] = [];

    public onStart(client: RecipleClient<boolean>): boolean | Promise<boolean> {
        this.logger = client.logger.cloneLogger({ loggerName: 'NoCrashModule' });

        return true;
    }

    public async onLoad(client: RecipleClient<boolean>): Promise<void> {
        for (const sendableId of this.config.logChannelId) {
            let sendTo: typeof this["sendTo"][0]|undefined;

            sendTo = client.users.cache.find(u => u.tag === sendableId) ?? await client.users.fetch(sendableId).catch(() => undefined);

            if (!sendTo) {
                const channel = client.channels.cache.get(sendableId) ?? await client.channels.fetch(sendableId).catch(() => undefined);
                if (channel?.isTextBased()) sendTo = channel;
            }

            if (sendTo) this.sendTo.push(sendTo);
        }

        process.on("uncaughtException", err => {
            this.logger.err(err);
            if (!this.config.dontExitOnError) process.exit(1);
        });
        process.on("unhandledRejection", err => {
            this.logger.err(err);
            if (!this.config.dontExitOnError) process.exit(1);
        });
    }

    public getConfig(): NoCrashModuleConfig {
        return yml.parse(createConfig(path.join(cwd, 'config/nocrash.yml'), yml.stringify(NoCrashModule.defaultConfig)));
    }

    static readonly defaultConfig: NoCrashModuleConfig = {
        logChannelId: ['000000000000000000', 'user#0000'],
        dontExitOnError: true
    };
}
