import { AnyCommandBuilder, AnyCommandData, RecipleScript } from 'reciple';

export default class EPlayerBaseModule implements Omit<RecipleScript, "onStart" | "onLoad"> {
    public versions: string = '^5.0.0';
    public commands: (AnyCommandBuilder | AnyCommandData)[] = [];
}
