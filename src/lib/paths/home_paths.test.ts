import { assertNotEquals } from "@std/assert";
import HomePaths from "./home_paths.ts";


Deno.test("homedir", () => {
  const home = HomePaths.homedir();

  assertNotEquals(home, undefined);
});
