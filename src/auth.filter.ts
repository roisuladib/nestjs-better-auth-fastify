import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { Catch } from '@nestjs/common';

import { APIError } from 'better-auth/api';

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
