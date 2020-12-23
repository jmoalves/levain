export default interface Command {
    readonly oneLineExample: string

    execute(args: string[]): void
}