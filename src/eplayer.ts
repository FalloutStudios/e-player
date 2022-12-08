import { Player } from 'discord-player';
import { Logger } from 'fallout-utility';
import { AnyCommandBuilder, AnyCommandData, cwd, path, RecipleClient, RecipleScript } from 'reciple';
import { Config, defaultConfig } from './eplayer/config';
import { createYmlFile, loadCommandFiles } from './eplayer/util';

export class EPlayer implements RecipleScript {
    public versions: string[] = ['^6'];
    public commands: (AnyCommandBuilder|AnyCommandData)[] = [];
    public client!: RecipleClient;
    public logger!: Logger;
    public player!: Player;
    public config: Config = createYmlFile(path.join(cwd, 'config/eplayer/config.yml'), defaultConfig);

    public async onStart(client: RecipleClient<false>): Promise<boolean> {
        this.client = client;
        this.logger = client.logger.cloneLogger({ loggerName: 'EPlayer' });

        this.logger.log(`Starting EPlayer...`);
        this.player = new Player(client, this.config.playerOptions);

        return true;
    }

    public async onLoad(client: RecipleClient<true>): Promise<void> {
        this.commands = await loadCommandFiles(path.join(__dirname, 'eplayer/commands/'));

        this.logger.log(`Loaded ${this.commands.length} commands`, `Loaded EPlayer!`);
    }

    public async onUnload(reason: unknown, client: RecipleClient<true>): Promise<void> {
        this.logger.log(`Unloaded EPlayer!`);
    }
}

export default new EPlayer();
