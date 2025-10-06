import type { DynamicModule, NestModule, OnModuleInit } from '@nestjs/common';
import type { FastifyAdapter } from '@nestjs/platform-fastify';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthModuleConfig } from './types';

import { HttpStatus, Inject, Logger, Module } from '@nestjs/common';
import {
	APP_FILTER,
	APP_GUARD,
	DiscoveryModule,
	DiscoveryService,
	HttpAdapterHost,
	MetadataScanner,
} from '@nestjs/core';

import { createAuthMiddleware } from 'better-auth/api';

import { AfterHook, BeforeHook, Hook } from './auth.decorators';
import { AuthFilter } from './auth.filter';
import { AuthGuard } from './auth.guard';
import {
	type ASYNC_OPTIONS_TYPE,
	ConfigurableModuleClass,
	type OPTIONS_TYPE,
} from './auth.module-definition';
import { AuthService } from './auth.service';
import { AUTH_MODULE_OPTIONS } from './auth.symbols';

const HOOKS = [
	{ metadataKey: BeforeHook.KEY, hookType: 'before' as const },
	{ metadataKey: AfterHook.KEY, hookType: 'after' as const },
];

/**
 * NestJS module that integrates Better Auth with NestJS/Fastify applications.
 * Uses ConfigurableModuleBuilder for enhanced type safety and reduced boilerplate.
 *
 * @class AuthNewModule
 * @extends {ConfigurableModuleClass}
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
 * - Enhanced type safety via ConfigurableModuleBuilder
 *
 * @example
 * ```typescript
 * // Static configuration
 * AuthNewModule.forRoot({
 *   auth: betterAuth(config),
 *   disableExceptionFilter: false,
 *   disableTrustedOriginsCors: false,
 *   isGlobal: true
 * })
 *
 * // Async configuration
 * AuthNewModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: async (config: ConfigService) => ({
 *     auth: betterAuth(config.get('auth')),
 *     disableExceptionFilter: false,
 *     disableTrustedOriginsCors: false
 *   }),
 *   inject: [ConfigService]
 * })
 * ```
 */
@Module({
	imports: [DiscoveryModule],
	providers: [AuthService],
	exports: [AuthService],
})
export class AuthModule extends ConfigurableModuleClass implements NestModule, OnModuleInit {
	private readonly logger = new Logger(AuthModule.name);

	constructor(
		@Inject(DiscoveryService)
		private readonly discoveryService: DiscoveryService,
		@Inject(MetadataScanner)
		private readonly metadataScanner: MetadataScanner,
		@Inject(HttpAdapterHost)
		private readonly adapter: HttpAdapterHost<FastifyAdapter>,
		@Inject(AUTH_MODULE_OPTIONS)
		private readonly options: AuthModuleConfig,
	) {
		super();
	}

	configure(): void {
		this.setupCors();
		this.setupHandler();
	}

