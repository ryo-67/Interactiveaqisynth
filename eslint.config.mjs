// ESLint, added 2026-09-17 (BUG-51, CLN-09). The repo had ten `eslint-disable react-hooks/exhaustive-deps`
// directives and no linter, so the rule they suppress had never run and nothing checked what they claimed.
// Measured before adding this: zero rules-of-hooks violations, and three exhaustive-deps findings nobody had
// seen — a memo that never memoised, a dependency array the rule could not read, and a directive suppressing
// nothing. All three are fixed; this is what stops the next one.
//
// Deliberately narrow. This is not a style pass: the codebase has its own conventions and no appetite for a
// thousand cosmetic warnings. Two rules, both about correctness:
//   rules-of-hooks  — error. Conditional hooks break React outright; there are none, and there should stay none.
//   exhaustive-deps — warn. Some omissions here are deliberate and carry a comment saying why; the point is
//                     that a NEW one has to be argued for rather than appearing unnoticed.
// reportUnusedDisableDirectives turns a stale suppression into a warning of its own, which is how the dead
// directive in Graph.tsx was found.
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["build/**", "node_modules/**", "public/**", "prototype/**"] },
  {
    files: ["src/**/*.{ts,tsx}", "api/**/*.ts", "scripts/**/*.ts"],
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { "react-hooks": reactHooks },
    linterOptions: { reportUnusedDisableDirectives: "warn" },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
