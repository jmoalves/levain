import {BaseHandler} from "https://deno.land/std/log/handlers.ts";
import {LevelName,} from "https://deno.land/std/log/levels.ts";

export default class TestHandler extends BaseHandler {

    constructor(levelName: LevelName, options: any = {}) {
        // FIXME constructor(levelName: LevelName, options: HandlerOptions = {}) {
        super(levelName, options)
    }

    public messages: string[] = [];

    public log(str: string): void {
        this.messages.push(str);
    }
}