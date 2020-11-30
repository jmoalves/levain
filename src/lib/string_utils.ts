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
				str += "." + (""+millis).padStart(3, '0');
			}
			str += "s";
		}

        return str.trim();
    }
}
