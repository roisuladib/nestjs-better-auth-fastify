import { defineConfig } from 'bunup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm', 'cjs'],
	exports: true,
	unused: true,
	clean: true,
	minify: true,
	dts: false,
});
