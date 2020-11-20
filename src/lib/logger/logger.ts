export default interface Logger {
    info(text: string): void;
    getInfo(): Array<string>;
}