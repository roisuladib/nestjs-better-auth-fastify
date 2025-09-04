import type {
	DynamicModule,
	MiddlewareConsumer,
	ModuleMetadata,
	NestModule,
	OnModuleInit,
	Provider,
	Type,
} from '@nestjs/common';
import type { FastifyAdapter } from '@nestjs/platform-fastify';
import type { Auth, betterAuth } from 'better-auth';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { HttpStatus, Inject, Logger, Module } from '@nestjs/common';
import {
	APP_FILTER,
	DiscoveryModule,
	DiscoveryService,
	HttpAdapterHost,
	MetadataScanner,
} from '@nestjs/core';

import { createAuthMiddleware } from 'better-auth/api';

import { AuthFilter } from './auth.filter';
import { AuthService } from './auth.service';
import {
	AFTER_HOOK_KEY,
	AUTH_INSTANCE_KEY,
	AUTH_MODULE_OPTIONS_KEY,
	BEFORE_HOOK_KEY,
	HOOK_KEY,
} from './auth.symbols';

type BetterAuthInstance = ReturnType<typeof betterAuth>;

/**
 * Configuration options for the AuthModule
 */
export type AuthModuleOptions = {
	disableExceptionFilter?: boolean;
	disableTrustedOriginsCors?: boolean;
};

/**
 * Return type for auth configuration factory
 */
export type AuthFactoryResult<T extends BetterAuthInstance> = {
	auth: T;
	options?: AuthModuleOptions;
};

/**
 * Configuration provider interface for auth module
 */
export interface AuthConfigProvider {
	createAuthOptions():
		| AuthFactoryResult<BetterAuthInstance>
		| Promise<AuthFactoryResult<BetterAuthInstance>>;
}

/**
 * Factory for creating Auth instance and module options asynchronously
 */
export interface AuthModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
	/**
	 * Factory function that returns an object with auth instance and optional module options
	 */
	useFactory?: (
		...args: unknown[]
	) => AuthFactoryResult<BetterAuthInstance> | Promise<AuthFactoryResult<BetterAuthInstance>>;
	/**
	 * Providers to inject into the factory function
	 */
	inject?: (string | symbol | Type<unknown>)[];
	/**
	 * Use an existing provider class
	 */
	useClass?: Type<AuthConfigProvider>;
	/**
	 * Use an existing provider
	 */
	useExisting?: Type<AuthConfigProvider>;
}

const HOOKS = [
	{ metadataKey: BEFORE_HOOK_KEY, hookType: 'before' as const },
	{ metadataKey: AFTER_HOOK_KEY, hookType: 'after' as const },
];

/**
 * NestJS module that integrates Better Auth with NestJS/Fastify applications.
 *
 * @class AuthModule
 * @implements {NestModule}
 * @implements {OnModuleInit}
 *
 * @description
 * This module provides:
 * - Authentication middleware for Better Auth integration
 * - Automatic CORS configuration based on trustedOrigins
 * - Hook system for before/after auth operations
 * - Global exception handling for auth errors
 * - Session management and guards
 *
 * @example
 * ```typescript
 * // Static configuration
 * AuthModule.forRoot(auth, {
 *   disableExceptionFilter: false,
 *   disableTrustedOriginsCors: false
 * })
 *
 * // Async configuration
 * AuthModule.forRootAsync({
 *   useFactory: async () => ({
 *     auth: betterAuth(config),
 *     options: { disableExceptionFilter: false }
 *   }),
 *   inject: [ConfigService]
 * })
 * ```
 */
@Module({
	imports: [DiscoveryModule],
})
export class AuthModule implements NestModule, OnModuleInit {
	private readonly logger = new Logger(AuthModule.name);

	constructor(
		@Inject(AUTH_INSTANCE_KEY)
		private readonly auth: Auth,
		@Inject(DiscoveryService)
		private readonly discoveryService: DiscoveryService,
		@Inject(MetadataScanner)
		private readonly metadataScanner: MetadataScanner,
		@Inject(HttpAdapterHost)
		private readonly adapter: HttpAdapterHost<FastifyAdapter>,
		@Inject(AUTH_MODULE_OPTIONS_KEY)
		private readonly options: AuthModuleOptions,
	) {}

