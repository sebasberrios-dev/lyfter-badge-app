import { defineConfig } from "vitest/config";
import path from "path";

const dirname = import.meta.dirname;

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": path.resolve(dirname, "tests/shims/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.ts"],
  },
});
