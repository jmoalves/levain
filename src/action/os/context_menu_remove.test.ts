import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import { assert } from "jsr:@std/assert@1.0.0";
import ContextMenuRemoveAction from "./context_menu_remove.ts";

Deno.test("ContextMenuRemoveAction should be obtainable with action factory", () => {
  const config = TestHelper.getConfig();
  const factory = new ActionFactory();
  const action = factory.get("contextMenuRemove", config);

  assert(action instanceof ContextMenuRemoveAction);
});
