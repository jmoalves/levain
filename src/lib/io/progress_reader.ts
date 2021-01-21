import RewindReader from "../io/rewind_reader.ts";
import Timestamps from "../io/timestamps.ts";
import Progress from "../io/progress.ts";

export default interface ProgressReader extends Deno.Reader, Progress, RewindReader, Timestamps, Deno.Closer {
}
