import { assertEquals, assertThrows } from "@std/assert";

import { handleQuotes, parseArgs, tokenizeArgs } from "./parse_args.ts";

Deno.test("should parse args", () => {
  const args = parseArgs([
    "firstArg",
    "secondArg",
  ]);

  assertEquals(args._.length, 2);
  assertEquals(args._[0], "firstArg");
  assertEquals(args._[1], "secondArg");
});

Deno.test("should parse boolean option", () => {
  const args = parseArgs([
    "--likeChocolate",
    "true",
  ], {
    boolean: [
      "likeChocolate",
    ],
  });

  assertEquals(args._.length, 0);
  assertEquals(args.likeChocolate, true);
});

Deno.test("should throw exception on unknown option", () => {
  assertThrows(
    () => {
      parseArgs([
        "--404",
        "true",
      ], {
        boolean: [
          "likeChocolate",
        ],
      });
    },
    Error,
    "ERROR: Unknown option --404",
  );
});

Deno.test("should parse stringOnce option", () => {
  const args = parseArgs(["--stringOption", "firstOption"], {
    stringOnce: [
      "stringOption",
    ],
  });

  assertEquals(args._.length, 0);
  assertEquals(args.stringOption, "firstOption");
});

Deno.test("should use stringOnce option only once", () => {
  assertThrows(
    () => {
      parseArgs(["--stringOption", "firstOption", "--stringOption", "secondOption"], {
        stringOnce: [
          "stringOption",
        ],
      });
    },
    Error,
    "Use option --stringOption only once",
  );
});

Deno.test("should reject duplicate stringOnce using --opt=val syntax and mixed forms", () => {
  assertThrows(
    () => {
      parseArgs(["--shell=cmd", "--shell=bash"], {
        stringOnce: ["shell"],
      });
    },
    Error,
    "Use option --shell only once",
  );

  assertThrows(
    () => {
      parseArgs(["--shell", "cmd", "--shell=bash"], {
        stringOnce: ["shell"],
      });
    },
    Error,
    "Use option --shell only once",
  );
});

Deno.test("should respect stopEarly and -- when checking stringOnce duplicates", () => {
  // With default stopEarly=true, child command flags after first positional are left in `_`
  const shellArgs = parseArgs(["--saveVar=OUT", "tool", "--saveVar=CHILD"], {
    stringOnce: ["saveVar"],
  });
  assertEquals(shellArgs.saveVar, "OUT");
  assertEquals(shellArgs._, ["tool", "--saveVar=CHILD"]);

  // After `--`, flags are treated as positional operands
  const dashed = parseArgs(["--saveVar=OUT", "--", "--saveVar=LITERAL"], {
    stringOnce: ["saveVar"],
    stopEarly: false,
  });
  assertEquals(dashed.saveVar, "OUT");
  assertEquals(dashed._, ["--saveVar=LITERAL"]);
});

Deno.test("should support stopEarly=false for flags after positional arguments", () => {
  const args = parseArgs(["pkgA", "--force", "pkgB"], {
    boolean: ["force"],
    stopEarly: false,
  });

  assertEquals(args.force, true);
  assertEquals(args._, ["pkgA", "pkgB"]);
});

Deno.test("should preserve flag-like positional values when stopEarly is true", () => {
  const args = parseArgs(["NODE_OPTIONS", "--max_old_space_size=4096"], {
    boolean: ["permanent"],
    stopEarly: true,
  });

  assertEquals(args.permanent, false);
  assertEquals(args._, ["NODE_OPTIONS", "--max_old_space_size=4096"]);
});

Deno.test("should parse stringMany option", () => {
  const args = parseArgs([
    "--nephew",
    "Huey",
    "--nephew",
    "Dewey",
    "--nephew",
    "Louie",
  ], {
    stringMany: [
      "nephew",
    ],
  });

  assertEquals(args._.length, 0);
  assertEquals(args.nephew, ["Huey", "Dewey", "Louie"]);
});

Deno.test("should parse stringMany option without values", () => {
  const args = parseArgs([], {
    stringMany: [
      "nephew",
    ],
  });

  assertEquals(args._.length, 0);
  assertEquals(args.nephew, undefined);
});

Deno.test("should preserve empty string values in --opt= and leading/trailing spaces", () => {
  const args = parseArgs(["--replace=/foo/g", "--with=", "--with=  padded  ", "src", "dst"], {
    stringMany: ["replace", "with"],
  });

  assertEquals(args.replace, ["/foo/g"]);
  assertEquals(args.with, ["", "  padded  "]);
  assertEquals(args._, ["src", "dst"]);
});

Deno.test("should parse arg and option", () => {
  const args = parseArgs(["--myOption", "yes", "firstArg"], {
    stringOnce: [
      "myOption",
    ],
  });

  assertEquals(args._, ["firstArg"]);
  assertEquals(args.myOption, "yes");
});

Deno.test("should ignore multiple empty string elements", () => {
  const args = parseArgs(["--myOption", "", "", "", "yes", "", "", "", "firstArg", "", "", ""], {
    stringOnce: [
      "myOption",
    ],
  });

  assertEquals(args._.length, 1);
  assertEquals(args._, ["firstArg"]);
  assertEquals(args.myOption, "yes");
});

Deno.test("tokenizeArgs should split unquoted whitespace, preserve quotes, and keep Windows backslashes literal", () => {
  assertEquals(tokenizeArgs("  copy   --verbose   a.txt\tb.txt  "), ["copy", "--verbose", "a.txt", "b.txt"]);
  assertEquals(
    tokenizeArgs('template --replace=/a/g --with="hello   world" --with="" "C:\\tools\\app\\" dst.txt'),
    ["template", "--replace=/a/g", "--with=hello   world", "--with=", "C:\\tools\\app\\", "dst.txt"],
  );
  assertEquals(
    tokenizeArgs('echo "first part"-"second part"'),
    ["echo", "first part-second part"],
  );
  assertEquals(tokenizeArgs("   \t\n  "), []);
});

Deno.test("tokenizeArgs should throw on unmatched double quote", () => {
  assertThrows(
    () => tokenizeArgs('echo "unclosed quote'),
    Error,
    "Quote mismatch",
  );
});

Deno.test("handleQuotes should remain backward compatible for pre-split tokens", () => {
  assertEquals(handleQuotes(['--name="Open', 'Shell"', "arg"]), ["--name=Open Shell", "arg"]);
  assertEquals(handleQuotes([]), []);
});
