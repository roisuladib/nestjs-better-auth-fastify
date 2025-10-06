import type { ExecutionContext } from '@nestjs/common';
import type { GqlContextType } from '@nestjs/graphql';
import type { FastifyRequest } from 'fastify';

import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * Extract FastifyRequest from any NestJS execution context
 *
 * Supports multiple context types: HTTP, GraphQL, WebSocket, and RPC.
 * Used internally by AuthGuard to access request headers for authentication.
 *
 * @param context - NestJS execution context from guard or interceptor
 * @returns Fastify request object containing headers, body, and session data
 * @example
 * ```typescript
 * // In custom guard or interceptor
 * async canActivate(context: ExecutionContext) {
 *   const request = extractRequestFromExecutionContext(context);
 *   const authHeader = request.headers.authorization;
 *   return this.validateToken(authHeader);
 * }
 * ```
 */
export function extractRequestFromExecutionContext(context: ExecutionContext): FastifyRequest {
	const contextType = context.getType<GqlContextType>();

	if (contextType === 'graphql') {
		return GqlExecutionContext.create(context).getContext<{ req: FastifyRequest }>().req;
	}

	if (contextType === 'ws') {
		return context.switchToWs().getClient<{ handshake: FastifyRequest }>().handshake;
	}

	if (contextType === 'rpc') {
		return context.switchToRpc().getContext<{ request: FastifyRequest }>().request;
	}

	// Default to HTTP (most common case)
	return context.switchToHttp().getRequest<FastifyRequest>();
}
