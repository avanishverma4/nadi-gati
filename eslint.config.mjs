import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import prettier from "eslint-config-prettier";

export default defineConfig([
  {
    ignores: [
      ".next/**",
      "dist/**",
      "build/**",
      "functions/lib/**",
      "node_modules/**",
      "next-env.d.ts",
      "public/sw*.js",
      "public/swe-worker*.js",
      "public/maplibre-gl-worker.mjs",
    ],
  },
  ...next,
  prettier,
  {
    rules: {
      "eqeqeq": ["error", "always"],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-debugger": "error",
      "prefer-const": "error",
      "no-var": "error",
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);
