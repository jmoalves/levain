import {assertEquals, assertThrows, assert} from "https://deno.land/std/assert/mod.ts";

import {parseArgs} from "./parse_args.ts";

Deno.test('should parse args', () => {
    const args = parseArgs([
        'firstArg',
        'secondArg',
    ])

    assertEquals(args._.length, 2)
    assertEquals(args._[0], 'firstArg')
    assertEquals(args._[1], 'secondArg')
})


Deno.test('should parse boolean option', () => {

    const args = parseArgs([
        '--likeChocolate', 'true'
    ], {
        boolean: [
            'likeChocolate',
        ]
    })

    assertEquals(args._.length, 0)
    assertEquals(args.likeChocolate, true)
})


Deno.test('should throw exception on unknown option', () => {

    assertThrows(
        () => {
            parseArgs([
                '--404', 'true'
            ], {
                boolean: [
                    'likeChocolate',
                ]
            })
        },
        Error,
        'ERROR: Unknown option --404')
})

Deno.test('should parse stringOnce option', () => {
    const args = parseArgs(['--stringOption', 'firstOption'], {
        stringOnce: [
            'stringOption'
        ]
    })

    assertEquals(args._.length, 0)
    assertEquals(args.stringOption, 'firstOption')
})


Deno.test('should use stringOnce option only once', () => {
    assertThrows(
        () => {
            const args = parseArgs(['--stringOption', 'firstOption', '--stringOption', 'secondOption'], {
                stringOnce: [
                    'stringOption'
                ]
            })
        },
        Error,
        'Use option --stringOption only once'
    )
})


Deno.test('should parse stringMany option', () => {
    const args = parseArgs([
        '--nephew', 'Huey',
        '--nephew', 'Dewey',
        '--nephew', 'Louie',
    ], {
        stringMany: [
            'nephew',
        ]
    })

    assertEquals(args._.length, 0)
    assertEquals(args.nephew, ['Huey', 'Dewey', 'Louie',])
})

Deno.test('should parse stringMany option without values', () => {
    const args = parseArgs([], {
        stringMany: [
            'nephew',
        ]
    })

    assertEquals(args._.length, 0)
    assertEquals(args.nephew, undefined)
})

Deno.test('should parse arg and option', () => {
    const args = parseArgs(['--myOption', 'yes', 'firstArg'], {
        stringOnce: [
            'myOption'
        ]
    })

    assertEquals(args._, ['firstArg'])
    assertEquals(args.myOption, 'yes')
})

Deno.test('should ignore multiple spaces', () => {
    const args = parseArgs(['--myOption', '', '', '', 'yes', '', '', '', 'firstArg', '', '', ''], {
        stringOnce: [
            'myOption'
        ]
    })

    assertEquals(args._.length, 1)
    assertEquals(args._, ['firstArg'])
    assertEquals(args.myOption, 'yes')
})
