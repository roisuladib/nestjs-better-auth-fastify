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
 * Authentication guard for NestJS routes using Better Auth
 *
 * Apply to controllers/routes to enforce authentication.
 * Use decorators to customize behavior per route.
 *
 * @example
 * ```typescript
 * @Controller('api')
 * @UseGuards(AuthGuard)
 * export class AppController {
 *   @Get('profile')        // Protected - requires auth
 *   getProfile(@Session session) { return session.user; }
 *
 *   @Public()
 *   @Get('health')         // Public - no auth needed
 *   getHealth() { return 'ok'; }
 *
 *   @Optional()
 *   @Get('posts')          // Optional - works with/without auth
 *   getPosts(@Session session) { return session?.user || 'anonymous'; }
 * }
 * ```
 *
 * @throws {APIError} UNAUTHORIZED when authentication required but missing
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
	 * Validates request authentication and attaches session data
	 *
	 * @param context - Execution context
	 * @returns `true` if authorized
	 * @throws {APIError} UNAUTHORIZED | INTERNAL_SERVER_ERROR
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
