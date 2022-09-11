import fs from 'fs';
import yml from 'yaml';
import path from 'path';
import { AnyCommandHaltData } from 'reciple';
import { Guild } from 'discord.js';
import eplayer from './eplayer';

export function createConfig(configPath: string, defaultData: any): string {
    if (fs.existsSync(configPath)) return fs.readFileSync(configPath, 'utf8');

    const filename = path.extname(configPath);
    const data = typeof defaultData === 'object' && (filename == '.yml' || filename == '.yaml') ? yml.stringify(defaultData) : defaultData;

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, typeof data === 'object' ? JSON.stringify(data, null, 2) : `${data}`);
    if (fs.existsSync(configPath)) return fs.readFileSync(configPath, 'utf8');

    throw new Error(`Failed to create config file at ${configPath}`);
}

export async function commandHalt(haltData: AnyCommandHaltData): Promise<boolean|void> {}

export async function createGuildData(guild: Guild): Promise<void> {
    if (await eplayer.prisma.guilds.count({ where: { guildId: guild.id } })) return;

    eplayer.prisma.guilds.create({
        data: {
            guildId: guild.id,
            cachedQueue: {
                connectOrCreate: {
                    create: {},
                    where: { guildId: guild.id }
                }
            },
            djSettings: {
                connectOrCreate: {
                    create: {},
                    where: { guildId: guild.id }
                }
            }
        }
    });
}

export async function deleteGuildData(guild: Guild): Promise<void> {
    eplayer.prisma.guilds.delete({
        where: { guildId: guild.id },
        include: {
            djSettings: {
                where: { guildId: guild.id }
            },
            cachedQueue: {
                where: { guildId: guild.id }
            }
        }
    });
}
