import type { ModuleMetadata, Type } from '@nestjs/common';
import type { betterAuth } from 'better-auth';
import type { getSession } from 'better-auth/api';

/**
 * Type representing a valid user session after authentication
 * Excludes null and undefined values from the session return type
 */
export type UserSession = NonNullable<Awaited<ReturnType<ReturnType<typeof getSession>>>>;

export type AuthInstance = ReturnType<typeof betterAuth>;

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
export type AuthFactoryResult<T extends AuthInstance = AuthInstance> = {
	auth: T;
	options?: AuthModuleOptions;
};

/**
 * Configuration provider interface for auth module
 */
export interface AuthConfigProvider {
	createAuthOptions(): AuthFactoryResult | Promise<AuthFactoryResult>;
}

/**
 * Factory for creating Auth instance and module options asynchronously
 */
export interface AuthModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
	/**
	 * Factory function that returns an object with auth instance and optional module options
	 */
	useFactory?: (...args: unknown[]) => AuthFactoryResult | Promise<AuthFactoryResult>;
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
