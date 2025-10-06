import type { Auth } from 'better-auth';
import type { AuthModuleConfig } from './types';

import { Inject, Injectable } from '@nestjs/common';

import { AUTH_MODULE_OPTIONS } from './auth.symbols';

/**
 * NestJS service that provides access to the Better Auth instance.
 *
 * This service acts as a bridge between NestJS dependency injection
 * and Better Auth functionality, providing type-safe access to
 * authentication features.
 *
 * @template T - The Better Auth instance type (defaults to Auth)
 *
 * @example
 * ```typescript
 * // Basic usage
 * constructor(private readonly authService: AuthService) {}
 *
 * // With custom auth instance type
 * constructor(private readonly authService: AuthService<CustomAuth>) {}
 * ```
 */
@Injectable()
export class AuthService<T extends Auth = Auth> {
	constructor(
		@Inject(AUTH_MODULE_OPTIONS)
		private readonly options: AuthModuleConfig,
	) {}

	/**
	 * Returns the API endpoints provided by the auth instance.
	 *
	 * This provides access to all Better Auth API methods like
	 * signIn, signUp, signOut, getSession, etc.
	 *
	 * @returns The Better Auth API object
	 *
	 * @example
	 * ```typescript
	 * // Get current session
	 * const session = await this.options.authService.api.getSession({ headers });
	 *
	 * // Sign in user
	 * const result = await this.options.authService.api.signIn.email({
	 *   email: 'user@example.com',
	 *   password: 'password',
	 *   headers
	 * });
	 * ```
	 */
	get api(): T['api'] {
		return this.options.auth.api;
	}

	/**
	 * Returns the complete auth instance.
	 *
	 * This provides access to the full Better Auth instance,
	 * including plugin-specific functionality and configuration.
	 *
	 * @returns The complete Better Auth instance
	 *
	 * @example
	 * ```typescript
	 * // Access auth configuration
	 * const config = this.options.authService.instance.options;
	 *
	 * // Access plugin-specific functionality
	 * const pluginFeature = this.options.authService.instance.pluginFeature;
	 * ```
	 */
	get instance(): T {
		return this.options.auth as T;
	}

	/**
	 * Checks if the auth instance is properly initialized.
	 *
	 * @returns True if the auth instance is valid
	 */
	isInitialized(): boolean {
		return (
			this.options.auth &&
			typeof this.options.auth.api === 'object' &&
			this.options.auth.api !== null
		);
	}

	/**
	 * Gets the base URL configured for the auth instance.
	 *
	 * @returns The base URL or undefined if not configured
	 */
	getBaseUrl(): string | undefined {
		return this.options.auth.options?.baseURL;
	}

	/**
	 * Gets the configured secret for the auth instance.
	 *
	 * @returns The secret or undefined if not configured
	 */
	getSecret(): string | undefined {
		return this.options.auth.options?.secret;
	}
}
