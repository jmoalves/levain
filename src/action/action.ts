import type Package from "../lib/package/package.ts";
import type { ShellToken } from "../lib/parse_args.ts";

export default interface Action {
  // TODO Implement the examples
  // readonly oneLineExample: string

  execute(pkg: Package | undefined, parameters: string[]): Promise<void>;
  executeShellTokens?(pkg: Package | undefined, tokens: ShellToken[]): Promise<void>;
}
