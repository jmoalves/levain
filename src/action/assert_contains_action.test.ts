import {assertThrows} from "https://deno.land/std/testing/asserts.ts";

import AssertContainsAction from "./assert_contains_action.ts";
import {MockPackage} from "../lib/package/mock_package.ts";
import Config from "../lib/config.ts";

const command = new AssertContainsAction(new Config({}))
const pkg = new MockPackage();

Deno.test('should assert the the first text is contained in the second', () => {
    command.execute(pkg, ["123", "abc123youandme"])
})

Deno.test('should throw error when not contained', () => {
    assertThrows(
        () => {
            command.execute(pkg, ["abc", "123"])
        },
        Error,
        'Cound not find "abc" in "123"'
    )
})

Deno.test('should throw Error with help when not enough args were supplied', () => {
    assertThrows(
        () => {
            command.execute(pkg, [])
        },
        Error,
        'Action - assertContains "text" "full text"'
    )
})

Deno.test('should throw custom message', () => {
    assertThrows(
        () => {
            command.execute(pkg, ['--message', 'custom message', 'qwe', 'poi'])
        },
        Error,
        'custom message'
    )
})