import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scripts/**/*.test.ts", "packages/*/src/**/*.test.ts", "packages/*/scripts/**/*.test.ts"],
    // Tests never ask npm for the latest release (RFC 0014); the check's own tests give it an answer.
    env: { PEER_AI_UPDATE_CHECK: "off" },
  },
});
