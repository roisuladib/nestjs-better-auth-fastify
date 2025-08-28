import { defineConfig } from 'bunup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm', 'cjs'],
	clean: true,
	minify: true,
	minifyIdentifiers: true,
	minifySyntax: true,
	minifyWhitespace: true,
	dts: false, // Disable bunup's DTS generation, use tsc instead
});
