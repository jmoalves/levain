export default interface RewindReader extends Deno.Reader {
    rewind(): void;
}
