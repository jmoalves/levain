import {assertEquals} from "https://deno.land/std/testing/asserts.ts";

import StringUtils from './string_utils.ts';

Deno.test('StringUtils - should check if textContainsChars', () => {
    assertEquals(StringUtils.textContainsAtLeastOneChar('abc', 'xyz'), false)
    assertEquals(StringUtils.textContainsAtLeastOneChar('abc', 'cde'), true)
})

Deno.test('StringUtils - humanizeMillis', () => {
    assertEquals(StringUtils.humanizeMillis(MillisBuilder.newMillis().hours(50).minutes(35).seconds(28).millis(75).build()),
        "50h 35min 28.075s");

    assertEquals(StringUtils.humanizeMillis(MillisBuilder.newMillis().hours(2).minutes(35).seconds(28).millis(75).build()),
        "2h 35min 28.075s");

    assertEquals(StringUtils.humanizeMillis(MillisBuilder.newMillis().hours(2).minutes(35).seconds(28).build()),
        "2h 35min 28s");

    assertEquals(StringUtils.humanizeMillis(MillisBuilder.newMillis().hours(2).minutes(35).millis(75).build()),
        "2h 35min 0.075s");

    assertEquals(StringUtils.humanizeMillis(MillisBuilder.newMillis().hours(2).minutes(35).build()),
        "2h 35min");

    assertEquals(StringUtils.humanizeMillis(MillisBuilder.newMillis().hours(2).build()),
        "2h");

    assertEquals(StringUtils.humanizeMillis(MillisBuilder.newMillis().minutes(35).build()),
        "35min");

    assertEquals(StringUtils.humanizeMillis(MillisBuilder.newMillis().seconds(28).millis(75).build()),
        "28.075s");

    assertEquals(StringUtils.humanizeMillis(MillisBuilder.newMillis().seconds(28).build()),
        "28s");

    assertEquals(StringUtils.humanizeMillis(MillisBuilder.newMillis().millis(75).build()),
        "0.075s");

    assertEquals(StringUtils.humanizeMillis(MillisBuilder.newMillis().build()),
        "0.000s");

    assertEquals(StringUtils.humanizeMillis(0.029),
        "0.000s");
});

Deno.test('StringUtils - padNum', () => {
    assertEquals(StringUtils.padNum(0, 10), '         0')
    assertEquals(StringUtils.padNum(0, 10, "0"), '0000000000')

    assertEquals(StringUtils.padNum(258, 5), '  258')
    assertEquals(StringUtils.padNum(258, 5, "0"), '00258')

    let x;
    assertEquals(StringUtils.padNum(x, 7, " "), '       ')
    assertEquals(StringUtils.padNum(x, 7, "0"), '0000000')
})

Deno.test('StringUtils - padEnd', () => {
    assertEquals(StringUtils.padEnd('0', 10), '0         ')

    assertEquals(StringUtils.padEnd('258', 5), '258  ')

    let x;
    assertEquals(StringUtils.padEnd(x, 7), '       ')
})

Deno.test('StringUtils - humanizeBytes', () => {
    assertEquals(StringUtils.humanizeBytes(0), "   0.000  B")
    assertEquals(StringUtils.humanizeBytes(500), " 500.000  B")
    assertEquals(StringUtils.humanizeBytes(1024), "   1.000 KB")
    assertEquals(StringUtils.humanizeBytes(1025), "   1.001 KB")
    assertEquals(StringUtils.humanizeBytes(2048), "   2.000 KB")
    assertEquals(StringUtils.humanizeBytes(2050), "   2.002 KB")
    assertEquals(StringUtils.humanizeBytes(1024 * 1024), "   1.000 MB")
    assertEquals(StringUtils.humanizeBytes(1024 * 1024 * 1024), "   1.000 GB")
    assertEquals(StringUtils.humanizeBytes(1024 * 1024 * 1024 * 1024), "   1.000 TB")
    assertEquals(StringUtils.humanizeBytes(1024 * 1024 * 1024 * 1024 * 1024), "1024.000 TB")
    assertEquals(StringUtils.humanizeBytes(10240 * 1024 * 1024 * 1024 * 1024), "10240.000 TB")
})


class MillisBuilder {
    private static readonly SECONDS = 1000;
    private static readonly MINUTES = 60 * MillisBuilder.SECONDS;
    private static readonly HOURS = 60 * MillisBuilder.MINUTES;

    private _hours = 0;
    private _minutes = 0;
    private _seconds = 0;
    private _millis = 0;

    public MillisBuilder() {
    }

    public static newMillis(): MillisBuilder {
        return new MillisBuilder();
    }

    public hours(hours: number): MillisBuilder {
        this._hours = hours;
        return this;
    }

    public minutes(minutes: number): MillisBuilder {
        this._minutes = minutes;
        return this;
    }

    public seconds(seconds: number): MillisBuilder {
        this._seconds = seconds;
        return this;
    }

    public millis(millis: number): MillisBuilder {
        this._millis = millis;
        return this;
    }

    public build(): number {
        return this._hours * MillisBuilder.HOURS + this._minutes * MillisBuilder.MINUTES + this._seconds * MillisBuilder.SECONDS + this._millis;
    }
}

//
// parseBoolean
//
Deno.test('StringUtils - parseBoolean - should parse true', () => {
    assertEquals(StringUtils.parseBoolean(true), true)
    assertEquals(StringUtils.parseBoolean('true'), true)
    assertEquals(StringUtils.parseBoolean('1'), true)
    assertEquals(StringUtils.parseBoolean(1), true)
    assertEquals(StringUtils.parseBoolean(123), true)
    assertEquals(StringUtils.parseBoolean('any text'), true)
})
Deno.test('StringUtils - parseBoolean - should parse false', () => {
    assertEquals(StringUtils.parseBoolean(false), false)
    assertEquals(StringUtils.parseBoolean('false'), false)
    assertEquals(StringUtils.parseBoolean('0'), false)
    assertEquals(StringUtils.parseBoolean(0), false)
    assertEquals(StringUtils.parseBoolean(undefined), false)
    assertEquals(StringUtils.parseBoolean(null), false)
})

//
// removeAccentMarks
//
Deno.test('StringUtils.removeAccentMarks', () => {
    assertEquals(StringUtils.removeAccentMarks('João'), 'Joao')
    assertEquals(StringUtils.removeAccentMarks('espaços'), 'espacos')
})

//
// surround
//
Deno.test('StringUtils.surround should surround assertEquals string with another text', () => {
    assertEquals(StringUtils.surround('abc', '"'), '"abc"')
})
