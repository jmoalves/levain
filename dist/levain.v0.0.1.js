// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.

// This is a specialised implementation of a System module loader.

"use strict";

// @ts-nocheck
/* eslint-disable */
let System, __instantiateAsync, __instantiate;

(() => {
  const r = new Map();

  System = {
    register(id, d, f) {
      r.set(id, { d, f, exp: {} });
    },
  };

  async function dI(mid, src) {
    let id = mid.replace(/\.\w+$/i, "");
    if (id.includes("./")) {
      const [o, ...ia] = id.split("/").reverse(),
        [, ...sa] = src.split("/").reverse(),
        oa = [o];
      let s = 0,
        i;
      while ((i = ia.shift())) {
        if (i === "..") s++;
        else if (i === ".") break;
        else oa.push(i);
      }
      if (s < sa.length) oa.push(...sa.slice(s));
      id = oa.reverse().join("/");
    }
    return r.has(id) ? gExpA(id) : import(mid);
  }

  function gC(id, main) {
    return {
      id,
      import: (m) => dI(m, id),
      meta: { url: id, main },
    };
  }

  function gE(exp) {
    return (id, v) => {
      v = typeof id === "string" ? { [id]: v } : id;
      for (const [id, value] of Object.entries(v)) {
        Object.defineProperty(exp, id, {
          value,
          writable: true,
          enumerable: true,
        });
      }
    };
  }

  function rF(main) {
    for (const [id, m] of r.entries()) {
      const { f, exp } = m;
      const { execute: e, setters: s } = f(gE(exp), gC(id, id === main));
      delete m.f;
      m.e = e;
      m.s = s;
    }
  }

  async function gExpA(id) {
    if (!r.has(id)) return;
    const m = r.get(id);
    if (m.s) {
      const { d, e, s } = m;
      delete m.s;
      delete m.e;
      for (let i = 0; i < s.length; i++) s[i](await gExpA(d[i]));
      const r = e();
      if (r) await r;
    }
    return m.exp;
  }

  function gExp(id) {
    if (!r.has(id)) return;
    const m = r.get(id);
    if (m.s) {
      const { d, e, s } = m;
      delete m.s;
      delete m.e;
      for (let i = 0; i < s.length; i++) s[i](gExp(d[i]));
      e();
    }
    return m.exp;
  }

  __instantiateAsync = async (m) => {
    System = __instantiateAsync = __instantiate = undefined;
    rF(m);
    return gExpA(m);
  };

  __instantiate = (m) => {
    System = __instantiateAsync = __instantiate = undefined;
    rF(m);
    return gExp(m);
  };
})();

System.register(
  "file:///C:/bndes-java-env.kit/bootstrap/levain/lib/command",
  [],
  function (exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    return {
      setters: [],
      execute: function () {
      },
    };
  },
);
System.register(
  "https://deno.land/std/path/interface",
  [],
  function (exports_2, context_2) {
    "use strict";
    var __moduleName = context_2 && context_2.id;
    return {
      setters: [],
      execute: function () {
      },
    };
  },
);
// Copyright the Browserify authors. MIT License.
// Ported from https://github.com/browserify/path-browserify/
System.register(
  "https://deno.land/std/path/_constants",
  [],
  function (exports_3, context_3) {
    "use strict";
    var build,
      CHAR_UPPERCASE_A,
      CHAR_LOWERCASE_A,
      CHAR_UPPERCASE_Z,
      CHAR_LOWERCASE_Z,
      CHAR_DOT,
      CHAR_FORWARD_SLASH,
      CHAR_BACKWARD_SLASH,
      CHAR_VERTICAL_LINE,
      CHAR_COLON,
      CHAR_QUESTION_MARK,
      CHAR_UNDERSCORE,
      CHAR_LINE_FEED,
      CHAR_CARRIAGE_RETURN,
      CHAR_TAB,
      CHAR_FORM_FEED,
      CHAR_EXCLAMATION_MARK,
      CHAR_HASH,
      CHAR_SPACE,
      CHAR_NO_BREAK_SPACE,
      CHAR_ZERO_WIDTH_NOBREAK_SPACE,
      CHAR_LEFT_SQUARE_BRACKET,
      CHAR_RIGHT_SQUARE_BRACKET,
      CHAR_LEFT_ANGLE_BRACKET,
      CHAR_RIGHT_ANGLE_BRACKET,
      CHAR_LEFT_CURLY_BRACKET,
      CHAR_RIGHT_CURLY_BRACKET,
      CHAR_HYPHEN_MINUS,
      CHAR_PLUS,
      CHAR_DOUBLE_QUOTE,
      CHAR_SINGLE_QUOTE,
      CHAR_PERCENT,
      CHAR_SEMICOLON,
      CHAR_CIRCUMFLEX_ACCENT,
      CHAR_GRAVE_ACCENT,
      CHAR_AT,
      CHAR_AMPERSAND,
      CHAR_EQUAL,
      CHAR_0,
      CHAR_9,
      isWindows,
      SEP,
      SEP_PATTERN;
    var __moduleName = context_3 && context_3.id;
    return {
      setters: [],
      execute: function () {
        build = Deno.build;
        // Alphabet chars.
        exports_3("CHAR_UPPERCASE_A", CHAR_UPPERCASE_A = 65); /* A */
        exports_3("CHAR_LOWERCASE_A", CHAR_LOWERCASE_A = 97); /* a */
        exports_3("CHAR_UPPERCASE_Z", CHAR_UPPERCASE_Z = 90); /* Z */
        exports_3("CHAR_LOWERCASE_Z", CHAR_LOWERCASE_Z = 122); /* z */
        // Non-alphabetic chars.
        exports_3("CHAR_DOT", CHAR_DOT = 46); /* . */
        exports_3("CHAR_FORWARD_SLASH", CHAR_FORWARD_SLASH = 47); /* / */
        exports_3("CHAR_BACKWARD_SLASH", CHAR_BACKWARD_SLASH = 92); /* \ */
        exports_3("CHAR_VERTICAL_LINE", CHAR_VERTICAL_LINE = 124); /* | */
        exports_3("CHAR_COLON", CHAR_COLON = 58); /* : */
        exports_3("CHAR_QUESTION_MARK", CHAR_QUESTION_MARK = 63); /* ? */
        exports_3("CHAR_UNDERSCORE", CHAR_UNDERSCORE = 95); /* _ */
        exports_3("CHAR_LINE_FEED", CHAR_LINE_FEED = 10); /* \n */
        exports_3("CHAR_CARRIAGE_RETURN", CHAR_CARRIAGE_RETURN = 13); /* \r */
        exports_3("CHAR_TAB", CHAR_TAB = 9); /* \t */
        exports_3("CHAR_FORM_FEED", CHAR_FORM_FEED = 12); /* \f */
        exports_3("CHAR_EXCLAMATION_MARK", CHAR_EXCLAMATION_MARK = 33); /* ! */
        exports_3("CHAR_HASH", CHAR_HASH = 35); /* # */
        exports_3("CHAR_SPACE", CHAR_SPACE = 32); /*   */
        exports_3(
          "CHAR_NO_BREAK_SPACE",
          CHAR_NO_BREAK_SPACE = 160,
        ); /* \u00A0 */
        exports_3(
          "CHAR_ZERO_WIDTH_NOBREAK_SPACE",
          CHAR_ZERO_WIDTH_NOBREAK_SPACE = 65279,
        ); /* \uFEFF */
        exports_3(
          "CHAR_LEFT_SQUARE_BRACKET",
          CHAR_LEFT_SQUARE_BRACKET = 91,
        ); /* [ */
        exports_3(
          "CHAR_RIGHT_SQUARE_BRACKET",
          CHAR_RIGHT_SQUARE_BRACKET = 93,
        ); /* ] */
        exports_3(
          "CHAR_LEFT_ANGLE_BRACKET",
          CHAR_LEFT_ANGLE_BRACKET = 60,
        ); /* < */
        exports_3(
          "CHAR_RIGHT_ANGLE_BRACKET",
          CHAR_RIGHT_ANGLE_BRACKET = 62,
        ); /* > */
        exports_3(
          "CHAR_LEFT_CURLY_BRACKET",
          CHAR_LEFT_CURLY_BRACKET = 123,
        ); /* { */
        exports_3(
          "CHAR_RIGHT_CURLY_BRACKET",
          CHAR_RIGHT_CURLY_BRACKET = 125,
        ); /* } */
        exports_3("CHAR_HYPHEN_MINUS", CHAR_HYPHEN_MINUS = 45); /* - */
        exports_3("CHAR_PLUS", CHAR_PLUS = 43); /* + */
        exports_3("CHAR_DOUBLE_QUOTE", CHAR_DOUBLE_QUOTE = 34); /* " */
        exports_3("CHAR_SINGLE_QUOTE", CHAR_SINGLE_QUOTE = 39); /* ' */
        exports_3("CHAR_PERCENT", CHAR_PERCENT = 37); /* % */
        exports_3("CHAR_SEMICOLON", CHAR_SEMICOLON = 59); /* ; */
        exports_3(
          "CHAR_CIRCUMFLEX_ACCENT",
          CHAR_CIRCUMFLEX_ACCENT = 94,
        ); /* ^ */
        exports_3("CHAR_GRAVE_ACCENT", CHAR_GRAVE_ACCENT = 96); /* ` */
        exports_3("CHAR_AT", CHAR_AT = 64); /* @ */
        exports_3("CHAR_AMPERSAND", CHAR_AMPERSAND = 38); /* & */
        exports_3("CHAR_EQUAL", CHAR_EQUAL = 61); /* = */
        // Digits
        exports_3("CHAR_0", CHAR_0 = 48); /* 0 */
        exports_3("CHAR_9", CHAR_9 = 57); /* 9 */
        isWindows = build.os == "windows";
        exports_3("SEP", SEP = isWindows ? "\\" : "/");
        exports_3("SEP_PATTERN", SEP_PATTERN = isWindows ? /[\\/]+/ : /\/+/);
      },
    };
  },
);
// Copyright the Browserify authors. MIT License.
// Ported from https://github.com/browserify/path-browserify/
System.register(
  "https://deno.land/std/path/_util",
  ["https://deno.land/std/path/_constants"],
  function (exports_4, context_4) {
    "use strict";
    var _constants_ts_1;
    var __moduleName = context_4 && context_4.id;
    function assertPath(path) {
      if (typeof path !== "string") {
        throw new TypeError(
          `Path must be a string. Received ${JSON.stringify(path)}`,
        );
      }
    }
    exports_4("assertPath", assertPath);
    function isPosixPathSeparator(code) {
      return code === _constants_ts_1.CHAR_FORWARD_SLASH;
    }
    exports_4("isPosixPathSeparator", isPosixPathSeparator);
    function isPathSeparator(code) {
      return isPosixPathSeparator(code) ||
        code === _constants_ts_1.CHAR_BACKWARD_SLASH;
    }
    exports_4("isPathSeparator", isPathSeparator);
    function isWindowsDeviceRoot(code) {
      return ((code >= _constants_ts_1.CHAR_LOWERCASE_A &&
        code <= _constants_ts_1.CHAR_LOWERCASE_Z) ||
        (code >= _constants_ts_1.CHAR_UPPERCASE_A &&
          code <= _constants_ts_1.CHAR_UPPERCASE_Z));
    }
    exports_4("isWindowsDeviceRoot", isWindowsDeviceRoot);
    // Resolves . and .. elements in a path with directory names
    function normalizeString(path, allowAboveRoot, separator, isPathSeparator) {
      let res = "";
      let lastSegmentLength = 0;
      let lastSlash = -1;
      let dots = 0;
      let code;
      for (let i = 0, len = path.length; i <= len; ++i) {
        if (i < len) {
          code = path.charCodeAt(i);
        } else if (isPathSeparator(code)) {
          break;
        } else {
          code = _constants_ts_1.CHAR_FORWARD_SLASH;
        }
        if (isPathSeparator(code)) {
          if (lastSlash === i - 1 || dots === 1) {
            // NOOP
          } else if (lastSlash !== i - 1 && dots === 2) {
            if (
              res.length < 2 ||
              lastSegmentLength !== 2 ||
              res.charCodeAt(res.length - 1) !== _constants_ts_1.CHAR_DOT ||
              res.charCodeAt(res.length - 2) !== _constants_ts_1.CHAR_DOT
            ) {
              if (res.length > 2) {
                const lastSlashIndex = res.lastIndexOf(separator);
                if (lastSlashIndex === -1) {
                  res = "";
                  lastSegmentLength = 0;
                } else {
                  res = res.slice(0, lastSlashIndex);
                  lastSegmentLength = res.length - 1 -
                    res.lastIndexOf(separator);
                }
                lastSlash = i;
                dots = 0;
                continue;
              } else if (res.length === 2 || res.length === 1) {
                res = "";
                lastSegmentLength = 0;
                lastSlash = i;
                dots = 0;
                continue;
              }
            }
            if (allowAboveRoot) {
              if (res.length > 0) {
                res += `${separator}..`;
              } else {
                res = "..";
              }
              lastSegmentLength = 2;
            }
          } else {
            if (res.length > 0) {
              res += separator + path.slice(lastSlash + 1, i);
            } else {
              res = path.slice(lastSlash + 1, i);
            }
            lastSegmentLength = i - lastSlash - 1;
          }
          lastSlash = i;
          dots = 0;
        } else if (code === _constants_ts_1.CHAR_DOT && dots !== -1) {
          ++dots;
        } else {
          dots = -1;
        }
      }
      return res;
    }
    exports_4("normalizeString", normalizeString);
    function _format(sep, pathObject) {
      const dir = pathObject.dir || pathObject.root;
      const base = pathObject.base ||
        (pathObject.name || "") + (pathObject.ext || "");
      if (!dir) {
        return base;
      }
      if (dir === pathObject.root) {
        return dir + base;
      }
      return dir + sep + base;
    }
    exports_4("_format", _format);
    return {
      setters: [
        function (_constants_ts_1_1) {
          _constants_ts_1 = _constants_ts_1_1;
        },
      ],
      execute: function () {
      },
    };
  },
);
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
/** A module to print ANSI terminal colors. Inspired by chalk, kleur, and colors
 * on npm.
 *
 * ```
 * import { bgBlue, red, bold } from "https://deno.land/std/fmt/colors.ts";
 * console.log(bgBlue(red(bold("Hello world!"))));
 * ```
 *
 * This module supports `NO_COLOR` environmental variable disabling any coloring
 * if `NO_COLOR` is set.
 *
 * This module is browser compatible. */
System.register(
  "https://deno.land/std/fmt/colors",
  [],
  function (exports_5, context_5) {
    "use strict";
    var noColor, enabled, ANSI_PATTERN;
    var __moduleName = context_5 && context_5.id;
    function setColorEnabled(value) {
      if (noColor) {
        return;
      }
      enabled = value;
    }
    exports_5("setColorEnabled", setColorEnabled);
    function getColorEnabled() {
      return enabled;
    }
    exports_5("getColorEnabled", getColorEnabled);
    function code(open, close) {
      return {
        open: `\x1b[${open.join(";")}m`,
        close: `\x1b[${close}m`,
        regexp: new RegExp(`\\x1b\\[${close}m`, "g"),
      };
    }
    function run(str, code) {
      return enabled
        ? `${code.open}${str.replace(code.regexp, code.open)}${code.close}`
        : str;
    }
    function reset(str) {
      return run(str, code([0], 0));
    }
    exports_5("reset", reset);
    function bold(str) {
      return run(str, code([1], 22));
    }
    exports_5("bold", bold);
    function dim(str) {
      return run(str, code([2], 22));
    }
    exports_5("dim", dim);
    function italic(str) {
      return run(str, code([3], 23));
    }
    exports_5("italic", italic);
    function underline(str) {
      return run(str, code([4], 24));
    }
    exports_5("underline", underline);
    function inverse(str) {
      return run(str, code([7], 27));
    }
    exports_5("inverse", inverse);
    function hidden(str) {
      return run(str, code([8], 28));
    }
    exports_5("hidden", hidden);
    function strikethrough(str) {
      return run(str, code([9], 29));
    }
    exports_5("strikethrough", strikethrough);
    function black(str) {
      return run(str, code([30], 39));
    }
    exports_5("black", black);
    function red(str) {
      return run(str, code([31], 39));
    }
    exports_5("red", red);
    function green(str) {
      return run(str, code([32], 39));
    }
    exports_5("green", green);
    function yellow(str) {
      return run(str, code([33], 39));
    }
    exports_5("yellow", yellow);
    function blue(str) {
      return run(str, code([34], 39));
    }
    exports_5("blue", blue);
    function magenta(str) {
      return run(str, code([35], 39));
    }
    exports_5("magenta", magenta);
    function cyan(str) {
      return run(str, code([36], 39));
    }
    exports_5("cyan", cyan);
    function white(str) {
      return run(str, code([37], 39));
    }
    exports_5("white", white);
    function gray(str) {
      return run(str, code([90], 39));
    }
    exports_5("gray", gray);
    function bgBlack(str) {
      return run(str, code([40], 49));
    }
    exports_5("bgBlack", bgBlack);
    function bgRed(str) {
      return run(str, code([41], 49));
    }
    exports_5("bgRed", bgRed);
    function bgGreen(str) {
      return run(str, code([42], 49));
    }
    exports_5("bgGreen", bgGreen);
    function bgYellow(str) {
      return run(str, code([43], 49));
    }
    exports_5("bgYellow", bgYellow);
    function bgBlue(str) {
      return run(str, code([44], 49));
    }
    exports_5("bgBlue", bgBlue);
    function bgMagenta(str) {
      return run(str, code([45], 49));
    }
    exports_5("bgMagenta", bgMagenta);
    function bgCyan(str) {
      return run(str, code([46], 49));
    }
    exports_5("bgCyan", bgCyan);
    function bgWhite(str) {
      return run(str, code([47], 49));
    }
    exports_5("bgWhite", bgWhite);
    /* Special Color Sequences */
    function clampAndTruncate(n, max = 255, min = 0) {
      return Math.trunc(Math.max(Math.min(n, max), min));
    }
    /** Set text color using paletted 8bit colors.
     * https://en.wikipedia.org/wiki/ANSI_escape_code#8-bit */
    function rgb8(str, color) {
      return run(str, code([38, 5, clampAndTruncate(color)], 39));
    }
    exports_5("rgb8", rgb8);
    /** Set background color using paletted 8bit colors.
     * https://en.wikipedia.org/wiki/ANSI_escape_code#8-bit */
    function bgRgb8(str, color) {
      return run(str, code([48, 5, clampAndTruncate(color)], 49));
    }
    exports_5("bgRgb8", bgRgb8);
    /** Set text color using 24bit rgb.
     * `color` can be a number in range `0x000000` to `0xffffff` or
     * an `Rgb`.
     *
     * To produce the color magenta:
     *
     *      rgba24("foo", 0xff00ff);
     *      rgba24("foo", {r: 255, g: 0, b: 255});
     */
    function rgb24(str, color) {
      if (typeof color === "number") {
        return run(
          str,
          code(
            [38, 2, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff],
            39,
          ),
        );
      }
      return run(
        str,
        code([
          38,
          2,
          clampAndTruncate(color.r),
          clampAndTruncate(color.g),
          clampAndTruncate(color.b),
        ], 39),
      );
    }
    exports_5("rgb24", rgb24);
    /** Set background color using 24bit rgb.
     * `color` can be a number in range `0x000000` to `0xffffff` or
     * an `Rgb`.
     *
     * To produce the color magenta:
     *
     *      bgRgba24("foo", 0xff00ff);
     *      bgRgba24("foo", {r: 255, g: 0, b: 255});
     */
    function bgRgb24(str, color) {
      if (typeof color === "number") {
        return run(
          str,
          code(
            [48, 2, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff],
            49,
          ),
        );
      }
      return run(
        str,
        code([
          48,
          2,
          clampAndTruncate(color.r),
          clampAndTruncate(color.g),
          clampAndTruncate(color.b),
        ], 49),
      );
    }
    exports_5("bgRgb24", bgRgb24);
    function stripColor(string) {
      return string.replace(ANSI_PATTERN, "");
    }
    exports_5("stripColor", stripColor);
    return {
      setters: [],
      execute: function () {
        noColor = globalThis.Deno?.noColor ?? true;
        enabled = !noColor;
        // https://github.com/chalk/ansi-regex/blob/2b56fb0c7a07108e5b54241e8faec160d393aedb/index.js
        ANSI_PATTERN = new RegExp(
          [
            "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
            "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))",
          ].join("|"),
          "g",
        );
      },
    };
  },
);
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
/** This module is browser compatible. */
System.register(
  "https://deno.land/std/testing/diff",
  [],
  function (exports_6, context_6) {
    "use strict";
    var DiffType, REMOVED, COMMON, ADDED;
    var __moduleName = context_6 && context_6.id;
    function createCommon(A, B, reverse) {
      const common = [];
      if (A.length === 0 || B.length === 0) {
        return [];
      }
      for (let i = 0; i < Math.min(A.length, B.length); i += 1) {
        if (
          A[reverse ? A.length - i - 1 : i] ===
            B[reverse ? B.length - i - 1 : i]
        ) {
          common.push(A[reverse ? A.length - i - 1 : i]);
        } else {
          return common;
        }
      }
      return common;
    }
    function diff(A, B) {
      const prefixCommon = createCommon(A, B);
      const suffixCommon = createCommon(
        A.slice(prefixCommon.length),
        B.slice(prefixCommon.length),
        true,
      ).reverse();
      A = suffixCommon.length
        ? A.slice(prefixCommon.length, -suffixCommon.length)
        : A.slice(prefixCommon.length);
      B = suffixCommon.length
        ? B.slice(prefixCommon.length, -suffixCommon.length)
        : B.slice(prefixCommon.length);
      const swapped = B.length > A.length;
      [A, B] = swapped ? [B, A] : [A, B];
      const M = A.length;
      const N = B.length;
      if (!M && !N && !suffixCommon.length && !prefixCommon.length) {
        return [];
      }
      if (!N) {
        return [
          ...prefixCommon.map((c) => ({ type: DiffType.common, value: c })),
          ...A.map((a) => ({
            type: swapped ? DiffType.added : DiffType.removed,
            value: a,
          })),
          ...suffixCommon.map((c) => ({ type: DiffType.common, value: c })),
        ];
      }
      const offset = N;
      const delta = M - N;
      const size = M + N + 1;
      const fp = new Array(size).fill({ y: -1 });
      /**
         * INFO:
         * This buffer is used to save memory and improve performance.
         * The first half is used to save route and last half is used to save diff
         * type.
         * This is because, when I kept new uint8array area to save type,performance
         * worsened.
         */
      const routes = new Uint32Array((M * N + size + 1) * 2);
      const diffTypesPtrOffset = routes.length / 2;
      let ptr = 0;
      let p = -1;
      function backTrace(A, B, current, swapped) {
        const M = A.length;
        const N = B.length;
        const result = [];
        let a = M - 1;
        let b = N - 1;
        let j = routes[current.id];
        let type = routes[current.id + diffTypesPtrOffset];
        while (true) {
          if (!j && !type) {
            break;
          }
          const prev = j;
          if (type === REMOVED) {
            result.unshift({
              type: swapped ? DiffType.removed : DiffType.added,
              value: B[b],
            });
            b -= 1;
          } else if (type === ADDED) {
            result.unshift({
              type: swapped ? DiffType.added : DiffType.removed,
              value: A[a],
            });
            a -= 1;
          } else {
            result.unshift({ type: DiffType.common, value: A[a] });
            a -= 1;
            b -= 1;
          }
          j = routes[prev];
          type = routes[prev + diffTypesPtrOffset];
        }
        return result;
      }
      function createFP(slide, down, k, M) {
        if (slide && slide.y === -1 && down && down.y === -1) {
          return { y: 0, id: 0 };
        }
        if (
          (down && down.y === -1) ||
          k === M ||
          (slide && slide.y) > (down && down.y) + 1
        ) {
          const prev = slide.id;
          ptr++;
          routes[ptr] = prev;
          routes[ptr + diffTypesPtrOffset] = ADDED;
          return { y: slide.y, id: ptr };
        } else {
          const prev = down.id;
          ptr++;
          routes[ptr] = prev;
          routes[ptr + diffTypesPtrOffset] = REMOVED;
          return { y: down.y + 1, id: ptr };
        }
      }
      function snake(k, slide, down, _offset, A, B) {
        const M = A.length;
        const N = B.length;
        if (k < -N || M < k) {
          return { y: -1, id: -1 };
        }
        const fp = createFP(slide, down, k, M);
        while (fp.y + k < M && fp.y < N && A[fp.y + k] === B[fp.y]) {
          const prev = fp.id;
          ptr++;
          fp.id = ptr;
          fp.y += 1;
          routes[ptr] = prev;
          routes[ptr + diffTypesPtrOffset] = COMMON;
        }
        return fp;
      }
      while (fp[delta + offset].y < N) {
        p = p + 1;
        for (let k = -p; k < delta; ++k) {
          fp[k + offset] = snake(
            k,
            fp[k - 1 + offset],
            fp[k + 1 + offset],
            offset,
            A,
            B,
          );
        }
        for (let k = delta + p; k > delta; --k) {
          fp[k + offset] = snake(
            k,
            fp[k - 1 + offset],
            fp[k + 1 + offset],
            offset,
            A,
            B,
          );
        }
        fp[delta + offset] = snake(
          delta,
          fp[delta - 1 + offset],
          fp[delta + 1 + offset],
          offset,
          A,
          B,
        );
      }
      return [
        ...prefixCommon.map((c) => ({ type: DiffType.common, value: c })),
        ...backTrace(A, B, fp[delta + offset], swapped),
        ...suffixCommon.map((c) => ({ type: DiffType.common, value: c })),
      ];
    }
    exports_6("default", diff);
    return {
      setters: [],
      execute: function () {
        (function (DiffType) {
          DiffType["removed"] = "removed";
          DiffType["common"] = "common";
          DiffType["added"] = "added";
        })(DiffType || (DiffType = {}));
        exports_6("DiffType", DiffType);
        REMOVED = 1;
        COMMON = 2;
        ADDED = 3;
      },
    };
  },
);
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
/** This module is browser compatible. Do not rely on good formatting of values
 * for AssertionError messages in browsers. */
