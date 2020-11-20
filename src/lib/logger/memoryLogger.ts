import Logger from "./logger.ts";

export default class MemoryLogger implements Logger {
    private _info: Array<string> = [];

    info(text: string): void {
        this._info.push(text);
    }

    getInfo() {
        return this._info
    }
}