	onModuleInit(): void {
		this.setupHooks();
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
		const trustedOrigins = this.options.auth.options.trustedOrigins;

		if (this.options.disableTrustedOriginsCors) {
			this.logger.log('CORS disabled by module configuration');
			return;
		}

		if (!trustedOrigins) {
			this.logger.debug(
				'No trustedOrigins configured, skipping automatic CORS setup. Configure CORS manually if needed.',
			);
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
	 * Uses Fastify's built-in CORS via NestJS adapter with optimized settings
	 */
	private setupStaticCors(origins: string[]): void {
		this.adapter.httpAdapter.enableCors({
			origin: origins,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
			credentials: true,
			maxAge: 86_400, // 24 hours preflight cache
		});

		this.logger.log(`Static CORS configured for ${origins.length} origins: ${origins.join(', ')}`);
	}

	/**
	 * Setup dynamic CORS for function-based trustedOrigins
	 * Provides full Request object to trustedOrigins function for maximum flexibility
	 *
	 * Note: Runs on every request for CORS validation. Consider using static string[]
	 * for better performance if your origins don't need dynamic logic.
	 */
	private setupDynamicCors(
		trustedOriginsFunc: (request: Request) => string[] | Promise<string[]>,
	): void {
		const fastifyInstance = this.adapter.httpAdapter.getInstance<FastifyInstance>();

		// Register preHandler hook for dynamic CORS evaluation
		fastifyInstance.addHook('preHandler', async (request, reply) => {
			const requestOrigin = request.headers.origin;

			// Skip if no origin header (same-origin request)
			if (!requestOrigin) {
				return;
			}

			try {
				// Convert Fastify Request to full Web API Request for trustedOrigins function
				// This ensures user function has access to all request properties (url, method, headers, body)
				const webRequest = this.convertToWebApiRequest(request);

				// Call trustedOrigins function (handles both sync and async)
				const allowedOrigins = await trustedOriginsFunc(webRequest);
				const isAllowed = Array.isArray(allowedOrigins) && allowedOrigins.includes(requestOrigin);

				// Handle preflight OPTIONS requests first
				if (request.method === 'OPTIONS') {
					if (isAllowed) {
						reply.header('Access-Control-Allow-Origin', requestOrigin);
						reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
						reply.header(
							'Access-Control-Allow-Headers',
							'Content-Type, Authorization, X-Requested-With',
						);
						reply.header('Access-Control-Allow-Credentials', 'true');
						reply.header('Access-Control-Max-Age', '86400');
						reply.header('Vary', 'Origin');
					}
					reply.status(HttpStatus.NO_CONTENT).send();
					return;
				}

				// For regular requests, set CORS headers if allowed
				if (isAllowed) {
					reply.header('Access-Control-Allow-Origin', requestOrigin);
					reply.header('Access-Control-Allow-Credentials', 'true');
					reply.header('Vary', 'Origin');
				}
			} catch (error) {
				this.logger.error(`Dynamic CORS evaluation failed for ${request.url}: ${error}`);

				// For OPTIONS, still respond even on error
				if (request.method === 'OPTIONS') {
					reply.status(HttpStatus.NO_CONTENT).send();
					return;
				}
				// For regular requests, continue without CORS headers
			}
		});

		this.logger.warn(
			'Dynamic CORS configured with function-based trustedOrigins. Runs on every request - consider static string[] for better performance.',
		);
	}

	/**
	 * Setup Better Auth handler as Fastify catch-all route
	 * Follows Better Auth Fastify integration pattern with performance optimizations
	 */
	private setupHandler(): void {
		const fastifyInstance = this.adapter.httpAdapter.getInstance<FastifyInstance>();

		// Get base path with wildcard for catch-all route
		const basePath = this.options.auth.options.basePath ?? '/api/auth';
		const normalizedPath = `/${basePath.replace(/^\/+|\/+$/g, '')}`;

		// Register catch-all route for all auth endpoints
		fastifyInstance.route({
			method: ['GET', 'POST'],
			url: `${normalizedPath}/*`,
			handler: async (request, reply) => {
				const startTime = Date.now();

				try {
					// Convert Fastify request to Web API Request for Better Auth
					const webRequest = this.convertToWebApiRequest(request);

					// Process request through Better Auth handler
					const response = await this.options.auth.handler(webRequest);

					// Set response status
					reply.status(response.status);

					// Forward all response headers
					response.headers.forEach((value, key) => {
						reply.header(key, value);
					});

					// Send response body (handle both text and null responses)
					const body = response.body ? await response.text() : null;
					reply.send(body);

					// Log performance metrics for monitoring
					const duration = Date.now() - startTime;
					if (duration > 1000) {
						// Log slow requests
						this.logger.warn(
							`Slow auth request: ${request.method} ${request.url} took ${duration}ms`,
						);
					}
				} catch (error) {
					const duration = Date.now() - startTime;

					this.logger.error(
						`Better Auth handler error for ${request.method} ${request.url} (${duration}ms):`,
						error instanceof Error ? error.stack : error,
					);

					// Send structured error response
					reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
						statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
						message: 'Internal authentication error',
						error: 'AUTH_FAILURE',
						timestamp: new Date().toISOString(),
						path: request.url,
					});
				}
			},
		});
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
		const providers = this.discoveryService
			.getProviders()
			.filter(({ metatype }) => metatype && Reflect.getMetadata(Hook.KEY, metatype));

		const hasHookProviders = providers.length > 0;
		const hooksConfigured = typeof this.options.auth.options.hooks === 'object';

		if (hasHookProviders && !hooksConfigured)
			throw new Error(
				"Detected @Hook providers but Better Auth 'hooks' are not configured. Add 'hooks: {}' to your betterAuth(...) options.",
			);

		if (!hooksConfigured) return;

		let registeredCount = 0;

		for (const provider of providers) {
			if (!provider.instance) {
				this.logger.warn(
					`Cannot register hooks from ${provider.metatype?.name || 'unknown provider'} - provider instance not available. ` +
						`Ensure hook providers use DEFAULT scope (not REQUEST or TRANSIENT).`,
				);
				continue;
			}

			const providerPrototype = Object.getPrototypeOf(provider.instance);
			const methods = this.metadataScanner.getAllMethodNames(providerPrototype);

			for (const methodName of methods) {
				const method = providerPrototype[methodName];
				if (typeof method === 'function') {
					this.setupHookMethod(method, provider.instance, methodName);
				}
			}

			registeredCount++;
		}

		this.logger.log(`Configured hooks for ${registeredCount} provider(s)`);
	}

