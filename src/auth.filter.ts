import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { Catch } from '@nestjs/common';

import { APIError } from 'better-auth/api';

@Catch(APIError)
export class AuthFilter implements ExceptionFilter {
	catch(exception: APIError, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<FastifyReply>();
		const status = exception.statusCode;
		const message = exception.body?.message;

		response.status(status).send({
			statusCode: status,
			message,
		});
	}
}
