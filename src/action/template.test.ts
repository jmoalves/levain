import {assert, assertEquals, assertRejects,} from "https://deno.land/std/testing/asserts.ts";

import TestHelper from '../lib/test/test_helper.ts';

import ActionFactory from './action_factory.ts';
import Template from './template.ts';

Deno.test('Template should replace one var', async () => {
    const config = TestHelper.getConfig()
    const factory = new ActionFactory()
    const action = factory.get("template", config)

    assert(action instanceof Template)

    await action.execute(TestHelper.mockPackage(), ['--replace=/@@USERNAME@@/g', '--with=jmaur', '--replace=/@@CREDENTIALS@@/g', '--with=Password:\ndasjdhakjdhaskjdhakjh\nshdkjahsdkjsahdkaj\nasjhdkasjhdaksjh', '--replace=/Password:.*/g', '--with=', '../testdata/template/source.txt', '../testdata/template/result.txt'])
})
