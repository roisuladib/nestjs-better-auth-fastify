import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { Catch } from '@nestjs/common';

import { APIError } from 'better-auth/api';

/**
 * **Global exception filter** - Converts Better Auth errors to proper HTTP responses
 *
 * Automatically transforms authentication errors into user-friendly JSON responses.
 * Handles all Better Auth API errors (UNAUTHORIZED, FORBIDDEN, etc.) with consistent formatting.
 *
 * **Features:**
 * - Consistent error response format across all auth endpoints
 * - Automatic HTTP status code mapping
 * - Includes helpful error codes and messages
 * - Request path tracking for debugging
 * - ISO 8601 timestamps
 *
 * **Auto-registered by default** - disable with `disableExceptionFilter: true`
 *
 * @example
 * ```typescript
 * // Error response format
 * {
 *   "statusCode": 401,
 *   "message": "Invalid credentials",
 *   "error": "INVALID_CREDENTIALS",
 *   "timestamp": "2025-01-15T10:30:00.000Z",
 *   "path": "/api/auth/sign-in/email"
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Custom filter registration (advanced)
 * @Module({
 *   imports: [
 *     AuthModule.forRoot({
 *       auth,
 *       disableExceptionFilter: true // Disable default filter
 *     })
 *   ],
 *   providers: [
 *     {
 *       provide: APP_FILTER,
 *       useClass: CustomAuthFilter // Your custom filter
 *     }
 *   ]
 * })
 * ```
 *
 * @see {@link AuthModule} for module configuration
 */
@Catch(APIError)
export class AuthFilter implements ExceptionFilter {
	catch(exception: APIError, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<FastifyReply>();
		const request = ctx.getRequest<FastifyRequest>();

		const status = exception.statusCode;
		const message = exception.body?.message;
		const errorCode = exception.body?.code;

		const errorResponse = {
			statusCode: status,
			message,
			error: errorCode,
			timestamp: new Date().toISOString(),
			path: request.url,
		};

		response.status(status).send(errorResponse);
	}
}