	/**
	 * Setup individual hook method with Better Auth middleware
	 */
	private setupHookMethod(
		providerMethod: (...args: unknown[]) => unknown,
		providerInstance: unknown,
		methodName: string,
	): void {
		if (!this.options.auth.options.hooks) return;

		for (const { metadataKey, hookType } of HOOKS) {
			const hookPath = Reflect.getMetadata(metadataKey, providerMethod);
			if (!hookPath) continue;

			// Get existing hook to preserve it when chaining multiple hooks
			const originalHook = this.options.auth.options.hooks[hookType];

			// Create wrapper that executes all hooks for this path
			this.options.auth.options.hooks[hookType] = createAuthMiddleware(async ctx => {
				// Execute original hook first (if exists)
				if (originalHook) {
					await originalHook(ctx);
				}

				// Execute this hook if path matches
				if (hookPath === ctx.path) {
					await providerMethod.apply(providerInstance, [ctx]);
				}
			});

			this.logger.log(
				`Registered ${hookType} hook for method "${methodName}" on path: ${hookPath || 'global'}`,
			);
		}
	}

	/**
	 * Static factory method to create and configure the AuthNewModule.
	 * This ensures hooks object exists for proper hook registration.
	 *
	 * @static
	 * @param {typeof OPTIONS_TYPE} options - Module configuration with auth instance and options
	 * @returns Configured NestJS dynamic module
	 *
	 * @example
	 * ```typescript
	 * import { betterAuth } from 'better-auth';
	 *
	 * @Module({
	 *   imports: [
	 *     AuthNewModule.forRoot({
	 *       auth: betterAuth(config),
	 *       disableExceptionFilter: false,
	 *       disableTrustedOriginsCors: false,
	 *       isGlobal: true
	 *     })
	 *   ]
	 * })
	 * export class AppModule {}
	 * ```
	 */
	static forRoot(options: typeof OPTIONS_TYPE): DynamicModule {
		const forRootResult = ConfigurableModuleClass.forRoot(options);

		return {
			...forRootResult,
			providers: [
				...(forRootResult.providers || []),
				...(!options.disableGlobalAuthGuard ? [{ provide: APP_GUARD, useClass: AuthGuard }] : []),
				...(!options.disableExceptionFilter ? [{ provide: APP_FILTER, useClass: AuthFilter }] : []),
			],
		};
	}

	/**
	 * Static factory method to handle async configuration with hook initialization.
	 * Supports useFactory, useClass, and useExisting patterns.
	 *
	 * @static
	 * @param {typeof ASYNC_OPTIONS_TYPE} options - Async configuration options
	 * @returns Configured NestJS dynamic module
	 *
	 * @example
	 * ```typescript
	 * // Using factory
	 * AuthNewModule.forRootAsync({
	 *   imports: [ConfigModule],
	 *   useFactory: async (config: ConfigService) => ({
	 *     auth: betterAuth({
	 *       database: {
	 *         url: config.get('DATABASE_URL')
	 *       }
	 *     }),
	 *     disableExceptionFilter: false,
	 *     disableTrustedOriginsCors: false
	 *   }),
	 *   inject: [ConfigService]
	 * })
	 *
	 * // Using class
	 * AuthNewModule.forRootAsync({
	 *   useClass: AuthConfigService
	 * })
	 * ```
	 */
	static forRootAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
		const forRootAsyncResult = ConfigurableModuleClass.forRootAsync(options);

		return {
			...forRootAsyncResult,
			providers: [
				...(forRootAsyncResult.providers || []),
				...(!options.disableGlobalAuthGuard ? [{ provide: APP_GUARD, useClass: AuthGuard }] : []),
				...(!options.disableExceptionFilter ? [{ provide: APP_FILTER, useClass: AuthFilter }] : []),
			],
		};
	}
}
