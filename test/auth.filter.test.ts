import type { ArgumentsHost } from '@nestjs/common';

import { APIError } from 'better-auth/api';

import { AuthFilter } from '../src/auth.filter';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

interface MockReply {
	status: ReturnType<typeof mock>;
	send: ReturnType<typeof mock>;
	statusCode?: number;
}

interface MockRequest {
	url: string;
}

type MockArgumentsHost = Pick<ArgumentsHost, 'switchToHttp'>;

describe('AuthFilter', () => {
	let filter: AuthFilter;
	let mockReply: MockReply;
	let mockRequest: MockRequest;
	let mockHost: MockArgumentsHost;

	beforeEach(() => {
		mockReply = {
			status: mock(function (this: MockReply, code: number) {
				this.statusCode = code;
				return this;
			}),
			send: mock((body: unknown) => body),
		};

		mockRequest = {
			url: '/api/auth/sign-in/email',
		};

		mockHost = {
			switchToHttp: () => ({
				getResponse: () => mockReply as never,
				getRequest: () => mockRequest as never,
				getNext: () => ({}) as never,
			}),
		};

		filter = new AuthFilter();
	});

	describe('Error transformation', () => {
		it('should transform APIError to HTTP response', () => {
			const error = new APIError('UNAUTHORIZED', {
				message: 'Invalid credentials',
			});

			filter.catch(error, mockHost);

			expect(mockReply.status).toHaveBeenCalledWith(401);
			expect(mockReply.send).toHaveBeenCalled();
		});

		it('should include error code in response', () => {
			const error = new APIError('INVALID_CREDENTIALS', {
				message: 'Wrong email or password',
			});

			filter.catch(error, mockHost);

			const response = mockReply.send.mock.calls[0][0];
			// APIError transforms to WRONG_EMAIL_OR_PASSWORD
			expect(response.error).toBeDefined();
		});

		it('should include error message in response', () => {
			const error = new APIError('FORBIDDEN', {
				message: 'Access denied',
			});

			filter.catch(error, mockHost);

			const response = mockReply.send.mock.calls[0][0];
			expect(response.message).toBe('Access denied');
		});

		it('should include request path in response', () => {
			const error = new APIError('UNAUTHORIZED', {
				message: 'Session expired',
			});

			filter.catch(error, mockHost);

			const response = mockReply.send.mock.calls[0][0];
			expect(response.path).toBe('/api/auth/sign-in/email');
		});

		it('should include ISO 8601 timestamp', () => {
			const error = new APIError('UNAUTHORIZED');

			filter.catch(error, mockHost);

			const response = mockReply.send.mock.calls[0][0];
			expect(response.timestamp).toBeDefined();
			expect(new Date(response.timestamp).toISOString()).toBe(response.timestamp);
		});
	});

	describe('Response format', () => {
		it('should return consistent error format', () => {
			const error = new APIError('UNAUTHORIZED', {
				message: 'Authentication required',
			});

			filter.catch(error, mockHost);

			const response = mockReply.send.mock.calls[0][0];

			expect(response).toHaveProperty('statusCode');
			expect(response).toHaveProperty('message');
			expect(response).toHaveProperty('error');
			expect(response).toHaveProperty('timestamp');
			expect(response).toHaveProperty('path');
		});

		it('should handle errors without message', () => {
			const error = new APIError('INTERNAL_SERVER_ERROR');

			filter.catch(error, mockHost);

			const response = mockReply.send.mock.calls[0][0];
			expect(response.statusCode).toBe(500);
		});

		it('should handle errors without code', () => {
			const error = {
				statusCode: 400,
				body: {
					message: 'Bad request',
				},
			} as APIError;

			filter.catch(error, mockHost);

			const response = mockReply.send.mock.calls[0][0];
			expect(response.message).toBe('Bad request');
		});
	});

	describe('HTTP status codes', () => {
		it('should map UNAUTHORIZED to 401', () => {
			const error = new APIError('UNAUTHORIZED');
			filter.catch(error, mockHost);
			expect(mockReply.status).toHaveBeenCalledWith(401);
		});

		it('should map FORBIDDEN to 403', () => {
			const error = new APIError('FORBIDDEN');
			filter.catch(error, mockHost);
			expect(mockReply.status).toHaveBeenCalledWith(403);
		});

		it('should handle custom status codes', () => {
			const error = {
				statusCode: 429,
				body: {
					message: 'Too many requests',
					code: 'RATE_LIMIT_EXCEEDED',
				},
			} as APIError;

			filter.catch(error, mockHost);
			expect(mockReply.status).toHaveBeenCalledWith(429);
		});
	});

	describe('Edge cases', () => {
		it('should handle missing error body', () => {
			const error = {
				statusCode: 500,
			} as APIError;

			filter.catch(error, mockHost);

			const response = mockReply.send.mock.calls[0][0];
			expect(response.statusCode).toBe(500);
			expect(response.timestamp).toBeDefined();
		});

		it('should handle complex request paths', () => {
			mockRequest.url = '/api/auth/sign-in/email?redirect=/dashboard';

			const error = new APIError('UNAUTHORIZED');
			filter.catch(error, mockHost);

			const response = mockReply.send.mock.calls[0][0];
			expect(response.path).toBe('/api/auth/sign-in/email?redirect=/dashboard');
		});
	});
});
