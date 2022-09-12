import fs from 'fs';
import yml from 'yaml';
import path from 'path';
import { AnyCommandHaltData } from 'reciple';

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

export function isStringArray(data: unknown): data is string[] {
    return typeof data === 'object' && Array.isArray(data) && data.every(i => typeof i === 'string');
}

export function isObjectArray<T extends any>(data: unknown): data is T[] {
    return typeof data === 'object' && Array.isArray(data) && data.every(i => typeof i === 'object');
}
