import { assertEquals, assertRejects } from "@std/assert";
import { Secret } from "@cliffy/prompt";
import { stub } from "@std/testing/mock";

import { assertStringEndsWith } from "../test/more_asserts.ts";

import UserInfoUtil from "./userinfo_util.ts";
import { InputFullName } from "./input_name.ts";
import { InputEmail } from "./input_email.ts";
import { InputLogin } from "./input_login.ts";
import TestHelper from "../test/test_helper.ts";
import { CliffyTestHelper } from "./cliffy_test_helper.ts";
import { UserInfo } from "./user_info.ts";

Deno.test("UserInfoUtil should use user_info file in $HOME/credentials_jdoe.yaml", () => {
  const userInfoUtil = new UserInfoUtil();
  assertStringEndsWith(userInfoUtil.userinfoFileUri, `.levain.yaml`);
});
//
// load
//
Deno.test("UserInfoUtil should load user info", async () => {
  const userinfoFileUri = TestHelper.getTestDataPath("home/credentials_jdoe.yaml");
  const userInfoUtil = new UserInfoUtil(userinfoFileUri);

  await userInfoUtil.load();

  assertEquals(userInfoUtil.userInfo.login, "jdoe");
  assertEquals(userInfoUtil.userInfo.email, "john.doe@organization.org");
  assertEquals(userInfoUtil.userInfo.fullName, "John Doe");
});
Deno.test("UserInfoUtil should work when user info is not found", async () => {
  const userInfoUtil = new UserInfoUtil("./this_file_does_not_exist");

  await userInfoUtil.load();

  assertEquals(userInfoUtil.userInfo.login, "");
  assertEquals(userInfoUtil.userInfo.email, "");
  assertEquals(userInfoUtil.userInfo.fullName, "");
});
//
// askUserInfo
//
Deno.test("UserInfoUtil.askUserInfo should return userInfo", async () => {
  const tempUserInfoFile = TestHelper.getNewTempFile();
  const userInfoUtil = new UserInfoUtil(tempUserInfoFile);
  const config = TestHelper.getConfig();
  const defaultUserInfo = new UserInfo();
  defaultUserInfo.fullName = "John Doe";
  userInfoUtil.userInfo = defaultUserInfo;

  const args = {
    "ask-fullname": true,
  };
  CliffyTestHelper.inputResponse("Walter Elias Disney");

  const userInfo = await userInfoUtil.askUserInfo(config, args);

  assertEquals(userInfo.fullName, "Walter Elias Disney");
});
//
// askFullName
//
Deno.test("UserInfoUtil.askFullName should get full name", async () => {
  const userInfoUtil = new UserInfoUtil(TestHelper.getNewTempFile());
  const config = TestHelper.getConfig();
  const name = "Walter Elias Disney";
  CliffyTestHelper.inputResponse(name);

  await userInfoUtil.askFullName(config);

  assertEquals(userInfoUtil.userInfo.fullName, name);
  assertEquals(config.fullname, name);
});
Deno.test("UserInfoUtil.inputFullName should have a default value", async () => {
  const userInfoUtil = new UserInfoUtil(TestHelper.getNewTempFile());
  const defaultFullName = "Steve Jobs";
  CliffyTestHelper.inputResponse("");
  const config = TestHelper.getConfig();

  const input = await userInfoUtil.askFullName(config, defaultFullName);

  assertEquals(input, defaultFullName);
});
//
// askLogin
//
Deno.test("UserInfoUtil.askLogin should get askLogin login", async () => {
  const userInfoUtil = new UserInfoUtil(TestHelper.getNewTempFile());
  const config = TestHelper.getConfig();
  const login = "rfwal";
  CliffyTestHelper.inputResponse(login);

  await userInfoUtil.askLogin(config);

  assertEquals(userInfoUtil.userInfo.login, login);
  assertEquals(config.login, login);
});
Deno.test("UserInfoUtil.askLogin should have a default value", async () => {
  const userInfoUtil = new UserInfoUtil(TestHelper.getNewTempFile());
  const defaultLogin = "jdoe";
  CliffyTestHelper.inputResponse("");
  const config = TestHelper.getConfig();

  const input = await userInfoUtil.askLogin(config, defaultLogin);

  assertEquals(input, defaultLogin);
});
//
// askEmail
//
Deno.test("UserInfoUtil.askEmail should get askLogin email", async () => {
  const userInfoUtil = new UserInfoUtil(TestHelper.getNewTempFile());
  const config = TestHelper.getConfig();
  const email = "jdoe@nowhere.com";
  CliffyTestHelper.inputResponse(email);

  await userInfoUtil.askEmail(config);

  assertEquals(userInfoUtil.userInfo.email, email);
  assertEquals(config.email, email);
});
Deno.test("UserInfoUtil.askEmail should have a default value", async () => {
  const userInfoUtil = new UserInfoUtil(TestHelper.getNewTempFile());
  const defaultEmail = "jdoe";
  CliffyTestHelper.inputResponse("");
  const config = TestHelper.getConfig();
  const emailDomain = undefined;

  const input = await userInfoUtil.askEmail(config, emailDomain, defaultEmail);

  assertEquals(input, defaultEmail);
});

