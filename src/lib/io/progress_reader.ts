import type { Reader, Closer } from "jsr:@std/io/types";

import RewindReader from "../io/rewind_reader.ts";
import Timestamps from "../io/timestamps.ts";
import Progress from "../io/progress.ts";

export default interface ProgressReader extends Reader, Progress, RewindReader, Timestamps, Closer {
    readonly name: string
}
