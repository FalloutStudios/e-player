import { Logger } from 'fallout-utility';
import { RecipleClient, RecipleScript } from 'reciple';

export class Guilds implements RecipleScript {
    public versions: string | string[] = ['1.5.x'];
    public logger!: Logger;

    public onStart(client: RecipleClient): boolean {
        this.logger = client.logger.cloneLogger();
        this.logger.defaultPrefix = 'Guilds';

        return true;
    }

    public async onLoad(client: RecipleClient): Promise<void> {
        const guilds = client.guilds.cache.toJSON();

        this.logger.debug(`${guilds.length} guild(s) found in cache:`);
        for (const guild of guilds) {
            this.logger.debug(`${guild.name} with ${guild.memberCount} member(s)`);
        }

        client.on('guildCreate', async guild => {
            this.logger.debug(`Added new guild ${guild.name} with ${guild.memberCount} member(s)`);
        });
    }
}

export default new Guilds();