Deno.test("UserInfoUtil.askPassword should accept passwords with special characters (^, &, $$, UTF-8)", async () => {
  const userInfoUtil = new UserInfoUtil(TestHelper.getNewTempFile());
  const config = TestHelper.getConfig();
  const specialPw = "p^a&s$$w%o!r|d çã";

  const responses = [specialPw, specialPw];
  const secretStub = stub(Secret, "prompt", () => Promise.resolve(responses.shift() ?? ""));

  try {
    const result = await userInfoUtil.askPassword(config);
    assertEquals(result, specialPw);
    assertEquals(config.password, specialPw);
  } finally {
    secretStub.restore();
  }
});

Deno.test("UserInfoUtil.askPassword should retry short/mismatched passwords and fail after 3 attempts", async () => {
  const userInfoUtil = new UserInfoUtil(TestHelper.getNewTempFile());
  const config = TestHelper.getConfig();

  const responses = ["ab", "abc1", "abc2", "xyz1", "xyz2"];
  const secretStub = stub(Secret, "prompt", () => Promise.resolve(responses.shift() ?? ""));

  try {
    await assertRejects(async () => await userInfoUtil.askPassword(config), Error);
    assertEquals(config.password, undefined);
  } finally {
    secretStub.restore();
  }
});

Deno.test("UserInfoUtil.askUserInfo asks login, email (with domain), and password, and validates errors", async () => {
  const userInfoUtil = new UserInfoUtil(TestHelper.getNewTempFile());
  const config = TestHelper.getConfig();

  const loginStub = stub(InputLogin, "inputAndValidate", () => Promise.resolve("jdoe"));
  let receivedEmailDefault = "";
  const emailStub = stub(InputEmail, "inputAndValidate", (def: string) => {
    receivedEmailDefault = def;
    return Promise.resolve(def);
  });
  const pwResponses = ["", "secret123", "secret123"];
  const secretStub = stub(Secret, "prompt", () => Promise.resolve(pwResponses.shift() ?? ""));
  const logStub = stub(console, "log", () => {});

  try {
    const info = await userInfoUtil.askUserInfo(config, {
      "ask-login": true,
      "ask-email": true,
      "email-domain": "example.org",
      "ask-password": true,
    });
    assertEquals(info.login, "jdoe");
    assertEquals(receivedEmailDefault, "jdoe@example.org");
    assertEquals(info.email, "jdoe@example.org");
    assertEquals(config.password, "secret123");

    // Validation failures in askFullName and askEmail
    const badNameStub = stub(InputFullName, "inputAndValidate", () => Promise.resolve("ab"));
    try {
      await assertRejects(() => userInfoUtil.askFullName(config), Error);
    } finally {
      badNameStub.restore();
    }

    emailStub.restore();
    const emptyEmailStub = stub(InputEmail, "inputAndValidate", () => Promise.resolve(""));
    try {
      await assertRejects(() => userInfoUtil.askEmail(config, "@corp.example"), Error);
    } finally {
      emptyEmailStub.restore();
    }
  } finally {
    logStub.restore();
    secretStub.restore();
    try {
      emailStub.restore();
    } catch {
      // already restored above
    }
    loginStub.restore();
  }
});
