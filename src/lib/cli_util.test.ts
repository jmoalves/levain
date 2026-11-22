import { assertEquals, assertThrows } from "@std/assert";

import CliUtil from "./cli_util.ts";
import t from "./i18n.ts";
import TestHelper from "./test/test_helper.ts";

Deno.test("CliUtil.askToContinue should skip prompt when testMode is true", () => {
  const prevTestMode = CliUtil.testMode;
  const origPrompt = globalThis.prompt;
  let prompted = false;

  try {
    CliUtil.testMode = true;
    globalThis.prompt = () => {
      prompted = true;
      return "N";
    };

    CliUtil.askToContinue();
    assertEquals(prompted, false);
  } finally {
    globalThis.prompt = origPrompt;
    CliUtil.testMode = prevTestMode;
  }
});

Deno.test("CliUtil.askToContinue should continue on default affirmative answer (case-insensitive)", async () => {
  const prevTestMode = CliUtil.testMode;
  try {
    CliUtil.testMode = false;
    const defaultYes = t("lib.cli_util.continueDefault");

    await TestHelper.mockInputWrap(defaultYes.toLowerCase(), () => {
      CliUtil.askToContinue();
    });
    await TestHelper.mockInputWrap(defaultYes.toUpperCase(), () => {
      CliUtil.askToContinue();
    });
  } finally {
    CliUtil.testMode = prevTestMode;
  }
});

Deno.test("CliUtil.askToContinue should throw when user declines or cancels", async () => {
  const prevTestMode = CliUtil.testMode;
  try {
    CliUtil.testMode = false;

    await TestHelper.mockInputWrap("N", () => {
      assertThrows(() => CliUtil.askToContinue(), t("lib.cli_util.doNotContinue"));
    });

    await TestHelper.mockInputWrap("", () => {
      assertThrows(() => CliUtil.askToContinue(), t("lib.cli_util.doNotContinue"));
    });
  } finally {
    CliUtil.testMode = prevTestMode;
  }
});
