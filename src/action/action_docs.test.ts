import { assert, assertEquals, assertNotEquals } from "@std/assert";

import ActionFactory from "./action_factory.ts";
import { ActionDocs } from "./action_docs.ts";

Deno.test("ActionDocs should cover every action registered in ActionFactory with 1-to-1 parity", () => {
  const factoryNames = new ActionFactory().list().sort();
  const docNames = ActionDocs.all().map((doc) => doc.name).sort();

  assertEquals(docNames, factoryNames);
});

Deno.test("ActionDocs should provide non-empty usage and localized summary for every action", () => {
  for (const doc of ActionDocs.all()) {
    assert(doc.usage.startsWith(doc.name), `Usage for ${doc.name} should start with action name: ${doc.usage}`);
    const summary = ActionDocs.summary(doc.name);
    assert(summary.length > 0, `Summary for ${doc.name} should not be empty`);
    assertNotEquals(summary, doc.summaryKey, `Summary key ${doc.summaryKey} should resolve to localized text`);
    assertEquals(ActionDocs.get(doc.name), doc);
  }

  assertEquals(ActionDocs.get("unknown-action"), undefined);
  assertEquals(ActionDocs.summary("unknown-action"), "");
});
