import {assertRejects} from "jsr:@std/assert";

import {MockPackage} from "../lib/package/mock_package.ts";
import Config from "../lib/config.ts";

import AssertContainsAction from "./assert_contains_action.ts";

const command = new AssertContainsAction(new Config({}))
const pkg = new MockPackage();

Deno.test('should assert the the first text is contained in the second', async () => {
    await command.execute(pkg, ["123", "abc123youandme"])
})

Deno.test('should throw error when not contained', async () => {
    await assertRejects(
        async () => {
            await command.execute(pkg, ["abc", "123"])
        },
        Error,
        'Could not find "abc" in "123"'
    )
})

Deno.test('should throw Error with help when not enough args were supplied', async () => {
    await assertRejects(
        async () => {
            await command.execute(pkg, [])
        },
        Error,
        'Action - expected two parametrers\nassertContains "text" "full text"'
    )
})

Deno.test('should throw custom message', async () => {
    await assertRejects(
        async () => {
            await command.execute(pkg, ['--message', 'custom message', 'qwe', 'poi'])
        },
        Error,
        'custom message'
    )
})
