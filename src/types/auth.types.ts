import type { ModuleMetadata, Type } from '@nestjs/common';
import type { Auth } from 'better-auth';
import type { getSession } from 'better-auth/api';

/**
 * **User session** - Complete authenticated session with user data
 *
 * Contains everything you need about the authenticated user:
 * - `session.user` - User profile (id, email, name, custom fields)
 * - `session.session` - Session metadata (expiresAt, ipAddress, userAgent)
 *
 * **Usage:** Extract with `@Session()` decorator in controllers
 *
 * @example
 * ```typescript
 * @Get('profile')
 * getProfile(@Session() session: UserSession) {
 *   return {
 *     userId: session.user.id,
 *     email: session.user.email,
 *     sessionExpiry: session.session.expiresAt
 *   };
 * }
 * ```
 *
 * @see {@link Session} decorator to extract session in controllers
 * @see {@link User} for user-only type
 * @see {@link AuthSession} for session metadata type
 */
export type UserSession = NonNullable<Awaited<ReturnType<ReturnType<typeof getSession>>>>;

/**
 * **User profile** - Authenticated user data
 *
 * Standard fields:
 * - `id` - Unique user identifier
 * - `email` - User email address
 * - `name` - User display name
 * - `emailVerified` - Email verification status
 * - `image` - Profile picture URL
 * - `createdAt` - Account creation timestamp
 * - `updatedAt` - Last update timestamp
 *
 * Plus any custom fields you add to your schema!
 *
 * @example
 * ```typescript
 * @Get('welcome')
 * getWelcome(@Session() { user }: UserSession) {
 *   return `Welcome, ${user.name}! Your ID is ${user.id}`;
 * }
 * ```
 */
export type User = UserSession['user'];

/**
 * **Session metadata** - Session tracking and security info
 *
 * Useful for:
 * - Session expiry checking
 * - Security monitoring (IP, user-agent)
 * - Multi-device session management
 * - Audit logging
 *
 * Contains:
 * - `id` - Session identifier
 * - `userId` - Associated user ID
 * - `expiresAt` - When session expires
 * - `ipAddress` - Client IP address
 * - `userAgent` - Client browser/device info
 *
 * @example
 * ```typescript
 * @Get('session-info')
 * getSessionInfo(@Session() { session }: UserSession) {
 *   return {
 *     expiresAt: session.expiresAt,
 *     device: session.userAgent,
 *     location: session.ipAddress
 *   };
 * }
 * ```
 */
export type AuthSession = UserSession['session'];

/**
 * **Module features** - Control built-in features
 *
 * Fine-tune module behavior:
 * - `disableExceptionFilter` - Disable automatic error handling (default: false)
 * - `disableGlobalAuthGuard` - Disable automatic route protection (default: false)
 * - `disableTrustedOriginsCors` - Disable automatic CORS setup (default: false)
 *
 * @see {@link AuthModuleConfig} for complete configuration
 */
export type AuthModuleFeatures = {
	disableExceptionFilter?: boolean;
	disableGlobalAuthGuard?: boolean;
	disableTrustedOriginsCors?: boolean;
};

/**
 * **Module configuration** - Complete AuthModule setup
 *
 * @template T - Better Auth instance type (supports plugins)
 *
 * @property auth - Better Auth instance from `betterAuth()`
 * @property disableExceptionFilter - Disable error filter (default: false)
 * @property disableGlobalAuthGuard - Disable global guard (default: false)
 * @property disableTrustedOriginsCors - Disable CORS (default: false)
 *
 * @see {@link AuthModule.forRoot} for static configuration
 * @see {@link AuthModule.forRootAsync} for async configuration
 */
export interface AuthModuleConfig<T extends Auth = Auth> extends AuthModuleFeatures {
	auth: T;
}

/**
 * **Config provider** - Class-based async configuration
 *
 * Implement this interface for class-based async configuration.
 *
 * @example
 * ```typescript
 * @Injectable()
 * class AuthConfigService implements AuthConfigProvider {
 *   createAuthConfig() {
 *     return {
 *       auth: betterAuth({ ... }),
 *       disableExceptionFilter: false
 *     };
 *   }
 * }
 *
 * AuthModule.forRootAsync({
 *   useClass: AuthConfigService
 * })
 * ```
 */
export interface AuthConfigProvider {
	createAuthConfig(): AuthModuleConfig | Promise<AuthModuleConfig>;
}

/**
 * **Async configuration** - Dynamic module setup with DI
 *
 * Flexible async configuration supporting multiple patterns:
 * - `useFactory` - Factory function with injectable dependencies
 * - `useClass` - Configuration provider class
 * - `useExisting` - Existing provider reference
 *
 * @example
 * ```typescript
 * // Factory pattern (most common)
 * AuthModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: (config: ConfigService) => ({
 *     auth: betterAuth({
 *       secret: config.get('AUTH_SECRET'),
 *       database: setupDb(config)
 *     })
 *   }),
 *   inject: [ConfigService]
 * })
 *
 * // Class pattern
 * AuthModule.forRootAsync({
 *   useClass: AuthConfigService
 * })
 * ```
 */
export interface AuthModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
	/** Factory function with DI - returns auth config */
	useFactory?: (...args: unknown[]) => AuthModuleConfig | Promise<AuthModuleConfig>;
	/** Dependencies to inject into factory */
	inject?: (string | symbol | Type<unknown>)[];
	/** Configuration provider class */
	useClass?: Type<AuthConfigProvider>;
	/** Existing provider reference */
	useExisting?: Type<AuthConfigProvider>;
}
