import { build } from "esbuild";
import { polyfillNode } from "esbuild-plugin-polyfill-node";

await build({
	entryPoints: ["src/index.ts"],
	bundle: true,
	format:"esm",
	outfile: "dist/index.mjs",
	sourcemap: true,
	platform: "browser",
	define: {
		"global": 'window',
	},
	plugins: [
		polyfillNode({
			// Options (optional)
		}),
	],
});

await build({
	entryPoints: ["src/index.ts"],
	bundle: true,
	minify: true,
	outfile: "dist/index.min.mjs",
	sourcemap: false,
	platform: "browser",
	define: {
		"global": 'window',
	},
	format:"esm",
	plugins: [
		polyfillNode({
			// Options (optional)
		}),
	],
});
