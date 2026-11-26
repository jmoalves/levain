import { assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import t from "../../lib/i18n.ts";
import OsUtils from "../../lib/os/os_utils.ts";
import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import CheckEnvExists from "./check_env_exists.ts";

Deno.test("CheckEnvExists should be registered in ActionFactory and require at least one env name", async () => {
  const config = TestHelper.getConfig();
  const action = new ActionFactory().get("checkEnvExists", config);
  const pkg = TestHelper.mockPackage();

  await assertRejects(
    () => action.execute(pkg, []),
    Error,
    t("action.check_env_exists.missingArgs"),
  );
});

Deno.test("CheckEnvExists passes when at least one env var exists in session setEnv, config, or Deno.env", async () => {
  const pkg = TestHelper.mockPackage();

  // 1. Found via Deno.env (with first candidate missing)
  const config1 = TestHelper.getConfig();
  const origEnvGet = Deno.env.get.bind(Deno.env);
  const envStub = stub(Deno.env, "get", (key: string) => (key === "MY_RUNTIME_HOME" ? "/opt/runtime" : origEnvGet(key)));
  try {
    await new CheckEnvExists(config1).execute(pkg, ["MISSING_VAR", "MY_RUNTIME_HOME"]);
  } finally {
    envStub.restore();
  }

  // 2. Found via session setEnv context (exact match + Windows case-insensitive match)
  const config2 = TestHelper.getConfig();
  config2.context.action = { setEnv: { env: { WLP_HOME: "/dev/wlp" } } };
  await new CheckEnvExists(config2).execute(pkg, ["WLP_HOME"]);

  const winStub = stub(OsUtils, "isWindows", () => true);
  try {
    await new CheckEnvExists(config2).execute(pkg, ["wlp_home"]);
  } finally {
    winStub.restore();
  }

  // 3. Found via config.getVar
  const config3 = TestHelper.getConfig();
  config3.setVar("FROM_CONFIG_VAR", "ok");
  await new CheckEnvExists(config3).execute(pkg, ["FROM_CONFIG_VAR"]);
});

Deno.test("CheckEnvExists throws clear errors when single or multiple env vars are missing or blank", async () => {
  const config = TestHelper.getConfig();
  config.context.action = { setEnv: { env: { BLANK_VAR: "   " } } };
  const pkg = TestHelper.mockPackage();
  const action = new CheckEnvExists(config);

  const envStub = stub(Deno.env, "get", () => undefined);
  const posixStub = stub(OsUtils, "isWindows", () => false);
  try {
    await assertRejects(
      () => action.execute(pkg, ["BLANK_VAR"]),
      Error,
      t("action.check_env_exists.notFound", { name: "BLANK_VAR" }),
    );
    await assertRejects(
      () => action.execute(pkg, ["MISSING_A", "MISSING_B"]),
      Error,
      t("action.check_env_exists.noneFound", { names: "MISSING_A, MISSING_B" }),
    );
  } finally {
    posixStub.restore();
    envStub.restore();
  }
});
