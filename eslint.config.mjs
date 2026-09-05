import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const frontendError = "error";

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: [
      "src/components/**/*.{ts,tsx}",
      "src/app/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
    ],
    ignores: ["src/components/ui/**", "src/app/api/**"],
    rules: {
      "react/destructuring-assignment": ["warn", "always"],
      "react/jsx-no-leaked-render": ["warn", { validStrategies: ["ternary"] }],
      "react/no-unstable-nested-components": frontendError,
      "react/display-name": frontendError,
      "no-restricted-imports": [
        frontendError,
        {
          paths: [
            {
              name: "mongoose",
              message: "Client UI must not import Mongoose. See FRONTEND.md.",
            },
          ],
          patterns: [
            {
              group: ["@/types/mongoose/*", "@/types/mongoose"],
              message:
                "Client UI must not import Mongoose models. See FRONTEND.md.",
            },
            {
              group: ["@/server/*", "@/server"],
              message:
                "Client UI must not import server modules. Call /api via apiFetch. See FRONTEND.md.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/api/**/route.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "mongoose",
              message: "Handlers must not import mongoose. See ARCHITECTURE.md.",
            },
          ],
          patterns: [
            {
              group: ["@/types/mongoose/*", "@/types/mongoose"],
              message: "Handlers must not import Mongoose models.",
            },
            {
              group: ["@/services/Database"],
              message: "Handlers must not import Database. Use a repository.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/**/*.service.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "next/server", message: "Services must not import next/server." },
            {
              name: "@/services/Database",
              message: "Services must not import Database. Use a repository.",
            },
          ],
          patterns: [
            {
              group: ["@/types/mongoose/*", "@/types/mongoose"],
              message: "Services must not import Mongoose models.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "mongoose", message: "Domain must stay pure." },
            { name: "next/server", message: "Domain must stay pure." },
          ],
          patterns: [
            { group: ["next/*"], message: "Domain must stay pure." },
            { group: ["@/services/*"], message: "Domain must stay pure." },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