System.register(
  "https://deno.land/std/testing/asserts",
  ["https://deno.land/std/fmt/colors", "https://deno.land/std/testing/diff"],
  function (exports_7, context_7) {
    "use strict";
    var colors_ts_1, diff_ts_1, CAN_NOT_DISPLAY, AssertionError;
    var __moduleName = context_7 && context_7.id;
    function format(v) {
      let string = globalThis.Deno ? Deno.inspect(v) : String(v);
      if (typeof v == "string") {
        string = `"${string.replace(/(?=["\\])/g, "\\")}"`;
      }
      return string;
    }
    function createColor(diffType) {
      switch (diffType) {
        case diff_ts_1.DiffType.added:
          return (s) => colors_ts_1.green(colors_ts_1.bold(s));
        case diff_ts_1.DiffType.removed:
          return (s) => colors_ts_1.red(colors_ts_1.bold(s));
        default:
          return colors_ts_1.white;
      }
    }
    function createSign(diffType) {
      switch (diffType) {
        case diff_ts_1.DiffType.added:
          return "+   ";
        case diff_ts_1.DiffType.removed:
          return "-   ";
        default:
          return "    ";
      }
    }
    function buildMessage(diffResult) {
      const messages = [];
      messages.push("");
      messages.push("");
      messages.push(
        `    ${colors_ts_1.gray(colors_ts_1.bold("[Diff]"))} ${
          colors_ts_1.red(colors_ts_1.bold("Actual"))
        } / ${colors_ts_1.green(colors_ts_1.bold("Expected"))}`,
      );
      messages.push("");
      messages.push("");
      diffResult.forEach((result) => {
        const c = createColor(result.type);
        messages.push(c(`${createSign(result.type)}${result.value}`));
      });
      messages.push("");
      return messages;
    }
    function isKeyedCollection(x) {
      return [Symbol.iterator, "size"].every((k) => k in x);
    }
    function equal(c, d) {
      const seen = new Map();
      return (function compare(a, b) {
        // Have to render RegExp & Date for string comparison
        // unless it's mistreated as object
        if (
          a &&
          b &&
          ((a instanceof RegExp && b instanceof RegExp) ||
            (a instanceof Date && b instanceof Date))
        ) {
          return String(a) === String(b);
        }
        if (Object.is(a, b)) {
          return true;
        }
        if (a && typeof a === "object" && b && typeof b === "object") {
          if (seen.get(a) === b) {
            return true;
          }
          if (Object.keys(a || {}).length !== Object.keys(b || {}).length) {
            return false;
          }
          if (isKeyedCollection(a) && isKeyedCollection(b)) {
            if (a.size !== b.size) {
              return false;
            }
            let unmatchedEntries = a.size;
            for (const [aKey, aValue] of a.entries()) {
              for (const [bKey, bValue] of b.entries()) {
                /* Given that Map keys can be references, we need
                             * to ensure that they are also deeply equal */
                if (
                  (aKey === aValue && bKey === bValue && compare(aKey, bKey)) ||
                  (compare(aKey, bKey) && compare(aValue, bValue))
                ) {
                  unmatchedEntries--;
                }
              }
            }
            return unmatchedEntries === 0;
          }
          const merged = { ...a, ...b };
          for (const key in merged) {
            if (!compare(a && a[key], b && b[key])) {
              return false;
            }
          }
          seen.set(a, b);
          return true;
        }
        return false;
      })(c, d);
    }
    exports_7("equal", equal);
    /** Make an assertion, if not `true`, then throw. */
    function assert(expr, msg = "") {
      if (!expr) {
        throw new AssertionError(msg);
      }
    }
    exports_7("assert", assert);
    /**
     * Make an assertion that `actual` and `expected` are equal, deeply. If not
     * deeply equal, then throw.
     */
    function assertEquals(actual, expected, msg) {
      if (equal(actual, expected)) {
        return;
      }
      let message = "";
      const actualString = format(actual);
      const expectedString = format(expected);
      try {
        const diffResult = diff_ts_1.default(
          actualString.split("\n"),
          expectedString.split("\n"),
        );
        const diffMsg = buildMessage(diffResult).join("\n");
        message = `Values are not equal:\n${diffMsg}`;
      } catch (e) {
        message = `\n${colors_ts_1.red(CAN_NOT_DISPLAY)} + \n\n`;
      }
      if (msg) {
        message = msg;
      }
      throw new AssertionError(message);
    }
    exports_7("assertEquals", assertEquals);
    /**
     * Make an assertion that `actual` and `expected` are not equal, deeply.
     * If not then throw.
     */
    function assertNotEquals(actual, expected, msg) {
      if (!equal(actual, expected)) {
        return;
      }
      let actualString;
      let expectedString;
      try {
        actualString = String(actual);
      } catch (e) {
        actualString = "[Cannot display]";
      }
      try {
        expectedString = String(expected);
      } catch (e) {
        expectedString = "[Cannot display]";
      }
      if (!msg) {
        msg = `actual: ${actualString} expected: ${expectedString}`;
      }
      throw new AssertionError(msg);
    }
    exports_7("assertNotEquals", assertNotEquals);
    /**
     * Make an assertion that `actual` and `expected` are strictly equal.  If
     * not then throw.
     */
    function assertStrictEq(actual, expected, msg) {
      if (actual === expected) {
        return;
      }
      let message;
      if (msg) {
        message = msg;
      } else {
        const actualString = format(actual);
        const expectedString = format(expected);
        if (actualString === expectedString) {
          const withOffset = actualString
            .split("\n")
            .map((l) => `     ${l}`)
            .join("\n");
          message =
            `Values have the same structure but are not reference-equal:\n\n${
              colors_ts_1.red(withOffset)
            }\n`;
        } else {
          try {
            const diffResult = diff_ts_1.default(
              actualString.split("\n"),
              expectedString.split("\n"),
            );
            const diffMsg = buildMessage(diffResult).join("\n");
            message = `Values are not strictly equal:\n${diffMsg}`;
          } catch (e) {
            message = `\n${colors_ts_1.red(CAN_NOT_DISPLAY)} + \n\n`;
          }
        }
      }
      throw new AssertionError(message);
    }
    exports_7("assertStrictEq", assertStrictEq);
    /**
     * Make an assertion that actual contains expected. If not
     * then thrown.
     */
    function assertStrContains(actual, expected, msg) {
      if (!actual.includes(expected)) {
        if (!msg) {
          msg = `actual: "${actual}" expected to contain: "${expected}"`;
        }
        throw new AssertionError(msg);
      }
    }
    exports_7("assertStrContains", assertStrContains);
    /**
     * Make an assertion that `actual` contains the `expected` values
     * If not then thrown.
     */
    function assertArrayContains(actual, expected, msg) {
      const missing = [];
      for (let i = 0; i < expected.length; i++) {
        let found = false;
        for (let j = 0; j < actual.length; j++) {
          if (equal(expected[i], actual[j])) {
            found = true;
            break;
          }
        }
        if (!found) {
          missing.push(expected[i]);
        }
      }
      if (missing.length === 0) {
        return;
      }
      if (!msg) {
        msg = `actual: "${actual}" expected to contain: "${expected}"`;
        msg += "\n";
        msg += `missing: ${missing}`;
      }
      throw new AssertionError(msg);
    }
    exports_7("assertArrayContains", assertArrayContains);
    /**
     * Make an assertion that `actual` match RegExp `expected`. If not
     * then thrown
     */
    function assertMatch(actual, expected, msg) {
      if (!expected.test(actual)) {
        if (!msg) {
          msg = `actual: "${actual}" expected to match: "${expected}"`;
        }
        throw new AssertionError(msg);
      }
    }
    exports_7("assertMatch", assertMatch);
    /**
     * Forcefully throws a failed assertion
     */
    function fail(msg) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      assert(false, `Failed assertion${msg ? `: ${msg}` : "."}`);
    }
    exports_7("fail", fail);
    /** Executes a function, expecting it to throw.  If it does not, then it
     * throws.  An error class and a string that should be included in the
     * error message can also be asserted.
     */
    function assertThrows(fn, ErrorClass, msgIncludes = "", msg) {
      let doesThrow = false;
      let error = null;
      try {
        fn();
      } catch (e) {
        if (
          ErrorClass && !(Object.getPrototypeOf(e) === ErrorClass.prototype)
        ) {
          msg =
            `Expected error to be instance of "${ErrorClass.name}", but was "${e.constructor.name}"${
              msg ? `: ${msg}` : "."
            }`;
          throw new AssertionError(msg);
        }
        if (msgIncludes && !e.message.includes(msgIncludes)) {
          msg =
            `Expected error message to include "${msgIncludes}", but got "${e.message}"${
              msg ? `: ${msg}` : "."
            }`;
          throw new AssertionError(msg);
        }
        doesThrow = true;
        error = e;
      }
      if (!doesThrow) {
        msg = `Expected function to throw${msg ? `: ${msg}` : "."}`;
        throw new AssertionError(msg);
      }
      return error;
    }
    exports_7("assertThrows", assertThrows);
    async function assertThrowsAsync(fn, ErrorClass, msgIncludes = "", msg) {
      let doesThrow = false;
      let error = null;
      try {
        await fn();
      } catch (e) {
        if (
          ErrorClass && !(Object.getPrototypeOf(e) === ErrorClass.prototype)
        ) {
          msg =
            `Expected error to be instance of "${ErrorClass.name}", but got "${e.name}"${
              msg ? `: ${msg}` : "."
            }`;
          throw new AssertionError(msg);
        }
        if (msgIncludes && !e.message.includes(msgIncludes)) {
          msg =
            `Expected error message to include "${msgIncludes}", but got "${e.message}"${
              msg ? `: ${msg}` : "."
            }`;
          throw new AssertionError(msg);
        }
        doesThrow = true;
        error = e;
      }
      if (!doesThrow) {
        msg = `Expected function to throw${msg ? `: ${msg}` : "."}`;
        throw new AssertionError(msg);
      }
      return error;
    }
    exports_7("assertThrowsAsync", assertThrowsAsync);
    /** Use this to stub out methods that will throw when invoked. */
    function unimplemented(msg) {
      throw new AssertionError(msg || "unimplemented");
    }
    exports_7("unimplemented", unimplemented);
    /** Use this to assert unreachable code. */
    function unreachable() {
      throw new AssertionError("unreachable");
    }
    exports_7("unreachable", unreachable);
    return {
      setters: [
        function (colors_ts_1_1) {
          colors_ts_1 = colors_ts_1_1;
        },
        function (diff_ts_1_1) {
          diff_ts_1 = diff_ts_1_1;
        },
      ],
      execute: function () {
        CAN_NOT_DISPLAY = "[Cannot display]";
        AssertionError = class AssertionError extends Error {
          constructor(message) {
            super(message);
            this.name = "AssertionError";
          }
        };
        exports_7("AssertionError", AssertionError);
      },
    };
  },
);
// Copyright the Browserify authors. MIT License.
// Ported from https://github.com/browserify/path-browserify/
System.register(
  "https://deno.land/std/path/win32",
  [
    "https://deno.land/std/path/_constants",
    "https://deno.land/std/path/_util",
    "https://deno.land/std/testing/asserts",
  ],
  function (exports_8, context_8) {
    "use strict";
    var cwd, env, _constants_ts_2, _util_ts_1, asserts_ts_1, sep, delimiter;
    var __moduleName = context_8 && context_8.id;
    function resolve(...pathSegments) {
      let resolvedDevice = "";
      let resolvedTail = "";
      let resolvedAbsolute = false;
      for (let i = pathSegments.length - 1; i >= -1; i--) {
        let path;
        if (i >= 0) {
          path = pathSegments[i];
        } else if (!resolvedDevice) {
          path = cwd();
        } else {
          // Windows has the concept of drive-specific current working
          // directories. If we've resolved a drive letter but not yet an
          // absolute path, get cwd for that drive, or the process cwd if
          // the drive cwd is not available. We're sure the device is not
          // a UNC path at this points, because UNC paths are always absolute.
          path = env.get(`=${resolvedDevice}`) || cwd();
          // Verify that a cwd was found and that it actually points
          // to our drive. If not, default to the drive's root.
          if (
            path === undefined ||
            path.slice(0, 3).toLowerCase() !==
              `${resolvedDevice.toLowerCase()}\\`
          ) {
            path = `${resolvedDevice}\\`;
          }
        }
        _util_ts_1.assertPath(path);
        const len = path.length;
        // Skip empty entries
        if (len === 0) {
          continue;
        }
        let rootEnd = 0;
        let device = "";
        let isAbsolute = false;
        const code = path.charCodeAt(0);
        // Try to match a root
        if (len > 1) {
          if (_util_ts_1.isPathSeparator(code)) {
            // Possible UNC root
            // If we started with a separator, we know we at least have an
            // absolute path of some kind (UNC or otherwise)
            isAbsolute = true;
            if (_util_ts_1.isPathSeparator(path.charCodeAt(1))) {
              // Matched double path separator at beginning
              let j = 2;
              let last = j;
              // Match 1 or more non-path separators
              for (; j < len; ++j) {
                if (_util_ts_1.isPathSeparator(path.charCodeAt(j))) {
                  break;
                }
              }
              if (j < len && j !== last) {
                const firstPart = path.slice(last, j);
                // Matched!
                last = j;
                // Match 1 or more path separators
                for (; j < len; ++j) {
                  if (!_util_ts_1.isPathSeparator(path.charCodeAt(j))) {
                    break;
                  }
                }
                if (j < len && j !== last) {
                  // Matched!
                  last = j;
                  // Match 1 or more non-path separators
                  for (; j < len; ++j) {
                    if (_util_ts_1.isPathSeparator(path.charCodeAt(j))) {
                      break;
                    }
                  }
                  if (j === len) {
                    // We matched a UNC root only
                    device = `\\\\${firstPart}\\${path.slice(last)}`;
                    rootEnd = j;
                  } else if (j !== last) {
                    // We matched a UNC root with leftovers
                    device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                    rootEnd = j;
                  }
                }
              }
            } else {
              rootEnd = 1;
            }
          } else if (_util_ts_1.isWindowsDeviceRoot(code)) {
            // Possible device root
            if (path.charCodeAt(1) === _constants_ts_2.CHAR_COLON) {
              device = path.slice(0, 2);
              rootEnd = 2;
              if (len > 2) {
                if (_util_ts_1.isPathSeparator(path.charCodeAt(2))) {
                  // Treat separator following drive name as an absolute path
                  // indicator
                  isAbsolute = true;
                  rootEnd = 3;
                }
              }
            }
          }
        } else if (_util_ts_1.isPathSeparator(code)) {
          // `path` contains just a path separator
          rootEnd = 1;
          isAbsolute = true;
        }
        if (
          device.length > 0 &&
          resolvedDevice.length > 0 &&
          device.toLowerCase() !== resolvedDevice.toLowerCase()
        ) {
          // This path points to another device so it is not applicable
          continue;
        }
        if (resolvedDevice.length === 0 && device.length > 0) {
          resolvedDevice = device;
        }
        if (!resolvedAbsolute) {
          resolvedTail = `${path.slice(rootEnd)}\\${resolvedTail}`;
          resolvedAbsolute = isAbsolute;
        }
        if (resolvedAbsolute && resolvedDevice.length > 0) {
          break;
        }
      }
      // At this point the path should be resolved to a full absolute path,
      // but handle relative paths to be safe (might happen when process.cwd()
      // fails)
      // Normalize the tail path
      resolvedTail = _util_ts_1.normalizeString(
        resolvedTail,
        !resolvedAbsolute,
        "\\",
        _util_ts_1.isPathSeparator,
      );
      return resolvedDevice + (resolvedAbsolute ? "\\" : "") + resolvedTail ||
        ".";
    }
    exports_8("resolve", resolve);
    function normalize(path) {
      _util_ts_1.assertPath(path);
      const len = path.length;
      if (len === 0) {
        return ".";
      }
      let rootEnd = 0;
      let device;
      let isAbsolute = false;
      const code = path.charCodeAt(0);
      // Try to match a root
      if (len > 1) {
        if (_util_ts_1.isPathSeparator(code)) {
          // Possible UNC root
          // If we started with a separator, we know we at least have an absolute
          // path of some kind (UNC or otherwise)
          isAbsolute = true;
          if (_util_ts_1.isPathSeparator(path.charCodeAt(1))) {
            // Matched double path separator at beginning
            let j = 2;
            let last = j;
            // Match 1 or more non-path separators
            for (; j < len; ++j) {
              if (_util_ts_1.isPathSeparator(path.charCodeAt(j))) {
                break;
              }
            }
            if (j < len && j !== last) {
              const firstPart = path.slice(last, j);
              // Matched!
              last = j;
              // Match 1 or more path separators
              for (; j < len; ++j) {
                if (!_util_ts_1.isPathSeparator(path.charCodeAt(j))) {
                  break;
                }
              }
              if (j < len && j !== last) {
                // Matched!
                last = j;
                // Match 1 or more non-path separators
                for (; j < len; ++j) {
                  if (_util_ts_1.isPathSeparator(path.charCodeAt(j))) {
                    break;
                  }
                }
                if (j === len) {
                  // We matched a UNC root only
                  // Return the normalized version of the UNC root since there
                  // is nothing left to process
                  return `\\\\${firstPart}\\${path.slice(last)}\\`;
                } else if (j !== last) {
                  // We matched a UNC root with leftovers
                  device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                  rootEnd = j;
                }
              }
            }
          } else {
            rootEnd = 1;
          }
        } else if (_util_ts_1.isWindowsDeviceRoot(code)) {
          // Possible device root
          if (path.charCodeAt(1) === _constants_ts_2.CHAR_COLON) {
            device = path.slice(0, 2);
            rootEnd = 2;
            if (len > 2) {
              if (_util_ts_1.isPathSeparator(path.charCodeAt(2))) {
                // Treat separator following drive name as an absolute path
                // indicator
                isAbsolute = true;
                rootEnd = 3;
              }
            }
          }
        }
      } else if (_util_ts_1.isPathSeparator(code)) {
        // `path` contains just a path separator, exit early to avoid unnecessary
        // work
        return "\\";
      }
      let tail;
      if (rootEnd < len) {
        tail = _util_ts_1.normalizeString(
          path.slice(rootEnd),
          !isAbsolute,
          "\\",
          _util_ts_1.isPathSeparator,
        );
      } else {
        tail = "";
      }
      if (tail.length === 0 && !isAbsolute) {
        tail = ".";
      }
      if (
        tail.length > 0 &&
        _util_ts_1.isPathSeparator(path.charCodeAt(len - 1))
      ) {
        tail += "\\";
      }
      if (device === undefined) {
        if (isAbsolute) {
          if (tail.length > 0) {
            return `\\${tail}`;
          } else {
            return "\\";
          }
        } else if (tail.length > 0) {
          return tail;
        } else {
          return "";
        }
      } else if (isAbsolute) {
        if (tail.length > 0) {
          return `${device}\\${tail}`;
        } else {
          return `${device}\\`;
        }
      } else if (tail.length > 0) {
        return device + tail;
      } else {
        return device;
      }
    }
    exports_8("normalize", normalize);
    function isAbsolute(path) {
      _util_ts_1.assertPath(path);
      const len = path.length;
      if (len === 0) {
        return false;
      }
      const code = path.charCodeAt(0);
      if (_util_ts_1.isPathSeparator(code)) {
        return true;
      } else if (_util_ts_1.isWindowsDeviceRoot(code)) {
        // Possible device root
        if (len > 2 && path.charCodeAt(1) === _constants_ts_2.CHAR_COLON) {
          if (_util_ts_1.isPathSeparator(path.charCodeAt(2))) {
            return true;
          }
        }
      }
      return false;
    }
    exports_8("isAbsolute", isAbsolute);
    function join(...paths) {
      const pathsCount = paths.length;
      if (pathsCount === 0) {
        return ".";
      }
      let joined;
      let firstPart = null;
      for (let i = 0; i < pathsCount; ++i) {
        const path = paths[i];
        _util_ts_1.assertPath(path);
        if (path.length > 0) {
          if (joined === undefined) {
            joined = firstPart = path;
          } else {
            joined += `\\${path}`;
          }
        }
      }
      if (joined === undefined) {
        return ".";
      }
      // Make sure that the joined path doesn't start with two slashes, because
      // normalize() will mistake it for an UNC path then.
      //
      // This step is skipped when it is very clear that the user actually
      // intended to point at an UNC path. This is assumed when the first
      // non-empty string arguments starts with exactly two slashes followed by
      // at least one more non-slash character.
      //
      // Note that for normalize() to treat a path as an UNC path it needs to
      // have at least 2 components, so we don't filter for that here.
      // This means that the user can use join to construct UNC paths from
      // a server name and a share name; for example:
      //   path.join('//server', 'share') -> '\\\\server\\share\\')
      let needsReplace = true;
      let slashCount = 0;
      asserts_ts_1.assert(firstPart != null);
      if (_util_ts_1.isPathSeparator(firstPart.charCodeAt(0))) {
        ++slashCount;
        const firstLen = firstPart.length;
        if (firstLen > 1) {
          if (_util_ts_1.isPathSeparator(firstPart.charCodeAt(1))) {
            ++slashCount;
            if (firstLen > 2) {
              if (_util_ts_1.isPathSeparator(firstPart.charCodeAt(2))) {
                ++slashCount;
              } else {
                // We matched a UNC path in the first part
                needsReplace = false;
              }
            }
          }
        }
      }
      if (needsReplace) {
        // Find any more consecutive slashes we need to replace
        for (; slashCount < joined.length; ++slashCount) {
          if (!_util_ts_1.isPathSeparator(joined.charCodeAt(slashCount))) {
            break;
          }
        }
        // Replace the slashes if needed
        if (slashCount >= 2) {
          joined = `\\${joined.slice(slashCount)}`;
        }
      }
      return normalize(joined);
    }
    exports_8("join", join);
    // It will solve the relative path from `from` to `to`, for instance:
    //  from = 'C:\\orandea\\test\\aaa'
    //  to = 'C:\\orandea\\impl\\bbb'
    // The output of the function should be: '..\\..\\impl\\bbb'
    function relative(from, to) {
      _util_ts_1.assertPath(from);
      _util_ts_1.assertPath(to);
      if (from === to) {
        return "";
      }
      const fromOrig = resolve(from);
      const toOrig = resolve(to);
      if (fromOrig === toOrig) {
        return "";
      }
      from = fromOrig.toLowerCase();
      to = toOrig.toLowerCase();
      if (from === to) {
        return "";
      }
      // Trim any leading backslashes
      let fromStart = 0;
      let fromEnd = from.length;
      for (; fromStart < fromEnd; ++fromStart) {
        if (
          from.charCodeAt(fromStart) !== _constants_ts_2.CHAR_BACKWARD_SLASH
        ) {
          break;
        }
      }
      // Trim trailing backslashes (applicable to UNC paths only)
      for (; fromEnd - 1 > fromStart; --fromEnd) {
        if (
          from.charCodeAt(fromEnd - 1) !== _constants_ts_2.CHAR_BACKWARD_SLASH
        ) {
          break;
        }
      }
      const fromLen = fromEnd - fromStart;
      // Trim any leading backslashes
      let toStart = 0;
      let toEnd = to.length;
      for (; toStart < toEnd; ++toStart) {
        if (to.charCodeAt(toStart) !== _constants_ts_2.CHAR_BACKWARD_SLASH) {
          break;
        }
      }
      // Trim trailing backslashes (applicable to UNC paths only)
      for (; toEnd - 1 > toStart; --toEnd) {
        if (to.charCodeAt(toEnd - 1) !== _constants_ts_2.CHAR_BACKWARD_SLASH) {
          break;
        }
      }
      const toLen = toEnd - toStart;
      // Compare paths to find the longest common path from root
      const length = fromLen < toLen ? fromLen : toLen;
      let lastCommonSep = -1;
      let i = 0;
      for (; i <= length; ++i) {
        if (i === length) {
          if (toLen > length) {
            if (
              to.charCodeAt(toStart + i) === _constants_ts_2.CHAR_BACKWARD_SLASH
            ) {
              // We get here if `from` is the exact base path for `to`.
              // For example: from='C:\\foo\\bar'; to='C:\\foo\\bar\\baz'
              return toOrig.slice(toStart + i + 1);
            } else if (i === 2) {
              // We get here if `from` is the device root.
              // For example: from='C:\\'; to='C:\\foo'
              return toOrig.slice(toStart + i);
            }
          }
          if (fromLen > length) {
            if (
              from.charCodeAt(fromStart + i) ===
                _constants_ts_2.CHAR_BACKWARD_SLASH
            ) {
              // We get here if `to` is the exact base path for `from`.
              // For example: from='C:\\foo\\bar'; to='C:\\foo'
              lastCommonSep = i;
            } else if (i === 2) {
              // We get here if `to` is the device root.
              // For example: from='C:\\foo\\bar'; to='C:\\'
              lastCommonSep = 3;
            }
          }
          break;
        }
        const fromCode = from.charCodeAt(fromStart + i);
        const toCode = to.charCodeAt(toStart + i);
        if (fromCode !== toCode) {
          break;
        } else if (fromCode === _constants_ts_2.CHAR_BACKWARD_SLASH) {
          lastCommonSep = i;
        }
      }
      // We found a mismatch before the first common path separator was seen, so
      // return the original `to`.
      if (i !== length && lastCommonSep === -1) {
        return toOrig;
      }
      let out = "";
      if (lastCommonSep === -1) {
        lastCommonSep = 0;
      }
      // Generate the relative path based on the path difference between `to` and
      // `from`
      for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
        if (
          i === fromEnd ||
          from.charCodeAt(i) === _constants_ts_2.CHAR_BACKWARD_SLASH
        ) {
          if (out.length === 0) {
            out += "..";
          } else {
            out += "\\..";
          }
        }
      }
      // Lastly, append the rest of the destination (`to`) path that comes after
      // the common path parts
      if (out.length > 0) {
        return out + toOrig.slice(toStart + lastCommonSep, toEnd);
      } else {
        toStart += lastCommonSep;
        if (
          toOrig.charCodeAt(toStart) === _constants_ts_2.CHAR_BACKWARD_SLASH
        ) {
          ++toStart;
        }
        return toOrig.slice(toStart, toEnd);
      }
    }
    exports_8("relative", relative);
    function toNamespacedPath(path) {
      // Note: this will *probably* throw somewhere.
      if (typeof path !== "string") {
        return path;
      }
      if (path.length === 0) {
        return "";
      }
      const resolvedPath = resolve(path);
      if (resolvedPath.length >= 3) {
        if (
          resolvedPath.charCodeAt(0) === _constants_ts_2.CHAR_BACKWARD_SLASH
        ) {
          // Possible UNC root
          if (
            resolvedPath.charCodeAt(1) === _constants_ts_2.CHAR_BACKWARD_SLASH
          ) {
            const code = resolvedPath.charCodeAt(2);
            if (
              code !== _constants_ts_2.CHAR_QUESTION_MARK &&
              code !== _constants_ts_2.CHAR_DOT
            ) {
              // Matched non-long UNC root, convert the path to a long UNC path
              return `\\\\?\\UNC\\${resolvedPath.slice(2)}`;
            }
          }
        } else if (_util_ts_1.isWindowsDeviceRoot(resolvedPath.charCodeAt(0))) {
          // Possible device root
          if (
            resolvedPath.charCodeAt(1) === _constants_ts_2.CHAR_COLON &&
            resolvedPath.charCodeAt(2) === _constants_ts_2.CHAR_BACKWARD_SLASH
          ) {
            // Matched device root, convert the path to a long UNC path
            return `\\\\?\\${resolvedPath}`;
          }
        }
      }
      return path;
    }
    exports_8("toNamespacedPath", toNamespacedPath);
    function dirname(path) {
      _util_ts_1.assertPath(path);
      const len = path.length;
      if (len === 0) {
        return ".";
      }
      let rootEnd = -1;
      let end = -1;
      let matchedSlash = true;
      let offset = 0;
      const code = path.charCodeAt(0);
      // Try to match a root
      if (len > 1) {
        if (_util_ts_1.isPathSeparator(code)) {
          // Possible UNC root
          rootEnd = offset = 1;
          if (_util_ts_1.isPathSeparator(path.charCodeAt(1))) {
            // Matched double path separator at beginning
            let j = 2;
            let last = j;
            // Match 1 or more non-path separators
            for (; j < len; ++j) {
              if (_util_ts_1.isPathSeparator(path.charCodeAt(j))) {
                break;
              }
            }
            if (j < len && j !== last) {
              // Matched!
              last = j;
              // Match 1 or more path separators
              for (; j < len; ++j) {
                if (!_util_ts_1.isPathSeparator(path.charCodeAt(j))) {
                  break;
                }
              }
              if (j < len && j !== last) {
                // Matched!
                last = j;
                // Match 1 or more non-path separators
                for (; j < len; ++j) {
                  if (_util_ts_1.isPathSeparator(path.charCodeAt(j))) {
                    break;
                  }
                }
                if (j === len) {
                  // We matched a UNC root only
                  return path;
                }
                if (j !== last) {
                  // We matched a UNC root with leftovers
                  // Offset by 1 to include the separator after the UNC root to
                  // treat it as a "normal root" on top of a (UNC) root
                  rootEnd = offset = j + 1;
                }
              }
            }
          }
        } else if (_util_ts_1.isWindowsDeviceRoot(code)) {
          // Possible device root
          if (path.charCodeAt(1) === _constants_ts_2.CHAR_COLON) {
            rootEnd = offset = 2;
            if (len > 2) {
              if (_util_ts_1.isPathSeparator(path.charCodeAt(2))) {
                rootEnd = offset = 3;
              }
            }
          }
        }
      } else if (_util_ts_1.isPathSeparator(code)) {
        // `path` contains just a path separator, exit early to avoid
        // unnecessary work
        return path;
      }
      for (let i = len - 1; i >= offset; --i) {
        if (_util_ts_1.isPathSeparator(path.charCodeAt(i))) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
          // We saw the first non-path separator
          matchedSlash = false;
        }
      }
      if (end === -1) {
        if (rootEnd === -1) {
          return ".";
        } else {
          end = rootEnd;
        }
      }
      return path.slice(0, end);
    }
    exports_8("dirname", dirname);
    function basename(path, ext = "") {
      if (ext !== undefined && typeof ext !== "string") {
        throw new TypeError('"ext" argument must be a string');
      }
      _util_ts_1.assertPath(path);
      let start = 0;
      let end = -1;
      let matchedSlash = true;
      let i;
      // Check for a drive letter prefix so as not to mistake the following
      // path separator as an extra separator at the end of the path that can be
      // disregarded
      if (path.length >= 2) {
        const drive = path.charCodeAt(0);
        if (_util_ts_1.isWindowsDeviceRoot(drive)) {
          if (path.charCodeAt(1) === _constants_ts_2.CHAR_COLON) {
            start = 2;
          }
        }
      }
      if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
        if (ext.length === path.length && ext === path) {
          return "";
        }
        let extIdx = ext.length - 1;
        let firstNonSlashEnd = -1;
        for (i = path.length - 1; i >= start; --i) {
          const code = path.charCodeAt(i);
          if (_util_ts_1.isPathSeparator(code)) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
            if (firstNonSlashEnd === -1) {
              // We saw the first non-path separator, remember this index in case
              // we need it if the extension ends up not matching
              matchedSlash = false;
              firstNonSlashEnd = i + 1;
            }
            if (extIdx >= 0) {
              // Try to match the explicit extension
              if (code === ext.charCodeAt(extIdx)) {
                if (--extIdx === -1) {
                  // We matched the extension, so mark this as the end of our path
                  // component
                  end = i;
                }
              } else {
                // Extension does not match, so our result is the entire path
                // component
                extIdx = -1;
                end = firstNonSlashEnd;
              }
            }
          }
        }
        if (start === end) {
          end = firstNonSlashEnd;
        } else if (end === -1) {
          end = path.length;
        }
        return path.slice(start, end);
      } else {
        for (i = path.length - 1; i >= start; --i) {
          if (_util_ts_1.isPathSeparator(path.charCodeAt(i))) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
            // We saw the first non-path separator, mark this as the end of our
            // path component
            matchedSlash = false;
            end = i + 1;
          }
        }
        if (end === -1) {
          return "";
        }
        return path.slice(start, end);
      }
    }
    exports_8("basename", basename);
    function extname(path) {
      _util_ts_1.assertPath(path);
      let start = 0;
      let startDot = -1;
      let startPart = 0;
      let end = -1;
      let matchedSlash = true;
      // Track the state of characters (if any) we see before our first dot and
      // after any path separator we find
      let preDotState = 0;
      // Check for a drive letter prefix so as not to mistake the following
      // path separator as an extra separator at the end of the path that can be
      // disregarded
      if (
        path.length >= 2 &&
        path.charCodeAt(1) === _constants_ts_2.CHAR_COLON &&
        _util_ts_1.isWindowsDeviceRoot(path.charCodeAt(0))
      ) {
        start = startPart = 2;
      }
      for (let i = path.length - 1; i >= start; --i) {
        const code = path.charCodeAt(i);
        if (_util_ts_1.isPathSeparator(code)) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
        if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // extension
          matchedSlash = false;
          end = i + 1;
        }
        if (code === _constants_ts_2.CHAR_DOT) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) {
            startDot = i;
          } else if (preDotState !== 1) {
            preDotState = 1;
          }
        } else if (startDot !== -1) {
          // We saw a non-dot and non-path separator before our dot, so we should
          // have a good chance at having a non-empty extension
          preDotState = -1;
        }
      }
      if (
        startDot === -1 ||
        end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        (preDotState === 1 && startDot === end - 1 &&
          startDot === startPart + 1)
      ) {
        return "";
      }
      return path.slice(startDot, end);
    }
    exports_8("extname", extname);
    function format(pathObject) {
      /* eslint-disable max-len */
      if (pathObject === null || typeof pathObject !== "object") {
        throw new TypeError(
          `The "pathObject" argument must be of type Object. Received type ${typeof pathObject}`,
        );
      }
      return _util_ts_1._format("\\", pathObject);
    }
    exports_8("format", format);
    function parse(path) {
      _util_ts_1.assertPath(path);
      const ret = { root: "", dir: "", base: "", ext: "", name: "" };
      const len = path.length;
      if (len === 0) {
        return ret;
      }
      let rootEnd = 0;
      let code = path.charCodeAt(0);
      // Try to match a root
      if (len > 1) {
        if (_util_ts_1.isPathSeparator(code)) {
          // Possible UNC root
          rootEnd = 1;
          if (_util_ts_1.isPathSeparator(path.charCodeAt(1))) {
            // Matched double path separator at beginning
            let j = 2;
            let last = j;
            // Match 1 or more non-path separators
            for (; j < len; ++j) {
              if (_util_ts_1.isPathSeparator(path.charCodeAt(j))) {
                break;
              }
            }
            if (j < len && j !== last) {
              // Matched!
              last = j;
              // Match 1 or more path separators
              for (; j < len; ++j) {
                if (!_util_ts_1.isPathSeparator(path.charCodeAt(j))) {
                  break;
                }
              }
              if (j < len && j !== last) {
                // Matched!
                last = j;
                // Match 1 or more non-path separators
                for (; j < len; ++j) {
                  if (_util_ts_1.isPathSeparator(path.charCodeAt(j))) {
                    break;
                  }
                }
                if (j === len) {
                  // We matched a UNC root only
                  rootEnd = j;
                } else if (j !== last) {
                  // We matched a UNC root with leftovers
                  rootEnd = j + 1;
                }
              }
            }
          }
        } else if (_util_ts_1.isWindowsDeviceRoot(code)) {
          // Possible device root
          if (path.charCodeAt(1) === _constants_ts_2.CHAR_COLON) {
            rootEnd = 2;
            if (len > 2) {
              if (_util_ts_1.isPathSeparator(path.charCodeAt(2))) {
                if (len === 3) {
                  // `path` contains just a drive root, exit early to avoid
                  // unnecessary work
                  ret.root = ret.dir = path;
                  return ret;
                }
                rootEnd = 3;
              }
            } else {
              // `path` contains just a drive root, exit early to avoid
              // unnecessary work
              ret.root = ret.dir = path;
              return ret;
            }
          }
        }
      } else if (_util_ts_1.isPathSeparator(code)) {
        // `path` contains just a path separator, exit early to avoid
        // unnecessary work
        ret.root = ret.dir = path;
        return ret;
      }
      if (rootEnd > 0) {
        ret.root = path.slice(0, rootEnd);
      }
      let startDot = -1;
      let startPart = rootEnd;
      let end = -1;
      let matchedSlash = true;
      let i = path.length - 1;
      // Track the state of characters (if any) we see before our first dot and
      // after any path separator we find
      let preDotState = 0;
      // Get non-dir info
      for (; i >= rootEnd; --i) {
        code = path.charCodeAt(i);
        if (_util_ts_1.isPathSeparator(code)) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
        if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // extension
          matchedSlash = false;
          end = i + 1;
        }
        if (code === _constants_ts_2.CHAR_DOT) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) {
            startDot = i;
          } else if (preDotState !== 1) {
            preDotState = 1;
          }
        } else if (startDot !== -1) {
          // We saw a non-dot and non-path separator before our dot, so we should
          // have a good chance at having a non-empty extension
          preDotState = -1;
        }
      }
      if (
        startDot === -1 ||
        end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        (preDotState === 1 && startDot === end - 1 &&
          startDot === startPart + 1)
      ) {
        if (end !== -1) {
          ret.base = ret.name = path.slice(startPart, end);
        }
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
        ret.ext = path.slice(startDot, end);
      }
      // If the directory is the root, use the entire root as the `dir` including
      // the trailing slash if any (`C:\abc` -> `C:\`). Otherwise, strip out the
      // trailing slash (`C:\abc\def` -> `C:\abc`).
      if (startPart > 0 && startPart !== rootEnd) {
        ret.dir = path.slice(0, startPart - 1);
      } else {
        ret.dir = ret.root;
      }
      return ret;
    }
    exports_8("parse", parse);
    /** Converts a file URL to a path string.
     *
     *      fromFileUrl("file:///C:/Users/foo"); // "C:\\Users\\foo"
     *      fromFileUrl("file:///home/foo"); // "\\home\\foo"
     *
     * Note that non-file URLs are treated as file URLs and irrelevant components
     * are ignored.
     */
    function fromFileUrl(url) {
      return new URL(url).pathname
        .replace(/^\/*([A-Za-z]:)(\/|$)/, "$1/")
        .replace(/\//g, "\\");
    }
    exports_8("fromFileUrl", fromFileUrl);
    return {
      setters: [
        function (_constants_ts_2_1) {
          _constants_ts_2 = _constants_ts_2_1;
        },
        function (_util_ts_1_1) {
          _util_ts_1 = _util_ts_1_1;
        },
        function (asserts_ts_1_1) {
          asserts_ts_1 = asserts_ts_1_1;
        },
      ],
      execute: function () {
        cwd = Deno.cwd, env = Deno.env;
        exports_8("sep", sep = "\\");
        exports_8("delimiter", delimiter = ";");
      },
    };
  },
);
// Copyright the Browserify authors. MIT License.
// Ported from https://github.com/browserify/path-browserify/
System.register(
  "https://deno.land/std/path/posix",
  ["https://deno.land/std/path/_constants", "https://deno.land/std/path/_util"],
  function (exports_9, context_9) {
    "use strict";
    var cwd, _constants_ts_3, _util_ts_2, sep, delimiter;
    var __moduleName = context_9 && context_9.id;
    // path.resolve([from ...], to)
    function resolve(...pathSegments) {
      let resolvedPath = "";
      let resolvedAbsolute = false;
      for (let i = pathSegments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
        let path;
        if (i >= 0) {
          path = pathSegments[i];
        } else {
          path = cwd();
        }
        _util_ts_2.assertPath(path);
        // Skip empty entries
        if (path.length === 0) {
          continue;
        }
        resolvedPath = `${path}/${resolvedPath}`;
        resolvedAbsolute =
          path.charCodeAt(0) === _constants_ts_3.CHAR_FORWARD_SLASH;
      }
      // At this point the path should be resolved to a full absolute path, but
      // handle relative paths to be safe (might happen when process.cwd() fails)
      // Normalize the path
      resolvedPath = _util_ts_2.normalizeString(
        resolvedPath,
        !resolvedAbsolute,
        "/",
        _util_ts_2.isPosixPathSeparator,
      );
      if (resolvedAbsolute) {
        if (resolvedPath.length > 0) {
          return `/${resolvedPath}`;
        } else {
          return "/";
        }
      } else if (resolvedPath.length > 0) {
        return resolvedPath;
      } else {
        return ".";
      }
    }
    exports_9("resolve", resolve);
    function normalize(path) {
      _util_ts_2.assertPath(path);
      if (path.length === 0) {
        return ".";
      }
      const isAbsolute =
        path.charCodeAt(0) === _constants_ts_3.CHAR_FORWARD_SLASH;
      const trailingSeparator =
        path.charCodeAt(path.length - 1) === _constants_ts_3.CHAR_FORWARD_SLASH;
      // Normalize the path
      path = _util_ts_2.normalizeString(
        path,
        !isAbsolute,
        "/",
        _util_ts_2.isPosixPathSeparator,
      );
      if (path.length === 0 && !isAbsolute) {
        path = ".";
      }
      if (path.length > 0 && trailingSeparator) {
        path += "/";
      }
      if (isAbsolute) {
        return `/${path}`;
      }
      return path;
    }
    exports_9("normalize", normalize);
    function isAbsolute(path) {
      _util_ts_2.assertPath(path);
      return path.length > 0 &&
        path.charCodeAt(0) === _constants_ts_3.CHAR_FORWARD_SLASH;
    }
    exports_9("isAbsolute", isAbsolute);
    function join(...paths) {
      if (paths.length === 0) {
        return ".";
      }
      let joined;
      for (let i = 0, len = paths.length; i < len; ++i) {
        const path = paths[i];
        _util_ts_2.assertPath(path);
        if (path.length > 0) {
          if (!joined) {
            joined = path;
          } else {
            joined += `/${path}`;
          }
        }
      }
      if (!joined) {
        return ".";
      }
      return normalize(joined);
    }
    exports_9("join", join);
    function relative(from, to) {
      _util_ts_2.assertPath(from);
      _util_ts_2.assertPath(to);
      if (from === to) {
        return "";
      }
      from = resolve(from);
      to = resolve(to);
      if (from === to) {
        return "";
      }
      // Trim any leading backslashes
      let fromStart = 1;
      const fromEnd = from.length;
      for (; fromStart < fromEnd; ++fromStart) {
        if (from.charCodeAt(fromStart) !== _constants_ts_3.CHAR_FORWARD_SLASH) {
          break;
        }
      }
      const fromLen = fromEnd - fromStart;
      // Trim any leading backslashes
      let toStart = 1;
      const toEnd = to.length;
      for (; toStart < toEnd; ++toStart) {
        if (to.charCodeAt(toStart) !== _constants_ts_3.CHAR_FORWARD_SLASH) {
          break;
        }
      }
      const toLen = toEnd - toStart;
      // Compare paths to find the longest common path from root
      const length = fromLen < toLen ? fromLen : toLen;
      let lastCommonSep = -1;
      let i = 0;
      for (; i <= length; ++i) {
        if (i === length) {
          if (toLen > length) {
            if (
              to.charCodeAt(toStart + i) === _constants_ts_3.CHAR_FORWARD_SLASH
            ) {
              // We get here if `from` is the exact base path for `to`.
              // For example: from='/foo/bar'; to='/foo/bar/baz'
              return to.slice(toStart + i + 1);
            } else if (i === 0) {
              // We get here if `from` is the root
              // For example: from='/'; to='/foo'
              return to.slice(toStart + i);
            }
          } else if (fromLen > length) {
            if (
              from.charCodeAt(fromStart + i) ===
                _constants_ts_3.CHAR_FORWARD_SLASH
            ) {
              // We get here if `to` is the exact base path for `from`.
              // For example: from='/foo/bar/baz'; to='/foo/bar'
              lastCommonSep = i;
            } else if (i === 0) {
              // We get here if `to` is the root.
              // For example: from='/foo'; to='/'
              lastCommonSep = 0;
            }
          }
          break;
        }
        const fromCode = from.charCodeAt(fromStart + i);
        const toCode = to.charCodeAt(toStart + i);
        if (fromCode !== toCode) {
          break;
        } else if (fromCode === _constants_ts_3.CHAR_FORWARD_SLASH) {
          lastCommonSep = i;
        }
      }
      let out = "";
      // Generate the relative path based on the path difference between `to`
      // and `from`
      for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
        if (
          i === fromEnd ||
          from.charCodeAt(i) === _constants_ts_3.CHAR_FORWARD_SLASH
        ) {
          if (out.length === 0) {
            out += "..";
          } else {
            out += "/..";
          }
        }
      }
      // Lastly, append the rest of the destination (`to`) path that comes after
      // the common path parts
      if (out.length > 0) {
        return out + to.slice(toStart + lastCommonSep);
      } else {
        toStart += lastCommonSep;
        if (to.charCodeAt(toStart) === _constants_ts_3.CHAR_FORWARD_SLASH) {
          ++toStart;
        }
        return to.slice(toStart);
      }
    }
    exports_9("relative", relative);
    function toNamespacedPath(path) {
      // Non-op on posix systems
      return path;
    }
    exports_9("toNamespacedPath", toNamespacedPath);
    function dirname(path) {
      _util_ts_2.assertPath(path);
      if (path.length === 0) {
        return ".";
      }
      const hasRoot = path.charCodeAt(0) === _constants_ts_3.CHAR_FORWARD_SLASH;
      let end = -1;
      let matchedSlash = true;
      for (let i = path.length - 1; i >= 1; --i) {
        if (path.charCodeAt(i) === _constants_ts_3.CHAR_FORWARD_SLASH) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
          // We saw the first non-path separator
          matchedSlash = false;
        }
      }
      if (end === -1) {
        return hasRoot ? "/" : ".";
      }
      if (hasRoot && end === 1) {
        return "//";
      }
      return path.slice(0, end);
    }
    exports_9("dirname", dirname);
    function basename(path, ext = "") {
      if (ext !== undefined && typeof ext !== "string") {
        throw new TypeError('"ext" argument must be a string');
      }
      _util_ts_2.assertPath(path);
      let start = 0;
      let end = -1;
      let matchedSlash = true;
      let i;
      if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
        if (ext.length === path.length && ext === path) {
          return "";
        }
        let extIdx = ext.length - 1;
        let firstNonSlashEnd = -1;
        for (i = path.length - 1; i >= 0; --i) {
          const code = path.charCodeAt(i);
          if (code === _constants_ts_3.CHAR_FORWARD_SLASH) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
            if (firstNonSlashEnd === -1) {
              // We saw the first non-path separator, remember this index in case
              // we need it if the extension ends up not matching
              matchedSlash = false;
              firstNonSlashEnd = i + 1;
            }
            if (extIdx >= 0) {
              // Try to match the explicit extension
              if (code === ext.charCodeAt(extIdx)) {
                if (--extIdx === -1) {
                  // We matched the extension, so mark this as the end of our path
                  // component
                  end = i;
                }
              } else {
                // Extension does not match, so our result is the entire path
                // component
                extIdx = -1;
                end = firstNonSlashEnd;
              }
            }
          }
        }
        if (start === end) {
          end = firstNonSlashEnd;
        } else if (end === -1) {
          end = path.length;
        }
        return path.slice(start, end);
      } else {
        for (i = path.length - 1; i >= 0; --i) {
          if (path.charCodeAt(i) === _constants_ts_3.CHAR_FORWARD_SLASH) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
            // We saw the first non-path separator, mark this as the end of our
            // path component
            matchedSlash = false;
            end = i + 1;
          }
        }
        if (end === -1) {
          return "";
        }
        return path.slice(start, end);
      }
    }
    exports_9("basename", basename);
    function extname(path) {
      _util_ts_2.assertPath(path);
      let startDot = -1;
      let startPart = 0;
      let end = -1;
      let matchedSlash = true;
      // Track the state of characters (if any) we see before our first dot and
      // after any path separator we find
      let preDotState = 0;
      for (let i = path.length - 1; i >= 0; --i) {
        const code = path.charCodeAt(i);
        if (code === _constants_ts_3.CHAR_FORWARD_SLASH) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
        if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // extension
          matchedSlash = false;
          end = i + 1;
        }
        if (code === _constants_ts_3.CHAR_DOT) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) {
            startDot = i;
          } else if (preDotState !== 1) {
            preDotState = 1;
          }
        } else if (startDot !== -1) {
          // We saw a non-dot and non-path separator before our dot, so we should
          // have a good chance at having a non-empty extension
          preDotState = -1;
        }
      }
      if (
        startDot === -1 ||
        end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        (preDotState === 1 && startDot === end - 1 &&
          startDot === startPart + 1)
      ) {
        return "";
      }
      return path.slice(startDot, end);
    }
    exports_9("extname", extname);
    function format(pathObject) {
      /* eslint-disable max-len */
      if (pathObject === null || typeof pathObject !== "object") {
        throw new TypeError(
          `The "pathObject" argument must be of type Object. Received type ${typeof pathObject}`,
        );
      }
      return _util_ts_2._format("/", pathObject);
    }
    exports_9("format", format);
    function parse(path) {
      _util_ts_2.assertPath(path);
      const ret = { root: "", dir: "", base: "", ext: "", name: "" };
      if (path.length === 0) {
        return ret;
      }
      const isAbsolute =
        path.charCodeAt(0) === _constants_ts_3.CHAR_FORWARD_SLASH;
      let start;
      if (isAbsolute) {
        ret.root = "/";
        start = 1;
      } else {
        start = 0;
      }
      let startDot = -1;
      let startPart = 0;
      let end = -1;
      let matchedSlash = true;
      let i = path.length - 1;
      // Track the state of characters (if any) we see before our first dot and
      // after any path separator we find
      let preDotState = 0;
      // Get non-dir info
      for (; i >= start; --i) {
        const code = path.charCodeAt(i);
        if (code === _constants_ts_3.CHAR_FORWARD_SLASH) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
        if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // extension
          matchedSlash = false;
          end = i + 1;
        }
        if (code === _constants_ts_3.CHAR_DOT) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) {
            startDot = i;
          } else if (preDotState !== 1) {
            preDotState = 1;
          }
        } else if (startDot !== -1) {
          // We saw a non-dot and non-path separator before our dot, so we should
          // have a good chance at having a non-empty extension
          preDotState = -1;
        }
      }
      if (
        startDot === -1 ||
        end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        (preDotState === 1 && startDot === end - 1 &&
          startDot === startPart + 1)
      ) {
        if (end !== -1) {
          if (startPart === 0 && isAbsolute) {
            ret.base = ret.name = path.slice(1, end);
          } else {
            ret.base = ret.name = path.slice(startPart, end);
          }
        }
      } else {
        if (startPart === 0 && isAbsolute) {
          ret.name = path.slice(1, startDot);
          ret.base = path.slice(1, end);
        } else {
          ret.name = path.slice(startPart, startDot);
          ret.base = path.slice(startPart, end);
        }
        ret.ext = path.slice(startDot, end);
      }
      if (startPart > 0) {
        ret.dir = path.slice(0, startPart - 1);
      } else if (isAbsolute) {
        ret.dir = "/";
      }
      return ret;
    }
    exports_9("parse", parse);
    /** Converts a file URL to a path string.
     *
     *      fromFileUrl("file:///home/foo"); // "/home/foo"
     *
     * Note that non-file URLs are treated as file URLs and irrelevant components
     * are ignored.
     */
    function fromFileUrl(url) {
      return new URL(url).pathname;
    }
    exports_9("fromFileUrl", fromFileUrl);
    return {
      setters: [
        function (_constants_ts_3_1) {
          _constants_ts_3 = _constants_ts_3_1;
        },
        function (_util_ts_2_1) {
          _util_ts_2 = _util_ts_2_1;
        },
      ],
      execute: function () {
        cwd = Deno.cwd;
        exports_9("sep", sep = "/");
        exports_9("delimiter", delimiter = ":");
      },
    };
  },
);
System.register(
  "https://deno.land/std/path/separator",
  [],
  function (exports_10, context_10) {
    "use strict";
    var isWindows, SEP, SEP_PATTERN;
    var __moduleName = context_10 && context_10.id;
    return {
      setters: [],
      execute: function () {
        // Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
        isWindows = Deno.build.os == "windows";
        exports_10("SEP", SEP = isWindows ? "\\" : "/");
        exports_10("SEP_PATTERN", SEP_PATTERN = isWindows ? /[\\/]+/ : /\/+/);
      },
    };
  },
);
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/path/common",
  ["https://deno.land/std/path/separator"],
  function (exports_11, context_11) {
    "use strict";
    var separator_ts_1;
    var __moduleName = context_11 && context_11.id;
    /** Determines the common path from a set of paths, using an optional separator,
     * which defaults to the OS default separator.
     *
     *       import { common } from "https://deno.land/std/path/mod.ts";
     *       const p = common([
     *         "./deno/std/path/mod.ts",
     *         "./deno/std/fs/mod.ts",
     *       ]);
     *       console.log(p); // "./deno/std/"
     *
     */
    function common(paths, sep = separator_ts_1.SEP) {
      const [first = "", ...remaining] = paths;
      if (first === "" || remaining.length === 0) {
        return first.substring(0, first.lastIndexOf(sep) + 1);
      }
      const parts = first.split(sep);
      let endOfPrefix = parts.length;
      for (const path of remaining) {
        const compare = path.split(sep);
        for (let i = 0; i < endOfPrefix; i++) {
          if (compare[i] !== parts[i]) {
            endOfPrefix = i;
          }
        }
        if (endOfPrefix === 0) {
          return "";
        }
      }
      const prefix = parts.slice(0, endOfPrefix).join(sep);
      return prefix.endsWith(sep) ? prefix : `${prefix}${sep}`;
    }
    exports_11("common", common);
    return {
      setters: [
        function (separator_ts_1_1) {
          separator_ts_1 = separator_ts_1_1;
        },
      ],
      execute: function () {
      },
    };
  },
);
// This file is ported from globrex@0.1.2
// MIT License
// Copyright (c) 2018 Terkel Gjervig Nielsen
System.register(
  "https://deno.land/std/path/_globrex",
  [],
  function (exports_12, context_12) {
    "use strict";
    var isWin,
      SEP,
      SEP_ESC,
      SEP_RAW,
      GLOBSTAR,
      WILDCARD,
      GLOBSTAR_SEGMENT,
      WILDCARD_SEGMENT;
    var __moduleName = context_12 && context_12.id;
    /**
     * Convert any glob pattern to a JavaScript Regexp object
     * @param glob Glob pattern to convert
     * @param opts Configuration object
     * @returns Converted object with string, segments and RegExp object
     */
    function globrex(
      glob,
      {
        extended = false,
        globstar = false,
        strict = false,
        filepath = false,
        flags = "",
      } = {},
    ) {
      const sepPattern = new RegExp(`^${SEP}${strict ? "" : "+"}$`);
      let regex = "";
      let segment = "";
      let pathRegexStr = "";
      const pathSegments = [];
      // If we are doing extended matching, this boolean is true when we are inside
      // a group (eg {*.html,*.js}), and false otherwise.
      let inGroup = false;
      let inRange = false;
      // extglob stack. Keep track of scope
      const ext = [];
      // Helper function to build string and segments
      function add(str, options = { split: false, last: false, only: "" }) {
        const { split, last, only } = options;
        if (only !== "path") {
          regex += str;
        }
        if (filepath && only !== "regex") {
          pathRegexStr += str.match(sepPattern) ? SEP : str;
          if (split) {
            if (last) {
              segment += str;
            }
            if (segment !== "") {
              // change it 'includes'
              if (!flags.includes("g")) {
                segment = `^${segment}$`;
              }
              pathSegments.push(new RegExp(segment, flags));
            }
            segment = "";
          } else {
            segment += str;
          }
        }
      }
      let c, n;
      for (let i = 0; i < glob.length; i++) {
        c = glob[i];
        n = glob[i + 1];
        if (["\\", "$", "^", ".", "="].includes(c)) {
          add(`\\${c}`);
          continue;
        }
        if (c.match(sepPattern)) {
          add(SEP, { split: true });
          if (n != null && n.match(sepPattern) && !strict) {
            regex += "?";
          }
          continue;
        }
        if (c === "(") {
          if (ext.length) {
            add(`${c}?:`);
            continue;
          }
          add(`\\${c}`);
          continue;
        }
        if (c === ")") {
          if (ext.length) {
            add(c);
            const type = ext.pop();
            if (type === "@") {
              add("{1}");
            } else if (type === "!") {
              add(WILDCARD);
            } else {
              add(type);
            }
            continue;
          }
          add(`\\${c}`);
          continue;
        }
        if (c === "|") {
          if (ext.length) {
            add(c);
            continue;
          }
          add(`\\${c}`);
          continue;
        }
        if (c === "+") {
          if (n === "(" && extended) {
            ext.push(c);
            continue;
          }
          add(`\\${c}`);
          continue;
        }
        if (c === "@" && extended) {
          if (n === "(") {
            ext.push(c);
            continue;
          }
        }
        if (c === "!") {
          if (extended) {
            if (inRange) {
              add("^");
              continue;
            }
            if (n === "(") {
              ext.push(c);
              add("(?!");
              i++;
              continue;
            }
            add(`\\${c}`);
            continue;
          }
          add(`\\${c}`);
          continue;
        }
        if (c === "?") {
          if (extended) {
            if (n === "(") {
              ext.push(c);
            } else {
              add(".");
            }
            continue;
          }
          add(`\\${c}`);
          continue;
        }
        if (c === "[") {
          if (inRange && n === ":") {
            i++; // skip [
            let value = "";
            while (glob[++i] !== ":") {
              value += glob[i];
            }
            if (value === "alnum") {
              add("(?:\\w|\\d)");
            } else if (value === "space") {
              add("\\s");
            } else if (value === "digit") {
              add("\\d");
            }
            i++; // skip last ]
            continue;
          }
          if (extended) {
            inRange = true;
            add(c);
            continue;
          }
          add(`\\${c}`);
          continue;
        }
        if (c === "]") {
          if (extended) {
            inRange = false;
            add(c);
            continue;
          }
          add(`\\${c}`);
          continue;
        }
        if (c === "{") {
          if (extended) {
            inGroup = true;
            add("(?:");
            continue;
          }
          add(`\\${c}`);
          continue;
        }
        if (c === "}") {
          if (extended) {
            inGroup = false;
            add(")");
            continue;
          }
          add(`\\${c}`);
          continue;
        }
        if (c === ",") {
          if (inGroup) {
            add("|");
            continue;
          }
          add(`\\${c}`);
          continue;
        }
        if (c === "*") {
          if (n === "(" && extended) {
            ext.push(c);
            continue;
          }
          // Move over all consecutive "*"'s.
          // Also store the previous and next characters
          const prevChar = glob[i - 1];
          let starCount = 1;
          while (glob[i + 1] === "*") {
            starCount++;
            i++;
          }
          const nextChar = glob[i + 1];
          if (!globstar) {
            // globstar is disabled, so treat any number of "*" as one
            add(".*");
          } else {
            // globstar is enabled, so determine if this is a globstar segment
            const isGlobstar = starCount > 1 && // multiple "*"'s
              // from the start of the segment
              [SEP_RAW, "/", undefined].includes(prevChar) &&
              // to the end of the segment
              [SEP_RAW, "/", undefined].includes(nextChar);
            if (isGlobstar) {
              // it's a globstar, so match zero or more path segments
              add(GLOBSTAR, { only: "regex" });
              add(GLOBSTAR_SEGMENT, { only: "path", last: true, split: true });
              i++; // move over the "/"
            } else {
              // it's not a globstar, so only match one path segment
              add(WILDCARD, { only: "regex" });
              add(WILDCARD_SEGMENT, { only: "path" });
            }
          }
          continue;
        }
        add(c);
      }
      // When regexp 'g' flag is specified don't
      // constrain the regular expression with ^ & $
      if (!flags.includes("g")) {
        regex = `^${regex}$`;
        segment = `^${segment}$`;
        if (filepath) {
          pathRegexStr = `^${pathRegexStr}$`;
        }
      }
      const result = { regex: new RegExp(regex, flags) };
      // Push the last segment
      if (filepath) {
        pathSegments.push(new RegExp(segment, flags));
        result.path = {
          regex: new RegExp(pathRegexStr, flags),
          segments: pathSegments,
          globstar: new RegExp(
            !flags.includes("g") ? `^${GLOBSTAR_SEGMENT}$` : GLOBSTAR_SEGMENT,
            flags,
          ),
        };
      }
      return result;
    }
    exports_12("globrex", globrex);
    return {
      setters: [],
      execute: function () {
        isWin = Deno.build.os === "windows";
        SEP = isWin ? `(?:\\\\|\\/)` : `\\/`;
        SEP_ESC = isWin ? `\\\\` : `/`;
        SEP_RAW = isWin ? `\\` : `/`;
        GLOBSTAR = `(?:(?:[^${SEP_ESC}/]*(?:${SEP_ESC}|\/|$))*)`;
        WILDCARD = `(?:[^${SEP_ESC}/]*)`;
        GLOBSTAR_SEGMENT = `((?:[^${SEP_ESC}/]*(?:${SEP_ESC}|\/|$))*)`;
        WILDCARD_SEGMENT = `(?:[^${SEP_ESC}/]*)`;
      },
    };
  },
);
System.register(
  "https://deno.land/std/path/glob",
  [
    "https://deno.land/std/path/separator",
    "https://deno.land/std/path/_globrex",
    "https://deno.land/std/path/mod",
    "https://deno.land/std/testing/asserts",
  ],
  function (exports_13, context_13) {
    "use strict";
    var separator_ts_2, _globrex_ts_1, mod_ts_1, asserts_ts_2;
    var __moduleName = context_13 && context_13.id;
    /**
     * Generate a regex based on glob pattern and options
     * This was meant to be using the the `fs.walk` function
     * but can be used anywhere else.
     * Examples:
     *
     *     Looking for all the `ts` files:
     *     walkSync(".", {
     *       match: [globToRegExp("*.ts")]
     *     })
     *
     *     Looking for all the `.json` files in any subfolder:
     *     walkSync(".", {
     *       match: [globToRegExp(join("a", "**", "*.json"),{
     *         flags: "g",
     *         extended: true,
     *         globstar: true
     *       })]
     *     })
     *
     * @param glob - Glob pattern to be used
     * @param options - Specific options for the glob pattern
     * @returns A RegExp for the glob pattern
     */
    function globToRegExp(glob, { extended = false, globstar = true } = {}) {
      const result = _globrex_ts_1.globrex(glob, {
        extended,
        globstar,
        strict: false,
        filepath: true,
      });
      asserts_ts_2.assert(result.path != null);
      return result.path.regex;
    }
    exports_13("globToRegExp", globToRegExp);
    /** Test whether the given string is a glob */
    function isGlob(str) {
      const chars = { "{": "}", "(": ")", "[": "]" };
      /* eslint-disable-next-line max-len */
      const regex =
        /\\(.)|(^!|\*|[\].+)]\?|\[[^\\\]]+\]|\{[^\\}]+\}|\(\?[:!=][^\\)]+\)|\([^|]+\|[^\\)]+\))/;
      if (str === "") {
        return false;
      }
      let match;
      while ((match = regex.exec(str))) {
        if (match[2]) {
          return true;
        }
        let idx = match.index + match[0].length;
        // if an open bracket/brace/paren is escaped,
        // set the index to the next closing character
        const open = match[1];
        const close = open ? chars[open] : null;
        if (open && close) {
          const n = str.indexOf(close, idx);
          if (n !== -1) {
            idx = n + 1;
          }
        }
        str = str.slice(idx);
      }
      return false;
    }
    exports_13("isGlob", isGlob);
    /** Like normalize(), but doesn't collapse "**\/.." when `globstar` is true. */
    function normalizeGlob(glob, { globstar = false } = {}) {
      if (!!glob.match(/\0/g)) {
        throw new Error(`Glob contains invalid characters: "${glob}"`);
      }
      if (!globstar) {
        return mod_ts_1.normalize(glob);
      }
      const s = separator_ts_2.SEP_PATTERN.source;
      const badParentPattern = new RegExp(
        `(?<=(${s}|^)\\*\\*${s})\\.\\.(?=${s}|$)`,
        "g",
      );
      return mod_ts_1.normalize(glob.replace(badParentPattern, "\0")).replace(
        /\0/g,
        "..",
      );
    }
    exports_13("normalizeGlob", normalizeGlob);
    /** Like join(), but doesn't collapse "**\/.." when `globstar` is true. */
    function joinGlobs(globs, { extended = false, globstar = false } = {}) {
      if (!globstar || globs.length == 0) {
        return mod_ts_1.join(...globs);
      }
      if (globs.length === 0) {
        return ".";
      }
      let joined;
      for (const glob of globs) {
        const path = glob;
        if (path.length > 0) {
          if (!joined) {
            joined = path;
          } else {
            joined += `${separator_ts_2.SEP}${path}`;
          }
        }
      }
      if (!joined) {
        return ".";
      }
      return normalizeGlob(joined, { extended, globstar });
    }
    exports_13("joinGlobs", joinGlobs);
    return {
      setters: [
        function (separator_ts_2_1) {
          separator_ts_2 = separator_ts_2_1;
        },
        function (_globrex_ts_1_1) {
          _globrex_ts_1 = _globrex_ts_1_1;
        },
        function (mod_ts_1_1) {
          mod_ts_1 = mod_ts_1_1;
        },
        function (asserts_ts_2_1) {
          asserts_ts_2 = asserts_ts_2_1;
        },
      ],
      execute: function () {
      },
    };
  },
);
// Copyright the Browserify authors. MIT License.
// Ported mostly from https://github.com/browserify/path-browserify/
System.register(
  "https://deno.land/std/path/mod",
  [
    "https://deno.land/std/path/win32",
    "https://deno.land/std/path/posix",
    "https://deno.land/std/path/common",
    "https://deno.land/std/path/separator",
    "https://deno.land/std/path/interface",
    "https://deno.land/std/path/glob",
  ],
  function (exports_14, context_14) {
    "use strict";
    var _win32,
      _posix,
      isWindows,
      path,
      win32,
      posix,
      basename,
      delimiter,
      dirname,
      extname,
      format,
      fromFileUrl,
      isAbsolute,
      join,
      normalize,
      parse,
      relative,
      resolve,
      sep,
      toNamespacedPath;
    var __moduleName = context_14 && context_14.id;
    var exportedNames_1 = {
      "win32": true,
      "posix": true,
      "basename": true,
      "delimiter": true,
      "dirname": true,
      "extname": true,
      "format": true,
      "fromFileUrl": true,
      "isAbsolute": true,
      "join": true,
      "normalize": true,
      "parse": true,
      "relative": true,
      "resolve": true,
      "sep": true,
      "toNamespacedPath": true,
      "SEP": true,
      "SEP_PATTERN": true,
    };
    function exportStar_1(m) {
      var exports = {};
      for (var n in m) {
        if (n !== "default" && !exportedNames_1.hasOwnProperty(n)) {
          exports[n] = m[n];
        }
      }
      exports_14(exports);
    }
    return {
      setters: [
        function (_win32_1) {
          _win32 = _win32_1;
        },
        function (_posix_1) {
          _posix = _posix_1;
        },
        function (common_ts_1_1) {
          exportStar_1(common_ts_1_1);
        },
        function (separator_ts_3_1) {
          exports_14({
            "SEP": separator_ts_3_1["SEP"],
            "SEP_PATTERN": separator_ts_3_1["SEP_PATTERN"],
          });
        },
        function (interface_ts_1_1) {
          exportStar_1(interface_ts_1_1);
        },
        function (glob_ts_1_1) {
          exportStar_1(glob_ts_1_1);
        },
      ],
      execute: function () {
        isWindows = Deno.build.os == "windows";
        path = isWindows ? _win32 : _posix;
        exports_14("win32", win32 = _win32);
        exports_14("posix", posix = _posix);
        exports_14("basename", basename = path.basename),
          exports_14("delimiter", delimiter = path.delimiter),
          exports_14("dirname", dirname = path.dirname),
          exports_14("extname", extname = path.extname),
          exports_14("format", format = path.format),
          exports_14("fromFileUrl", fromFileUrl = path.fromFileUrl),
          exports_14("isAbsolute", isAbsolute = path.isAbsolute),
          exports_14("join", join = path.join),
          exports_14("normalize", normalize = path.normalize),
          exports_14("parse", parse = path.parse),
          exports_14("relative", relative = path.relative),
          exports_14("resolve", resolve = path.resolve),
          exports_14("sep", sep = path.sep),
          exports_14(
            "toNamespacedPath",
            toNamespacedPath = path.toNamespacedPath,
          );
      },
    };
  },
);
System.register(
  "file:///C:/bndes-java-env.kit/bootstrap/levain/lib/repository",
  [],
  function (exports_15, context_15) {
    "use strict";
    var __moduleName = context_15 && context_15.id;
    return {
      setters: [],
      execute: function () {
      },
    };
  },
);
System.register(
  "file:///C:/bndes-java-env.kit/bootstrap/levain/lib/package",
  [],
  function (exports_16, context_16) {
    "use strict";
    var Package;
    var __moduleName = context_16 && context_16.id;
    return {
      setters: [],
      execute: function () {
        Package = class Package {
          constructor(_name, _yamlFile, _yamlStruc, _repo) {
            this._name = _name;
            this._yamlFile = _yamlFile;
            this._yamlStruc = _yamlStruc;
            this._repo = _repo;
            this._dependencies = undefined;
            if (this._yamlStruc) {
              if (this._yamlStruc.dependencies) {
                this._dependencies = this._yamlStruc.dependencies;
              }
            }
            this._dependencies = this.normalizeDeps(this._dependencies);
          }
          get name() {
            return this._name;
          }
          get yaml() {
            return this._yamlFile;
          }
          get dependencies() {
            return this._dependencies;
          }
          get repo() {
            return this._repo;
          }
          yamlItem(key) {
            if (this._yamlStruc) {
              return this._yamlStruc[key];
            }
            return undefined;
          }
          toString() {
            return "Package[" +
              "name=" + this.name +
              ", yaml=" + this.yaml +
              (this._yamlStruc ? ", pkgDef=" + JSON.stringify(this._yamlStruc)
              : "") +
              (this.dependencies ? ", deps=" + this.dependencies : "") +
              "]";
          }
          normalizeDeps(deps) {
            if (this._name == "levain") {
              return undefined;
            }
            let set = new Set();
            set.add("levain"); // first dependency
            if (deps) {
              deps.forEach((v) => set.add(v));
            }
            return [...set];
          }
        };
        exports_16("default", Package);
      },
    };
  },
);
System.register(
  "file:///C:/bndes-java-env.kit/bootstrap/levain/lib/repositories/cache",
  [],
  function (exports_17, context_17) {
    "use strict";
    var CacheRepository;
    var __moduleName = context_17 && context_17.id;
    return {
      setters: [],
      execute: function () {
        CacheRepository = class CacheRepository {
          // eslint-disable-next-line no-useless-constructor
          constructor(config, repository) {
            this.config = config;
            this.repository = repository;
            this.cache = new Map();
          }
          resolvePackage(packageName) {
            if (this.cache.has(packageName)) {
              return this.cache.get(packageName);
            }
            if (!this.repository) {
              return undefined;
            }
            const pkg = this.repository.resolvePackage(packageName);
            if (pkg) {
              this.cache.set(packageName, pkg);
            }
            return pkg;
          }
        };
        exports_17("default", CacheRepository);
      },
    };
  },
);
System.register(
  "file:///C:/bndes-java-env.kit/bootstrap/levain/lib/repositories/chain",
  [],
  function (exports_18, context_18) {
    "use strict";
    var ChainRepository;
    var __moduleName = context_18 && context_18.id;
    return {
      setters: [],
      execute: function () {
        ChainRepository = class ChainRepository {
          constructor(config, repositories) {
            this.config = config;
            this.repositories = repositories;
          }
          resolvePackage(packageName) {
            if (!this.repositories) {
              return undefined;
            }
            for (const repo of this.repositories) {
              const pkg = repo.resolvePackage(packageName);
              if (pkg) {
                return pkg;
              }
            }
            return undefined;
          }
        };
        exports_18("default", ChainRepository);
      },
    };
  },
);
System.register(
  "file:///C:/bndes-java-env.kit/bootstrap/levain/lib/repositories/null",
  [],
  function (exports_19, context_19) {
    "use strict";
    var NullRepository;
    var __moduleName = context_19 && context_19.id;
    return {
      setters: [],
      execute: function () {
        NullRepository = class NullRepository {
          constructor(config) {
            this.config = config;
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          resolvePackage(packageName) {
            return undefined;
          }
        };
        exports_19("default", NullRepository);
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/utils",
  [],
  function (exports_20, context_20) {
    "use strict";
    var __moduleName = context_20 && context_20.id;
    function isNothing(subject) {
      return typeof subject === "undefined" || subject === null;
    }
    exports_20("isNothing", isNothing);
    function isArray(value) {
      return Array.isArray(value);
    }
    exports_20("isArray", isArray);
    function isBoolean(value) {
      return typeof value === "boolean" || value instanceof Boolean;
    }
    exports_20("isBoolean", isBoolean);
    function isNull(value) {
      return value === null;
    }
    exports_20("isNull", isNull);
    function isNumber(value) {
      return typeof value === "number" || value instanceof Number;
    }
    exports_20("isNumber", isNumber);
    function isString(value) {
      return typeof value === "string" || value instanceof String;
    }
    exports_20("isString", isString);
    function isSymbol(value) {
      return typeof value === "symbol";
    }
    exports_20("isSymbol", isSymbol);
    function isUndefined(value) {
      return value === undefined;
    }
    exports_20("isUndefined", isUndefined);
    function isObject(value) {
      return value !== null && typeof value === "object";
    }
    exports_20("isObject", isObject);
    function isError(e) {
      return e instanceof Error;
    }
    exports_20("isError", isError);
    function isFunction(value) {
      return typeof value === "function";
    }
    exports_20("isFunction", isFunction);
    function isRegExp(value) {
      return value instanceof RegExp;
    }
    exports_20("isRegExp", isRegExp);
    function toArray(sequence) {
      if (isArray(sequence)) {
        return sequence;
      }
      if (isNothing(sequence)) {
        return [];
      }
      return [sequence];
    }
    exports_20("toArray", toArray);
    function repeat(str, count) {
      let result = "";
      for (let cycle = 0; cycle < count; cycle++) {
        result += str;
      }
      return result;
    }
    exports_20("repeat", repeat);
    function isNegativeZero(i) {
      return i === 0 && Number.NEGATIVE_INFINITY === 1 / i;
    }
    exports_20("isNegativeZero", isNegativeZero);
    return {
      setters: [],
      execute: function () {
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/mark",
  ["https://deno.land/std/encoding/_yaml/utils"],
  function (exports_21, context_21) {
    "use strict";
    var utils_ts_1, Mark;
    var __moduleName = context_21 && context_21.id;
    return {
      setters: [
        function (utils_ts_1_1) {
          utils_ts_1 = utils_ts_1_1;
        },
      ],
      execute: function () {
        Mark = class Mark {
          constructor(name, buffer, position, line, column) {
            this.name = name;
            this.buffer = buffer;
            this.position = position;
            this.line = line;
            this.column = column;
          }
          getSnippet(indent = 4, maxLength = 75) {
            if (!this.buffer) {
              return null;
            }
            let head = "";
            let start = this.position;
            while (
              start > 0 &&
              "\x00\r\n\x85\u2028\u2029".indexOf(
                  this.buffer.charAt(start - 1),
                ) === -1
            ) {
              start -= 1;
              if (this.position - start > maxLength / 2 - 1) {
                head = " ... ";
                start += 5;
                break;
              }
            }
            let tail = "";
            let end = this.position;
            while (
              end < this.buffer.length &&
              "\x00\r\n\x85\u2028\u2029".indexOf(this.buffer.charAt(end)) ===
                -1
            ) {
              end += 1;
              if (end - this.position > maxLength / 2 - 1) {
                tail = " ... ";
                end -= 5;
                break;
              }
            }
            const snippet = this.buffer.slice(start, end);
            return `${
              utils_ts_1.repeat(" ", indent)
            }${head}${snippet}${tail}\n${
              utils_ts_1.repeat(
                " ",
                indent + this.position - start + head.length,
              )
            }^`;
          }
          toString(compact) {
            let snippet, where = "";
            if (this.name) {
              where += `in "${this.name}" `;
            }
            where += `at line ${this.line + 1}, column ${this.column + 1}`;
            if (!compact) {
              snippet = this.getSnippet();
              if (snippet) {
                where += `:\n${snippet}`;
              }
            }
            return where;
          }
        };
        exports_21("Mark", Mark);
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/error",
  [],
  function (exports_22, context_22) {
    "use strict";
    var YAMLError;
    var __moduleName = context_22 && context_22.id;
    return {
      setters: [],
      execute: function () {
        YAMLError = class YAMLError extends Error {
          constructor(message = "(unknown reason)", mark = "") {
            super(`${message} ${mark}`);
            this.mark = mark;
            this.name = this.constructor.name;
          }
          toString(_compact) {
            return `${this.name}: ${this.message} ${this.mark}`;
          }
        };
        exports_22("YAMLError", YAMLError);
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/type",
  [],
  function (exports_23, context_23) {
    "use strict";
    var DEFAULT_RESOLVE, DEFAULT_CONSTRUCT, Type;
    var __moduleName = context_23 && context_23.id;
    function checkTagFormat(tag) {
      return tag;
    }
    return {
      setters: [],
      execute: function () {
        DEFAULT_RESOLVE = () => true;
        DEFAULT_CONSTRUCT = (data) => data;
        Type = class Type {
          constructor(tag, options) {
            this.kind = null;
            this.resolve = () => true;
            this.construct = (data) => data;
            this.tag = checkTagFormat(tag);
            if (options) {
              this.kind = options.kind;
              this.resolve = options.resolve || DEFAULT_RESOLVE;
              this.construct = options.construct || DEFAULT_CONSTRUCT;
              this.instanceOf = options.instanceOf;
              this.predicate = options.predicate;
              this.represent = options.represent;
              this.defaultStyle = options.defaultStyle;
              this.styleAliases = options.styleAliases;
            }
          }
        };
        exports_23("Type", Type);
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/schema",
  ["https://deno.land/std/encoding/_yaml/error"],
  function (exports_24, context_24) {
    "use strict";
    var error_ts_1, Schema;
    var __moduleName = context_24 && context_24.id;
    function compileList(schema, name, result) {
      const exclude = [];
      for (const includedSchema of schema.include) {
        result = compileList(includedSchema, name, result);
      }
      for (const currentType of schema[name]) {
        for (
          let previousIndex = 0; previousIndex < result.length; previousIndex++
        ) {
          const previousType = result[previousIndex];
          if (
            previousType.tag === currentType.tag &&
            previousType.kind === currentType.kind
          ) {
            exclude.push(previousIndex);
          }
        }
        result.push(currentType);
      }
      return result.filter((type, index) => !exclude.includes(index));
    }
    function compileMap(...typesList) {
      const result = {
        fallback: {},
        mapping: {},
        scalar: {},
        sequence: {},
      };
      for (const types of typesList) {
        for (const type of types) {
          if (type.kind !== null) {
            result[type.kind][type.tag] = result["fallback"][type.tag] = type;
          }
        }
      }
      return result;
    }
    return {
      setters: [
        function (error_ts_1_1) {
          error_ts_1 = error_ts_1_1;
        },
      ],
      execute: function () {
        Schema = class Schema {
          constructor(definition) {
            this.explicit = definition.explicit || [];
            this.implicit = definition.implicit || [];
            this.include = definition.include || [];
            for (const type of this.implicit) {
              if (type.loadKind && type.loadKind !== "scalar") {
                throw new error_ts_1.YAMLError(
                  // eslint-disable-next-line max-len
                  "There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.",
                );
              }
            }
            this.compiledImplicit = compileList(this, "implicit", []);
            this.compiledExplicit = compileList(this, "explicit", []);
            this.compiledTypeMap = compileMap(
              this.compiledImplicit,
              this.compiledExplicit,
            );
          }
          static create() {}
        };
        exports_24("Schema", Schema);
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/type/binary",
  ["https://deno.land/std/encoding/_yaml/type"],
  function (exports_25, context_25) {
    "use strict";
    var type_ts_1, Buffer, BASE64_MAP, binary;
    var __moduleName = context_25 && context_25.id;
    function resolveYamlBinary(data) {
      if (data === null) {
        return false;
      }
      let code;
      let bitlen = 0;
      const max = data.length;
      const map = BASE64_MAP;
      // Convert one by one.
      for (let idx = 0; idx < max; idx++) {
        code = map.indexOf(data.charAt(idx));
        // Skip CR/LF
        if (code > 64) {
          continue;
        }
        // Fail on illegal characters
        if (code < 0) {
          return false;
        }
        bitlen += 6;
      }
      // If there are any bits left, source was corrupted
      return bitlen % 8 === 0;
    }
    function constructYamlBinary(data) {
      // remove CR/LF & padding to simplify scan
      const input = data.replace(/[\r\n=]/g, "");
      const max = input.length;
      const map = BASE64_MAP;
      // Collect by 6*4 bits (3 bytes)
      const result = [];
      let bits = 0;
      for (let idx = 0; idx < max; idx++) {
        if (idx % 4 === 0 && idx) {
          result.push((bits >> 16) & 0xff);
          result.push((bits >> 8) & 0xff);
          result.push(bits & 0xff);
        }
        bits = (bits << 6) | map.indexOf(input.charAt(idx));
      }
      // Dump tail
      const tailbits = (max % 4) * 6;
      if (tailbits === 0) {
        result.push((bits >> 16) & 0xff);
        result.push((bits >> 8) & 0xff);
        result.push(bits & 0xff);
      } else if (tailbits === 18) {
        result.push((bits >> 10) & 0xff);
        result.push((bits >> 2) & 0xff);
      } else if (tailbits === 12) {
        result.push((bits >> 4) & 0xff);
      }
      return new Buffer(new Uint8Array(result));
    }
    function representYamlBinary(object) {
      const max = object.length;
      const map = BASE64_MAP;
      // Convert every three bytes to 4 ASCII characters.
      let result = "";
      let bits = 0;
      for (let idx = 0; idx < max; idx++) {
        if (idx % 3 === 0 && idx) {
          result += map[(bits >> 18) & 0x3f];
          result += map[(bits >> 12) & 0x3f];
          result += map[(bits >> 6) & 0x3f];
          result += map[bits & 0x3f];
        }
        bits = (bits << 8) + object[idx];
      }
      // Dump tail
      const tail = max % 3;
      if (tail === 0) {
        result += map[(bits >> 18) & 0x3f];
        result += map[(bits >> 12) & 0x3f];
        result += map[(bits >> 6) & 0x3f];
        result += map[bits & 0x3f];
      } else if (tail === 2) {
        result += map[(bits >> 10) & 0x3f];
        result += map[(bits >> 4) & 0x3f];
        result += map[(bits << 2) & 0x3f];
        result += map[64];
      } else if (tail === 1) {
        result += map[(bits >> 2) & 0x3f];
        result += map[(bits << 4) & 0x3f];
        result += map[64];
        result += map[64];
      }
      return result;
    }
    function isBinary(obj) {
      const buf = new Buffer();
      try {
        if (0 > buf.readFromSync(obj)) {
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        buf.reset();
      }
    }
    return {
      setters: [
        function (type_ts_1_1) {
          type_ts_1 = type_ts_1_1;
        },
      ],
      execute: function () {
        Buffer = Deno.Buffer;
        // [ 64, 65, 66 ] -> [ padding, CR, LF ]
        BASE64_MAP =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
        exports_25(
          "binary",
          binary = new type_ts_1.Type("tag:yaml.org,2002:binary", {
            construct: constructYamlBinary,
            kind: "scalar",
            predicate: isBinary,
            represent: representYamlBinary,
            resolve: resolveYamlBinary,
          }),
        );
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/type/bool",
  [
    "https://deno.land/std/encoding/_yaml/type",
    "https://deno.land/std/encoding/_yaml/utils",
  ],
  function (exports_26, context_26) {
    "use strict";
    var type_ts_2, utils_ts_2, bool;
    var __moduleName = context_26 && context_26.id;
    function resolveYamlBoolean(data) {
      const max = data.length;
      return ((max === 4 &&
        (data === "true" || data === "True" || data === "TRUE")) ||
        (max === 5 &&
          (data === "false" || data === "False" || data === "FALSE")));
    }
    function constructYamlBoolean(data) {
      return data === "true" || data === "True" || data === "TRUE";
    }
    return {
      setters: [
        function (type_ts_2_1) {
          type_ts_2 = type_ts_2_1;
        },
        function (utils_ts_2_1) {
          utils_ts_2 = utils_ts_2_1;
        },
      ],
      execute: function () {
        exports_26(
          "bool",
          bool = new type_ts_2.Type("tag:yaml.org,2002:bool", {
            construct: constructYamlBoolean,
            defaultStyle: "lowercase",
            kind: "scalar",
            predicate: utils_ts_2.isBoolean,
            represent: {
              lowercase(object) {
                return object ? "true" : "false";
              },
              uppercase(object) {
                return object ? "TRUE" : "FALSE";
              },
              camelcase(object) {
                return object ? "True" : "False";
              },
            },
            resolve: resolveYamlBoolean,
          }),
        );
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/type/float",
  [
    "https://deno.land/std/encoding/_yaml/type",
    "https://deno.land/std/encoding/_yaml/utils",
  ],
  function (exports_27, context_27) {
    "use strict";
    var type_ts_3,
      utils_ts_3,
      YAML_FLOAT_PATTERN,
      SCIENTIFIC_WITHOUT_DOT,
      float;
    var __moduleName = context_27 && context_27.id;
    function resolveYamlFloat(data) {
      if (
        !YAML_FLOAT_PATTERN.test(data) ||
        // Quick hack to not allow integers end with `_`
        // Probably should update regexp & check speed
        data[data.length - 1] === "_"
      ) {
        return false;
      }
      return true;
    }
    function constructYamlFloat(data) {
      let value = data.replace(/_/g, "").toLowerCase();
      const sign = value[0] === "-" ? -1 : 1;
      const digits = [];
      if ("+-".indexOf(value[0]) >= 0) {
        value = value.slice(1);
      }
      if (value === ".inf") {
        return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      }
      if (value === ".nan") {
        return NaN;
      }
      if (value.indexOf(":") >= 0) {
        value.split(":").forEach((v) => {
          digits.unshift(parseFloat(v));
        });
        let valueNb = 0.0;
        let base = 1;
        digits.forEach((d) => {
          valueNb += d * base;
          base *= 60;
        });
        return sign * valueNb;
      }
      return sign * parseFloat(value);
    }
    function representYamlFloat(object, style) {
      if (isNaN(object)) {
        switch (style) {
          case "lowercase":
            return ".nan";
          case "uppercase":
            return ".NAN";
          case "camelcase":
            return ".NaN";
        }
      } else if (Number.POSITIVE_INFINITY === object) {
        switch (style) {
          case "lowercase":
            return ".inf";
          case "uppercase":
            return ".INF";
          case "camelcase":
            return ".Inf";
        }
      } else if (Number.NEGATIVE_INFINITY === object) {
        switch (style) {
          case "lowercase":
            return "-.inf";
          case "uppercase":
            return "-.INF";
          case "camelcase":
            return "-.Inf";
        }
      } else if (utils_ts_3.isNegativeZero(object)) {
        return "-0.0";
      }
      const res = object.toString(10);
      // JS stringifier can build scientific format without dots: 5e-100,
      // while YAML requres dot: 5.e-100. Fix it with simple hack
      return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
    }
    function isFloat(object) {
      return (Object.prototype.toString.call(object) === "[object Number]" &&
        (object % 1 !== 0 || utils_ts_3.isNegativeZero(object)));
    }
    return {
      setters: [
        function (type_ts_3_1) {
          type_ts_3 = type_ts_3_1;
        },
        function (utils_ts_3_1) {
          utils_ts_3 = utils_ts_3_1;
        },
      ],
      execute: function () {
        YAML_FLOAT_PATTERN = new RegExp(
          // 2.5e4, 2.5 and integers
          "^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?" +
            // .2e4, .2
            // special case, seems not from spec
            "|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?" +
            // 20:59
            "|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*" +
            // .inf
            "|[-+]?\\.(?:inf|Inf|INF)" +
            // .nan
            "|\\.(?:nan|NaN|NAN))$",
        );
        SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
        exports_27(
          "float",
          float = new type_ts_3.Type("tag:yaml.org,2002:float", {
            construct: constructYamlFloat,
            defaultStyle: "lowercase",
            kind: "scalar",
            predicate: isFloat,
            represent: representYamlFloat,
            resolve: resolveYamlFloat,
          }),
        );
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/type/int",
  [
    "https://deno.land/std/encoding/_yaml/type",
    "https://deno.land/std/encoding/_yaml/utils",
  ],
  function (exports_28, context_28) {
    "use strict";
    var type_ts_4, utils_ts_4, int;
    var __moduleName = context_28 && context_28.id;
    function isHexCode(c) {
      return ((0x30 <= /* 0 */ c && c <= 0x39) /* 9 */ ||
        (0x41 <= /* A */ c && c <= 0x46) /* F */ ||
        (0x61 <= /* a */ c && c <= 0x66) /* f */);
    }
    function isOctCode(c) {
      return 0x30 <= /* 0 */ c && c <= 0x37 /* 7 */;
    }
    function isDecCode(c) {
      return 0x30 <= /* 0 */ c && c <= 0x39 /* 9 */;
    }
    function resolveYamlInteger(data) {
      const max = data.length;
      let index = 0;
      let hasDigits = false;
      if (!max) {
        return false;
      }
      let ch = data[index];
      // sign
      if (ch === "-" || ch === "+") {
        ch = data[++index];
      }
      if (ch === "0") {
        // 0
        if (index + 1 === max) {
          return true;
        }
        ch = data[++index];
        // base 2, base 8, base 16
        if (ch === "b") {
          // base 2
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch === "_") {
              continue;
            }
            if (ch !== "0" && ch !== "1") {
              return false;
            }
            hasDigits = true;
          }
          return hasDigits && ch !== "_";
        }
        if (ch === "x") {
          // base 16
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch === "_") {
              continue;
            }
            if (!isHexCode(data.charCodeAt(index))) {
              return false;
            }
            hasDigits = true;
          }
          return hasDigits && ch !== "_";
        }
        // base 8
        for (; index < max; index++) {
          ch = data[index];
          if (ch === "_") {
            continue;
          }
          if (!isOctCode(data.charCodeAt(index))) {
            return false;
          }
          hasDigits = true;
        }
        return hasDigits && ch !== "_";
      }
      // base 10 (except 0) or base 60
      // value should not start with `_`;
      if (ch === "_") {
        return false;
      }
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") {
          continue;
        }
        if (ch === ":") {
          break;
        }
        if (!isDecCode(data.charCodeAt(index))) {
          return false;
        }
        hasDigits = true;
      }
      // Should have digits and should not end with `_`
      if (!hasDigits || ch === "_") {
        return false;
      }
      // if !base60 - done;
      if (ch !== ":") {
        return true;
      }
      // base60 almost not used, no needs to optimize
      return /^(:[0-5]?[0-9])+$/.test(data.slice(index));
    }
    function constructYamlInteger(data) {
      let value = data;
      const digits = [];
      if (value.indexOf("_") !== -1) {
        value = value.replace(/_/g, "");
      }
      let sign = 1;
      let ch = value[0];
      if (ch === "-" || ch === "+") {
        if (ch === "-") {
          sign = -1;
        }
        value = value.slice(1);
        ch = value[0];
      }
      if (value === "0") {
        return 0;
      }
      if (ch === "0") {
        if (value[1] === "b") {
          return sign * parseInt(value.slice(2), 2);
        }
        if (value[1] === "x") {
          return sign * parseInt(value, 16);
        }
        return sign * parseInt(value, 8);
      }
      if (value.indexOf(":") !== -1) {
        value.split(":").forEach((v) => {
          digits.unshift(parseInt(v, 10));
        });
        let valueInt = 0;
        let base = 1;
        digits.forEach((d) => {
          valueInt += d * base;
          base *= 60;
        });
        return sign * valueInt;
      }
      return sign * parseInt(value, 10);
    }
    function isInteger(object) {
      return (Object.prototype.toString.call(object) === "[object Number]" &&
        object % 1 === 0 &&
        !utils_ts_4.isNegativeZero(object));
    }
    return {
      setters: [
        function (type_ts_4_1) {
          type_ts_4 = type_ts_4_1;
        },
        function (utils_ts_4_1) {
          utils_ts_4 = utils_ts_4_1;
        },
      ],
      execute: function () {
        exports_28(
          "int",
          int = new type_ts_4.Type("tag:yaml.org,2002:int", {
            construct: constructYamlInteger,
            defaultStyle: "decimal",
            kind: "scalar",
            predicate: isInteger,
            represent: {
              binary(obj) {
                return obj >= 0
                  ? `0b${obj.toString(2)}`
                  : `-0b${obj.toString(2).slice(1)}`;
              },
              octal(obj) {
                return obj >= 0
                  ? `0${obj.toString(8)}`
                  : `-0${obj.toString(8).slice(1)}`;
              },
              decimal(obj) {
                return obj.toString(10);
              },
              hexadecimal(obj) {
                return obj >= 0
                  ? `0x${obj.toString(16).toUpperCase()}`
                  : `-0x${obj.toString(16).toUpperCase().slice(1)}`;
              },
            },
            resolve: resolveYamlInteger,
            styleAliases: {
              binary: [2, "bin"],
              decimal: [10, "dec"],
              hexadecimal: [16, "hex"],
              octal: [8, "oct"],
            },
          }),
        );
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/type/map",
  ["https://deno.land/std/encoding/_yaml/type"],
  function (exports_29, context_29) {
    "use strict";
    var type_ts_5, map;
    var __moduleName = context_29 && context_29.id;
    return {
      setters: [
        function (type_ts_5_1) {
          type_ts_5 = type_ts_5_1;
        },
      ],
      execute: function () {
        exports_29(
          "map",
          map = new type_ts_5.Type("tag:yaml.org,2002:map", {
            construct(data) {
              return data !== null ? data : {};
            },
            kind: "mapping",
          }),
        );
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/type/merge",
  ["https://deno.land/std/encoding/_yaml/type"],
  function (exports_30, context_30) {
    "use strict";
    var type_ts_6, merge;
    var __moduleName = context_30 && context_30.id;
    function resolveYamlMerge(data) {
      return data === "<<" || data === null;
    }
    return {
      setters: [
        function (type_ts_6_1) {
          type_ts_6 = type_ts_6_1;
        },
      ],
      execute: function () {
        exports_30(
          "merge",
          merge = new type_ts_6.Type("tag:yaml.org,2002:merge", {
            kind: "scalar",
            resolve: resolveYamlMerge,
          }),
        );
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/type/nil",
  ["https://deno.land/std/encoding/_yaml/type"],
  function (exports_31, context_31) {
    "use strict";
    var type_ts_7, nil;
    var __moduleName = context_31 && context_31.id;
    function resolveYamlNull(data) {
      const max = data.length;
      return ((max === 1 && data === "~") ||
        (max === 4 && (data === "null" || data === "Null" || data === "NULL")));
    }
    function constructYamlNull() {
      return null;
    }
    function isNull(object) {
      return object === null;
    }
    return {
      setters: [
        function (type_ts_7_1) {
          type_ts_7 = type_ts_7_1;
        },
      ],
      execute: function () {
        exports_31(
          "nil",
          nil = new type_ts_7.Type("tag:yaml.org,2002:null", {
            construct: constructYamlNull,
            defaultStyle: "lowercase",
            kind: "scalar",
            predicate: isNull,
            represent: {
              canonical() {
                return "~";
              },
              lowercase() {
                return "null";
              },
              uppercase() {
                return "NULL";
              },
              camelcase() {
                return "Null";
              },
            },
            resolve: resolveYamlNull,
          }),
        );
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/type/omap",
  ["https://deno.land/std/encoding/_yaml/type"],
  function (exports_32, context_32) {
    "use strict";
    var type_ts_8, _hasOwnProperty, _toString, omap;
    var __moduleName = context_32 && context_32.id;
    function resolveYamlOmap(data) {
      const objectKeys = [];
      let pairKey = "";
      let pairHasKey = false;
      for (const pair of data) {
        pairHasKey = false;
        if (_toString.call(pair) !== "[object Object]") {
          return false;
        }
        for (pairKey in pair) {
          if (_hasOwnProperty.call(pair, pairKey)) {
            if (!pairHasKey) {
              pairHasKey = true;
            } else {
              return false;
            }
          }
        }
        if (!pairHasKey) {
          return false;
        }
        if (objectKeys.indexOf(pairKey) === -1) {
          objectKeys.push(pairKey);
        } else {
          return false;
        }
      }
      return true;
    }
    function constructYamlOmap(data) {
      return data !== null ? data : [];
    }
    return {
      setters: [
        function (type_ts_8_1) {
          type_ts_8 = type_ts_8_1;
        },
      ],
      execute: function () {
        _hasOwnProperty = Object.prototype.hasOwnProperty;
        _toString = Object.prototype.toString;
        exports_32(
          "omap",
          omap = new type_ts_8.Type("tag:yaml.org,2002:omap", {
            construct: constructYamlOmap,
            kind: "sequence",
            resolve: resolveYamlOmap,
          }),
        );
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/type/pairs",
  ["https://deno.land/std/encoding/_yaml/type"],
  function (exports_33, context_33) {
    "use strict";
    var type_ts_9, _toString, pairs;
    var __moduleName = context_33 && context_33.id;
    function resolveYamlPairs(data) {
      const result = new Array(data.length);
      for (let index = 0; index < data.length; index++) {
        const pair = data[index];
        if (_toString.call(pair) !== "[object Object]") {
          return false;
        }
        const keys = Object.keys(pair);
        if (keys.length !== 1) {
          return false;
        }
        result[index] = [keys[0], pair[keys[0]]];
      }
      return true;
    }
    function constructYamlPairs(data) {
      if (data === null) {
        return [];
      }
      const result = new Array(data.length);
      for (let index = 0; index < data.length; index += 1) {
        const pair = data[index];
        const keys = Object.keys(pair);
        result[index] = [keys[0], pair[keys[0]]];
      }
      return result;
    }
    return {
      setters: [
        function (type_ts_9_1) {
          type_ts_9 = type_ts_9_1;
        },
      ],
      execute: function () {
        _toString = Object.prototype.toString;
        exports_33(
          "pairs",
          pairs = new type_ts_9.Type("tag:yaml.org,2002:pairs", {
            construct: constructYamlPairs,
            kind: "sequence",
            resolve: resolveYamlPairs,
          }),
        );
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/type/seq",
  ["https://deno.land/std/encoding/_yaml/type"],
  function (exports_34, context_34) {
    "use strict";
    var type_ts_10, seq;
    var __moduleName = context_34 && context_34.id;
    return {
      setters: [
        function (type_ts_10_1) {
          type_ts_10 = type_ts_10_1;
        },
      ],
      execute: function () {
        exports_34(
          "seq",
          seq = new type_ts_10.Type("tag:yaml.org,2002:seq", {
            construct(data) {
              return data !== null ? data : [];
            },
            kind: "sequence",
          }),
        );
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/type/set",
  ["https://deno.land/std/encoding/_yaml/type"],
  function (exports_35, context_35) {
    "use strict";
    var type_ts_11, _hasOwnProperty, set;
    var __moduleName = context_35 && context_35.id;
    function resolveYamlSet(data) {
      if (data === null) {
        return true;
      }
      for (const key in data) {
        if (_hasOwnProperty.call(data, key)) {
          if (data[key] !== null) {
            return false;
          }
        }
      }
      return true;
    }
    function constructYamlSet(data) {
      return data !== null ? data : {};
    }
    return {
      setters: [
        function (type_ts_11_1) {
          type_ts_11 = type_ts_11_1;
        },
      ],
      execute: function () {
        _hasOwnProperty = Object.prototype.hasOwnProperty;
        exports_35(
          "set",
          set = new type_ts_11.Type("tag:yaml.org,2002:set", {
            construct: constructYamlSet,
            kind: "mapping",
            resolve: resolveYamlSet,
          }),
        );
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/type/str",
  ["https://deno.land/std/encoding/_yaml/type"],
  function (exports_36, context_36) {
    "use strict";
    var type_ts_12, str;
    var __moduleName = context_36 && context_36.id;
    return {
      setters: [
        function (type_ts_12_1) {
          type_ts_12 = type_ts_12_1;
        },
      ],
      execute: function () {
        exports_36(
          "str",
          str = new type_ts_12.Type("tag:yaml.org,2002:str", {
            construct(data) {
              return data !== null ? data : "";
            },
            kind: "scalar",
          }),
        );
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/type/timestamp",
  ["https://deno.land/std/encoding/_yaml/type"],
  function (exports_37, context_37) {
    "use strict";
    var type_ts_13, YAML_DATE_REGEXP, YAML_TIMESTAMP_REGEXP, timestamp;
    var __moduleName = context_37 && context_37.id;
    function resolveYamlTimestamp(data) {
      if (data === null) {
        return false;
      }
      if (YAML_DATE_REGEXP.exec(data) !== null) {
        return true;
      }
      if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) {
        return true;
      }
      return false;
    }
    function constructYamlTimestamp(data) {
      let match = YAML_DATE_REGEXP.exec(data);
      if (match === null) {
        match = YAML_TIMESTAMP_REGEXP.exec(data);
      }
      if (match === null) {
        throw new Error("Date resolve error");
      }
      // match: [1] year [2] month [3] day
      const year = +match[1];
      const month = +match[2] - 1; // JS month starts with 0
      const day = +match[3];
      if (!match[4]) {
        // no hour
        return new Date(Date.UTC(year, month, day));
      }
      // match: [4] hour [5] minute [6] second [7] fraction
      const hour = +match[4];
      const minute = +match[5];
      const second = +match[6];
      let fraction = 0;
      if (match[7]) {
        let partFraction = match[7].slice(0, 3);
        while (partFraction.length < 3) {
          // milli-seconds
          partFraction += "0";
        }
        fraction = +partFraction;
      }
      // match: [8] tz [9] tz_sign [10] tz_hour [11] tz_minute
      let delta = null;
      if (match[9]) {
        const tzHour = +match[10];
        const tzMinute = +(match[11] || 0);
        delta = (tzHour * 60 + tzMinute) * 60000; // delta in mili-seconds
        if (match[9] === "-") {
          delta = -delta;
        }
      }
      const date = new Date(
        Date.UTC(year, month, day, hour, minute, second, fraction),
      );
      if (delta) {
        date.setTime(date.getTime() - delta);
      }
      return date;
    }
    function representYamlTimestamp(date) {
      return date.toISOString();
    }
    return {
      setters: [
        function (type_ts_13_1) {
          type_ts_13 = type_ts_13_1;
        },
      ],
      execute: function () {
        YAML_DATE_REGEXP = new RegExp(
          "^([0-9][0-9][0-9][0-9])" + // [1] year
            "-([0-9][0-9])" + // [2] month
            "-([0-9][0-9])$", // [3] day
        );
        YAML_TIMESTAMP_REGEXP = new RegExp(
          "^([0-9][0-9][0-9][0-9])" + // [1] year
            "-([0-9][0-9]?)" + // [2] month
            "-([0-9][0-9]?)" + // [3] day
            "(?:[Tt]|[ \\t]+)" + // ...
            "([0-9][0-9]?)" + // [4] hour
            ":([0-9][0-9])" + // [5] minute
            ":([0-9][0-9])" + // [6] second
            "(?:\\.([0-9]*))?" + // [7] fraction
            "(?:[ \\t]*(Z|([-+])([0-9][0-9]?)" + // [8] tz [9] tz_sign [10] tz_hour
            "(?::([0-9][0-9]))?))?$", // [11] tz_minute
        );
        exports_37(
          "timestamp",
          timestamp = new type_ts_13.Type("tag:yaml.org,2002:timestamp", {
            construct: constructYamlTimestamp,
            instanceOf: Date,
            kind: "scalar",
            represent: representYamlTimestamp,
            resolve: resolveYamlTimestamp,
          }),
        );
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/type/mod",
  [
    "https://deno.land/std/encoding/_yaml/type/binary",
    "https://deno.land/std/encoding/_yaml/type/bool",
    "https://deno.land/std/encoding/_yaml/type/float",
    "https://deno.land/std/encoding/_yaml/type/int",
    "https://deno.land/std/encoding/_yaml/type/map",
    "https://deno.land/std/encoding/_yaml/type/merge",
    "https://deno.land/std/encoding/_yaml/type/nil",
    "https://deno.land/std/encoding/_yaml/type/omap",
    "https://deno.land/std/encoding/_yaml/type/pairs",
    "https://deno.land/std/encoding/_yaml/type/seq",
    "https://deno.land/std/encoding/_yaml/type/set",
    "https://deno.land/std/encoding/_yaml/type/str",
    "https://deno.land/std/encoding/_yaml/type/timestamp",
  ],
  function (exports_38, context_38) {
    "use strict";
    var __moduleName = context_38 && context_38.id;
    return {
      setters: [
        function (binary_ts_1_1) {
          exports_38({
            "binary": binary_ts_1_1["binary"],
          });
        },
        function (bool_ts_1_1) {
          exports_38({
            "bool": bool_ts_1_1["bool"],
          });
        },
        function (float_ts_1_1) {
          exports_38({
            "float": float_ts_1_1["float"],
          });
        },
        function (int_ts_1_1) {
          exports_38({
            "int": int_ts_1_1["int"],
          });
        },
        function (map_ts_1_1) {
          exports_38({
            "map": map_ts_1_1["map"],
          });
        },
        function (merge_ts_1_1) {
          exports_38({
            "merge": merge_ts_1_1["merge"],
          });
        },
        function (nil_ts_1_1) {
          exports_38({
            "nil": nil_ts_1_1["nil"],
          });
        },
        function (omap_ts_1_1) {
          exports_38({
            "omap": omap_ts_1_1["omap"],
          });
        },
        function (pairs_ts_1_1) {
          exports_38({
            "pairs": pairs_ts_1_1["pairs"],
          });
        },
        function (seq_ts_1_1) {
          exports_38({
            "seq": seq_ts_1_1["seq"],
          });
        },
        function (set_ts_1_1) {
          exports_38({
            "set": set_ts_1_1["set"],
          });
        },
        function (str_ts_1_1) {
          exports_38({
            "str": str_ts_1_1["str"],
          });
        },
        function (timestamp_ts_1_1) {
          exports_38({
            "timestamp": timestamp_ts_1_1["timestamp"],
          });
        },
      ],
      execute: function () {
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/schema/failsafe",
  [
    "https://deno.land/std/encoding/_yaml/schema",
    "https://deno.land/std/encoding/_yaml/type/mod",
  ],
  function (exports_39, context_39) {
    "use strict";
    var schema_ts_1, mod_ts_2, failsafe;
    var __moduleName = context_39 && context_39.id;
    return {
      setters: [
        function (schema_ts_1_1) {
          schema_ts_1 = schema_ts_1_1;
        },
        function (mod_ts_2_1) {
          mod_ts_2 = mod_ts_2_1;
        },
      ],
      execute: function () {
        // Standard YAML's Failsafe schema.
        // http://www.yaml.org/spec/1.2/spec.html#id2802346
        exports_39(
          "failsafe",
          failsafe = new schema_ts_1.Schema({
            explicit: [mod_ts_2.str, mod_ts_2.seq, mod_ts_2.map],
          }),
        );
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/schema/json",
  [
    "https://deno.land/std/encoding/_yaml/schema",
    "https://deno.land/std/encoding/_yaml/type/mod",
    "https://deno.land/std/encoding/_yaml/schema/failsafe",
  ],
  function (exports_40, context_40) {
    "use strict";
    var schema_ts_2, mod_ts_3, failsafe_ts_1, json;
    var __moduleName = context_40 && context_40.id;
    return {
      setters: [
        function (schema_ts_2_1) {
          schema_ts_2 = schema_ts_2_1;
        },
        function (mod_ts_3_1) {
          mod_ts_3 = mod_ts_3_1;
        },
        function (failsafe_ts_1_1) {
          failsafe_ts_1 = failsafe_ts_1_1;
        },
      ],
      execute: function () {
        // Standard YAML's JSON schema.
        // http://www.yaml.org/spec/1.2/spec.html#id2803231
        exports_40(
          "json",
          json = new schema_ts_2.Schema({
            implicit: [
              mod_ts_3.nil,
              mod_ts_3.bool,
              mod_ts_3.int,
              mod_ts_3.float,
            ],
            include: [failsafe_ts_1.failsafe],
          }),
        );
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/schema/core",
  [
    "https://deno.land/std/encoding/_yaml/schema",
    "https://deno.land/std/encoding/_yaml/schema/json",
  ],
  function (exports_41, context_41) {
    "use strict";
    var schema_ts_3, json_ts_1, core;
    var __moduleName = context_41 && context_41.id;
    return {
      setters: [
        function (schema_ts_3_1) {
          schema_ts_3 = schema_ts_3_1;
        },
        function (json_ts_1_1) {
          json_ts_1 = json_ts_1_1;
        },
      ],
      execute: function () {
        // Standard YAML's Core schema.
        // http://www.yaml.org/spec/1.2/spec.html#id2804923
        exports_41(
          "core",
          core = new schema_ts_3.Schema({
            include: [json_ts_1.json],
          }),
        );
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/schema/default",
  [
    "https://deno.land/std/encoding/_yaml/schema",
    "https://deno.land/std/encoding/_yaml/type/mod",
    "https://deno.land/std/encoding/_yaml/schema/core",
  ],
  function (exports_42, context_42) {
    "use strict";
    var schema_ts_4, mod_ts_4, core_ts_1, def;
    var __moduleName = context_42 && context_42.id;
    return {
      setters: [
        function (schema_ts_4_1) {
          schema_ts_4 = schema_ts_4_1;
        },
        function (mod_ts_4_1) {
          mod_ts_4 = mod_ts_4_1;
        },
        function (core_ts_1_1) {
          core_ts_1 = core_ts_1_1;
        },
      ],
      execute: function () {
        // JS-YAML's default schema for `safeLoad` function.
        // It is not described in the YAML specification.
        exports_42(
          "def",
          def = new schema_ts_4.Schema({
            explicit: [
              mod_ts_4.binary,
              mod_ts_4.omap,
              mod_ts_4.pairs,
              mod_ts_4.set,
            ],
            implicit: [mod_ts_4.timestamp, mod_ts_4.merge],
            include: [core_ts_1.core],
          }),
        );
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/schema/mod",
  [
    "https://deno.land/std/encoding/_yaml/schema/core",
    "https://deno.land/std/encoding/_yaml/schema/default",
    "https://deno.land/std/encoding/_yaml/schema/failsafe",
    "https://deno.land/std/encoding/_yaml/schema/json",
  ],
  function (exports_43, context_43) {
    "use strict";
    var __moduleName = context_43 && context_43.id;
    return {
      setters: [
        function (core_ts_2_1) {
          exports_43({
            "CORE_SCHEMA": core_ts_2_1["core"],
          });
        },
        function (default_ts_1_1) {
          exports_43({
            "DEFAULT_SCHEMA": default_ts_1_1["def"],
          });
        },
        function (failsafe_ts_2_1) {
          exports_43({
            "FAILSAFE_SCHEMA": failsafe_ts_2_1["failsafe"],
          });
        },
        function (json_ts_2_1) {
          exports_43({
            "JSON_SCHEMA": json_ts_2_1["json"],
          });
        },
      ],
      execute: function () {
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/state",
  ["https://deno.land/std/encoding/_yaml/schema/mod"],
  function (exports_44, context_44) {
    "use strict";
    var mod_ts_5, State;
    var __moduleName = context_44 && context_44.id;
    return {
      setters: [
        function (mod_ts_5_1) {
          mod_ts_5 = mod_ts_5_1;
        },
      ],
      execute: function () {
        State = class State {
          constructor(schema = mod_ts_5.DEFAULT_SCHEMA) {
            this.schema = schema;
          }
        };
        exports_44("State", State);
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/loader/loader_state",
  ["https://deno.land/std/encoding/_yaml/state"],
  function (exports_45, context_45) {
    "use strict";
    var state_ts_1, LoaderState;
    var __moduleName = context_45 && context_45.id;
    return {
      setters: [
        function (state_ts_1_1) {
          state_ts_1 = state_ts_1_1;
        },
      ],
      execute: function () {
        LoaderState = class LoaderState extends state_ts_1.State {
          constructor(
            input,
            {
              filename,
              schema,
              onWarning,
              legacy = false,
              json = false,
              listener = null,
            },
          ) {
            super(schema);
            this.input = input;
            this.documents = [];
            this.lineIndent = 0;
            this.lineStart = 0;
            this.position = 0;
            this.line = 0;
            this.result = "";
            this.filename = filename;
            this.onWarning = onWarning;
            this.legacy = legacy;
            this.json = json;
            this.listener = listener;
            this.implicitTypes = this.schema.compiledImplicit;
            this.typeMap = this.schema.compiledTypeMap;
            this.length = input.length;
          }
        };
        exports_45("LoaderState", LoaderState);
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/loader/loader",
  [
    "https://deno.land/std/encoding/_yaml/error",
    "https://deno.land/std/encoding/_yaml/mark",
    "https://deno.land/std/encoding/_yaml/utils",
    "https://deno.land/std/encoding/_yaml/loader/loader_state",
  ],
  function (exports_46, context_46) {
    "use strict";
    var error_ts_2,
      mark_ts_1,
      common,
      loader_state_ts_1,
      _hasOwnProperty,
      CONTEXT_FLOW_IN,
      CONTEXT_FLOW_OUT,
      CONTEXT_BLOCK_IN,
      CONTEXT_BLOCK_OUT,
      CHOMPING_CLIP,
      CHOMPING_STRIP,
      CHOMPING_KEEP,
      PATTERN_NON_PRINTABLE,
      PATTERN_NON_ASCII_LINE_BREAKS,
      PATTERN_FLOW_INDICATORS,
      PATTERN_TAG_HANDLE,
      PATTERN_TAG_URI,
      simpleEscapeCheck,
      simpleEscapeMap,
      directiveHandlers;
    var __moduleName = context_46 && context_46.id;
    function _class(obj) {
      return Object.prototype.toString.call(obj);
    }
    function isEOL(c) {
      return c === 0x0a || /* LF */ c === 0x0d /* CR */;
    }
    function isWhiteSpace(c) {
      return c === 0x09 || /* Tab */ c === 0x20 /* Space */;
    }
    function isWsOrEol(c) {
      return (c === 0x09 /* Tab */ ||
        c === 0x20 /* Space */ ||
        c === 0x0a /* LF */ ||
        c === 0x0d /* CR */);
    }
    function isFlowIndicator(c) {
      return (c === 0x2c /* , */ ||
        c === 0x5b /* [ */ ||
        c === 0x5d /* ] */ ||
        c === 0x7b /* { */ ||
        c === 0x7d /* } */);
    }
    function fromHexCode(c) {
      if (0x30 <= /* 0 */ c && c <= 0x39 /* 9 */) {
        return c - 0x30;
      }
      const lc = c | 0x20;
      if (0x61 <= /* a */ lc && lc <= 0x66 /* f */) {
        return lc - 0x61 + 10;
      }
      return -1;
    }
    function escapedHexLen(c) {
      if (c === 0x78 /* x */) {
        return 2;
      }
      if (c === 0x75 /* u */) {
        return 4;
      }
      if (c === 0x55 /* U */) {
        return 8;
      }
      return 0;
    }
    function fromDecimalCode(c) {
      if (0x30 <= /* 0 */ c && c <= 0x39 /* 9 */) {
        return c - 0x30;
      }
      return -1;
    }
    function simpleEscapeSequence(c) {
      /* eslint:disable:prettier */
      return c === 0x30 /* 0 */ ? "\x00" : c === 0x61 /* a */
      ? "\x07"
      : c === 0x62 /* b */
      ? "\x08"
      : c === 0x74 /* t */
      ? "\x09"
      : c === 0x09 /* Tab */
      ? "\x09"
      : c === 0x6e /* n */
      ? "\x0A"
      : c === 0x76 /* v */
      ? "\x0B"
      : c === 0x66 /* f */
      ? "\x0C"
      : c === 0x72 /* r */
      ? "\x0D"
      : c === 0x65 /* e */
      ? "\x1B"
      : c === 0x20 /* Space */
      ? " "
      : c === 0x22 /* " */
      ? "\x22"
      : c === 0x2f /* / */
      ? "/"
      : c === 0x5c /* \ */
      ? "\x5C"
      : c === 0x4e /* N */
      ? "\x85"
      : c === 0x5f /* _ */
      ? "\xA0"
      : c === 0x4c /* L */
      ? "\u2028"
      : c === 0x50 /* P */
      ? "\u2029"
      : "";
      /* eslint:enable:prettier */
    }
    function charFromCodepoint(c) {
      if (c <= 0xffff) {
        return String.fromCharCode(c);
      }
      // Encode UTF-16 surrogate pair
      // https://en.wikipedia.org/wiki/UTF-16#Code_points_U.2B010000_to_U.2B10FFFF
      return String.fromCharCode(
        ((c - 0x010000) >> 10) + 0xd800,
        ((c - 0x010000) & 0x03ff) + 0xdc00,
      );
    }
    function generateError(state, message) {
      return new error_ts_2.YAMLError(
        message,
        new mark_ts_1.Mark(
          state.filename,
          state.input,
          state.position,
          state.line,
          state.position - state.lineStart,
        ),
      );
    }
    function throwError(state, message) {
      throw generateError(state, message);
    }
    function throwWarning(state, message) {
      if (state.onWarning) {
        state.onWarning.call(null, generateError(state, message));
      }
    }
    function captureSegment(state, start, end, checkJson) {
      let result;
      if (start < end) {
        result = state.input.slice(start, end);
        if (checkJson) {
          for (
            let position = 0, length = result.length;
            position < length;
            position++
          ) {
            const character = result.charCodeAt(position);
            if (
              !(character === 0x09 ||
                (0x20 <= character && character <= 0x10ffff))
            ) {
              return throwError(state, "expected valid JSON character");
            }
          }
        } else if (PATTERN_NON_PRINTABLE.test(result)) {
          return throwError(
            state,
            "the stream contains non-printable characters",
          );
        }
        state.result += result;
      }
    }
    function mergeMappings(state, destination, source, overridableKeys) {
      if (!common.isObject(source)) {
        return throwError(
          state,
          "cannot merge mappings; the provided source object is unacceptable",
        );
      }
      const keys = Object.keys(source);
      for (let i = 0, len = keys.length; i < len; i++) {
        const key = keys[i];
        if (!_hasOwnProperty.call(destination, key)) {
          destination[key] = source[key];
          overridableKeys[key] = true;
        }
      }
    }
    function storeMappingPair(
      state,
      result,
      overridableKeys,
      keyTag,
      keyNode,
      valueNode,
      startLine,
      startPos,
    ) {
      // The output is a plain object here, so keys can only be strings.
      // We need to convert keyNode to a string, but doing so can hang the process
      // (deeply nested arrays that explode exponentially using aliases).
      if (Array.isArray(keyNode)) {
        keyNode = Array.prototype.slice.call(keyNode);
        for (
          let index = 0, quantity = keyNode.length; index < quantity; index++
        ) {
          if (Array.isArray(keyNode[index])) {
            return throwError(
              state,
              "nested arrays are not supported inside keys",
            );
          }
          if (
            typeof keyNode === "object" &&
            _class(keyNode[index]) === "[object Object]"
          ) {
            keyNode[index] = "[object Object]";
          }
        }
      }
      // Avoid code execution in load() via toString property
      // (still use its own toString for arrays, timestamps,
      // and whatever user schema extensions happen to have @@toStringTag)
      if (
        typeof keyNode === "object" && _class(keyNode) === "[object Object]"
      ) {
        keyNode = "[object Object]";
      }
      keyNode = String(keyNode);
      if (result === null) {
        result = {};
      }
      if (keyTag === "tag:yaml.org,2002:merge") {
        if (Array.isArray(valueNode)) {
          for (
            let index = 0, quantity = valueNode.length;
            index < quantity;
            index++
          ) {
            mergeMappings(state, result, valueNode[index], overridableKeys);
          }
        } else {
          mergeMappings(state, result, valueNode, overridableKeys);
        }
      } else {
        if (
          !state.json &&
          !_hasOwnProperty.call(overridableKeys, keyNode) &&
          _hasOwnProperty.call(result, keyNode)
        ) {
          state.line = startLine || state.line;
          state.position = startPos || state.position;
          return throwError(state, "duplicated mapping key");
        }
        result[keyNode] = valueNode;
        delete overridableKeys[keyNode];
      }
      return result;
    }
    function readLineBreak(state) {
      const ch = state.input.charCodeAt(state.position);
      if (ch === 0x0a /* LF */) {
        state.position++;
      } else if (ch === 0x0d /* CR */) {
        state.position++;
        if (state.input.charCodeAt(state.position) === 0x0a /* LF */) {
          state.position++;
        }
      } else {
        return throwError(state, "a line break is expected");
      }
      state.line += 1;
      state.lineStart = state.position;
    }
    function skipSeparationSpace(state, allowComments, checkIndent) {
      let lineBreaks = 0, ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        while (isWhiteSpace(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (allowComments && ch === 0x23 /* # */) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (ch !== 0x0a && /* LF */ ch !== 0x0d && /* CR */ ch !== 0);
        }
        if (isEOL(ch)) {
          readLineBreak(state);
          ch = state.input.charCodeAt(state.position);
          lineBreaks++;
          state.lineIndent = 0;
          while (ch === 0x20 /* Space */) {
            state.lineIndent++;
            ch = state.input.charCodeAt(++state.position);
          }
        } else {
          break;
        }
      }
      if (
        checkIndent !== -1 &&
        lineBreaks !== 0 &&
        state.lineIndent < checkIndent
      ) {
        throwWarning(state, "deficient indentation");
      }
      return lineBreaks;
    }
    function testDocumentSeparator(state) {
      let _position = state.position;
      let ch = state.input.charCodeAt(_position);
      // Condition state.position === state.lineStart is tested
      // in parent on each call, for efficiency. No needs to test here again.
      if (
        (ch === 0x2d || /* - */ ch === 0x2e) /* . */ &&
        ch === state.input.charCodeAt(_position + 1) &&
        ch === state.input.charCodeAt(_position + 2)
      ) {
        _position += 3;
        ch = state.input.charCodeAt(_position);
        if (ch === 0 || isWsOrEol(ch)) {
          return true;
        }
      }
      return false;
    }
    function writeFoldedLines(state, count) {
      if (count === 1) {
        state.result += " ";
      } else if (count > 1) {
        state.result += common.repeat("\n", count - 1);
      }
    }
    function readPlainScalar(state, nodeIndent, withinFlowCollection) {
      const kind = state.kind;
      const result = state.result;
      let ch = state.input.charCodeAt(state.position);
      if (
        isWsOrEol(ch) ||
        isFlowIndicator(ch) ||
        ch === 0x23 /* # */ ||
        ch === 0x26 /* & */ ||
        ch === 0x2a /* * */ ||
        ch === 0x21 /* ! */ ||
        ch === 0x7c /* | */ ||
        ch === 0x3e /* > */ ||
        ch === 0x27 /* ' */ ||
        ch === 0x22 /* " */ ||
        ch === 0x25 /* % */ ||
        ch === 0x40 /* @ */ ||
        ch === 0x60 /* ` */
      ) {
        return false;
      }
      let following;
      if (ch === 0x3f || /* ? */ ch === 0x2d /* - */) {
        following = state.input.charCodeAt(state.position + 1);
        if (
          isWsOrEol(following) ||
          (withinFlowCollection && isFlowIndicator(following))
        ) {
          return false;
        }
      }
      state.kind = "scalar";
      state.result = "";
      let captureEnd, captureStart = (captureEnd = state.position);
      let hasPendingContent = false;
      let line = 0;
      while (ch !== 0) {
        if (ch === 0x3a /* : */) {
          following = state.input.charCodeAt(state.position + 1);
          if (
            isWsOrEol(following) ||
            (withinFlowCollection && isFlowIndicator(following))
          ) {
            break;
          }
        } else if (ch === 0x23 /* # */) {
          const preceding = state.input.charCodeAt(state.position - 1);
          if (isWsOrEol(preceding)) {
            break;
          }
        } else if (
          (state.position === state.lineStart &&
            testDocumentSeparator(state)) ||
          (withinFlowCollection && isFlowIndicator(ch))
        ) {
          break;
        } else if (isEOL(ch)) {
          line = state.line;
          const lineStart = state.lineStart;
          const lineIndent = state.lineIndent;
          skipSeparationSpace(state, false, -1);
          if (state.lineIndent >= nodeIndent) {
            hasPendingContent = true;
            ch = state.input.charCodeAt(state.position);
            continue;
          } else {
            state.position = captureEnd;
            state.line = line;
            state.lineStart = lineStart;
            state.lineIndent = lineIndent;
            break;
          }
        }
        if (hasPendingContent) {
          captureSegment(state, captureStart, captureEnd, false);
          writeFoldedLines(state, state.line - line);
          captureStart = captureEnd = state.position;
          hasPendingContent = false;
        }
        if (!isWhiteSpace(ch)) {
          captureEnd = state.position + 1;
        }
        ch = state.input.charCodeAt(++state.position);
      }
      captureSegment(state, captureStart, captureEnd, false);
      if (state.result) {
        return true;
      }
      state.kind = kind;
      state.result = result;
      return false;
    }
    function readSingleQuotedScalar(state, nodeIndent) {
      let ch, captureStart, captureEnd;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 0x27 /* ' */) {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      state.position++;
      captureStart = captureEnd = state.position;
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 0x27 /* ' */) {
          captureSegment(state, captureStart, state.position, true);
          ch = state.input.charCodeAt(++state.position);
          if (ch === 0x27 /* ' */) {
            captureStart = state.position;
            state.position++;
            captureEnd = state.position;
          } else {
            return true;
          }
        } else if (isEOL(ch)) {
          captureSegment(state, captureStart, captureEnd, true);
          writeFoldedLines(
            state,
            skipSeparationSpace(state, false, nodeIndent),
          );
          captureStart = captureEnd = state.position;
        } else if (
          state.position === state.lineStart &&
          testDocumentSeparator(state)
        ) {
          return throwError(
            state,
            "unexpected end of the document within a single quoted scalar",
          );
        } else {
          state.position++;
          captureEnd = state.position;
        }
      }
      return throwError(
        state,
        "unexpected end of the stream within a single quoted scalar",
      );
    }
    function readDoubleQuotedScalar(state, nodeIndent) {
      let ch = state.input.charCodeAt(state.position);
      if (ch !== 0x22 /* " */) {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      state.position++;
      let captureEnd, captureStart = (captureEnd = state.position);
      let tmp;
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 0x22 /* " */) {
          captureSegment(state, captureStart, state.position, true);
          state.position++;
          return true;
        }
        if (ch === 0x5c /* \ */) {
          captureSegment(state, captureStart, state.position, true);
          ch = state.input.charCodeAt(++state.position);
          if (isEOL(ch)) {
            skipSeparationSpace(state, false, nodeIndent);
            // TODO: rework to inline fn with no type cast?
          } else if (ch < 256 && simpleEscapeCheck[ch]) {
            state.result += simpleEscapeMap[ch];
            state.position++;
          } else if ((tmp = escapedHexLen(ch)) > 0) {
            let hexLength = tmp;
            let hexResult = 0;
            for (; hexLength > 0; hexLength--) {
              ch = state.input.charCodeAt(++state.position);
              if ((tmp = fromHexCode(ch)) >= 0) {
                hexResult = (hexResult << 4) + tmp;
              } else {
                return throwError(state, "expected hexadecimal character");
              }
            }
            state.result += charFromCodepoint(hexResult);
            state.position++;
          } else {
            return throwError(state, "unknown escape sequence");
          }
          captureStart = captureEnd = state.position;
        } else if (isEOL(ch)) {
          captureSegment(state, captureStart, captureEnd, true);
          writeFoldedLines(
            state,
            skipSeparationSpace(state, false, nodeIndent),
          );
          captureStart = captureEnd = state.position;
        } else if (
          state.position === state.lineStart &&
          testDocumentSeparator(state)
        ) {
          return throwError(
            state,
            "unexpected end of the document within a double quoted scalar",
          );
        } else {
          state.position++;
          captureEnd = state.position;
        }
      }
      return throwError(
        state,
        "unexpected end of the stream within a double quoted scalar",
      );
    }
    function readFlowCollection(state, nodeIndent) {
      let ch = state.input.charCodeAt(state.position);
      let terminator;
      let isMapping = true;
      let result = {};
      if (ch === 0x5b /* [ */) {
        terminator = 0x5d; /* ] */
        isMapping = false;
        result = [];
      } else if (ch === 0x7b /* { */) {
        terminator = 0x7d; /* } */
      } else {
        return false;
      }
      if (
        state.anchor !== null &&
        typeof state.anchor != "undefined" &&
        typeof state.anchorMap != "undefined"
      ) {
        state.anchorMap[state.anchor] = result;
      }
      ch = state.input.charCodeAt(++state.position);
      const tag = state.tag, anchor = state.anchor;
      let readNext = true;
      let valueNode,
        keyNode,
        keyTag = (keyNode = valueNode = null),
        isExplicitPair,
        isPair = (isExplicitPair = false);
      let following = 0, line = 0;
      const overridableKeys = {};
      while (ch !== 0) {
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if (ch === terminator) {
          state.position++;
          state.tag = tag;
          state.anchor = anchor;
          state.kind = isMapping ? "mapping" : "sequence";
          state.result = result;
          return true;
        }
        if (!readNext) {
          return throwError(
            state,
            "missed comma between flow collection entries",
          );
        }
        keyTag = keyNode = valueNode = null;
        isPair = isExplicitPair = false;
        if (ch === 0x3f /* ? */) {
          following = state.input.charCodeAt(state.position + 1);
          if (isWsOrEol(following)) {
            isPair = isExplicitPair = true;
            state.position++;
            skipSeparationSpace(state, true, nodeIndent);
          }
        }
        line = state.line;
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
        keyTag = state.tag || null;
        keyNode = state.result;
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if ((isExplicitPair || state.line === line) && ch === 0x3a /* : */) {
          isPair = true;
          ch = state.input.charCodeAt(++state.position);
          skipSeparationSpace(state, true, nodeIndent);
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
          valueNode = state.result;
        }
        if (isMapping) {
          storeMappingPair(
            state,
            result,
            overridableKeys,
            keyTag,
            keyNode,
            valueNode,
          );
        } else if (isPair) {
          result.push(
            storeMappingPair(
              state,
              null,
              overridableKeys,
              keyTag,
              keyNode,
              valueNode,
            ),
          );
        } else {
          result.push(keyNode);
        }
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if (ch === 0x2c /* , */) {
          readNext = true;
          ch = state.input.charCodeAt(++state.position);
        } else {
          readNext = false;
        }
      }
      return throwError(
        state,
        "unexpected end of the stream within a flow collection",
      );
    }
    function readBlockScalar(state, nodeIndent) {
      let chomping = CHOMPING_CLIP,
        didReadContent = false,
        detectedIndent = false,
        textIndent = nodeIndent,
        emptyLines = 0,
        atMoreIndented = false;
      let ch = state.input.charCodeAt(state.position);
      let folding = false;
      if (ch === 0x7c /* | */) {
        folding = false;
      } else if (ch === 0x3e /* > */) {
        folding = true;
      } else {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      let tmp = 0;
      while (ch !== 0) {
        ch = state.input.charCodeAt(++state.position);
        if (ch === 0x2b || /* + */ ch === 0x2d /* - */) {
          if (CHOMPING_CLIP === chomping) {
            chomping = ch === 0x2b /* + */ ? CHOMPING_KEEP : CHOMPING_STRIP;
          } else {
            return throwError(state, "repeat of a chomping mode identifier");
          }
        } else if ((tmp = fromDecimalCode(ch)) >= 0) {
          if (tmp === 0) {
            return throwError(
              state,
              "bad explicit indentation width of a block scalar; it cannot be less than one",
            );
          } else if (!detectedIndent) {
            textIndent = nodeIndent + tmp - 1;
            detectedIndent = true;
          } else {
            return throwError(
              state,
              "repeat of an indentation width identifier",
            );
          }
        } else {
          break;
        }
      }
      if (isWhiteSpace(ch)) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (isWhiteSpace(ch));
        if (ch === 0x23 /* # */) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (!isEOL(ch) && ch !== 0);
        }
      }
      while (ch !== 0) {
        readLineBreak(state);
        state.lineIndent = 0;
        ch = state.input.charCodeAt(state.position);
        while (
          (!detectedIndent || state.lineIndent < textIndent) &&
          ch === 0x20 /* Space */
        ) {
          state.lineIndent++;
          ch = state.input.charCodeAt(++state.position);
        }
        if (!detectedIndent && state.lineIndent > textIndent) {
          textIndent = state.lineIndent;
        }
        if (isEOL(ch)) {
          emptyLines++;
          continue;
        }
        // End of the scalar.
        if (state.lineIndent < textIndent) {
          // Perform the chomping.
          if (chomping === CHOMPING_KEEP) {
            state.result += common.repeat(
              "\n",
              didReadContent ? 1 + emptyLines : emptyLines,
            );
          } else if (chomping === CHOMPING_CLIP) {
            if (didReadContent) {
              // i.e. only if the scalar is not empty.
              state.result += "\n";
            }
          }
          // Break this `while` cycle and go to the funciton's epilogue.
          break;
        }
        // Folded style: use fancy rules to handle line breaks.
        if (folding) {
          // Lines starting with white space characters (more-indented lines) are not folded.
          if (isWhiteSpace(ch)) {
            atMoreIndented = true;
            // except for the first content line (cf. Example 8.1)
            state.result += common.repeat(
              "\n",
              didReadContent ? 1 + emptyLines : emptyLines,
            );
            // End of more-indented block.
          } else if (atMoreIndented) {
            atMoreIndented = false;
            state.result += common.repeat("\n", emptyLines + 1);
            // Just one line break - perceive as the same line.
          } else if (emptyLines === 0) {
            if (didReadContent) {
              // i.e. only if we have already read some scalar content.
              state.result += " ";
            }
            // Several line breaks - perceive as different lines.
          } else {
            state.result += common.repeat("\n", emptyLines);
          }
          // Literal style: just add exact number of line breaks between content lines.
        } else {
          // Keep all line breaks except the header line break.
          state.result += common.repeat(
            "\n",
            didReadContent ? 1 + emptyLines : emptyLines,
          );
        }
        didReadContent = true;
        detectedIndent = true;
        emptyLines = 0;
        const captureStart = state.position;
        while (!isEOL(ch) && ch !== 0) {
          ch = state.input.charCodeAt(++state.position);
        }
        captureSegment(state, captureStart, state.position, false);
      }
      return true;
    }
    function readBlockSequence(state, nodeIndent) {
      let line, following, detected = false, ch;
      const tag = state.tag, anchor = state.anchor, result = [];
      if (
        state.anchor !== null &&
        typeof state.anchor !== "undefined" &&
        typeof state.anchorMap !== "undefined"
      ) {
        state.anchorMap[state.anchor] = result;
      }
      ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        if (ch !== 0x2d /* - */) {
          break;
        }
        following = state.input.charCodeAt(state.position + 1);
        if (!isWsOrEol(following)) {
          break;
        }
        detected = true;
        state.position++;
        if (skipSeparationSpace(state, true, -1)) {
          if (state.lineIndent <= nodeIndent) {
            result.push(null);
            ch = state.input.charCodeAt(state.position);
            continue;
          }
        }
        line = state.line;
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
        result.push(state.result);
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
        if (
          (state.line === line || state.lineIndent > nodeIndent) && ch !== 0
        ) {
          return throwError(state, "bad indentation of a sequence entry");
        } else if (state.lineIndent < nodeIndent) {
          break;
        }
      }
      if (detected) {
        state.tag = tag;
        state.anchor = anchor;
        state.kind = "sequence";
        state.result = result;
        return true;
      }
      return false;
    }
    function readBlockMapping(state, nodeIndent, flowIndent) {
      const tag = state.tag,
        anchor = state.anchor,
        result = {},
        overridableKeys = {};
      let following,
        allowCompact = false,
        line,
        pos,
        keyTag = null,
        keyNode = null,
        valueNode = null,
        atExplicitKey = false,
        detected = false,
        ch;
      if (
        state.anchor !== null &&
        typeof state.anchor !== "undefined" &&
        typeof state.anchorMap !== "undefined"
      ) {
        state.anchorMap[state.anchor] = result;
      }
      ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        following = state.input.charCodeAt(state.position + 1);
        line = state.line; // Save the current line.
        pos = state.position;
        //
        // Explicit notation case. There are two separate blocks:
        // first for the key (denoted by "?") and second for the value (denoted by ":")
        //
        if (
          (ch === 0x3f || /* ? */ ch === 0x3a) && /* : */ isWsOrEol(following)
        ) {
          if (ch === 0x3f /* ? */) {
            if (atExplicitKey) {
              storeMappingPair(
                state,
                result,
                overridableKeys,
                keyTag,
                keyNode,
                null,
              );
              keyTag = keyNode = valueNode = null;
            }
            detected = true;
            atExplicitKey = true;
            allowCompact = true;
          } else if (atExplicitKey) {
            // i.e. 0x3A/* : */ === character after the explicit key.
            atExplicitKey = false;
            allowCompact = true;
          } else {
            return throwError(
              state,
              "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line",
            );
          }
          state.position += 1;
          ch = following;
          //
          // Implicit notation case. Flow-style node as the key first, then ":", and the value.
          //
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
        } else if (
          composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)
        ) {
          if (state.line === line) {
            ch = state.input.charCodeAt(state.position);
            while (isWhiteSpace(ch)) {
              ch = state.input.charCodeAt(++state.position);
            }
            if (ch === 0x3a /* : */) {
              ch = state.input.charCodeAt(++state.position);
              if (!isWsOrEol(ch)) {
                return throwError(
                  state,
                  "a whitespace character is expected after the key-value separator within a block mapping",
                );
              }
              if (atExplicitKey) {
                storeMappingPair(
                  state,
                  result,
                  overridableKeys,
                  keyTag,
                  keyNode,
                  null,
                );
                keyTag = keyNode = valueNode = null;
              }
              detected = true;
              atExplicitKey = false;
              allowCompact = false;
              keyTag = state.tag;
              keyNode = state.result;
            } else if (detected) {
              return throwError(
                state,
                "can not read an implicit mapping pair; a colon is missed",
              );
            } else {
              state.tag = tag;
              state.anchor = anchor;
              return true; // Keep the result of `composeNode`.
            }
          } else if (detected) {
            return throwError(
              state,
              "can not read a block mapping entry; a multiline key may not be an implicit key",
            );
          } else {
            state.tag = tag;
            state.anchor = anchor;
            return true; // Keep the result of `composeNode`.
          }
        } else {
          break; // Reading is done. Go to the epilogue.
        }
        //
        // Common reading code for both explicit and implicit notations.
        //
        if (state.line === line || state.lineIndent > nodeIndent) {
          if (
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            composeNode(
              state,
              nodeIndent,
              CONTEXT_BLOCK_OUT,
              true,
              allowCompact,
            )
          ) {
            if (atExplicitKey) {
              keyNode = state.result;
            } else {
              valueNode = state.result;
            }
          }
          if (!atExplicitKey) {
            storeMappingPair(
              state,
              result,
              overridableKeys,
              keyTag,
              keyNode,
              valueNode,
              line,
              pos,
            );
            keyTag = keyNode = valueNode = null;
          }
          skipSeparationSpace(state, true, -1);
          ch = state.input.charCodeAt(state.position);
        }
        if (state.lineIndent > nodeIndent && ch !== 0) {
          return throwError(state, "bad indentation of a mapping entry");
        } else if (state.lineIndent < nodeIndent) {
          break;
        }
      }
      //
      // Epilogue.
      //
      // Special case: last mapping's node contains only the key in explicit notation.
      if (atExplicitKey) {
        storeMappingPair(state, result, overridableKeys, keyTag, keyNode, null);
      }
      // Expose the resulting mapping.
      if (detected) {
        state.tag = tag;
        state.anchor = anchor;
        state.kind = "mapping";
        state.result = result;
      }
      return detected;
    }
    function readTagProperty(state) {
      let position,
        isVerbatim = false,
        isNamed = false,
        tagHandle = "",
        tagName,
        ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 0x21 /* ! */) {
        return false;
      }
      if (state.tag !== null) {
        return throwError(state, "duplication of a tag property");
      }
      ch = state.input.charCodeAt(++state.position);
      if (ch === 0x3c /* < */) {
        isVerbatim = true;
        ch = state.input.charCodeAt(++state.position);
      } else if (ch === 0x21 /* ! */) {
        isNamed = true;
        tagHandle = "!!";
        ch = state.input.charCodeAt(++state.position);
      } else {
        tagHandle = "!";
      }
      position = state.position;
      if (isVerbatim) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && ch !== 0x3e /* > */);
        if (state.position < state.length) {
          tagName = state.input.slice(position, state.position);
          ch = state.input.charCodeAt(++state.position);
        } else {
          return throwError(
            state,
            "unexpected end of the stream within a verbatim tag",
          );
        }
      } else {
        while (ch !== 0 && !isWsOrEol(ch)) {
          if (ch === 0x21 /* ! */) {
            if (!isNamed) {
              tagHandle = state.input.slice(position - 1, state.position + 1);
              if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
                return throwError(
                  state,
                  "named tag handle cannot contain such characters",
                );
              }
              isNamed = true;
              position = state.position + 1;
            } else {
              return throwError(
                state,
                "tag suffix cannot contain exclamation marks",
              );
            }
          }
          ch = state.input.charCodeAt(++state.position);
        }
        tagName = state.input.slice(position, state.position);
        if (PATTERN_FLOW_INDICATORS.test(tagName)) {
          return throwError(
            state,
            "tag suffix cannot contain flow indicator characters",
          );
        }
      }
      if (tagName && !PATTERN_TAG_URI.test(tagName)) {
        return throwError(
          state,
          `tag name cannot contain such characters: ${tagName}`,
        );
      }
      if (isVerbatim) {
        state.tag = tagName;
      } else if (
        typeof state.tagMap !== "undefined" &&
        _hasOwnProperty.call(state.tagMap, tagHandle)
      ) {
        state.tag = state.tagMap[tagHandle] + tagName;
      } else if (tagHandle === "!") {
        state.tag = `!${tagName}`;
      } else if (tagHandle === "!!") {
        state.tag = `tag:yaml.org,2002:${tagName}`;
      } else {
        return throwError(state, `undeclared tag handle "${tagHandle}"`);
      }
      return true;
    }
    function readAnchorProperty(state) {
      let ch = state.input.charCodeAt(state.position);
      if (ch !== 0x26 /* & */) {
        return false;
      }
      if (state.anchor !== null) {
        return throwError(state, "duplication of an anchor property");
      }
      ch = state.input.charCodeAt(++state.position);
      const position = state.position;
      while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (state.position === position) {
        return throwError(
          state,
          "name of an anchor node must contain at least one character",
        );
      }
      state.anchor = state.input.slice(position, state.position);
      return true;
    }
    function readAlias(state) {
      let ch = state.input.charCodeAt(state.position);
      if (ch !== 0x2a /* * */) {
        return false;
      }
      ch = state.input.charCodeAt(++state.position);
      const _position = state.position;
      while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (state.position === _position) {
        return throwError(
          state,
          "name of an alias node must contain at least one character",
        );
      }
      const alias = state.input.slice(_position, state.position);
      if (
        typeof state.anchorMap !== "undefined" &&
        !state.anchorMap.hasOwnProperty(alias)
      ) {
        return throwError(state, `unidentified alias "${alias}"`);
      }
      if (typeof state.anchorMap !== "undefined") {
        state.result = state.anchorMap[alias];
      }
      skipSeparationSpace(state, true, -1);
      return true;
    }
    function composeNode(
      state,
      parentIndent,
      nodeContext,
      allowToSeek,
      allowCompact,
    ) {
      let allowBlockScalars,
        allowBlockCollections,
        indentStatus = 1, // 1: this>parent, 0: this=parent, -1: this<parent
        atNewLine = false,
        hasContent = false,
        type,
        flowIndent,
        blockIndent;
      if (state.listener && state.listener !== null) {
        state.listener("open", state);
      }
      state.tag = null;
      state.anchor = null;
      state.kind = null;
      state.result = null;
      const allowBlockStyles =
        (allowBlockScalars = allowBlockCollections =
          CONTEXT_BLOCK_OUT === nodeContext ||
          CONTEXT_BLOCK_IN === nodeContext);
      if (allowToSeek) {
        if (skipSeparationSpace(state, true, -1)) {
          atNewLine = true;
          if (state.lineIndent > parentIndent) {
            indentStatus = 1;
          } else if (state.lineIndent === parentIndent) {
            indentStatus = 0;
          } else if (state.lineIndent < parentIndent) {
            indentStatus = -1;
          }
        }
      }
      if (indentStatus === 1) {
        while (readTagProperty(state) || readAnchorProperty(state)) {
          if (skipSeparationSpace(state, true, -1)) {
            atNewLine = true;
            allowBlockCollections = allowBlockStyles;
            if (state.lineIndent > parentIndent) {
              indentStatus = 1;
            } else if (state.lineIndent === parentIndent) {
              indentStatus = 0;
            } else if (state.lineIndent < parentIndent) {
              indentStatus = -1;
            }
          } else {
            allowBlockCollections = false;
          }
        }
      }
      if (allowBlockCollections) {
        allowBlockCollections = atNewLine || allowCompact;
      }
      if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
        const cond = CONTEXT_FLOW_IN === nodeContext ||
          CONTEXT_FLOW_OUT === nodeContext;
        flowIndent = cond ? parentIndent : parentIndent + 1;
        blockIndent = state.position - state.lineStart;
        if (indentStatus === 1) {
          if (
            (allowBlockCollections &&
              (readBlockSequence(state, blockIndent) ||
                readBlockMapping(state, blockIndent, flowIndent))) ||
            readFlowCollection(state, flowIndent)
          ) {
            hasContent = true;
          } else {
            if (
              (allowBlockScalars && readBlockScalar(state, flowIndent)) ||
              readSingleQuotedScalar(state, flowIndent) ||
              readDoubleQuotedScalar(state, flowIndent)
            ) {
              hasContent = true;
            } else if (readAlias(state)) {
              hasContent = true;
              if (state.tag !== null || state.anchor !== null) {
                return throwError(
                  state,
                  "alias node should not have Any properties",
                );
              }
            } else if (
              readPlainScalar(
                state,
                flowIndent,
                CONTEXT_FLOW_IN === nodeContext,
              )
            ) {
              hasContent = true;
              if (state.tag === null) {
                state.tag = "?";
              }
            }
            if (
              state.anchor !== null && typeof state.anchorMap !== "undefined"
            ) {
              state.anchorMap[state.anchor] = state.result;
            }
          }
        } else if (indentStatus === 0) {
          // Special case: block sequences are allowed to have same indentation level as the parent.
          // http://www.yaml.org/spec/1.2/spec.html#id2799784
          hasContent = allowBlockCollections &&
            readBlockSequence(state, blockIndent);
        }
      }
      if (state.tag !== null && state.tag !== "!") {
        if (state.tag === "?") {
          for (
            let typeIndex = 0, typeQuantity = state.implicitTypes.length;
            typeIndex < typeQuantity;
            typeIndex++
          ) {
            type = state.implicitTypes[typeIndex];
            // Implicit resolving is not allowed for non-scalar types, and '?'
            // non-specific tag is only assigned to plain scalars. So, it isn't
            // needed to check for 'kind' conformity.
            if (type.resolve(state.result)) {
              // `state.result` updated in resolver if matched
              state.result = type.construct(state.result);
              state.tag = type.tag;
              if (
                state.anchor !== null &&
                typeof state.anchorMap !== "undefined"
              ) {
                state.anchorMap[state.anchor] = state.result;
              }
              break;
            }
          }
        } else if (
          _hasOwnProperty.call(
            state.typeMap[state.kind || "fallback"],
            state.tag,
          )
        ) {
          type = state.typeMap[state.kind || "fallback"][state.tag];
          if (state.result !== null && type.kind !== state.kind) {
            return throwError(
              state,
              `unacceptable node kind for !<${state.tag}> tag; it should be "${type.kind}", not "${state.kind}"`,
            );
          }
          if (!type.resolve(state.result)) {
            // `state.result` updated in resolver if matched
            return throwError(
              state,
              `cannot resolve a node with !<${state.tag}> explicit tag`,
            );
          } else {
            state.result = type.construct(state.result);
            if (
              state.anchor !== null && typeof state.anchorMap !== "undefined"
            ) {
              state.anchorMap[state.anchor] = state.result;
            }
          }
        } else {
          return throwError(state, `unknown tag !<${state.tag}>`);
        }
      }
      if (state.listener && state.listener !== null) {
        state.listener("close", state);
      }
      return state.tag !== null || state.anchor !== null || hasContent;
    }
    function readDocument(state) {
      const documentStart = state.position;
      let position, directiveName, directiveArgs, hasDirectives = false, ch;
      state.version = null;
      state.checkLineBreaks = state.legacy;
      state.tagMap = {};
      state.anchorMap = {};
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
        if (state.lineIndent > 0 || ch !== 0x25 /* % */) {
          break;
        }
        hasDirectives = true;
        ch = state.input.charCodeAt(++state.position);
        position = state.position;
        while (ch !== 0 && !isWsOrEol(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        directiveName = state.input.slice(position, state.position);
        directiveArgs = [];
        if (directiveName.length < 1) {
          return throwError(
            state,
            "directive name must not be less than one character in length",
          );
        }
        while (ch !== 0) {
          while (isWhiteSpace(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          if (ch === 0x23 /* # */) {
            do {
              ch = state.input.charCodeAt(++state.position);
            } while (ch !== 0 && !isEOL(ch));
            break;
          }
          if (isEOL(ch)) {
            break;
          }
          position = state.position;
          while (ch !== 0 && !isWsOrEol(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          directiveArgs.push(state.input.slice(position, state.position));
        }
        if (ch !== 0) {
          readLineBreak(state);
        }
        if (_hasOwnProperty.call(directiveHandlers, directiveName)) {
          directiveHandlers[directiveName](
            state,
            directiveName,
            ...directiveArgs,
          );
        } else {
          throwWarning(state, `unknown document directive "${directiveName}"`);
        }
      }
      skipSeparationSpace(state, true, -1);
      if (
        state.lineIndent === 0 &&
        state.input.charCodeAt(state.position) === 0x2d /* - */ &&
        state.input.charCodeAt(state.position + 1) === 0x2d /* - */ &&
        state.input.charCodeAt(state.position + 2) === 0x2d /* - */
      ) {
        state.position += 3;
        skipSeparationSpace(state, true, -1);
      } else if (hasDirectives) {
        return throwError(state, "directives end mark is expected");
      }
      composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
      skipSeparationSpace(state, true, -1);
      if (
        state.checkLineBreaks &&
        PATTERN_NON_ASCII_LINE_BREAKS.test(
          state.input.slice(documentStart, state.position),
        )
      ) {
        throwWarning(state, "non-ASCII line breaks are interpreted as content");
      }
      state.documents.push(state.result);
      if (state.position === state.lineStart && testDocumentSeparator(state)) {
        if (state.input.charCodeAt(state.position) === 0x2e /* . */) {
          state.position += 3;
          skipSeparationSpace(state, true, -1);
        }
        return;
      }
      if (state.position < state.length - 1) {
        return throwError(
          state,
          "end of the stream or a document separator is expected",
        );
      } else {
        return;
      }
    }
    function loadDocuments(input, options) {
      input = String(input);
      options = options || {};
      if (input.length !== 0) {
        // Add tailing `\n` if not exists
        if (
          input.charCodeAt(input.length - 1) !== 0x0a /* LF */ &&
          input.charCodeAt(input.length - 1) !== 0x0d /* CR */
        ) {
          input += "\n";
        }
        // Strip BOM
        if (input.charCodeAt(0) === 0xfeff) {
          input = input.slice(1);
        }
      }
      const state = new loader_state_ts_1.LoaderState(input, options);
      // Use 0 as string terminator. That significantly simplifies bounds check.
      state.input += "\0";
      while (state.input.charCodeAt(state.position) === 0x20 /* Space */) {
        state.lineIndent += 1;
        state.position += 1;
      }
      while (state.position < state.length - 1) {
        readDocument(state);
      }
      return state.documents;
    }
    function isCbFunction(fn) {
      return typeof fn === "function";
    }
    function loadAll(input, iteratorOrOption, options) {
      if (!isCbFunction(iteratorOrOption)) {
        return loadDocuments(input, iteratorOrOption);
      }
      const documents = loadDocuments(input, options);
      const iterator = iteratorOrOption;
      for (let index = 0, length = documents.length; index < length; index++) {
        iterator(documents[index]);
      }
      return void 0;
    }
    exports_46("loadAll", loadAll);
    function load(input, options) {
      const documents = loadDocuments(input, options);
      if (documents.length === 0) {
        return;
      }
      if (documents.length === 1) {
        return documents[0];
      }
      throw new error_ts_2.YAMLError(
        "expected a single document in the stream, but found more",
      );
    }
    exports_46("load", load);
    return {
      setters: [
        function (error_ts_2_1) {
          error_ts_2 = error_ts_2_1;
        },
        function (mark_ts_1_1) {
          mark_ts_1 = mark_ts_1_1;
        },
        function (common_1) {
          common = common_1;
        },
        function (loader_state_ts_1_1) {
          loader_state_ts_1 = loader_state_ts_1_1;
        },
      ],
      execute: function () {
        _hasOwnProperty = Object.prototype.hasOwnProperty;
        CONTEXT_FLOW_IN = 1;
        CONTEXT_FLOW_OUT = 2;
        CONTEXT_BLOCK_IN = 3;
        CONTEXT_BLOCK_OUT = 4;
        CHOMPING_CLIP = 1;
        CHOMPING_STRIP = 2;
        CHOMPING_KEEP = 3;
        PATTERN_NON_PRINTABLE =
          /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
        PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
        PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
        PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
        /* eslint-disable-next-line max-len */
        PATTERN_TAG_URI =
          /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
        simpleEscapeCheck = new Array(256); // integer, for fast access
        simpleEscapeMap = new Array(256);
        for (let i = 0; i < 256; i++) {
          simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
          simpleEscapeMap[i] = simpleEscapeSequence(i);
        }
        directiveHandlers = {
          YAML(state, _name, ...args) {
            if (state.version !== null) {
              return throwError(state, "duplication of %YAML directive");
            }
            if (args.length !== 1) {
              return throwError(
                state,
                "YAML directive accepts exactly one argument",
              );
            }
            const match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
            if (match === null) {
              return throwError(
                state,
                "ill-formed argument of the YAML directive",
              );
            }
            const major = parseInt(match[1], 10);
            const minor = parseInt(match[2], 10);
            if (major !== 1) {
              return throwError(
                state,
                "unacceptable YAML version of the document",
              );
            }
            state.version = args[0];
            state.checkLineBreaks = minor < 2;
            if (minor !== 1 && minor !== 2) {
              return throwWarning(
                state,
                "unsupported YAML version of the document",
              );
            }
          },
          TAG(state, _name, ...args) {
            if (args.length !== 2) {
              return throwError(
                state,
                "TAG directive accepts exactly two arguments",
              );
            }
            const handle = args[0];
            const prefix = args[1];
            if (!PATTERN_TAG_HANDLE.test(handle)) {
              return throwError(
                state,
                "ill-formed tag handle (first argument) of the TAG directive",
              );
            }
            if (_hasOwnProperty.call(state.tagMap, handle)) {
              return throwError(
                state,
                `there is a previously declared suffix for "${handle}" tag handle`,
              );
            }
            if (!PATTERN_TAG_URI.test(prefix)) {
              return throwError(
                state,
                "ill-formed tag prefix (second argument) of the TAG directive",
              );
            }
            if (typeof state.tagMap === "undefined") {
              state.tagMap = {};
            }
            state.tagMap[handle] = prefix;
          },
        };
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/parse",
  ["https://deno.land/std/encoding/_yaml/loader/loader"],
  function (exports_47, context_47) {
    "use strict";
    var loader_ts_1;
    var __moduleName = context_47 && context_47.id;
    /**
     * Parses `content` as single YAML document.
     *
     * Returns a JavaScript object or throws `YAMLException` on error.
     * By default, does not support regexps, functions and undefined. This method is safe for untrusted data.
     *
     */
    function parse(content, options) {
      return loader_ts_1.load(content, options);
    }
    exports_47("parse", parse);
    /**
     * Same as `parse()`, but understands multi-document sources.
     * Applies iterator to each document if specified, or returns array of documents.
     */
    function parseAll(content, iterator, options) {
      return loader_ts_1.loadAll(content, iterator, options);
    }
    exports_47("parseAll", parseAll);
    return {
      setters: [
        function (loader_ts_1_1) {
          loader_ts_1 = loader_ts_1_1;
        },
      ],
      execute: function () {
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/dumper/dumper_state",
  ["https://deno.land/std/encoding/_yaml/state"],
  function (exports_48, context_48) {
    "use strict";
    var state_ts_2, _hasOwnProperty, DumperState;
    var __moduleName = context_48 && context_48.id;
    function compileStyleMap(schema, map) {
      if (typeof map === "undefined" || map === null) {
        return {};
      }
      let type;
      const result = {};
      const keys = Object.keys(map);
      let tag, style;
      for (let index = 0, length = keys.length; index < length; index += 1) {
        tag = keys[index];
        style = String(map[tag]);
        if (tag.slice(0, 2) === "!!") {
          tag = `tag:yaml.org,2002:${tag.slice(2)}`;
        }
        type = schema.compiledTypeMap.fallback[tag];
        if (
          type &&
          typeof type.styleAliases !== "undefined" &&
          _hasOwnProperty.call(type.styleAliases, style)
        ) {
          style = type.styleAliases[style];
        }
        result[tag] = style;
      }
      return result;
    }
    return {
      setters: [
        function (state_ts_2_1) {
          state_ts_2 = state_ts_2_1;
        },
      ],
      execute: function () {
        _hasOwnProperty = Object.prototype.hasOwnProperty;
        DumperState = class DumperState extends state_ts_2.State {
          constructor(
            {
              schema,
              indent = 2,
              noArrayIndent = false,
              skipInvalid = false,
              flowLevel = -1,
              styles = null,
              sortKeys = false,
              lineWidth = 80,
              noRefs = false,
              noCompatMode = false,
              condenseFlow = false,
            },
          ) {
            super(schema);
            this.tag = null;
            this.result = "";
            this.duplicates = [];
            this.usedDuplicates = []; // changed from null to []
            this.indent = Math.max(1, indent);
            this.noArrayIndent = noArrayIndent;
            this.skipInvalid = skipInvalid;
            this.flowLevel = flowLevel;
            this.styleMap = compileStyleMap(this.schema, styles);
            this.sortKeys = sortKeys;
            this.lineWidth = lineWidth;
            this.noRefs = noRefs;
            this.noCompatMode = noCompatMode;
            this.condenseFlow = condenseFlow;
            this.implicitTypes = this.schema.compiledImplicit;
            this.explicitTypes = this.schema.compiledExplicit;
          }
        };
        exports_48("DumperState", DumperState);
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/dumper/dumper",
  [
    "https://deno.land/std/encoding/_yaml/error",
    "https://deno.land/std/encoding/_yaml/utils",
    "https://deno.land/std/encoding/_yaml/dumper/dumper_state",
  ],
  function (exports_49, context_49) {
    "use strict";
    var error_ts_3,
      common,
      dumper_state_ts_1,
      _toString,
      _hasOwnProperty,
      CHAR_TAB,
      CHAR_LINE_FEED,
      CHAR_SPACE,
      CHAR_EXCLAMATION,
      CHAR_DOUBLE_QUOTE,
      CHAR_SHARP,
      CHAR_PERCENT,
      CHAR_AMPERSAND,
      CHAR_SINGLE_QUOTE,
      CHAR_ASTERISK,
      CHAR_COMMA,
      CHAR_MINUS,
      CHAR_COLON,
      CHAR_GREATER_THAN,
      CHAR_QUESTION,
      CHAR_COMMERCIAL_AT,
      CHAR_LEFT_SQUARE_BRACKET,
      CHAR_RIGHT_SQUARE_BRACKET,
      CHAR_GRAVE_ACCENT,
      CHAR_LEFT_CURLY_BRACKET,
      CHAR_VERTICAL_LINE,
      CHAR_RIGHT_CURLY_BRACKET,
      ESCAPE_SEQUENCES,
      DEPRECATED_BOOLEANS_SYNTAX,
      STYLE_PLAIN,
      STYLE_SINGLE,
      STYLE_LITERAL,
      STYLE_FOLDED,
      STYLE_DOUBLE;
    var __moduleName = context_49 && context_49.id;
    function encodeHex(character) {
      const string = character.toString(16).toUpperCase();
      let handle;
      let length;
      if (character <= 0xff) {
        handle = "x";
        length = 2;
      } else if (character <= 0xffff) {
        handle = "u";
        length = 4;
      } else if (character <= 0xffffffff) {
        handle = "U";
        length = 8;
      } else {
        throw new error_ts_3.YAMLError(
          "code point within a string may not be greater than 0xFFFFFFFF",
        );
      }
      return `\\${handle}${
        common.repeat("0", length - string.length)
      }${string}`;
    }
    // Indents every line in a string. Empty lines (\n only) are not indented.
    function indentString(string, spaces) {
      const ind = common.repeat(" ", spaces), length = string.length;
      let position = 0, next = -1, result = "", line;
      while (position < length) {
        next = string.indexOf("\n", position);
        if (next === -1) {
          line = string.slice(position);
          position = length;
        } else {
          line = string.slice(position, next + 1);
          position = next + 1;
        }
        if (line.length && line !== "\n") {
          result += ind;
        }
        result += line;
      }
      return result;
    }
    function generateNextLine(state, level) {
      return `\n${common.repeat(" ", state.indent * level)}`;
    }
    function testImplicitResolving(state, str) {
      let type;
      for (
        let index = 0, length = state.implicitTypes.length;
        index < length;
        index += 1
      ) {
        type = state.implicitTypes[index];
        if (type.resolve(str)) {
          return true;
        }
      }
      return false;
    }
    // [33] s-white ::= s-space | s-tab
    function isWhitespace(c) {
      return c === CHAR_SPACE || c === CHAR_TAB;
    }
    // Returns true if the character can be printed without escaping.
    // From YAML 1.2: "any allowed characters known to be non-printable
    // should also be escaped. [However,] This isn’t mandatory"
    // Derived from nb-char - \t - #x85 - #xA0 - #x2028 - #x2029.
    function isPrintable(c) {
      return ((0x00020 <= c && c <= 0x00007e) ||
        (0x000a1 <= c && c <= 0x00d7ff && c !== 0x2028 && c !== 0x2029) ||
        (0x0e000 <= c && c <= 0x00fffd && c !== 0xfeff) /* BOM */ ||
        (0x10000 <= c && c <= 0x10ffff));
    }
    // Simplified test for values allowed after the first character in plain style.
    function isPlainSafe(c) {
      // Uses a subset of nb-char - c-flow-indicator - ":" - "#"
      // where nb-char ::= c-printable - b-char - c-byte-order-mark.
      return (isPrintable(c) &&
        c !== 0xfeff &&
        // - c-flow-indicator
        c !== CHAR_COMMA &&
        c !== CHAR_LEFT_SQUARE_BRACKET &&
        c !== CHAR_RIGHT_SQUARE_BRACKET &&
        c !== CHAR_LEFT_CURLY_BRACKET &&
        c !== CHAR_RIGHT_CURLY_BRACKET &&
        // - ":" - "#"
        c !== CHAR_COLON &&
        c !== CHAR_SHARP);
    }
    // Simplified test for values allowed as the first character in plain style.
    function isPlainSafeFirst(c) {
      // Uses a subset of ns-char - c-indicator
      // where ns-char = nb-char - s-white.
      return (isPrintable(c) &&
        c !== 0xfeff &&
        !isWhitespace(c) && // - s-white
        // - (c-indicator ::=
        // “-” | “?” | “:” | “,” | “[” | “]” | “{” | “}”
        c !== CHAR_MINUS &&
        c !== CHAR_QUESTION &&
        c !== CHAR_COLON &&
        c !== CHAR_COMMA &&
        c !== CHAR_LEFT_SQUARE_BRACKET &&
        c !== CHAR_RIGHT_SQUARE_BRACKET &&
        c !== CHAR_LEFT_CURLY_BRACKET &&
        c !== CHAR_RIGHT_CURLY_BRACKET &&
        // | “#” | “&” | “*” | “!” | “|” | “>” | “'” | “"”
        c !== CHAR_SHARP &&
        c !== CHAR_AMPERSAND &&
        c !== CHAR_ASTERISK &&
        c !== CHAR_EXCLAMATION &&
        c !== CHAR_VERTICAL_LINE &&
        c !== CHAR_GREATER_THAN &&
        c !== CHAR_SINGLE_QUOTE &&
        c !== CHAR_DOUBLE_QUOTE &&
        // | “%” | “@” | “`”)
        c !== CHAR_PERCENT &&
        c !== CHAR_COMMERCIAL_AT &&
        c !== CHAR_GRAVE_ACCENT);
    }
    // Determines whether block indentation indicator is required.
    function needIndentIndicator(string) {
      const leadingSpaceRe = /^\n* /;
      return leadingSpaceRe.test(string);
    }
    // Determines which scalar styles are possible and returns the preferred style.
    // lineWidth = -1 => no limit.
    // Pre-conditions: str.length > 0.
    // Post-conditions:
    //  STYLE_PLAIN or STYLE_SINGLE => no \n are in the string.
    //  STYLE_LITERAL => no lines are suitable for folding (or lineWidth is -1).
    //  STYLE_FOLDED => a line > lineWidth and can be folded (and lineWidth != -1).
    function chooseScalarStyle(
      string,
      singleLineOnly,
      indentPerLevel,
      lineWidth,
      testAmbiguousType,
    ) {
      const shouldTrackWidth = lineWidth !== -1;
      let hasLineBreak = false,
        hasFoldableLine = false, // only checked if shouldTrackWidth
        previousLineBreak = -1, // count the first line correctly
        plain = isPlainSafeFirst(string.charCodeAt(0)) &&
          !isWhitespace(string.charCodeAt(string.length - 1));
      let char, i;
      if (singleLineOnly) {
        // Case: no block styles.
        // Check for disallowed characters to rule out plain and single.
        for (i = 0; i < string.length; i++) {
          char = string.charCodeAt(i);
          if (!isPrintable(char)) {
            return STYLE_DOUBLE;
          }
          plain = plain && isPlainSafe(char);
        }
      } else {
        // Case: block styles permitted.
        for (i = 0; i < string.length; i++) {
          char = string.charCodeAt(i);
          if (char === CHAR_LINE_FEED) {
            hasLineBreak = true;
            // Check if any line can be folded.
            if (shouldTrackWidth) {
              hasFoldableLine = hasFoldableLine ||
                // Foldable line = too long, and not more-indented.
                (i - previousLineBreak - 1 > lineWidth &&
                  string[previousLineBreak + 1] !== " ");
              previousLineBreak = i;
            }
          } else if (!isPrintable(char)) {
            return STYLE_DOUBLE;
          }
          plain = plain && isPlainSafe(char);
        }
        // in case the end is missing a \n
        hasFoldableLine = hasFoldableLine ||
          (shouldTrackWidth &&
            i - previousLineBreak - 1 > lineWidth &&
            string[previousLineBreak + 1] !== " ");
      }
      // Although every style can represent \n without escaping, prefer block styles
      // for multiline, since they're more readable and they don't add empty lines.
      // Also prefer folding a super-long line.
      if (!hasLineBreak && !hasFoldableLine) {
        // Strings interpretable as another type have to be quoted;
        // e.g. the string 'true' vs. the boolean true.
        return plain && !testAmbiguousType(string) ? STYLE_PLAIN : STYLE_SINGLE;
      }
      // Edge case: block indentation indicator can only have one digit.
      if (indentPerLevel > 9 && needIndentIndicator(string)) {
        return STYLE_DOUBLE;
      }
      // At this point we know block styles are valid.
      // Prefer literal style unless we want to fold.
      return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
    }
    // Greedy line breaking.
    // Picks the longest line under the limit each time,
    // otherwise settles for the shortest line over the limit.
    // NB. More-indented lines *cannot* be folded, as that would add an extra \n.
    function foldLine(line, width) {
      if (line === "" || line[0] === " ") {
        return line;
      }
      // Since a more-indented line adds a \n, breaks can't be followed by a space.
      const breakRe = / [^ ]/g; // note: the match index will always be <= length-2.
      let match;
      // start is an inclusive index. end, curr, and next are exclusive.
      let start = 0, end, curr = 0, next = 0;
      let result = "";
      // Invariants: 0 <= start <= length-1.
      //   0 <= curr <= next <= max(0, length-2). curr - start <= width.
      // Inside the loop:
      //   A match implies length >= 2, so curr and next are <= length-2.
      // tslint:disable-next-line:no-conditional-assignment
      while ((match = breakRe.exec(line))) {
        next = match.index;
        // maintain invariant: curr - start <= width
        if (next - start > width) {
          end = curr > start ? curr : next; // derive end <= length-2
          result += `\n${line.slice(start, end)}`;
          // skip the space that was output as \n
          start = end + 1; // derive start <= length-1
        }
        curr = next;
      }
      // By the invariants, start <= length-1, so there is something left over.
      // It is either the whole string or a part starting from non-whitespace.
      result += "\n";
      // Insert a break if the remainder is too long and there is a break available.
      if (line.length - start > width && curr > start) {
        result += `${line.slice(start, curr)}\n${line.slice(curr + 1)}`;
      } else {
        result += line.slice(start);
      }
      return result.slice(1); // drop extra \n joiner
    }
    // (See the note for writeScalar.)
    function dropEndingNewline(string) {
      return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
    }
    // Note: a long line without a suitable break point will exceed the width limit.
    // Pre-conditions: every char in str isPrintable, str.length > 0, width > 0.
    function foldString(string, width) {
      // In folded style, $k$ consecutive newlines output as $k+1$ newlines—
      // unless they're before or after a more-indented line, or at the very
      // beginning or end, in which case $k$ maps to $k$.
      // Therefore, parse each chunk as newline(s) followed by a content line.
      const lineRe = /(\n+)([^\n]*)/g;
      // first line (possibly an empty line)
      let result = (() => {
        let nextLF = string.indexOf("\n");
        nextLF = nextLF !== -1 ? nextLF : string.length;
        lineRe.lastIndex = nextLF;
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return foldLine(string.slice(0, nextLF), width);
      })();
      // If we haven't reached the first content line yet, don't add an extra \n.
      let prevMoreIndented = string[0] === "\n" || string[0] === " ";
      let moreIndented;
      // rest of the lines
      let match;
      // tslint:disable-next-line:no-conditional-assignment
      while ((match = lineRe.exec(string))) {
        const prefix = match[1], line = match[2];
        moreIndented = line[0] === " ";
        result += prefix +
          (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") +
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          foldLine(line, width);
        prevMoreIndented = moreIndented;
      }
      return result;
    }
    // Escapes a double-quoted string.
    function escapeString(string) {
      let result = "";
      let char, nextChar;
      let escapeSeq;
      for (let i = 0; i < string.length; i++) {
        char = string.charCodeAt(i);
        // Check for surrogate pairs (reference Unicode 3.0 section "3.7 Surrogates").
        if (char >= 0xd800 && char <= 0xdbff /* high surrogate */) {
          nextChar = string.charCodeAt(i + 1);
          if (nextChar >= 0xdc00 && nextChar <= 0xdfff /* low surrogate */) {
            // Combine the surrogate pair and store it escaped.
            result += encodeHex(
              (char - 0xd800) * 0x400 + nextChar - 0xdc00 + 0x10000,
            );
            // Advance index one extra since we already used that char here.
            i++;
            continue;
          }
        }
        escapeSeq = ESCAPE_SEQUENCES[char];
        result += !escapeSeq && isPrintable(char) ? string[i]
        : escapeSeq || encodeHex(char);
      }
      return result;
    }
    // Pre-conditions: string is valid for a block scalar, 1 <= indentPerLevel <= 9.
    function blockHeader(string, indentPerLevel) {
      const indentIndicator = needIndentIndicator(string)
        ? String(indentPerLevel) : "";
      // note the special case: the string '\n' counts as a "trailing" empty line.
      const clip = string[string.length - 1] === "\n";
      const keep = clip &&
        (string[string.length - 2] === "\n" || string === "\n");
      const chomp = keep ? "+" : clip ? "" : "-";
      return `${indentIndicator}${chomp}\n`;
    }
    // Note: line breaking/folding is implemented for only the folded style.
    // NB. We drop the last trailing newline (if any) of a returned block scalar
    //  since the dumper adds its own newline. This always works:
    //    • No ending newline => unaffected; already using strip "-" chomping.
    //    • Ending newline    => removed then restored.
    //  Importantly, this keeps the "+" chomp indicator from gaining an extra line.
    function writeScalar(state, string, level, iskey) {
      state.dump = (() => {
        if (string.length === 0) {
          return "''";
        }
        if (
          !state.noCompatMode &&
          DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1
        ) {
          return `'${string}'`;
        }
        const indent = state.indent * Math.max(1, level); // no 0-indent scalars
        // As indentation gets deeper, let the width decrease monotonically
        // to the lower bound min(state.lineWidth, 40).
        // Note that this implies
        //  state.lineWidth ≤ 40 + state.indent: width is fixed at the lower bound.
        //  state.lineWidth > 40 + state.indent: width decreases until the lower
        //  bound.
        // This behaves better than a constant minimum width which disallows
        // narrower options, or an indent threshold which causes the width
        // to suddenly increase.
        const lineWidth = state.lineWidth === -1 ? -1
        : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
        // Without knowing if keys are implicit/explicit,
        // assume implicit for safety.
        const singleLineOnly = iskey ||
          // No block styles in flow mode.
          (state.flowLevel > -1 && level >= state.flowLevel);
        function testAmbiguity(str) {
          return testImplicitResolving(state, str);
        }
        switch (
          chooseScalarStyle(
            string,
            singleLineOnly,
            state.indent,
            lineWidth,
            testAmbiguity,
          )
        ) {
          case STYLE_PLAIN:
            return string;
          case STYLE_SINGLE:
            return `'${string.replace(/'/g, "''")}'`;
          case STYLE_LITERAL:
            return `|${blockHeader(string, state.indent)}${
              dropEndingNewline(indentString(string, indent))
            }`;
          case STYLE_FOLDED:
            return `>${blockHeader(string, state.indent)}${
              dropEndingNewline(
                indentString(foldString(string, lineWidth), indent),
              )
            }`;
          case STYLE_DOUBLE:
            return `"${escapeString(string)}"`;
          default:
            throw new error_ts_3.YAMLError(
              "impossible error: invalid scalar style",
            );
        }
      })();
    }
    function writeFlowSequence(state, level, object) {
      let _result = "";
      const _tag = state.tag;
      for (let index = 0, length = object.length; index < length; index += 1) {
        // Write only valid elements.
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        if (writeNode(state, level, object[index], false, false)) {
          if (index !== 0) {
            _result += `,${!state.condenseFlow ? " " : ""}`;
          }
          _result += state.dump;
        }
      }
      state.tag = _tag;
      state.dump = `[${_result}]`;
    }
    function writeBlockSequence(state, level, object, compact = false) {
      let _result = "";
      const _tag = state.tag;
      for (let index = 0, length = object.length; index < length; index += 1) {
        // Write only valid elements.
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        if (writeNode(state, level + 1, object[index], true, true)) {
          if (!compact || index !== 0) {
            _result += generateNextLine(state, level);
          }
          if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            _result += "-";
          } else {
            _result += "- ";
          }
          _result += state.dump;
        }
      }
      state.tag = _tag;
      state.dump = _result || "[]"; // Empty sequence if no valid values.
    }
    function writeFlowMapping(state, level, object) {
      let _result = "";
      const _tag = state.tag, objectKeyList = Object.keys(object);
      let pairBuffer, objectKey, objectValue;
      for (
        let index = 0, length = objectKeyList.length; index < length; index += 1
      ) {
        pairBuffer = state.condenseFlow ? '"' : "";
        if (index !== 0) {
          pairBuffer += ", ";
        }
        objectKey = objectKeyList[index];
        objectValue = object[objectKey];
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        if (!writeNode(state, level, objectKey, false, false)) {
          continue; // Skip this pair because of invalid key;
        }
        if (state.dump.length > 1024) {
          pairBuffer += "? ";
        }
        pairBuffer += `${state.dump}${state.condenseFlow ? '"' : ""}:${
          state.condenseFlow ? "" : " "
        }`;
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        if (!writeNode(state, level, objectValue, false, false)) {
          continue; // Skip this pair because of invalid value.
        }
        pairBuffer += state.dump;
        // Both key and value are valid.
        _result += pairBuffer;
      }
      state.tag = _tag;
      state.dump = `{${_result}}`;
    }
    function writeBlockMapping(state, level, object, compact = false) {
      const _tag = state.tag, objectKeyList = Object.keys(object);
      let _result = "";
      // Allow sorting keys so that the output file is deterministic
      if (state.sortKeys === true) {
        // Default sorting
        objectKeyList.sort();
      } else if (typeof state.sortKeys === "function") {
        // Custom sort function
        objectKeyList.sort(state.sortKeys);
      } else if (state.sortKeys) {
        // Something is wrong
        throw new error_ts_3.YAMLError(
          "sortKeys must be a boolean or a function",
        );
      }
      let pairBuffer = "", objectKey, objectValue, explicitPair;
      for (
        let index = 0, length = objectKeyList.length; index < length; index += 1
      ) {
        pairBuffer = "";
        if (!compact || index !== 0) {
          pairBuffer += generateNextLine(state, level);
        }
        objectKey = objectKeyList[index];
        objectValue = object[objectKey];
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        if (!writeNode(state, level + 1, objectKey, true, true, true)) {
          continue; // Skip this pair because of invalid key.
        }
        explicitPair = (state.tag !== null && state.tag !== "?") ||
          (state.dump && state.dump.length > 1024);
        if (explicitPair) {
          if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            pairBuffer += "?";
          } else {
            pairBuffer += "? ";
          }
        }
        pairBuffer += state.dump;
        if (explicitPair) {
          pairBuffer += generateNextLine(state, level);
        }
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
          continue; // Skip this pair because of invalid value.
        }
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          pairBuffer += ":";
        } else {
          pairBuffer += ": ";
        }
        pairBuffer += state.dump;
        // Both key and value are valid.
        _result += pairBuffer;
      }
      state.tag = _tag;
      state.dump = _result || "{}"; // Empty mapping if no valid pairs.
    }
    function detectType(state, object, explicit = false) {
      const typeList = explicit ? state.explicitTypes : state.implicitTypes;
      let type;
      let style;
      let _result;
      for (
        let index = 0, length = typeList.length; index < length; index += 1
      ) {
        type = typeList[index];
        if (
          (type.instanceOf || type.predicate) &&
          (!type.instanceOf ||
            (typeof object === "object" &&
              object instanceof type.instanceOf)) &&
          (!type.predicate || type.predicate(object))
        ) {
          state.tag = explicit ? type.tag : "?";
          if (type.represent) {
            style = state.styleMap[type.tag] || type.defaultStyle;
            if (_toString.call(type.represent) === "[object Function]") {
              _result = type.represent(object, style);
            } else if (_hasOwnProperty.call(type.represent, style)) {
              _result = type.represent[style](object, style);
            } else {
              throw new error_ts_3.YAMLError(
                `!<${type.tag}> tag resolver accepts not "${style}" style`,
              );
            }
            state.dump = _result;
          }
          return true;
        }
      }
      return false;
    }
    // Serializes `object` and writes it to global `result`.
    // Returns true on success, or false on invalid object.
    //
    function writeNode(state, level, object, block, compact, iskey = false) {
      state.tag = null;
      state.dump = object;
      if (!detectType(state, object, false)) {
        detectType(state, object, true);
      }
      const type = _toString.call(state.dump);
      if (block) {
        block = state.flowLevel < 0 || state.flowLevel > level;
      }
      const objectOrArray = type === "[object Object]" ||
        type === "[object Array]";
      let duplicateIndex = -1;
      let duplicate = false;
      if (objectOrArray) {
        duplicateIndex = state.duplicates.indexOf(object);
        duplicate = duplicateIndex !== -1;
      }
      if (
        (state.tag !== null && state.tag !== "?") ||
        duplicate ||
        (state.indent !== 2 && level > 0)
      ) {
        compact = false;
      }
      if (duplicate && state.usedDuplicates[duplicateIndex]) {
        state.dump = `*ref_${duplicateIndex}`;
      } else {
        if (
          objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]
        ) {
          state.usedDuplicates[duplicateIndex] = true;
        }
        if (type === "[object Object]") {
          if (block && Object.keys(state.dump).length !== 0) {
            writeBlockMapping(state, level, state.dump, compact);
            if (duplicate) {
              state.dump = `&ref_${duplicateIndex}${state.dump}`;
            }
          } else {
            writeFlowMapping(state, level, state.dump);
            if (duplicate) {
              state.dump = `&ref_${duplicateIndex} ${state.dump}`;
            }
          }
        } else if (type === "[object Array]") {
          const arrayLevel = state.noArrayIndent && level > 0 ? level - 1
          : level;
          if (block && state.dump.length !== 0) {
            writeBlockSequence(state, arrayLevel, state.dump, compact);
            if (duplicate) {
              state.dump = `&ref_${duplicateIndex}${state.dump}`;
            }
          } else {
            writeFlowSequence(state, arrayLevel, state.dump);
            if (duplicate) {
              state.dump = `&ref_${duplicateIndex} ${state.dump}`;
            }
          }
        } else if (type === "[object String]") {
          if (state.tag !== "?") {
            writeScalar(state, state.dump, level, iskey);
          }
        } else {
          if (state.skipInvalid) {
            return false;
          }
          throw new error_ts_3.YAMLError(
            `unacceptable kind of an object to dump ${type}`,
          );
        }
        if (state.tag !== null && state.tag !== "?") {
          state.dump = `!<${state.tag}> ${state.dump}`;
        }
      }
      return true;
    }
    function inspectNode(object, objects, duplicatesIndexes) {
      if (object !== null && typeof object === "object") {
        const index = objects.indexOf(object);
        if (index !== -1) {
          if (duplicatesIndexes.indexOf(index) === -1) {
            duplicatesIndexes.push(index);
          }
        } else {
          objects.push(object);
          if (Array.isArray(object)) {
            for (let idx = 0, length = object.length; idx < length; idx += 1) {
              inspectNode(object[idx], objects, duplicatesIndexes);
            }
          } else {
            const objectKeyList = Object.keys(object);
            for (
              let idx = 0, length = objectKeyList.length; idx < length; idx += 1
            ) {
              inspectNode(
                object[objectKeyList[idx]],
                objects,
                duplicatesIndexes,
              );
            }
          }
        }
      }
    }
    function getDuplicateReferences(object, state) {
      const objects = [], duplicatesIndexes = [];
      inspectNode(object, objects, duplicatesIndexes);
      const length = duplicatesIndexes.length;
      for (let index = 0; index < length; index += 1) {
        state.duplicates.push(objects[duplicatesIndexes[index]]);
      }
      state.usedDuplicates = new Array(length);
    }
    function dump(input, options) {
      options = options || {};
      const state = new dumper_state_ts_1.DumperState(options);
      if (!state.noRefs) {
        getDuplicateReferences(input, state);
      }
      if (writeNode(state, 0, input, true, true)) {
        return `${state.dump}\n`;
      }
      return "";
    }
    exports_49("dump", dump);
    return {
      setters: [
        function (error_ts_3_1) {
          error_ts_3 = error_ts_3_1;
        },
        function (common_2) {
          common = common_2;
        },
        function (dumper_state_ts_1_1) {
          dumper_state_ts_1 = dumper_state_ts_1_1;
        },
      ],
      execute: function () {
        _toString = Object.prototype.toString;
        _hasOwnProperty = Object.prototype.hasOwnProperty;
        CHAR_TAB = 0x09; /* Tab */
        CHAR_LINE_FEED = 0x0a; /* LF */
        CHAR_SPACE = 0x20; /* Space */
        CHAR_EXCLAMATION = 0x21; /* ! */
        CHAR_DOUBLE_QUOTE = 0x22; /* " */
        CHAR_SHARP = 0x23; /* # */
        CHAR_PERCENT = 0x25; /* % */
        CHAR_AMPERSAND = 0x26; /* & */
        CHAR_SINGLE_QUOTE = 0x27; /* ' */
        CHAR_ASTERISK = 0x2a; /* * */
        CHAR_COMMA = 0x2c; /* , */
        CHAR_MINUS = 0x2d; /* - */
        CHAR_COLON = 0x3a; /* : */
        CHAR_GREATER_THAN = 0x3e; /* > */
        CHAR_QUESTION = 0x3f; /* ? */
        CHAR_COMMERCIAL_AT = 0x40; /* @ */
        CHAR_LEFT_SQUARE_BRACKET = 0x5b; /* [ */
        CHAR_RIGHT_SQUARE_BRACKET = 0x5d; /* ] */
        CHAR_GRAVE_ACCENT = 0x60; /* ` */
        CHAR_LEFT_CURLY_BRACKET = 0x7b; /* { */
        CHAR_VERTICAL_LINE = 0x7c; /* | */
        CHAR_RIGHT_CURLY_BRACKET = 0x7d; /* } */
        ESCAPE_SEQUENCES = {};
        ESCAPE_SEQUENCES[0x00] = "\\0";
        ESCAPE_SEQUENCES[0x07] = "\\a";
        ESCAPE_SEQUENCES[0x08] = "\\b";
        ESCAPE_SEQUENCES[0x09] = "\\t";
        ESCAPE_SEQUENCES[0x0a] = "\\n";
        ESCAPE_SEQUENCES[0x0b] = "\\v";
        ESCAPE_SEQUENCES[0x0c] = "\\f";
        ESCAPE_SEQUENCES[0x0d] = "\\r";
        ESCAPE_SEQUENCES[0x1b] = "\\e";
        ESCAPE_SEQUENCES[0x22] = '\\"';
        ESCAPE_SEQUENCES[0x5c] = "\\\\";
        ESCAPE_SEQUENCES[0x85] = "\\N";
        ESCAPE_SEQUENCES[0xa0] = "\\_";
        ESCAPE_SEQUENCES[0x2028] = "\\L";
        ESCAPE_SEQUENCES[0x2029] = "\\P";
        DEPRECATED_BOOLEANS_SYNTAX = [
          "y",
          "Y",
          "yes",
          "Yes",
          "YES",
          "on",
          "On",
          "ON",
          "n",
          "N",
          "no",
          "No",
          "NO",
          "off",
          "Off",
          "OFF",
        ];
        STYLE_PLAIN = 1,
          STYLE_SINGLE = 2,
          STYLE_LITERAL = 3,
          STYLE_FOLDED = 4,
          STYLE_DOUBLE = 5;
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/_yaml/stringify",
  ["https://deno.land/std/encoding/_yaml/dumper/dumper"],
  function (exports_50, context_50) {
    "use strict";
    var dumper_ts_1;
    var __moduleName = context_50 && context_50.id;
    /**
     * Serializes `object` as a YAML document.
     *
     * You can disable exceptions by setting the skipInvalid option to true.
     */
    function stringify(obj, options) {
      return dumper_ts_1.dump(obj, options);
    }
    exports_50("stringify", stringify);
    return {
      setters: [
        function (dumper_ts_1_1) {
          dumper_ts_1 = dumper_ts_1_1;
        },
      ],
      execute: function () {
      },
    };
  },
);
// Ported from js-yaml v3.13.1:
// https://github.com/nodeca/js-yaml/commit/665aadda42349dcae869f12040d9b10ef18d12da
// Copyright 2011-2015 by Vitaly Puzrin. All rights reserved. MIT license.
// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.
System.register(
  "https://deno.land/std/encoding/yaml",
  [
    "https://deno.land/std/encoding/_yaml/parse",
    "https://deno.land/std/encoding/_yaml/stringify",
    "https://deno.land/std/encoding/_yaml/schema/mod",
  ],
  function (exports_51, context_51) {
    "use strict";
    var __moduleName = context_51 && context_51.id;
    return {
      setters: [
        function (parse_ts_1_1) {
          exports_51({
            "parse": parse_ts_1_1["parse"],
            "parseAll": parse_ts_1_1["parseAll"],
          });
        },
        function (stringify_ts_1_1) {
          exports_51({
            "stringify": stringify_ts_1_1["stringify"],
          });
        },
        function (mod_ts_6_1) {
          exports_51({
            "CORE_SCHEMA": mod_ts_6_1["CORE_SCHEMA"],
            "DEFAULT_SCHEMA": mod_ts_6_1["DEFAULT_SCHEMA"],
            "FAILSAFE_SCHEMA": mod_ts_6_1["FAILSAFE_SCHEMA"],
            "JSON_SCHEMA": mod_ts_6_1["JSON_SCHEMA"],
          });
        },
      ],
      execute: function () {
      },
    };
  },
);
System.register(
  "file:///C:/bndes-java-env.kit/bootstrap/levain/lib/repositories/fs",
  [
    "https://deno.land/std/path/mod",
    "https://deno.land/std/encoding/yaml",
    "file:///C:/bndes-java-env.kit/bootstrap/levain/lib/package",
  ],
  function (exports_52, context_52) {
    "use strict";
    var path, yaml, package_ts_1, FileSystemRepository;
    var __moduleName = context_52 && context_52.id;
    return {
      setters: [
        function (path_1) {
          path = path_1;
        },
        function (yaml_1) {
          yaml = yaml_1;
        },
        function (package_ts_1_1) {
          package_ts_1 = package_ts_1_1;
        },
      ],
      execute: function () {
        FileSystemRepository = class FileSystemRepository {
          constructor(config, rootDir) {
            this.config = config;
            this.rootDir = rootDir;
            console.log("FSRepo: Root=", this.rootDir);
          }
          resolvePackage(packageName) {
            let pkg = this.readDir(packageName, this.rootDir);
            if (pkg) {
              console.log("FSRepo:", packageName, "=>", pkg.toString());
              console.log("");
            }
            return pkg;
          }
          readDir(packageName, dirname) {
            let pkg = undefined;
            for (const entry of Deno.readDirSync(dirname)) {
              if (!pkg && entry.isDirectory) {
                pkg = this.readDir(
                  packageName,
                  path.resolve(dirname, entry.name),
                );
              }
              if (!pkg && entry.isFile) {
                pkg = this.readPackage(
                  packageName,
                  path.resolve(dirname, entry.name),
                );
              }
              if (pkg) {
                return pkg;
              }
            }
            return undefined;
          }
          readPackage(packageName, filename) {
            if (!filename.match(packageName + ".levain.yaml")) {
              return undefined;
            }
            let fileinfo = Deno.lstatSync(filename);
            if (!fileinfo.isFile) {
              return undefined;
            }
            //console.log(`FSRepo: PKG[${packageName}] => ${filename}`);
            let yamlStr = Deno.readTextFileSync(filename);
            let yamlStruct = yaml.parse(yamlStr);
            let pkg = new package_ts_1.default(
              packageName,
              filename,
              yamlStruct,
              this,
            );
            return pkg;
          }
        };
        exports_52("default", FileSystemRepository);
      },
    };
  },
);
System.register(
  "file:///C:/bndes-java-env.kit/bootstrap/levain/lib/config",
  [
    "https://deno.land/std/path/mod",
    "file:///C:/bndes-java-env.kit/bootstrap/levain/lib/repositories/cache",
    "file:///C:/bndes-java-env.kit/bootstrap/levain/lib/repositories/chain",
    "file:///C:/bndes-java-env.kit/bootstrap/levain/lib/repositories/null",
    "file:///C:/bndes-java-env.kit/bootstrap/levain/lib/repositories/fs",
  ],
  function (exports_53, context_53) {
    "use strict";
    var path, cache_ts_1, chain_ts_1, null_ts_1, fs_ts_1, Config;
    var __moduleName = context_53 && context_53.id;
    return {
      setters: [
        function (path_2) {
          path = path_2;
        },
        function (cache_ts_1_1) {
          cache_ts_1 = cache_ts_1_1;
        },
        function (chain_ts_1_1) {
          chain_ts_1 = chain_ts_1_1;
        },
        function (null_ts_1_1) {
          null_ts_1 = null_ts_1_1;
        },
        function (fs_ts_1_1) {
          fs_ts_1 = fs_ts_1_1;
        },
      ],
      execute: function () {
        Config = class Config {
          constructor() {
            let home = this.homedir();
            if (home) {
              this._levainHome = path.resolve(home, "levain");
              console.log("DEFAULT levainHome:", this._levainHome);
            }
            this._repository = new cache_ts_1.default(
              this,
              new chain_ts_1.default(this, [
                new fs_ts_1.default(this, "."),
                new null_ts_1.default(this),
              ]),
            );
          }
          get levainHome() {
            return this._levainHome;
          }
          get repository() {
            return this._repository;
          }
          replaceVars(pkg, text) {
            let pkgConfig = pkg.yamlItem("config");
            let myText = text;
            let vars = myText.match(/\${[^${}]+}/);
            if (vars) {
              for (let v of vars) {
                let vName = v.replace("$", "").replace("{", "").replace(
                  "}",
                  "",
                );
                let value = undefined;
                if (pkgConfig) {
                  value = pkgConfig[vName];
                }
                if (value) {
                  myText = myText.replace(v, value);
                }
              }
            }
            return myText;
          }
          // TODO: We must find a standard Deno function for this!
          homedir() {
            // Common option
            let home = Deno.env.get("home");
            if (home) {
              return home;
            }
            // Not found - Windows?
            let homedrive = Deno.env.get("homedrive");
            let homepath = Deno.env.get("homepath");
            if (homedrive && homepath) {
              return path.resolve(homedrive, homepath);
            }
            // What else?
            return undefined;
          }
        };
        exports_53("default", Config);
      },
    };
  },
);
System.register(
  "file:///C:/bndes-java-env.kit/bootstrap/levain/lib/action",
  [],
  function (exports_54, context_54) {
    "use strict";
    var __moduleName = context_54 && context_54.id;
    return {
      setters: [],
      execute: function () {
      },
    };
  },
);
System.register(
  "file:///C:/bndes-java-env.kit/bootstrap/levain/lib/loader",
  [],
  function (exports_55, context_55) {
    "use strict";
    var Loader;
    var __moduleName = context_55 && context_55.id;
    return {
      setters: [],
      execute: function () {
        Loader = class Loader {
          constructor(config) {
            this.config = config;
          }
          async command(cmd, args) {
            const module = await context_55.import(`../cmd/${cmd}/${cmd}.ts`);
            const handler = new module.default(this.config);
            handler.execute(args);
          }
          async action(pkg, action, args) {
            const module = await context_55.import(
              `../action/${action}/${action}.ts`,
            );
            const handler = new module.default(this.config);
            handler.execute(pkg, args);
          }
        };
        exports_55("default", Loader);
      },
    };
  },
);
System.register(
  "file:///C:/bndes-java-env.kit/bootstrap/levain/levain",
  [
    "file:///C:/bndes-java-env.kit/bootstrap/levain/lib/loader",
    "file:///C:/bndes-java-env.kit/bootstrap/levain/lib/config",
  ],
  function (exports_56, context_56) {
    "use strict";
    var loader_ts_2,
      config_ts_1,
      args,
      exit,
      myArgs,
      optionSpace,
      config,
      cmd,
      loader;
    var __moduleName = context_56 && context_56.id;
    return {
      setters: [
        function (loader_ts_2_1) {
          loader_ts_2 = loader_ts_2_1;
        },
        function (config_ts_1_1) {
          config_ts_1 = config_ts_1_1;
        },
      ],
      execute: function () {
        args = Deno.args, exit = Deno.exit;
        console.log("levain v0.0.1");
        console.log("");
        // TODO: We should use a command line parser. But not Deno.flags.
        // args clone
        myArgs = [];
        optionSpace = true;
        for (let arg of args) {
          if (optionSpace && arg.startsWith("-")) {
            console.log("General option ignored", arg);
          } else {
            optionSpace = false;
            myArgs.push(arg);
          }
        }
        // TODO: Handle general options
        // TODO: No parameters? Show Help
        if (myArgs.length == 0) {
          exit(1);
        }
        // Context
        config = new config_ts_1.default();
        //
        console.log("");
        console.log("==================================");
        // First parameter is the command
        cmd = myArgs.shift();
        loader = new loader_ts_2.default(config);
        loader.command(cmd, myArgs);
      },
    };
  },
);

__instantiate("file:///C:/bndes-java-env.kit/bootstrap/levain/levain");
