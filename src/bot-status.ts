import { ActivitiesOptions, PresenceStatusData } from 'discord.js';
import { Logger } from 'fallout-utility';
import path from 'path';
import { RecipleClient, RecipleScript } from 'reciple';
import yml from 'yaml';
import { createConfig } from './_createConfig';

export interface BotStatusConfig {
    shuffleStatus: boolean;
    changeInterval: number;
    activities: {
        status: PresenceStatusData;
        activity: ActivitiesOptions;
    }[];
}

export class BotStatus implements RecipleScript {
    public versions: string | string[] = ['1.4.x'];
    public config: BotStatusConfig = BotStatus.getConfig();
    public activities: BotStatusConfig["activities"] = [];
    public currentStatus: number = 0;
    public logger!: Logger;

    public onStart(client: RecipleClient): boolean {
        this.logger = client.logger.cloneLogger();
        this.logger.defaultPrefix = 'BotStatus';

        return true;
    }

    public onLoad(client: RecipleClient): void {
        const activities = !this.config.shuffleStatus
            ? this.config.activities
            : this.config.activities.map(value => ({ value, sort: Math.random() }))
                .sort((a, b) => a.sort - b.sort)
                .map(({ value }) => value);

        if (!activities.length) return;

        this.activities = activities;
        this.updateStatus(client, this.activities.length > 1);
    }

    public updateStatus(client: RecipleClient, repeat: boolean = false): void {
        const status = this.activities[this.currentStatus ?? 0];
        if (!status) return;

        this.logger.debug(`Changing status`);
        client.user?.setPresence({
            activities: [status.activity],
            status: status.status
        });

        this.logger.debug(`Status updated!`);
        this.currentStatus = this.currentStatus >= this.activities.length ? 0 : this.currentStatus + 1;

        if (repeat && this.activities.length) setTimeout(() => this.updateStatus(client, repeat), this.config.changeInterval);
    }

    public static getConfig(): BotStatusConfig {
        const configPath = path.join(process.cwd(), 'config/BotStatus/config.yml');
        const defaultConfig: BotStatusConfig = {
            changeInterval: 60 * 1000 * 5,
            shuffleStatus: false,
            activities: [
                {
                    activity: {
                        name: 'Music',
                        type: 'PLAYING',
                    },
                    status: 'online'
                }
            ]
        };

        return yml.parse(createConfig(configPath, defaultConfig));
    }
}

export default new BotStatus();
