import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
	declaration: true,
	clean: true,

	rollup: {
		emitCJS: true,
		inlineDependencies: false,
		cjsBridge: true,

		esbuild: {
			target: 'node18',
			platform: 'node',
			minify: false,
			keepNames: true,
			tsconfigRaw: {
				compilerOptions: {
					experimentalDecorators: true,
					strict: true,
					useDefineForClassFields: true,
				},
			},
		},

		output: {
			preserveModules: false,
			exports: 'named',
		},

		resolve: {
			preferBuiltins: true,
			extensions: ['.ts', '.js', '.json'],
		},
	},

	externals: [
		/^@nestjs\/.*/,
		'fastify',
		/^fastify\/.*/,
		'better-auth',
		/^better-auth\/.*/,
		'reflect-metadata',
		'rxjs',
		/^rxjs\/.*/,
		'graphql',
		/^graphql\/.*/,
		/^node:.*/,
	],

	failOnWarn: false,
});
