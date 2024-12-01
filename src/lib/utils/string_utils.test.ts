import {assertEquals} from "jsr:@std/assert";

import StringUtils from './string_utils.ts';

Deno.test('StringUtils - should check if textContainsAtLeastOneChar', () => {
    assertEquals(StringUtils.textContainsAtLeastOneChar('abc', 'xyz'), false)
    assertEquals(StringUtils.textContainsAtLeastOneChar('abc', 'cde'), true)
})

Deno.test('StringUtils - should check if textContainsAtLeastOneSequence', () => {
    assertEquals(StringUtils.textContainsAtLeastOneSequence('abc', ['xyz']), false)
    assertEquals(StringUtils.textContainsAtLeastOneSequence('abc', ['xyz', 'abc']), true)
    assertEquals(StringUtils.textContainsAtLeastOneSequence('abc', []), false)
    assertEquals(StringUtils.textContainsAtLeastOneSequence('', []), false)
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

    const undef = undefined;
    assertEquals(StringUtils.padNum(undef, 7, " "), '       ')
    assertEquals(StringUtils.padNum(undef, 7, "0"), '0000000')
})

Deno.test('StringUtils - padEnd', () => {
    assertEquals(StringUtils.padEnd('0', 10), '0         ')

    assertEquals(StringUtils.padEnd('258', 5), '258  ')

    const undef = undefined;
    assertEquals(StringUtils.padEnd(undef, 7), '       ')
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

//
// splitSpaces
//
Deno.test('StringUtils.splitSpaces should remove empty spaces', () => {
    assertEquals(StringUtils.splitSpaces('apple banana  carrot'), ['apple', 'banana', 'carrot'])
})

//
// findSimilar
//
Deno.test('StringUtils.findSimilar should find similar names', () => {
    assertEquals(
        [... StringUtils.findSimilar(
            'maiven',
            [
                'eclipse-2021-21',
                'maven',
                'maven-3.6',
                'maven-3.8',
                'eclipse-maven',
                'new-maven-version',
                'mav',
                'automav-en'
            ])], 
            [
                'maven',
                'maven-3.6',
                'maven-3.8',
                'eclipse-maven',
                'new-maven-version',
                'automav-en'
            ]) 
})

Deno.test('StringUtils.findSimilar should find similar names', () => {
    assertEquals(
        [... StringUtils.findSimilar(
            'instal',
            [
                'install',
                'list',
                'info',
                'explain',
                'clean',
                'shell',
                'actions'
            ])], 
            [
                'install'
            ]) 
})

Deno.test('StringUtils.findSimilar should find similar names', () => {
    assertEquals(
        [... StringUtils.findSimilar(
            'jdk',
            [
                'test-add-to-startup',
                'insideSubfolder',
                'mousse-de-chocolate',
                'superDuper',
                'reciepe-in-a-folder-in-a-zip',
                'openjdk-11',
                'openjdk-12',
                'openjdk-13',
                'openjdk-14',
                'openjdk-15',
                'openjdk-16',
                'jdk-17-ibm',
                'ganttProject'
            ])], 
            [
                'openjdk-11',
                'openjdk-12',
                'openjdk-13',
                'openjdk-14',
                'openjdk-15',
                'openjdk-16',
                'jdk-17-ibm'
            ]) 
})

Deno.test('StringUtils.compressText should shrink strings', () => {
    assertEquals(StringUtils.compressText('name', 50), 'name')
    assertEquals(StringUtils.compressText('long_name', 5), 'l...e')
    assertEquals(StringUtils.compressText('long_name', 6), 'lo...e')
    assertEquals(StringUtils.compressText('long_name', 7), 'lo...me')
    assertEquals(
        StringUtils.compressText('- HTTP ibm-semeru-open-jdk_x64_windows_17.0.3_7_openj9-0.32.0.zip', 50),
        '- HTTP ibm-semeru-open-j...0.3_7_openj9-0.32.0.zip'
    )
})
