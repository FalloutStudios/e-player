import { AnyCommandBuilder, RecipleScript } from 'reciple';

export default class BaseModule implements Omit<RecipleScript, "onStart"> {
    public versions: string = '^5.0.0';
    public commands: AnyCommandBuilder[] = [];
}
