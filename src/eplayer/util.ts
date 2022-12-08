import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import yml from 'yaml';
import { Awaitable } from 'discord.js';
import eplayer from '../eplayer';
import { AnyCommandBuilder, AnyCommandData, path } from 'reciple';

export async function loadCommandFiles(dir: string, filter?: (file: string) => Awaitable<boolean>): Promise<(AnyCommandBuilder|AnyCommandData)[]> {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        return [];
    }

    const files = readdirSync(dir).filter(file => filter ? filter(file) : file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs')).map(file => path.join(dir, file));
    const commands: (AnyCommandBuilder|AnyCommandData)[] = [];

    for (const file of files) {
        try {
            const resolve = await import((path.isAbsolute(file) ? 'file://' : '') + file);
            const command = resolve?.default ? resolve.default : resolve;

            if (typeof command !== 'function') throw new Error('Default export is not a function');

            commands.push(await command(eplayer));
        } catch (err) {
            eplayer.logger.err(`Couldn't load command: ${file}`, err);
        }
    }

    return commands;
}

export function createYmlFile<T extends {}|[]>(file: string, contents: T): T {
    if (existsSync(file)) {
        const contents = readFileSync(file, 'utf-8');

        return yml.parse(contents);
    }

    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, yml.stringify(contents));

    return contents;
}