	onModuleInit(): void {
		this.setupHooks();
	}

	configure(_consumer: MiddlewareConsumer): void {
		this.setupCors();
		this.setupHandler();
	}

	/**
	 * Setup Better Auth hooks from decorated providers.
	 * Scans for providers decorated with @Hook and registers their
	 * @BeforeHook and @AfterHook methods with Better Auth.
	 *
	 * @private
	 * @returns {void}
	 */
	private setupHooks(): void {
		if (!this.auth.options.hooks) {
			this.logger.log('No hooks configuration found in Better Auth, skipping hook setup');
			return;
		}

		const providers = this.discoveryService
			.getProviders()
			.filter(({ metatype }) => metatype && Reflect.getMetadata(HOOK_KEY, metatype));

		if (providers.length === 0) {
			this.logger.log('No hook providers found with @AuthHook decorator');
			return;
		}

		for (const provider of providers) {
			const providerPrototype = Object.getPrototypeOf(provider.instance);
			const methods = this.metadataScanner.getAllMethodNames(providerPrototype);

			for (const method of methods) {
				const providerMethod = providerPrototype[method];
				this.setupHookMethod(providerMethod, provider.instance);
			}
		}

		this.logger.log(`Configured hooks for ${providers.length} providers`);
	}

	/**
	 * Setup individual hook method with Better Auth middleware
	 */
	private setupHookMethod(
		providerMethod: (...args: unknown[]) => unknown,
		providerInstance: { new (...args: unknown[]): unknown },
	): void {
		if (!this.auth.options.hooks) return;

		for (const { metadataKey, hookType } of HOOKS) {
			const hookPath = Reflect.getMetadata(metadataKey, providerMethod);
			if (!hookPath) continue;

			const originalHook = this.auth.options.hooks[hookType];

			// Wrap with Better Auth middleware
			this.auth.options.hooks[hookType] = createAuthMiddleware(async (ctx) => {
				try {
					// Execute original hook first (if exists)
					if (originalHook) {
						await originalHook(ctx);
					}

					// Execute provider hook if path matches
					if (hookPath === ctx.path) {
						await providerMethod.apply(providerInstance, [ctx]);
					}
				} catch (error) {
					this.logger.error(`Hook execution failed for ${hookType}:${hookPath} - ${error}`);
					throw error; // Re-throw to let Better Auth handle it
				}
			});

			this.logger.log(`Registered ${hookType} hook for path: ${hookPath}`);
		}
	}

	/**
	 * Setup CORS configuration based on Better Auth trustedOrigins.
	 * Supports three modes:
	 * - undefined: No CORS configuration
	 * - string[]: Static list of allowed origins (best performance)
	 * - function: Dynamic origin validation (flexible but slower)
	 *
	 * @private
	 * @throws {Error} If trustedOrigins configuration is invalid
	 * @returns {void}
	 */
	private setupCors(): void {
		const trustedOrigins = this.auth.options.trustedOrigins;

		if (this.options.disableTrustedOriginsCors) {
			this.logger.log('CORS disabled by module configuration');
			return;
		}

		if (!trustedOrigins) {
			this.logger.log('No trustedOrigins configured in Better Auth, skipping CORS setup');
			return;
		}

		// Handle string[] - Static origins (recommended for performance)
		if (Array.isArray(trustedOrigins)) {
			this.setupStaticCors(trustedOrigins);
			return;
		}

		// Handle function - Dynamic origins (flexible but slower)
		if (typeof trustedOrigins === 'function') {
			this.logger.warn(
				'Function-based trustedOrigins detected. Consider using static string[] for better performance.',
			);
			this.setupDynamicCors(trustedOrigins);
			return;
		}

		// Invalid type
		throw new Error(
			'Invalid trustedOrigins configuration. Must be string[] or (request: Request) => string[] | Promise<string[]>',
		);
	}

