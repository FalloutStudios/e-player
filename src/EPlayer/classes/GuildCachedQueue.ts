import { Base, BaseOptions } from './Base';

export interface GuildCachedQueueOptions extends BaseOptions {}

export class GuildCachedQueue extends Base {
    constructor(options: GuildCachedQueueOptions) {
        super(options);
    }
}
