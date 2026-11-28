import { parseArgs as stdParseArgs, type ParseOptions } from "@std/cli/parse-args";

export interface ParseArgsOptions {
  stringOnce?: string[];
  stringMany?: string[];
  boolean?: string[];
  /**
   * When true (default), stops parsing options at the first non-option positional argument.
   * Preserve `true` for wrappers/actions whose positional values may begin with `-` (e.g.
   * global CLI dispatch, `levainShell`, `setEnv`, `assertContains`, `jsonSet`, `propertySet`).
   * Pass `false` for commands/actions that accept flags after positional arguments.
   */
  stopEarly?: boolean;
}

export function parseArgs(pArgs: string[], optsDef?: ParseArgsOptions): any {
  const stringOpts: string[] = [];
  const collectOpts: string[] = [];

  if (optsDef?.stringOnce) {
    for (const v of optsDef.stringOnce) {
      stringOpts.push(v);
      // Collecting stringOnce options delegates duplicate detection (--opt a --opt=b,
      // stopEarly, and `--` handling) directly to @std/cli/parse-args.
      collectOpts.push(v);
    }
  }

  if (optsDef?.stringMany) {
    for (const v of optsDef.stringMany) {
      stringOpts.push(v);
      collectOpts.push(v);
    }
  }

  const opts: ParseOptions = {
    stopEarly: optsDef?.stopEarly ?? true,
    unknown: (v: string) => {
      if (v.startsWith("-")) {
        throw new Error("ERROR: Unknown option " + v);
      }

      return true;
    },
  };

  if (stringOpts.length > 0) {
    opts.string = stringOpts;
    opts.collect = collectOpts;
  }

  if (optsDef?.boolean) {
    opts.boolean = optsDef.boolean;
  }

  const args = normalizeArgs(pArgs);
  const myArgs: Record<string, any> = stdParseArgs(args, opts);

  if (optsDef?.stringOnce) {
    for (const key of optsDef.stringOnce) {
      const value = myArgs[key];
      if (Array.isArray(value)) {
        if (value.length > 1) {
          throw new Error(`Use option --${key} only once`);
        }
        if (value.length === 1) {
          myArgs[key] = value[0];
        } else {
          delete myArgs[key];
        }
      }
    }
  }

  if (optsDef?.stringMany) {
    for (const key of optsDef.stringMany) {
      const value = myArgs[key];
      if (typeof value === "string") {
        myArgs[key] = [value];
      } else if (Array.isArray(value) && value.length === 0) {
        delete myArgs[key];
      }
    }
  }

  return myArgs;
}

/**
 * Single-pass tokenizer for declarative YAML action lines.
 *
 * Splits on unquoted whitespace and strips surrounding double quotes while
 * keeping backslashes literal (required for Windows file paths such as `"C:\tools\app"`
 * and regexes in recipes). Preserves intentional whitespace and explicit empty quotes
 * (`--with=""`).
 */
export function tokenizeArgs(cmdline: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;
  let varExprDepth = 0;
  let hasToken = false;

  for (let i = 0; i < cmdline.length; i++) {
    const ch = cmdline[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
      hasToken = true;
      continue;
    }

    // Keep spaces inside `${var | filter}` (including nested `${a_${b} | urlEncode}`) intact when unquoted
    if (!inQuotes && ch === "$" && cmdline[i + 1] === "{" && cmdline.indexOf("}", i + 2) !== -1) {
      varExprDepth++;
      current += "${";
      hasToken = true;
      i++;
      continue;
    }

    if (!inQuotes && varExprDepth > 0 && ch === "}") {
      varExprDepth--;
      current += ch;
      hasToken = true;
      continue;
    }

    if (!inQuotes && varExprDepth === 0 && /\s/.test(ch)) {
      if (hasToken) {
        tokens.push(current);
        current = "";
        hasToken = false;
      }
      continue;
    }

    current += ch;
    hasToken = true;
  }

  if (inQuotes) {
    throw new Error(`Quote mismatch - ${cmdline}`);
  }

  if (hasToken) {
    tokens.push(current);
  }

  return tokens;
}

export interface ShellToken {
  value: string;
  isOperator: boolean;
  precededBySpace: boolean;
}

