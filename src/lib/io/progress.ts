import ProgressBar from "https://deno.land/x/progress@v1.1.4/mod.ts";

export default interface Progress {
    readonly title: string | undefined
    readonly bytesCompleted: number
    size: number | undefined

    progressBar: ProgressBar | undefined
}
