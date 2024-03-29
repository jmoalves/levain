import {BaseHandler, LevelName} from "https://deno.land/std/log/mod.ts";

export default class MemoryHandler extends BaseHandler {

    constructor(levelName: LevelName, options: any = {}) {
        // FIXME constructor(levelName: LevelName, options: HandlerOptions = {}) {
        super(levelName, options)
    }

    public messages: string[] = [];

    public log(str: string): void {
        this.messages.push(str);
    }
}