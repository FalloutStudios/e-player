import { PrismaClient } from '@prisma/client';
import { RecipleClient } from 'reciple';
import { EPlayer } from '../../eplayer';

export interface BaseOptions {
    player: EPlayer;
}

export abstract class Base {
    protected player: EPlayer;
    protected prisma: PrismaClient;
    protected client: RecipleClient<true>;

    constructor(options: BaseOptions) {
        this.player = options.player;
        this.prisma = options.player.prisma;
        this.client = options.player.client;
    }
}
