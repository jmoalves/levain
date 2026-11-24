export default class StringUtils {
  static textContainsAtLeastOneChar(text: string, chars: string): boolean {
    return [...chars].some((char) => text.includes(char));
  }

  static textContainsAtLeastOneSequence(text: string, sequences: string[]): boolean {
    return sequences.some((sequence) => text.includes(sequence));
  }

  static humanizeMillis(millis: number): string {
    millis = Math.round(millis);

    if (millis == 0) {
      return "0.000s";
    }

    let seconds = Math.floor(millis / 1000);
    millis = millis % 1000;

    let minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;

    const hours = Math.floor(minutes / 60);
    minutes = minutes % 60;

    let str = "";
    if (hours > 0) {
      str += hours + "h" + " ";
    }

    if (minutes > 0) {
      str += minutes + "min" + " ";
    }

    if (seconds > 0 || millis > 0) {
      str += seconds;
      if (millis > 0) {
        str += "." + ("" + millis).padStart(3, "0");
      }
      str += "s";
    }

    return str.trim();
  }

  static parseBoolean(value: string | boolean | number | undefined | null) {
    return ![null, undefined, false, "false", 0, "0"].includes(value);
  }

  static padEnd(text: string | undefined, size: number): string {
    return (text == undefined ? "" : text + "").padEnd(size);
  }

  static padNum(n: number | undefined, size: number, pad: string = " "): string {
    return (n == undefined ? "" : "" + n).padStart(size, pad);
  }

  static humanizeBytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];

    let size = bytes;
    let idx = 0;

    while ((idx + 1) < units.length && size >= 1024) {
      size = size / 1024;
      idx++;
    }

    size = Math.round(size * 1000);
    const intPart = Math.round(size / 1000);
    const decPart = size % 1000;

    return `${StringUtils.padNum(intPart, 4)}.${(decPart + "").padStart(3, "0")} ${units[idx].padStart(2)}`;
  }

  static removeAccentMarks(text: string) {
    return text.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  /**
   * RFC 3986 percent-encoding (stricter than encodeURIComponent, also encoding ! ' ( ) *).
   */
  static encodeUrlComponent(text: string): string {
    return encodeURIComponent(text).replace(
      /[!'()*]/g,
      (ch) => "%" + ch.charCodeAt(0).toString(16).toUpperCase(),
    );
  }

  static surround(text: string, border: string): string {
    return border + text + border;
  }

  static splitSpaces(text: string): string[] {
    return text.split(" ")
      .filter((text) => text?.length);
  }

  static findSimilar(search: string, database: string[], maxResults?: number): Set<string> {
    const trimmed = search?.trim() ?? "";
    if (!trimmed) {
      return new Set();
    }

    const searchLower = trimmed.toLowerCase();
    const scored: Array<{ name: string; distance: number; isPrefix: boolean; lenDiff: number; index: number }> = [];

    for (let index = 0; index < database.length; index++) {
      const name = database[index];
      const nameLower = name.toLowerCase();
      const d = this.partialDistance(searchLower, nameLower);
      const perc = d / searchLower.length;
      const isShortMatch =
        searchLower.length === 1
          ? nameLower.includes(searchLower)
          : searchLower.length === 2
          ? nameLower.includes(searchLower) || this.damerauLevenshtein(searchLower, nameLower) <= 1
          : searchLower.length === 3 && (d <= 1 || nameLower.includes(searchLower));

      if ((searchLower.length >= 3 && d >= 0 && perc <= 0.40) || isShortMatch) {
        scored.push({
          name,
          distance: d,
          isPrefix: nameLower.startsWith(searchLower),
          lenDiff: Math.abs(nameLower.length - searchLower.length),
          index,
        });
      }
    }

    scored.sort((a, b) =>
      a.distance - b.distance ||
      Number(b.isPrefix) - Number(a.isPrefix) ||
      a.lenDiff - b.lenDiff ||
      a.index - b.index
    );

    const limited = maxResults !== undefined ? scored.slice(0, maxResults) : scored;
    return new Set(limited.map((entry) => entry.name));
  }

  /**
   * Optimal String Alignment (Damerau-Levenshtein) distance where adjacent
   * transpositions (e.g. "insatll" <-> "install") have cost 1.
   */
  static damerauLevenshtein(a: string, b: string): number {
    const lenA = a.length;
    const lenB = b.length;
    if (lenA === 0) return lenB;
    if (lenB === 0) return lenA;

    const dp: number[][] = Array.from({ length: lenA + 1 }, () => new Array(lenB + 1).fill(0));
    for (let i = 0; i <= lenA; i++) dp[i][0] = i;
    for (let j = 0; j <= lenB; j++) dp[0][j] = j;

    for (let i = 1; i <= lenA; i++) {
      for (let j = 1; j <= lenB; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let best = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost,
        );
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          best = Math.min(best, dp[i - 2][j - 2] + 1);
        }
        dp[i][j] = best;
      }
    }

    return dp[lenA][lenB];
  }

  private static partialDistance(str1: string, str2: string): number {
    const diff = str2.length - str1.length;
    if (diff < 0) {
      return this.damerauLevenshtein(str1, str2);
    }

    const windowLengths = [str1.length];
    if (str1.length >= 4) {
      windowLengths.push(str1.length - 1);
      if (str1.length + 1 <= str2.length) {
        windowLengths.push(str1.length + 1);
      }
    }

    let ret = Number.MAX_VALUE;
    for (const winLen of windowLengths) {
      const maxOffset = str2.length - winLen;
      for (let i = 0; i <= maxOffset; i++) {
        const partial = str2.substring(i, i + winLen);
        const v = this.damerauLevenshtein(str1, partial);
        ret = Math.min(ret, v);
        if (ret === 0) {
          return 0;
        }
      }
    }

    return ret;
  }

  static compressText(text: string, maxSize: number) {
    const ellipsis = "...";
    const minLimit = ellipsis.length + 2;
    if (maxSize < minLimit) {
      throw new Error(`maxSize should be at least ${minLimit}`);
    }

    if (text.length <= maxSize) {
      return text;
    }

    const split = (maxSize - ellipsis.length) / 2.0;
    const firstHalf = Math.ceil(split);
    const secondHalf = Math.floor(split);
    return text.substring(0, firstHalf) + ellipsis + text.substring(text.length - secondHalf, text.length);
  }
}