	/**
	 * Setup static CORS for string[] trustedOrigins
	 * Uses Fastify's built-in CORS via NestJS adapter
	 */
	private setupStaticCors(origins: string[]): void {
		this.adapter.httpAdapter.enableCors({
			origin: origins,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
			credentials: true,
			maxAge: 86400, // 24 hours preflight cache
		});

		this.logger.log(`Static CORS configured for ${origins.length} origins: ${origins.join(', ')}`);
	}

	/**
	 * Setup dynamic CORS for function-based trustedOrigins
	 * Handles both sync and async functions
	 */
	private setupDynamicCors(
		trustedOriginsFunc: (request: Request) => string[] | Promise<string[]>,
	): void {
		const fastifyInstance = this.adapter.httpAdapter.getInstance<FastifyInstance>();

		// Register preHandler hook for dynamic CORS evaluation
		fastifyInstance.addHook('preHandler', async (request, reply) => {
			// Only apply CORS to auth routes for performance
			const authBasePath = this.getAuthBasePath();
			if (!request.url.startsWith(authBasePath)) {
				return;
			}

			try {
				// Convert Fastify Request to Web API Request
				const webRequest = this.convertToWebApiRequest(request);

				// Call trustedOrigins function (handles both sync and async)
				const allowedOrigins = await trustedOriginsFunc(webRequest);
				const requestOrigin = request.headers.origin;

				// Set CORS headers if origin is allowed
				if (
					requestOrigin &&
					Array.isArray(allowedOrigins) &&
					allowedOrigins.includes(requestOrigin)
				) {
					this.setCorsHeaders(reply, requestOrigin);
				}

				// Handle preflight OPTIONS requests
				if (request.method === 'OPTIONS') {
					reply.status(HttpStatus.NO_CONTENT).send();
					return;
				}
			} catch (error) {
				this.logger.error(`Dynamic CORS evaluation failed for ${request.url}: ${error}`);
				// Don't block the request on CORS errors, just log and continue
			}
		});

		this.logger.log('Dynamic CORS configured with function-based trustedOrigins');
	}

