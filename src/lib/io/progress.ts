import ProgressBar from "@deno-library/progress";

export default interface Progress {
  readonly title: string | undefined;
  readonly bytesCompleted: number;
  size: number | undefined;

  progressBar: ProgressBar | undefined;
}
