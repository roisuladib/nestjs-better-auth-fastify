import type { AuthModuleConfig, AuthWithOpenAPI } from './types';

import { Inject, Injectable } from '@nestjs/common';

import { AUTH_MODULE_OPTIONS } from './auth.symbols';

/**
 * **Auth service** - Injectable access to Better Auth functionality
 *
 * Bridge between NestJS DI and Better Auth with full type safety.
 * Use this to programmatically interact with authentication without decorators.
 *
 * **Default Behavior**: AuthService automatically includes **openAPI plugin methods** out of the box.
 *
 * **Perfect for:**
 * - Building custom auth endpoints
 * - Server-side session management
 * - Admin user operations
 * - Background jobs and scripts
 * - Testing and mocking
 *
 * @template T - Better Auth instance type (default: AuthWithOpenAPI with openAPI plugin)
 *
 * @example
 * ```typescript
 * // Default usage - openAPI plugin included automatically
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly authService: AuthService) {}
 *
 *   async getUserSession(headers: Record<string, string>) {
 *     return this.authService.api.getSession({ headers });
 *   }
 *
 *   async generateOpenAPISpec() {
 *     // openAPI plugin method available by default
 *     return this.authService.api.generateOpenAPISchema();
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Custom plugins - manual type definition required
 * // Note: Include openAPI explicitly when defining custom types
 * import type { Auth } from 'better-auth';
 * import type { twoFactor, phoneNumber, admin, openAPI } from 'better-auth/plugins';
 * import type { AdminOptions } from 'better-auth/plugins/admin';
 *
 * // Define type matching ALL your plugins (in types/custom-auth.types.ts)
 * export type CustomAuth = Auth & {
 *   api: Auth['api']
 *     & ReturnType<typeof openAPI>['endpoints']       // Include openAPI
 *     & ReturnType<typeof twoFactor>['endpoints']
 *     & ReturnType<typeof phoneNumber>['endpoints']
 *     & ReturnType<typeof admin<AdminOptions>>['endpoints'];
 * };
 *
 * // Use custom type in services
 * @Injectable()
 * export class UserService {
 *   constructor(private authService: AuthService<CustomAuth>) {}
 *
 *   async sendOTP(phoneNumber: string) {
 *     // Type-safe access to ALL plugin methods
 *     return this.authService.api.sendPhoneNumberOTP({ phoneNumber });
 *   }
 * }
 * ```
 */
@Injectable()
export class AuthService<T extends AuthWithOpenAPI = AuthWithOpenAPI> {
	constructor(
		@Inject(AUTH_MODULE_OPTIONS)
		private readonly options: AuthModuleConfig<T>,
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
}