const MULTI_CHAR_SHELL_OPERATORS = ["2>&1", "1>&2", "2>>", "1>>", "2>", "1>", "||", "&&", ">>"];
const SINGLE_CHAR_SHELL_OPERATORS = new Set(["|", "&", ">", "<", "(", ")"]);

export function isShellOperatorToken(value: string): boolean {
  return MULTI_CHAR_SHELL_OPERATORS.includes(value) || SINGLE_CHAR_SHELL_OPERATORS.has(value);
}

function matchShellOperator(cmdline: string, index: number, insideToken: boolean): string | undefined {
  for (const op of MULTI_CHAR_SHELL_OPERATORS) {
    // Handle-prefixed redirects (2>, 2>>, 2>&1, 1>, 1>>, 1>&2) only match at a token
    // boundary so `foo2>bar` splits as `foo2` + `>` + `bar`.
    if ((op[0] === "1" || op[0] === "2") && insideToken) {
      continue;
    }
    if (cmdline.startsWith(op, index)) {
      return op;
    }
  }
  const ch = cmdline[index];
  if (SINGLE_CHAR_SHELL_OPERATORS.has(ch)) {
    return ch;
  }
  return undefined;
}

/**
 * Shell-aware tokenizer for `levainShell` recipe lines.
 *
 * Splits on unquoted whitespace AND unquoted shell operators (`|`, `||`, `&`, `&&`,
 * `>`, `>>`, `<`, `2>`, `2>>`, `2>&1`, `1>`, `1>>`, `1>&2`, `(`, `)`) outside `${...}`
 * expressions, preserving whether whitespace preceded each token so cmd.exe pipelines
 * like `echo ${levain.password}| cntlm ...` never add trailing spaces or swallow operators.
 */
export function tokenizeShellArgs(cmdline: string): ShellToken[] {
  const tokens: ShellToken[] = [];
  let current = "";
  let inQuotes = false;
  let varExprDepth = 0;
  let hasToken = false;
  let tokenPrecededBySpace = true;
  let sawSpaceSinceLastEmit = true;

  const flushCurrent = () => {
    if (hasToken) {
      tokens.push({
        value: current,
        isOperator: false,
        precededBySpace: tokenPrecededBySpace,
      });
      current = "";
      hasToken = false;
      sawSpaceSinceLastEmit = false;
    }
  };

  for (let i = 0; i < cmdline.length; i++) {
    const ch = cmdline[i];

    if (ch === '"') {
      if (!hasToken) {
        tokenPrecededBySpace = sawSpaceSinceLastEmit;
      }
      inQuotes = !inQuotes;
      hasToken = true;
      continue;
    }

    // Keep `${var | filter}` (including nested `${a_${b} | urlEncode}`) intact when unquoted
    if (!inQuotes && ch === "$" && cmdline[i + 1] === "{" && cmdline.indexOf("}", i + 2) !== -1) {
      if (!hasToken) {
        tokenPrecededBySpace = sawSpaceSinceLastEmit;
      }
      varExprDepth++;
      current += "${";
      hasToken = true;
      i++;
      continue;
    }

    if (!inQuotes && varExprDepth > 0 && ch === "}") {
      varExprDepth--;
      current += ch;
      hasToken = true;
      continue;
    }

    if (!inQuotes && varExprDepth === 0) {
      if (/\s/.test(ch)) {
        flushCurrent();
        sawSpaceSinceLastEmit = true;
        continue;
      }

      const op = matchShellOperator(cmdline, i, hasToken);
      if (op) {
        flushCurrent();
        tokens.push({
          value: op,
          isOperator: true,
          precededBySpace: sawSpaceSinceLastEmit,
        });
        sawSpaceSinceLastEmit = false;
        i += op.length - 1;
        continue;
      }
    }

    if (!hasToken) {
      tokenPrecededBySpace = sawSpaceSinceLastEmit;
    }
    current += ch;
    hasToken = true;
  }

  if (inQuotes) {
    throw new Error(`Quote mismatch - ${cmdline}`);
  }

  flushCurrent();
  return tokens;
}

/**
 * Backward-compatible wrapper for callers passing pre-split whitespace tokens.
 */
export function handleQuotes(args: string[]): string[] {
  if (!args || args.length === 0) {
    return args;
  }

  return tokenizeArgs(args.join(" "));
}

function normalizeArgs(args: string[]): string[] {
  return args.filter((item) => item !== undefined && item !== null && item.length > 0);
}
