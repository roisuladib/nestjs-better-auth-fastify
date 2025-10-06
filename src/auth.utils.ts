import type { ExecutionContext } from '@nestjs/common';
import type { GqlContextType } from '@nestjs/graphql';
import type { FastifyRequest } from 'fastify';

import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * **Universal request extractor** - Get FastifyRequest from any context
 *
 * Smart helper that extracts Fastify request from **any** NestJS execution context.
 * Powers AuthGuard to work seamlessly across all transport types.
 *
 * **Supported contexts:**
 * - ✅ HTTP (REST APIs) - most common
 * - ✅ GraphQL - Apollo/Mercurius
 * - ✅ WebSocket - real-time connections
 * - ✅ RPC - microservices
 *
 * **Why you might need this:**
 * - Building custom guards for specific routes
 * - Creating interceptors that need auth context
 * - Implementing custom authentication strategies
 * - Testing guard logic
 *
 * @param context - NestJS execution context (from guard, interceptor, or filter)
 * @returns Fastify request with headers, body, and session data
 *
 * @example
 * ```typescript
 * // Custom rate limiting guard
 * @Injectable()
 * export class RateLimitGuard implements CanActivate {
 *   async canActivate(context: ExecutionContext) {
 *     const request = extractRequestFromExecutionContext(context);
 *
 *     const ip = request.ip;
 *     const isAllowed = await this.rateLimiter.check(ip);
 *
 *     if (!isAllowed) {
 *       throw new TooManyRequestsException();
 *     }
 *
 *     return true;
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Custom logging interceptor
 * @Injectable()
 * export class AuthLogInterceptor implements NestInterceptor {
 *   intercept(context: ExecutionContext, next: CallHandler) {
 *     const request = extractRequestFromExecutionContext(context);
 *
 *     this.logger.log({
 *       userId: request.user?.id,
 *       path: request.url,
 *       method: request.method
 *     });
 *
 *     return next.handle();
 *   }
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
