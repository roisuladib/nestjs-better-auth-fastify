import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { AuthModuleConfig } from './types';

import { Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { APIError } from 'better-auth/api';
import { fromNodeHeaders } from 'better-auth/node';

import { Optional, Public } from './auth.decorators';
import { AUTH_MODULE_OPTIONS } from './auth.symbols';
import { extractRequestFromExecutionContext } from './auth.utils';

/**
 * **Authentication guard** - Protect routes with Better Auth sessions
 *
 * Smart authentication guard with **zero configuration** - works out of the box!
 * Automatically validates sessions and enriches requests with user data.
 *
 * **Key features:**
 * - 🚀 **Automatic global protection** (disable with `disableGlobalAuthGuard: true`)
 * - ⚡ **Performance optimized** - early exits for public routes
 * - 🎯 **Flexible** - use `@Public()` and `@Optional()` decorators
 * - 📊 **Observability ready** - attaches `req.user` and `req.session`
 * - 🔒 **Type-safe** - full TypeScript support
 *
 * @example
 * ```typescript
 * // Method 1: Selective protection
 * @Controller('api')
 * @UseGuards(AuthGuard)
 * export class UserController {
 *   @Get('profile')  // ✅ Protected - requires auth
 *   getProfile(@Session() session: UserSession) {
 *     return session.user;
 *   }
 *
 *   @Public()
 *   @Get('health')  // ✅ Public - skips auth check
 *   getHealth() {
 *     return { status: 'ok' };
 *   }
 *
 *   @Optional()
 *   @Get('posts')  // ✅ Adaptive - works with or without auth
 *   getPosts(@Session() session?: UserSession) {
 *     return session?.user
 *       ? this.getPersonalizedPosts(session.user.id)
 *       : this.getPublicPosts();
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Method 2: Global protection (recommended for SPAs)
 * @Module({
 *   imports: [
 *     AuthModule.forRoot({
 *       auth,
 *       disableGlobalAuthGuard: false  // Default: auto-protect all routes
 *     })
 *   ]
 * })
 * export class AppModule {}
 *
 * // Then use @Public() to exempt specific routes
 * @Controller('public')
 * export class PublicController {
 *   @Public()
 *   @Get('landing')
 *   getLanding() {
 *     return { welcome: 'No auth needed!' };
 *   }
 * }
 * ```
 *
 * @throws {APIError} UNAUTHORIZED when authentication required but missing
 * @see {@link Public} to skip authentication
 * @see {@link Optional} for optional authentication
 * @see {@link Session} to extract user data
 */
@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		@Inject(Reflector)
		private readonly reflector: Reflector,
		@Inject(AUTH_MODULE_OPTIONS)
		private readonly options: AuthModuleConfig,
	) {}

	/**
	 * **Validates authentication** - Smart session validation with performance optimization
	 *
	 * Execution flow:
	 * 1. Check `@Public()` → early exit (no session lookup)
	 * 2. Fetch session from Better Auth
	 * 3. Enrich request with `session` and `user` properties
	 * 4. Check `@Optional()` → allow access even without session
	 * 5. Enforce auth for protected routes
	 *
	 * **Performance:** Public routes skip session lookup completely!
	 *
	 * @param context - NestJS execution context (HTTP, GraphQL, WebSocket, RPC)
	 * @returns `true` if user is authorized or route is public/optional
	 * @throws {APIError} UNAUTHORIZED when auth required but session missing
	 */
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = extractRequestFromExecutionContext(context);

		// Check if route is marked as public (early return to avoid unnecessary session call)
		const isPublic = this.reflector.getAllAndOverride(Public, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) return true;

		// Get session from Better Auth (only when needed)
		const session = await this.options.auth.api.getSession({
			headers: fromNodeHeaders(request.headers),
		});

		// Attach session and user to request for easy access
		request.session = session;
		request.user = session?.user ?? null; // useful for observability tools like Sentry

		// Check if route has optional authentication
		const isOptional = this.reflector.getAllAndOverride(Optional, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isOptional && !session) return true;

		// Require authentication for protected routes
		if (!session) {
			throw new APIError('UNAUTHORIZED', {
				message: 'Authentication required to access this resource',
			});
		}

		return true;
	}
}
