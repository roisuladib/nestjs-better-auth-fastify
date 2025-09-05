import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { AuthInstance } from './types';

import { Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { APIError } from 'better-auth/api';
import { fromNodeHeaders } from 'better-auth/node';

import { ROLES_KEY, type Role } from './auth.decorators';
import { AUTH_INSTANCE_KEY } from './auth.symbols';

/**
 * NestJS guard that handles authentication for protected routes
 * Can be configured with @Public() or @Optional() decorators to modify authentication behavior
 */
@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		@Inject(Reflector)
		private readonly reflector: Reflector,
		@Inject(AUTH_INSTANCE_KEY)
		private readonly auth: AuthInstance,
	) {}

	/**
	 * Validates if the current request is authenticated
	 * Attaches session and user information to the request object
	 * @param context - The execution context of the current request
	 * @returns True if the request is authorized to proceed, throws an error otherwise
	 */
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		const session = await this.auth.api.getSession({
			headers: fromNodeHeaders(request.headers),
		});

		request.session = session;
		request.user = session?.user ?? null; // useful for observability tools like Sentry

		const isPublic = this.reflector.getAllAndOverride<boolean>('PUBLIC', [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) return true;

		const isOptional = this.reflector.getAllAndOverride<boolean>('OPTIONAL', [
			context.getHandler(),
			context.getClass(),
		]);
		if (isOptional && !session) return true;

		if (!session) {
			throw new APIError('UNAUTHORIZED', {
				code: 'UNAUTHORIZED',
				message: 'Authentication required to access this resource',
			});
		}

		const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (requiredRoles && requiredRoles.length > 0) {
			const userRole = (session.user as unknown as { role: string }).role;
			const hasRole = requiredRoles.some((role) => userRole?.includes(role));

			if (!hasRole) {
				throw new APIError('FORBIDDEN', {
					code: 'FORBIDDEN',
					message: `Access denied. Required roles: ${requiredRoles.join(', ')}`,
				});
			}
		}

		return true;
	}
}
