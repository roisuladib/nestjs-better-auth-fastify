import type { ModuleMetadata, Type } from '@nestjs/common';
import type { Auth } from 'better-auth';
import type { getSession } from 'better-auth/api';

/**
 * Type representing a valid user session after authentication
 * Excludes null and undefined values from the session return type
 */
export type UserSession = NonNullable<Awaited<ReturnType<ReturnType<typeof getSession>>>>;

/**
 * Type representing a user object from the session
 * Provides type safety for user data access
 */
export type User = UserSession['user'];

/**
 * Type representing a session object from Better Auth
 * Provides type safety for session data access
 */
export type AuthSession = UserSession['session'];

/**
 * Configuration options for the AuthModule
 */
export type AuthModuleFeatures = {
	disableExceptionFilter: boolean;
	disableGlobalAuthGuard: boolean;
	disableTrustedOriginsCors: boolean;
};

/**
 * Return type for auth configuration factory
 */
export interface AuthModuleConfig<T extends Auth = Auth> extends AuthModuleFeatures {
	auth: T;
}

/**
 * Configuration provider interface for auth module
 */
export interface AuthConfigProvider {
	createAuthConfig(): AuthModuleConfig | Promise<AuthModuleConfig>;
}

/**
 * Factory for creating Auth instance and module options asynchronously
 */
export interface AuthModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
	/**
	 * Factory function that returns an object with auth instance and optional module options
	 */
	useFactory?: (...args: unknown[]) => AuthModuleConfig | Promise<AuthModuleConfig>;
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
