import {BaseHandler} from "https://deno.land/std/log/handlers.ts";

export default class TestHandler extends BaseHandler {
    public messages: string[] = [];

    public log(str: string): void {
        this.messages.push(str);
    }
}