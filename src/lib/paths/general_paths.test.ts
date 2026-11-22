import {
  assert,
  assertNotEquals
} from "@std/assert";
import { existsSync } from "@std/fs";
import GeneralPaths from "./general_paths.ts";


Deno.test("GeneralPaths should know where is the temp folder", () => {
  assertNotEquals(GeneralPaths.tempDir, undefined);
  assert(existsSync(GeneralPaths.tempDir));
});