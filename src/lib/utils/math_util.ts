export default class MathUtil {

    static randomInt(max_number: number): number {
        return Math.round(this.randomFloat(max_number));
    }

    static randomFloat(max_number: number): number {
        return Math.random() * max_number
    }

}