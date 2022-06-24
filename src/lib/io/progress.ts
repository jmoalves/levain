import ProgressBar from "https://deno.land/x/progress/mod.ts";

export default interface Progress {
    readonly title: string | undefined
    readonly bytesCompleted: number
    size: number | undefined

    progressBar: ProgressBar | undefined
}