	/**
	 * Convert Fastify Request to Web API Request
	 * Better Auth expects Web API Request objects
	 */
	private convertToWebApiRequest(request: FastifyRequest) {
		// Build complete URL
		const protocol = request.protocol || 'http';
		const hostname = request.hostname || request.headers.host || 'localhost';
		const url = new URL(request.url, `${protocol}://${hostname}`);

		// Convert Fastify headers to Web API Headers
		const headers = new Headers();
		Object.entries(request.headers).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				// Handle both single values and arrays
				const headerValue = Array.isArray(value) ? value.join(', ') : String(value);
				headers.set(key, headerValue);
			}
		});

		// Create Web API Request object
		return new Request(url.toString(), {
			method: request.method,
			headers,
			body: request.body ? JSON.stringify(request.body) : undefined,
		});
	}

	/**
	 * Set CORS headers for dynamic origins
	 */
	private setCorsHeaders(reply: FastifyReply, origin: string): void {
		reply.header('Access-Control-Allow-Origin', origin);
		reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		reply.header(
			'Access-Control-Allow-Headers',
			'Content-Type, Authorization, X-Requested-With, Accept, Origin',
		);
		reply.header('Access-Control-Allow-Credentials', 'true');
		reply.header('Access-Control-Max-Age', '86400'); // 24 hours preflight cache
		reply.header('Vary', 'Origin');
	}

	/**
	 * Setup Better Auth handler as Fastify catch-all route
	 * Follows Better Auth Fastify integration pattern
	 */
	private setupHandler(): void {
		const fastifyInstance = this.adapter.httpAdapter.getInstance<FastifyInstance>();

		// Register catch-all route for all auth endpoints
		fastifyInstance.route({
			method: ['GET', 'POST'],
			url: this.getBasePath(),
			handler: async (request, reply) => {
				try {
					// Convert Fastify request to Web API Request for Better Auth
					const webRequest = this.convertToWebApiRequest(request);

					// Process request through Better Auth handler
					const response = await this.auth.handler(webRequest);

					// Set response status
					reply.status(response.status);

					// Forward all response headers
					response.headers.forEach((value, key) => {
						reply.header(key, value);
					});

					// Send response body (handle both text and null responses)
					const body = response.body ? await response.text() : null;
					reply.send(body);
				} catch (error) {
					this.logger.error(
						`Better Auth handler error for ${request.method} ${request.url}:`,
						error,
					);
					reply.status(500).send({
						error: 'Internal authentication error',
						code: 'BETTER_AUTH_ERROR',
					});
				}
			},
		});
	}

	/**
	 * Get base path with wildcard for catch-all route
	 */
	private getBasePath() {
		const basePath = this.auth.options.basePath ?? '/api/auth';
		// Normalize path: ensure it starts with / and remove trailing /
		const normalizedPath = `/${basePath.replace(/^\/+|\/+$/g, '')}`;

		return `${normalizedPath}/*`;
	}

	/**
	 * Get auth base path without wildcard
	 */
	private getAuthBasePath(): string {
		const basePath = this.auth.options.basePath ?? '/api/auth';
		return `/${basePath.replace(/^\/+|\/+$/g, '')}`;
	}

	/**
	 * Static factory method to create and configure the AuthModule.
	 *
	 * @static
	 * @param {Auth} auth - The Better Auth instance to use
	 * @param {AuthModuleOptions} [options={}] - Configuration options for the module
	 * @returns {DynamicModule} Configured NestJS dynamic module
	 *
	 * @example
	 * ```typescript
	 * import { auth } from './auth.config';
	 *
	 * @Module({
	 *   imports: [
	 *     AuthModule.forRoot(auth, {
	 *       disableExceptionFilter: false
	 *     })
	 *   ]
	 * })
	 * export class AppModule {}
	 * ```
	 */
	static forRoot<T extends BetterAuthInstance>(
		auth: T,
		options: AuthModuleOptions = {},
	): DynamicModule {
		// Initialize hooks with an empty object if undefined
		// Without this initialization, the setupHook method won't be able to properly override hooks
		// It won't throw an error, but any hook functions we try to add won't be called
		auth.options.hooks = {
			...auth.options.hooks,
		};

		const baseProviders: Provider[] = [
			{ provide: AUTH_INSTANCE_KEY, useValue: auth },
			{ provide: AUTH_MODULE_OPTIONS_KEY, useValue: options },
			AuthService,
		] as const;

		const conditionalProviders: Provider[] = [];
		if (!options.disableExceptionFilter) {
			conditionalProviders.push({
				provide: APP_FILTER,
				useClass: AuthFilter,
			});
		}

		return {
			global: true,
			module: AuthModule,
			providers: [...baseProviders, ...conditionalProviders],
			exports: [...baseProviders],
		};
	}

	/**
	 * Static factory method to create and configure the AuthModule asynchronously.
	 * Supports three configuration methods: useFactory, useClass, and useExisting.
	 *
	 * @static
	 * @param {AuthModuleAsyncOptions} options - Async configuration options
	 * @returns {DynamicModule} Configured NestJS dynamic module
	 * @throws {Error} If no configuration method or multiple methods are provided
	 *
	 * @example
	 * ```typescript
	 * // Using factory
	 * AuthModule.forRootAsync({
	 *   imports: [ConfigModule],
	 *   useFactory: async (config: ConfigService) => ({
	 *     auth: betterAuth(config.get('auth')),
	 *     options: { disableExceptionFilter: false }
	 *   }),
	 *   inject: [ConfigService]
	 * })
	 *
	 * // Using class
	 * AuthModule.forRootAsync({
	 *   useClass: AuthConfigService
	 * })
	 * ```
	 */
	static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule {
		AuthModule.validateAsyncOptions(options);
		const asyncProviders = AuthModule.createAsyncProviders(options);

		return {
			global: true,
			module: AuthModule,
			imports: options.imports || [],
			providers: [...asyncProviders, AuthService],
			exports: [
				{
					provide: AUTH_INSTANCE_KEY,
					useExisting: AUTH_INSTANCE_KEY,
				},
				{
					provide: AUTH_MODULE_OPTIONS_KEY,
					useExisting: AUTH_MODULE_OPTIONS_KEY,
				},
				AuthService,
			],
		};
	}

	/**
	 * Validates async options to ensure exactly one configuration method is provided
	 */
	private static validateAsyncOptions(options: AuthModuleAsyncOptions): void {
		const configMethods = ['useFactory', 'useClass', 'useExisting'].filter(
			(method) => options[method as keyof AuthModuleAsyncOptions] !== undefined,
		);

		if (configMethods.length === 0) {
			throw new Error(
				'Invalid async configuration. Must provide one of: useFactory, useClass, or useExisting.',
			);
		}

		if (configMethods.length > 1) {
			throw new Error(
				`Invalid async configuration. Cannot provide multiple configuration methods: ${configMethods.join(', ')}.`,
			);
		}
	}

	/**
	 * Initializes auth instance hooks to ensure proper hook registration
	 */
	private static initializeAuthHooks<T extends BetterAuthInstance>(auth: T): T {
		if (!auth.options) {
			auth.options = {};
		}
		auth.options.hooks = {
			...auth.options.hooks,
		};
		return auth;
	}

	private static createAsyncProviders(options: AuthModuleAsyncOptions): Provider[] {
		if (options.useFactory) {
			return [
				{
					provide: AUTH_INSTANCE_KEY,
					useFactory: async (...args: unknown[]) => {
						const result = await options.useFactory?.(...args);
						if (!result?.auth) {
							throw new Error('Auth factory must return an object with an "auth" property');
						}
						return AuthModule.initializeAuthHooks(result.auth);
					},
					inject: options.inject || [],
				},
				{
					provide: AUTH_MODULE_OPTIONS_KEY,
					useFactory: async (...args: unknown[]) => {
						const result = await options.useFactory?.(...args);
						return result?.options || {};
					},
					inject: options.inject || [],
				},
				AuthModule.createExceptionFilterProvider(),
			];
		}

		if (options.useClass) {
			return [
				{
					provide: options.useClass,
					useClass: options.useClass,
				},
				{
					provide: AUTH_INSTANCE_KEY,
					useFactory: async (configService: AuthConfigProvider) => {
						const result = await configService.createAuthOptions();
						if (!result?.auth) {
							throw new Error('Auth factory must return an object with an "auth" property');
						}
						return AuthModule.initializeAuthHooks(result.auth);
					},
					inject: [options.useClass],
				},
				{
					provide: AUTH_MODULE_OPTIONS_KEY,
					useFactory: async (configService: AuthConfigProvider) => {
						const result = await configService.createAuthOptions();
						return result?.options || {};
					},
					inject: [options.useClass],
				},
				AuthModule.createExceptionFilterProvider(),
			];
		}

		if (options.useExisting) {
			return [
				{
					provide: AUTH_INSTANCE_KEY,
					useFactory: async (configService: AuthConfigProvider) => {
						const result = await configService.createAuthOptions();
						if (!result?.auth) {
							throw new Error('Auth factory must return an object with an "auth" property');
						}
						return AuthModule.initializeAuthHooks(result.auth);
					},
					inject: [options.useExisting],
				},
				{
					provide: AUTH_MODULE_OPTIONS_KEY,
					useFactory: async (configService: AuthConfigProvider) => {
						const result = await configService.createAuthOptions();
						return result?.options || {};
					},
					inject: [options.useExisting],
				},
				AuthModule.createExceptionFilterProvider(),
			];
		}

		// This should never be reached due to validation, but TypeScript needs it
		throw new Error(
			'Invalid async configuration. Must provide useFactory, useClass, or useExisting.',
		);
	}

	private static createExceptionFilterProvider(): Provider {
		return {
			provide: APP_FILTER,
			useFactory: (options: AuthModuleOptions) => {
				return options.disableExceptionFilter ? null : new AuthFilter();
			},
			inject: [AUTH_MODULE_OPTIONS_KEY],
		};
	}
}
