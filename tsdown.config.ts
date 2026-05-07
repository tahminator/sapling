import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "index.ts",
  outDir: "dist",
  tsconfig: "tsconfig.app.json",
  format: ["esm", "cjs"],
  platform: "node",
  hash: false,
  fixedExtension: true,
  exports: true,
  dts: {
    build: true,
  },
  clean: true,
  target: "node18",
});
