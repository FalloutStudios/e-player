import { PrismaClient } from '@prisma/client';
import { RecipleClient } from 'reciple';
import { EPlayer } from '../../eplayer';

export interface BaseOptions {
    player: EPlayer;
}

export abstract class Base {
    private _player: EPlayer;
    private _prisma: PrismaClient;
    private _client: RecipleClient<true>;

    protected _deleted: boolean = false;

    get player() { return this._player; }
    get prisma() { return this._prisma; }
    get client() { return this._client; }
    get deleted() { return this._deleted; }

    constructor(options: BaseOptions) {
        this._player = options.player;
        this._prisma = options.player.prisma;
        this._client = options.player.client;
    }

    public abstract fetch(): Promise<this>;
    public abstract update(): Promise<this>;

    public async delete(): Promise<void> {
        this._deleted = true;
    }
}
