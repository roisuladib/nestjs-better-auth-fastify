import type { Auth } from 'better-auth';
import type { AuthModuleConfig } from './types';

import { Inject, Injectable } from '@nestjs/common';

import { AUTH_MODULE_OPTIONS } from './auth.symbols';

/**
 * **Auth service** - Injectable access to Better Auth functionality
 *
 * Bridge between NestJS DI and Better Auth with full type safety.
 * Use this to programmatically interact with authentication without decorators.
 *
 * **Perfect for:**
 * - Building custom auth endpoints
 * - Server-side session management
 * - Admin user operations
 * - Background jobs and scripts
 * - Testing and mocking
 *
 * @template T - Better Auth instance type with plugin support
 *
 * @example
 * ```typescript
 * // Inject in any service or controller
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly authService: AuthService) {}
 *
 *   async getUserSession(headers: Record<string, string>) {
 *     return this.authService.api.getSession({ headers });
 *   }
 *
 *   async forceSignOut() {
 *     // Admin action: force sign out user
 *     await this.authService.api.signOut();
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Custom auth endpoint with validation
 * @Controller('auth')
 * export class CustomAuthController {
 *   constructor(private readonly authService: AuthService) {}
 *
 *   @Post('sign-in')
 *   async signIn(@Body() dto: SignInDto, @Req() req: FastifyRequest) {
 *     // Custom validation logic
 *     await this.validateDomain(dto.email);
 *
 *     // Use Better Auth API
 *     return this.authService.api.signIn.email({
 *       email: dto.email,
 *       password: dto.password,
 *       headers: req.headers
 *     });
 *   }
 * }
 * ```
 */
@Injectable()
export class AuthService<T extends Auth = Auth> {
	constructor(
		@Inject(AUTH_MODULE_OPTIONS)
		private readonly options: AuthModuleConfig,
	) {}

	/**
	 * **Better Auth API** - Complete server-side authentication API with type safety
	 *
	 * Access all Better Auth server methods:
	 * - `getSession({ headers })` - Retrieve current session
	 * - `signInEmail({ body, headers })` - Email/password authentication
	 * - `signUpEmail({ body })` - User registration
	 * - `signOut({ headers })` - Session termination
	 * - Plugin-specific methods (if using plugins)
	 *
	 * **Note:** Server-side API uses flat method names (`signInEmail`) vs client-side nested (`signIn.email`)
	 *
	 * @returns Type-safe Better Auth server API object
	 *
	 * @example
	 * ```typescript
	 * // Get session in service
	 * async getCurrentUser(headers: Record<string, string>) {
	 *   const session = await this.authService.api.getSession({ headers });
	 *   return session?.user;
	 * }
	 *
	 * // Custom sign-in with business logic (server-side)
	 * async customSignIn(email: string, password: string, headers: HeadersInit) {
	 *   // Pre-validation
	 *   await this.checkUserStatus(email);
	 *
	 *   // Better Auth sign-in (server-side API)
	 *   const result = await this.authService.api.signInEmail({
	 *     body: { email, password },
	 *     headers
	 *   });
	 *
	 *   // Post-sign-in logic
	 *   await this.updateLastLogin(result.user.id);
	 *
	 *   return result;
	 * }
	 *
	 * // Admin operations
	 * async adminSignOutUser(headers: HeadersInit) {
	 *   await this.authService.api.signOut({ headers });
	 *   await this.auditLog.log('admin_signout');
	 * }
	 * ```
	 */
	get api(): T['api'] {
		return this.options.auth.api;
	}

	/**
	 * **Complete auth instance** - Direct access to Better Auth with plugins
	 *
	 * Use this for advanced scenarios:
	 * - Plugin-specific methods
	 * - Configuration inspection
	 * - Custom integrations
	 * - Testing and debugging
	 *
	 * @returns Full Better Auth instance with type safety
	 *
	 * @example
	 * ```typescript
	 * // Access plugin functionality
	 * const twoFactorEnabled = this.authService.instance.twoFactor?.isEnabled;
	 *
	 * // Inspect configuration
	 * const providers = this.authService.instance.options.socialProviders;
	 * const sessionConfig = this.authService.instance.options.session;
	 *
	 * // Build custom integrations
	 * const handler = this.authService.instance.handler;
	 * ```
	 */
	get instance(): T {
		return this.options.auth as T;
	}

	/**
	 * **Health check** - Verify auth instance is properly initialized
	 *
	 * Useful for startup health checks and diagnostics.
	 *
	 * @returns `true` if auth instance is valid and ready
	 */
	isInitialized(): boolean {
		return (
			this.options.auth &&
			typeof this.options.auth.api === 'object' &&
			this.options.auth.api !== null
		);
	}

	/**
	 * **Get base URL** - Retrieve configured application base URL
	 *
	 * @returns Base URL string or undefined if not configured
	 */
	getBaseUrl(): string | undefined {
		return this.options.auth.options?.baseURL;
	}

	/**
	 * **Get secret** - Retrieve auth secret (use with caution!)
	 *
	 * ⚠️ **Security warning:** Never expose this in API responses
	 *
	 * @returns Auth secret or undefined
	 */
	getSecret(): string | undefined {
		return this.options.auth.options?.secret;
	}
}
