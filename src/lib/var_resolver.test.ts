import {assertEquals, assertMatch, assertRejects} from "https://deno.land/std/testing/asserts.ts";

import VarResolver from "./var_resolver.ts";
import Config from "./config.ts";
import TestHelper from "./test/test_helper.ts";

//
// replaceVars
//
Deno.test('VarResolver.replaceVars should not change a text without vars', async () => {

    const textWithoutVars = 'I am Groot.'

    const config = TestHelper.getConfig()
    const replacedText = await VarResolver.replaceVars(textWithoutVars, undefined, config)
    assertEquals(replacedText, textWithoutVars)
})
Deno.test('VarResolver.replaceVars should throw error for unknown vars', async () => {
    const config = TestHelper.getConfig()

    await assertRejects(
        async () => {
            await VarResolver.replaceVars('${var-that-does-not-exist}', undefined, config)
        },
        Error,
        'Var var-that-does-not-exist not defined',
    )
})
Deno.test('VarResolver.replaceVars should replace a var', async () => {
    const config = new Config()

    const text = 'home: ${home}';
    const replacedVars = await VarResolver.replaceVars(text, undefined, config)

    assertMatch(replacedVars, /home: .*levain/)
})
Deno.test('VarResolver.replaceVars should replace a var multiple times', async () => {
    const config = new Config()

    const text = 'home: ${home} ${home}';
    const replacedVars = await VarResolver.replaceVars(text, undefined, config)

    assertMatch(replacedVars, /home: .*levain .*levain/)
})
Deno.test('VarResolver.replaceVars should replace multiple vars', async () => {
    const config = new Config({levainCache: 'cache/'})

    const text = 'home: ${home} ${levainCache}';
    const replacedVars = await VarResolver.replaceVars(text, undefined, config)

    assertMatch(replacedVars, /home: .*levain cache\//)
})
//
// findVarsInText
//
Deno.test({
    name: 'VarResolver.findVarsInText should detect no vars',
    fn: () => {
        const varsFoundInText = VarResolver.findVarsInText('no vars in this text')
        assertEquals(varsFoundInText, [])
    },
    // only: true,
})
Deno.test({
    name: 'VarResolver.findVarsInText should match multiple vars',
    fn: () => {
        const varsFoundInText = VarResolver.findVarsInText('${aVar} and ${anotherVar}')
        assertEquals(varsFoundInText, [{
            name: "aVar",
            text: "${aVar}",
        }, {
            name: "anotherVar",
            text: "${anotherVar}",
        }])
    },
    // only: true,
})
//
// getVarValue
//
Deno.test('VarResolver.getVarValue should return undefined for unknown vars', async () => {
    await verifyVarValueEquals('var-that-does-not-exist', undefined)
})
Deno.test('VarResolver.getVarValue should get home', async () => {
    await verifyVarValueMatches('home', /.*levain/)
})
Deno.test('VarResolver.getVarValue should get levain.homeDir', async () => {
    await verifyVarValueMatches('levain.homeDir', /.*levain/)
})
Deno.test('VarResolver.getVarValue should get levainCache ', async () => {
    await verifyVarValueEquals('levainCache', 'cache/', {levainCache: 'cache/'})
})
Deno.test('VarResolver.getVarValue should get levain.cacheDir', async () => {
    await verifyVarValueMatches('levain.cacheDir', /.*\.levainCache/)
})


async function verifyVarValueEquals(varName: string, expectedValue: string | undefined, configArgs: any = {}) {
    const config = new Config(configArgs)
    const varValue = await VarResolver.getVarValue(varName, undefined, config)
    assertEquals(varValue, expectedValue)
}

async function verifyVarValueMatches(varName: string, expectedPattern: RegExp, configArgs: any = {}) {
    const config = new Config(configArgs)
    const varValue = await VarResolver.getVarValue(varName, undefined, config)
    assertMatch(varValue ?? 'undefined', expectedPattern)
}
