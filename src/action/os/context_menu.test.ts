import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import {assert} from "https://deno.land/std@0.224.0/assert/assert.ts";
import ContextMenuAction from "./context_menu.ts";

Deno.test('ContextMenuAction should be obtainable with action factory', () => {
    const config = TestHelper.getConfig()
    const factory = new ActionFactory()
    const action = factory.get("contextMenu", config)

    assert(action instanceof ContextMenuAction)
})
