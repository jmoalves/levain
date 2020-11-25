export class Timer {
    startTime = performance.now()

    measure() {
        return performance.now() - this.startTime
    }
}