import {distance} from 'https://deno.land/x/fastest_levenshtein/mod.ts'

export default class StringUtils {

    static textContainsAtLeastOneChar(text: string, chars: string): boolean {
        return [...chars].some(char => text.includes(char));
    }

    static textContainsAtLeastOneSequence(text: string, sequences: string[]): boolean {
        return sequences.some(sequence => text.includes(sequence));
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

        let hours = Math.floor(minutes / 60);
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
                str += "." + ("" + millis).padStart(3, '0');
            }
            str += "s";
        }

        return str.trim();
    }

    static parseBoolean(value: any) {
        return ![null, undefined, false, 'false', 0, '0'].includes(value)
    }

    static padEnd(text: string | undefined, size: number): string {
        return (text == undefined ? "" : text + "").padEnd(size);
    }

    static padNum(n: number | undefined, size: number, pad: string = " "): string {
        return (n == undefined ? "" : "" + n).padStart(size, pad);
    }

    static humanizeBytes(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB', 'TB']

        let size = bytes
        let idx = 0

        while ((idx + 1) < units.length && size >= 1024) {
            size = size / 1024
            idx++
        }

        size = Math.round(size * 1000)
        let intPart = Math.round(size / 1000)
        let decPart = size % 1000

        return `${StringUtils.padNum(intPart, 4)}.${(decPart + "").padStart(3, "0")} ${units[idx].padStart(2)}`
    }

    static removeAccentMarks(text: string) {
        return text.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
    }

    static surround(text: string, border: string): string {
        return border + text + border
    }

    static splitSpaces(text: string): string[] {
        return text.split(' ')
            .filter(text => text?.length)
    }

    static findSimilar(search: string, database: string[]) : Set<string> {
        let names: Set<string> = new Set();

        for (let name of database) {
            let d = this.partialDistance(search.toLowerCase(), name.toLowerCase())
            let perc = d / search.length
            // log.info(`|${search} - ${name}| = ${d} - ${perc}`)
            if ((d>=0) && (perc <= 0.40)) {
                names.add(name)
            }
        }

        return names;
    }

    private static partialDistance(str1: string, str2: string): number {
        // http://www.augustobaffa.pro.br/wiki/Dist%C3%A2ncia_de_Levenshtein
        let diff = str2.length - str1.length
        if (diff <= 0) {
            return distance(str1, str2)
        }

        let ret = Number.MAX_VALUE;
        for (let i = 0; i <= diff; i++) {
            let partial = str2.substring(i, i + str1.length)
            let v = distance(str1, partial)
            ret = Math.min(ret, v)
        }

        return ret
    }

    static compressText(text: string, maxSize: number) {
        const ellipsis = '...'
        const minLimit = (ellipsis.length + 2)
        if (maxSize < minLimit) {
            throw new Error(`maxSize should be at least ${minLimit}`)
        }

        if (text.length <= maxSize) {
            return text
        }

        const split = (maxSize - ellipsis.length) / 2.0
        const firstHalf = Math.ceil(split)
        const secondHalf = Math.floor(split)
        return text.substring(0, firstHalf) + ellipsis + text.substring(text.length - secondHalf, text.length)
    }
}
