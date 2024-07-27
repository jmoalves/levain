import subDays from "https://deno.land/x/date_fns/subDays/index.ts";

export default class DateUtils {
    static dateTimeTag(dt: Date = new Date()): string {
        return `${DateUtils.dateTag(dt)}-${DateUtils.timeTag(dt)}`
    }

    static dateTag(dt: Date = new Date()): string {
        let month = dt.getMonth() + 1; // Date month starts with zero!

        let tag: string = "";
        tag += dt.getFullYear() + "";
        tag += (month < 10 ? "0" : "") + month;
        tag += (dt.getDate() < 10 ? "0" : "") + dt.getDate();
        return tag;
    }

    static timeTag(dt: Date = new Date()): string {
        let tag: string = "";
        tag += (dt.getHours() < 10 ? "0" : "") + dt.getHours();
        tag += (dt.getMinutes() < 10 ? "0" : "") + dt.getMinutes();
        tag += (dt.getSeconds() < 10 ? "0" : "") + dt.getSeconds();
        return tag;
    }

    static timeTagWithMillis(separator = '.', dt: Date = new Date()): string {
        let millis = dt.getMilliseconds();

        let tag: string = this.timeTag(dt);
        tag += separator;
        tag += (millis < 10 ? "00" : ( millis < 100 ? "0" : "")) + millis;
        return tag;
    }

    static daysAgo(days: number): Date {
        return subDays(new Date(), days);
    }
}
