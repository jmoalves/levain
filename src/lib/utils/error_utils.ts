import t from "../i18n.ts";

export class FileError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "FileError";
  }
}

export function fileError(err: any, filePath: string | URL, operation: string) {
    if (!(err instanceof Error)) {
        err = new Error(err);
    }
    return new FileError(t("lib.utils.error_utils.fileError", { err, filePath, operation }), { cause: err })
}

export function isNotFoundFileError(err: any): boolean {
    if ((err instanceof FileError) && (err.cause instanceof Error)) {
        return err.cause.name == "NotFound";
    } 
    if (err instanceof Error) {
        return err.name == "NotFound"
    } 
    return false;
}