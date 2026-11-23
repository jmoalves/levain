import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import VarResolver from "./var_resolver.ts";
import Config from "./config.ts";
import TestHelper from "./test/test_helper.ts";
import { MockPackage } from "./package/mock_package.ts";

import HomePaths from "./paths/home_paths.ts";
import StringUtils from "./utils/string_utils.ts";

//
// replaceVars
//
Deno.test("VarResolver.replaceVars should not change a text without vars", async () => {
  const textWithoutVars = "I am Groot.";

  const config = TestHelper.getConfig();
  const replacedText = await VarResolver.replaceVars(textWithoutVars, undefined, config);
  assertEquals(replacedText, textWithoutVars);
});
Deno.test("VarResolver.replaceVars should throw error for unknown vars", async () => {
  const config = TestHelper.getConfig();

  await assertRejects(
    async () => {
      await VarResolver.replaceVars("${var-that-does-not-exist}", undefined, config);
    },
    Error,
    "Var var-that-does-not-exist not defined",
  );
});
Deno.test("VarResolver.replaceVars should replace a var", async () => {
  const config = new Config({ myVar: "myValue" });

  const text = "home: ${myVar}";
  const replacedVars = await VarResolver.replaceVars(text, undefined, config);

  assertMatch(replacedVars, /home: myValue/);
});
Deno.test("VarResolver.replaceVars should replace a var multiple times", async () => {
  const config = new Config({ myVar: "myValue" });

  const text = "home: ${myVar} ${myVar}";
  const replacedVars = await VarResolver.replaceVars(text, undefined, config);

  assertMatch(replacedVars, /home: myValue myValue/);
});
Deno.test("VarResolver.replaceVars should replace multiple vars", async () => {
  const config = new Config({ myVar: "myValue", levainCache: "cache/" });

  const text = "home: ${myVar} ${levainCache}";
  const replacedVars = await VarResolver.replaceVars(text, undefined, config);

  assertMatch(replacedVars, /home: myValue cache\//);
});

Deno.test("VarResolver.replaceVars should treat $& and $$ literally in variable values", async () => {
  const config = new Config({ specialVar: "a$&b$$c" });

  const replaced = await VarResolver.replaceVars("val=${specialVar}", undefined, config);
  assertEquals(replaced, "val=a$&b$$c");
});

Deno.test("VarResolver.replaceVars should abort on circular variable references", async () => {
  const config = new Config({ varA: "${varB}", varB: "${varA}" });

  await assertRejects(
    async () => {
      await VarResolver.replaceVars("${varA}", undefined, config);
    },
    Error,
    "Maximum variable expansion depth",
  );
});

Deno.test("VarResolver.replaceVars should not re-expand variable syntax inside levain.password", async () => {
  const config = new Config({ other: "expanded" });
  config.password = "p@ss${notDefined}$&123";

  const replaced = await VarResolver.replaceVars(
    "pass=${levain.password} repeat=${levain.password} other=${other}",
    undefined,
    config,
  );
  assertEquals(replaced, "pass=p@ss${notDefined}$&123 repeat=p@ss${notDefined}$&123 other=expanded");
});

Deno.test("VarResolver.replaceVars should resolve nested vars and protect indirect levain.password and cycles in package YAML", async () => {
  const config = new Config({ envName: "prod", url_prod: "https://example.org" });
  assertEquals(await VarResolver.replaceVars("${url_${envName}}", undefined, config), "https://example.org");

  config.password = "pw${notDefined}$&9";
  const yamlItems: Record<string, string> = {
    proxyUrl: "http://user:${levain.password}@proxy.example.org",
    cycleA: "${cycleB}",
    cycleB: "${cycleA}",
  };
  const pkg = new MockPackage("corp-app");
  pkg.yamlItem = (key: string) => yamlItems[key];

  const pkgStub = stub(config.packageManager, "package", (name: string) => name === "corp-app" ? pkg : undefined);
  try {
    const resolvedProxy = await VarResolver.replaceVars("url=${proxyUrl}", "corp-app", config);
    assertEquals(resolvedProxy, "url=http://user:pw${notDefined}$&9@proxy.example.org");

    await assertRejects(
      async () => {
        await VarResolver.replaceVars("${cycleA}", "corp-app", config);
      },
      Error,
      "Maximum variable expansion depth",
    );
  } finally {
    pkgStub.restore();
  }
});

Deno.test("VarResolver.replaceVars allows 25+ sibling package YAML vars and handles cross-package refs and cycles", async () => {
  const config = new Config({ sharedPrefix: "p" });
  config.password = "cross${missing}$&pw";

  const manyVars: Record<string, string> = {};
  const exprParts: string[] = [];
  for (let i = 1; i <= 25; i++) {
    manyVars[`v${i}`] = `\${sharedPrefix}-${i}`;
    exprParts.push(`\${v${i}}`);
  }
  const bigPkg = new MockPackage("big-pkg");
  bigPkg.yamlItem = (key: string) => manyVars[key];

  const dottedPkg = new MockPackage("wlp-runtime-24.0.0.1");
  const dottedItems: Record<string, string> = {
    url: "https://example.org/wlp?pw=${levain.password}",
    cycleA: "${pkg.cycle-peer.cycleB}",
  };
  dottedPkg.yamlItem = (key: string) => dottedItems[key];

  const peerPkg = new MockPackage("cycle-peer");
  const peerItems: Record<string, string> = {
    cycleB: "${pkg.wlp-runtime-24.0.0.1.cycleA}",
  };
  peerPkg.yamlItem = (key: string) => peerItems[key];

  const pkgMap = new Map<string, MockPackage>([
    ["big-pkg", bigPkg],
    ["wlp-runtime-24.0.0.1", dottedPkg],
    ["cycle-peer", peerPkg],
  ]);
  const pkgStub = stub(config.packageManager, "package", (name: string) => pkgMap.get(name));

  try {
    // 25 sibling package YAML vars (each nesting 1 level) must NOT trigger depth limit
    const resolvedMany = await VarResolver.replaceVars(exprParts.join(","), "big-pkg", config);
    assertEquals(resolvedMany.split(",").length, 25);
    assertEquals(resolvedMany.startsWith("p-1,p-2,"), true);
    assertEquals(resolvedMany.endsWith(",p-25"), true);

    // Cross-package reference with dotted package name + indirect levain.password
    const crossUrl = await VarResolver.replaceVars("${pkg.wlp-runtime-24.0.0.1.url}", "big-pkg", config);
    assertEquals(crossUrl, "https://example.org/wlp?pw=cross${missing}$&pw");

    // Cross-package cycle still aborts cleanly with depth error
    await assertRejects(
      async () => {
        await VarResolver.replaceVars("${pkg.wlp-runtime-24.0.0.1.cycleA}", "big-pkg", config);
      },
      Error,
      "Maximum variable expansion depth",
    );
  } finally {
    pkgStub.restore();
  }
});
//
// findVarsInText
//
Deno.test({
  name: "VarResolver.findVarsInText should detect no vars",
  fn: () => {
    const varsFoundInText = VarResolver.findVarsInText("no vars in this text");
    assertEquals(varsFoundInText, []);
  },
});
Deno.test({
  name: "VarResolver.findVarsInText should match multiple vars",
  fn: () => {
    const varsFoundInText = VarResolver.findVarsInText("${aVar} and ${anotherVar}");
    assertEquals(varsFoundInText, [{
      name: "aVar",
      text: "${aVar}",
    }, {
      name: "anotherVar",
      text: "${anotherVar}",
    }]);
  },
});
//
// getVarValue
//
Deno.test("VarResolver.getVarValue should return undefined for unknown vars", async () => {
  await verifyVarValueEquals("var-that-does-not-exist", undefined);
});
Deno.test("VarResolver.getVarValue should get home", async () => {
  await verifyVarValueEquals("home", `${HomePaths.homedir()}`);
});
// Deno.test('VarResolver.getVarValue should get levain.homeDir', async () => {
//     await verifyVarValueMatches('levain.homeDir', /.*levain/)
// })
Deno.test("VarResolver.getVarValue should get levainCache ", async () => {
  await verifyVarValueEquals("levainCache", "cache/", { levainCache: "cache/" });
});
Deno.test("VarResolver.getVarValue should get levain.cacheDir", async () => {
  await verifyVarValueMatches("levain.cacheDir", /.*\.levainCache/);
});

Deno.test("VarResolver.replaceVars should apply urlEncode filter with and without spaces and protect secrets", async () => {
  const config = TestHelper.getConfig();
  config.login = "CORP\\john doe";
  config.password = "p^a&s$$w!o(r)*'${HOME}ç";

  const expectedLogin = StringUtils.encodeUrlComponent(config.login);
  const expectedPassword = StringUtils.encodeUrlComponent(config.password);

  const withSpaces = await VarResolver.replaceVars(
    "https://${levain.login | urlEncode}:${levain.password | urlEncode}@proxy.example.org",
    undefined,
    config,
  );
  assertEquals(withSpaces, `https://${expectedLogin}:${expectedPassword}@proxy.example.org`);

  const compact = await VarResolver.replaceVars("${levain.password|urlEncode}", undefined, config);
  assertEquals(compact, expectedPassword);

  await assertRejects(
    async () => await VarResolver.replaceVars("${levain.login | noSuchFilter}", undefined, config),
    Error,
    "Unknown filter 'noSuchFilter'",
  );
  await assertRejects(
    async () => await VarResolver.replaceVars("${levain.login | toString}", undefined, config),
    Error,
    "Unknown filter 'toString'",
  );
  await assertRejects(
    async () => await VarResolver.replaceVars("${levain.password | }", undefined, config),
    Error,
    "Empty filter",
  );

  // Indirect YAML variable wrapping ${levain.password} piped through | urlEncode must encode the real secret
  const indirectPkg = new MockPackage("indirect-secret-pkg");
  indirectPkg.yamlItem = (key: string) => (key === "wrappedPw" ? "${levain.password}" : undefined);
  const pkgStub = stub(config.packageManager, "package", (name: string) =>
    name === "indirect-secret-pkg" ? indirectPkg : undefined
  );
  try {
    const resolvedIndirect = await VarResolver.replaceVars(
      "${wrappedPw | urlEncode}",
      "indirect-secret-pkg",
      config,
    );
    assertEquals(resolvedIndirect, expectedPassword);
  } finally {
    pkgStub.restore();
  }
});

async function verifyVarValueEquals(varName: string, expectedValue: string | undefined, configArgs: any = {}) {
  const config = new Config(configArgs);
  const varValue = await VarResolver.getVarValue(varName, undefined, config);
  assertEquals(varValue, expectedValue);
}

async function verifyVarValueMatches(varName: string, expectedPattern: RegExp, configArgs: any = {}) {
  const config = new Config(configArgs);
  const varValue = await VarResolver.getVarValue(varName, undefined, config);
  assertMatch(varValue ?? "undefined", expectedPattern);
}
