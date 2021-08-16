export default class StringUtils {

    static textContainsAtLeastOneChar(text: string, chars: string) {
        return [...chars].some(char => text.includes(char));
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
        return [null, undefined, false, 'false', 0, '0'].includes(value)
            ? false
            : true
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
}
