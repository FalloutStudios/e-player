import { Player, Queue } from 'discord-player';
import { Awaitable, Interaction, TextBasedChannel, TextChannel } from 'discord.js';
import { Logger } from 'fallout-utility';
import { AnyCommandBuilder, AnyCommandData, cwd, path, RecipleClient, RecipleScript } from 'reciple';
import defaultConfig, { Config } from './eplayer/config';
import { createYmlFile, getMessageEmbed, loadCommandFiles } from './eplayer/util';

export interface EPlayerMetadata {
    textChannel?: TextBasedChannel;
}

export class EPlayer implements RecipleScript {
    public versions: string[] = ['^6'];
    public commands: (AnyCommandBuilder|AnyCommandData)[] = [];
    public client!: RecipleClient;
    public logger!: Logger;
    public player!: Player;
    public config: Config = createYmlFile(path.join(cwd, 'config/eplayer/config.yml'), defaultConfig);
    public interactionHandlers: ((interaction: Interaction) => Awaitable<void>)[] = [];

    public async onStart(client: RecipleClient<false>): Promise<boolean> {
        this.client = client;
        this.logger = client.logger.cloneLogger({ loggerName: 'EPlayer' });

        this.logger.log(`Starting EPlayer...`);
        this.player = new Player(client, this.config.playerOptions);

        return true;
    }

    public async onLoad(client: RecipleClient<true>): Promise<void> {
        this.commands = await loadCommandFiles(path.join(__dirname, 'eplayer/commands/'));

        client.on('interactionCreate', async interaction => {
            await Promise.all(this.interactionHandlers.map(f => Promise.resolve(f(interaction)).catch(err => this.logger.err(err))))
        });

        this.player.on('error', async (_queue, error) => {
            this.logger.err(`An error occured:`, error);

            const queue = _queue as Queue<EPlayerMetadata>;
            if (!queue.destroyed) queue.stop();

            await queue.metadata?.textChannel?.send({
                embeds: [getMessageEmbed('unexpectedError', false)]
            }).catch(() => null);
        });

        this.player.on('connectionError', async (_queue, error) => {
            this.logger.err(`A connection error occured:`, error);

            const queue = _queue as Queue<EPlayerMetadata>;
            if (!queue.destroyed) queue.stop();

            await queue.metadata?.textChannel?.send({
                embeds: [getMessageEmbed('connectionError', false)]
            }).catch(() => null);
        });

        this.logger.log(`Loaded ${this.commands.length} commands`, `Loaded EPlayer!`);
    }

    public async onUnload(reason: unknown, client: RecipleClient<true>): Promise<void> {
        this.logger.log(`Unloaded EPlayer!`);
    }
}

export default new EPlayer();
