import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".skillweave/**",
      "dist/**",
      "node_modules/**",
      "src-tauri/gen/**",
      "src-tauri/target/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    rules: {
      "no-debugger": "error",
    },
  },
  {
    files: ["**/*.{ts,tsx,mts}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-console": "off",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
