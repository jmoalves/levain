import StringUtils from './string_utils.ts';

export class Timer {
    startTime = performance.now()

    reset(): void {
        this.startTime = performance.now();
    }

    measure(): number {
        return performance.now() - this.startTime
    }

    humanize(): string {
        // FIXME: return moment().duration(this.measure()).humanize()
        return StringUtils.humanizeMillis(this.measure());
    }
}
