import * as log from "https://deno.land/std/log/mod.ts";

import ProgressReader from "../io/progress_reader.ts";
import FileReader from "./file_reader.ts";
import HttpReader from "./http_reader.ts";

export default class ReaderFactory {
    static readerFor(url: string): ProgressReader {
        if (url.startsWith("http://") || url.startsWith("https://")) {            
            return new HttpReader(url)
        }

        return new FileReader(url)
    }
}
