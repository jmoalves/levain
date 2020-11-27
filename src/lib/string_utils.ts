export default class StringUtils {

    static textContainsAtLeastOneChar(text: string, chars: string) {
        return [...chars].some(char => text.includes(char));
    }

}
