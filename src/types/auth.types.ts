import type { Auth } from 'better-auth';
import type { getSession } from 'better-auth/api';
import type { openAPI } from 'better-auth/plugins';

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
 * **OpenAPI Plugin Endpoints** - Type definition for openAPI plugin endpoints
 *
 * Extracts endpoint types from Better Auth's openAPI plugin.
 * Used as default plugin for InferAuth and AuthWithOpenAPI.
 */
export type OpenAPIEndpoints = ReturnType<typeof openAPI>['endpoints'];

/**
 * **Plugin Endpoints** - Helper type to extract endpoints from Better Auth plugins
 *
 * **Purpose**: Simplify plugin endpoint type extraction by handling the verbose ReturnType pattern.
 *
 * @template T - Better Auth plugin function type
 *
 * @example
 * ```typescript
 * import type { twoFactor } from 'better-auth/plugins';
 *
 * // Instead of: ReturnType<typeof twoFactor>['endpoints']
 * type TwoFactorEndpoints = PluginEndpoints<typeof twoFactor>;
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic utility type requires any for maximum flexibility
export type PluginEndpoints<T> = T extends (...args: any[]) => { endpoints: infer E } ? E : never;

/**
 * **Auth with Plugins** - Generic interface for composing Better Auth with custom plugin endpoints
 *
 * **Purpose**: Create type-safe Better Auth instances with any combination of plugins.
 *
 * @template T - Additional plugin endpoints to merge with base Auth API
 *
 * **Type Safety**: Always includes OpenAPIEndpoints by default for documentation generation.
 *
 * **Generic Parameter**: Pass plugin endpoint types to extend the base Auth API:
 * - Use `PluginEndpoints<typeof pluginName>` helper for cleaner syntax
 * - Use intersection (`&`) to combine multiple plugins
 *
 * @example
 * ```typescript
 * // ✅ Single plugin - twoFactor
 * import type { twoFactor } from 'better-auth/plugins';
 *
 * interface MyAuth extends AuthWithPlugins<PluginEndpoints<typeof twoFactor>> {}
 *
 * @Injectable()
 * export class MyService {
 *   constructor(private authService: AuthService<MyAuth>) {}
 *   // authService.api has openAPI + twoFactor methods
 * }
 * ```
 *
 * @example
 * ```typescript
 * // ✅ Multiple plugins - combine with intersection
 * import type { twoFactor, phoneNumber, admin } from 'better-auth/plugins';
 * import type { AdminOptions } from 'better-auth/plugins/admin';
 *
 * interface MyAuth extends AuthWithPlugins<
 *   PluginEndpoints<typeof twoFactor> &
 *   PluginEndpoints<typeof phoneNumber> &
 *   PluginEndpoints<typeof admin<AdminOptions>>
 * > {}
 *
 * @Injectable()
 * export class MyService {
 *   constructor(private authService: AuthService<MyAuth>) {}
 *   // authService.api has openAPI + twoFactor + phoneNumber + admin methods
 * }
 * ```
 *
 * @see {@link PluginEndpoints} for simplified endpoint extraction
 * @see {@link AuthService} for usage in dependency injection
 * @see {@link AuthWithOpenAPI} for the default type with only openAPI plugin
 */
export interface AuthWithPlugins<T = Record<string, never>> extends Auth {
	api: Auth['api'] & OpenAPIEndpoints & T;
}

/**
 * **Auth with OpenAPI** - Default type for AuthService (openAPI plugin only)
 *
 * **⚠️ Internal Type**: This is the default generic type for AuthService.
 * You typically don't need to use this directly.
 *
 * Extends base Better Auth with openAPI plugin endpoints by default.
 * Provides automatic type support for OpenAPI documentation generation.
 *
 * **Default behavior**: AuthService uses this type automatically when no generic is specified.
 *
 * **For custom plugins**: Use {@link AuthWithPlugins} generic interface instead.
 *
 * @example
 * ```typescript
 * // ✅ Default usage - AuthWithOpenAPI used automatically
 * @Injectable()
 * export class MyService {
 *   constructor(private authService: AuthService) {}
 *   // authService.api has openAPI methods
 * }
 * ```
 *
 * @example
 * ```typescript
 * // ✅ Custom plugins - use AuthWithPlugins instead
 * import type { twoFactor } from 'better-auth/plugins';
 *
 * interface MyAuth extends AuthWithPlugins<PluginEndpoints<typeof twoFactor>> {}
 *
 * @Injectable()
 * export class MyService {
 *   constructor(private authService: AuthService<MyAuth>) {}
 * }
 * ```
 *
 * @see {@link AuthWithPlugins} for custom plugin type composition
 * @see {@link AuthService} for usage in dependency injection
 */
export interface AuthWithOpenAPI extends AuthWithPlugins {}
