import { AnyCommandBuilder, AnyCommandData, cwd, RecipleClient, RecipleScript } from 'reciple';
import { EPlayerConfig, ePlayerDefaultConfig } from './EPlayer/config';
import EPlayerBaseModule from './_eplayer.base';
import { createConfig } from './_eplayer.util';
import { Logger } from 'fallout-utility';
import { Player } from 'discord-player';
import path from 'path';
import yml from 'yaml';
import { mkdirSync, readdirSync } from 'fs';

export type EPlayerCommand = (player: EPlayer) => (AnyCommandBuilder|AnyCommandData)[];

export class EPlayer extends EPlayerBaseModule implements RecipleScript {
    public logger!: Logger;
    public client!: RecipleClient;
    public config: EPlayerConfig = this.getConfig();
    public player: Player = new Player(this.client, this.config.player);

    public async onStart(client: RecipleClient<boolean>): Promise<boolean> {
        this.client = client;
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
                const commands = await import(file) as EPlayerCommand;

                this.commands.push(...commands(this));
                this.logger.log(`Loaded ${file}`);
            } catch (err) {
                this.logger.err(`Failed to load ${file}`, err);
            }
        }
    }

    public getConfig(): EPlayerConfig {
        return yml.parse(createConfig(path.join(cwd, 'config/eplayer.yml'), yml.stringify(ePlayerDefaultConfig)));
    }
}

export default new EPlayer();
