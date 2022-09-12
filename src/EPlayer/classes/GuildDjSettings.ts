import { Base, BaseOptions } from './Base';

export interface GuildDjOptions extends BaseOptions {}

export class GuildDjSettings extends Base {
    constructor(options: GuildDjOptions) {
        super(options);
    }
}
