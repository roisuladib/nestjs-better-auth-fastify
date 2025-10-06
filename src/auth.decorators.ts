import type { ExecutionContext } from '@nestjs/common';
import type { ReflectableDecorator } from '@nestjs/core';
import type { createAuthMiddleware } from 'better-auth/api';
import type { FastifyRequest } from 'fastify';

import { createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Skip authentication for public routes
 *
 * Use on routes that should be accessible without authentication.
 * AuthGuard will return early, improving performance for public endpoints.
 *
 * @example
 * ```typescript
 * @Controller('api')
 * @UseGuards(AuthGuard)
 * export class AppController {
 *   @Public()
 *   @Get('health')
 *   getHealth() {
 *     return { status: 'ok' };
 *   }
 * }
 * ```
 */
export const Public: ReflectableDecorator<boolean> = Reflector.createDecorator<boolean>();

/**
 * Allow unauthenticated access with optional session
 *
 * Route works with or without authentication. Session will be null
 * if user is not authenticated. Use for content that adapts based on auth state.
 *
 * @example
 * ```typescript
 * @Optional()
 * @Get('posts')
 * getPosts(@Session session) {
 *   if (session?.user) {
 *     return this.getPersonalizedPosts(session.user.id);
 *   }
 *   return this.getPublicPosts();
 * }
 * ```
 */
export const Optional: ReflectableDecorator<boolean> = Reflector.createDecorator<boolean>();

/**
 * Extract user session from request
 *
 * Provides authenticated user's session data in controller methods.
 * Returns null for @Optional routes without authentication.
 * Contains user info and session metadata from Better Auth.
 *
 * @example
 * ```typescript
 * @Get('profile')
 * getProfile(@Session session) {
 *   return {
 *     id: session.user.id,
 *     email: session.user.email,
 *     name: session.user.name
 *   };
 * }
 * ```
 */
export const Session: ParameterDecorator = createParamDecorator(
	(_data: unknown, context: ExecutionContext): unknown => {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		return request.session;
	},
);

/**
 * Context object passed to Better Auth hooks
 *
 * Contains request, response, and auth-related data for middleware processing.
 * Use this type when implementing hook methods.
 */
export type AuthHookContext = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

/**
 * Execute logic before auth route processing
 *
 * Intercept Better Auth routes before they execute.
 * Perfect for validation, rate limiting, logging, or custom business logic.
 *
 * @param path - Auth route path that triggers this hook (must start with '/')
 * @example
 * ```typescript
 * @Hook()
 * @Injectable()
 * export class AuthHooks {
 *   @BeforeHook('/sign-in')
 *   async beforeSignIn(ctx: AuthHookContext) {
 *     // Rate limiting
 *     await this.rateLimiter.check(ctx.request.ip);
 *
 *     // Logging
 *     this.logger.log(`Sign-in attempt from ${ctx.request.ip}`);
 *   }
 * }
 * ```
 */
export const BeforeHook: ReflectableDecorator<`/${string}`> =
	Reflector.createDecorator<`/${string}`>();

/**
 * Execute logic after auth route processing
 *
 * Intercept Better Auth routes after they execute successfully.
 * Perfect for notifications, analytics, webhooks, or cleanup tasks.
 *
 * @param path - Auth route path that triggers this hook (must start with '/')
 * @example
 * ```typescript
 * @Hook()
 * @Injectable()
 * export class AuthHooks {
 *   @AfterHook('/sign-up')
 *   async afterSignUp(ctx: AuthHookContext) {
 *     // Send welcome email
 *     await this.emailService.sendWelcome(ctx.body.email);
 *
 *     // Track analytics
 *     this.analytics.track('user_registered', { userId: ctx.user.id });
 *   }
 * }
 * ```
 */
export const AfterHook: ReflectableDecorator<`/${string}`> =
	Reflector.createDecorator<`/${string}`>();

/**
 * Mark provider as containing hook methods
 *
 * Required class decorator for providers using @BeforeHook or @AfterHook.
 * Enables automatic discovery and registration of hooks during module initialization.
 *
 * @example
 * ```typescript
 * @Hook()
 * @Injectable()
 * export class AuthHooks {
 *   @BeforeHook('/sign-in')
 *   beforeSignIn(ctx: AuthHookContext) { }
 *
 *   @AfterHook('/sign-up')
 *   afterSignUp(ctx: AuthHookContext) { }
 * }
 *
 * // Register in module
 * @Module({
 *   providers: [AuthHooks],
 *   imports: [BetterAuthModule.register({ ... })]
 * })
 * export class AppModule {}
 * ```
 */
export const Hook: ReflectableDecorator<boolean> = Reflector.createDecorator<boolean>();
