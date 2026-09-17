export class NullWriter {
  writeSync(p: Uint8Array): number {
    return p.length;
  }

  isTerminal(): boolean {
    return false;
  }

  // deno-lint-ignore require-await
  async write(p: Uint8Array): Promise<number> {
    return p.length;
  }

  close() {}

  readonly writable: WritableStream<Uint8Array<ArrayBufferLike>> = new WritableStream<Uint8Array>({
    write() {
    // Discard data
    },
  });;
}
