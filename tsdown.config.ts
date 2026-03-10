import { defineConfig } from "tsdown";
import process from "node:process";

export default defineConfig({
	entry: ["src/cli/index.ts"],
	format: "esm",
	platform: "node",
	outDir: "dist/cli",
	dts: false,
	minify: true,
	sourcemap: !process.env.CI,
	deps: {
		alwaysBundle: [/.*/],
		onlyAllowBundle: false,
	},
	outExtensions: () => ({ js: ".js" }),
});
