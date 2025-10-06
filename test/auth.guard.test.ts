import type { ExecutionContext } from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import { APIError } from 'better-auth/api';

import { Optional, Public } from '../src/auth.decorators';
import { AuthGuard } from '../src/auth.guard';
import { AUTH_MODULE_OPTIONS } from '../src/auth.symbols';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

interface MockRequest {
	headers: Record<string, string>;
	session: unknown;
	user: unknown;
}

interface MockAuthApi {
	getSession: ReturnType<typeof mock>;
}

type MockExecutionContext = Pick<
	ExecutionContext,
	'switchToHttp' | 'getHandler' | 'getClass' | 'getType'
>;

describe('AuthGuard', () => {
	let guard: AuthGuard;
	let reflector: Reflector;
	let mockContext: MockExecutionContext;
	let mockRequest: MockRequest;
	let mockAuthApi: MockAuthApi;

	beforeEach(async () => {
		mockRequest = {
			headers: {},
			session: null,
			user: null,
		};

		mockAuthApi = {
			getSession: mock(() => Promise.resolve(null)),
		};

		const module = await Test.createTestingModule({
			providers: [
				AuthGuard,
				{
					provide: Reflector,
					useValue: {
						getAllAndOverride: mock(() => false),
					},
				},
				{
					provide: AUTH_MODULE_OPTIONS,
					useValue: {
						auth: {
							api: mockAuthApi,
						},
					},
				},
			],
		}).compile();

		guard = module.get<AuthGuard>(AuthGuard);
		reflector = module.get<Reflector>(Reflector);

		mockContext = {
			switchToHttp: () => ({
				getRequest: () => mockRequest as never,
				getResponse: () => ({}) as never,
				getNext: () => ({}) as never,
			}),
			getHandler: () => ({}) as never,
			getClass: () => ({}) as never,
			getType: () => 'http' as const,
		};
	});

	describe('Public routes', () => {
		it('should allow access to @Public() routes without session check', async () => {
			reflector.getAllAndOverride = mock(() => true);

			const result = await guard.canActivate(mockContext);

			expect(result).toBe(true);
			expect(mockAuthApi.getSession).not.toHaveBeenCalled();
		});

		it('should skip authentication for public routes (performance optimization)', async () => {
			reflector.getAllAndOverride = mock(decorator => decorator === Public);

			const result = await guard.canActivate(mockContext);

			expect(result).toBe(true);
			expect(mockAuthApi.getSession).not.toHaveBeenCalled();
		});
	});

	describe('Optional authentication', () => {
		it('should allow access to @Optional() routes without session', async () => {
			reflector.getAllAndOverride = mock(decorator => {
				if (decorator === Public) return false;
				if (decorator === Optional) return true;
				return false;
			});

			mockAuthApi.getSession = mock(() => Promise.resolve(null));

			const result = await guard.canActivate(mockContext);

			expect(result).toBe(true);
			expect(mockAuthApi.getSession).toHaveBeenCalled();
		});

		it('should allow access to @Optional() routes with valid session', async () => {
			const mockSession = {
				user: { id: '1', email: 'test@example.com' },
				session: { id: 'session-1' },
			};

			reflector.getAllAndOverride = mock(decorator => {
				if (decorator === Public) return false;
				if (decorator === Optional) return true;
				return false;
			});

			mockAuthApi.getSession = mock(() => Promise.resolve(mockSession));

			const result = await guard.canActivate(mockContext);

			expect(result).toBe(true);
			expect(mockRequest.session).toBe(mockSession);
			expect(mockRequest.user).toBe(mockSession.user);
		});
	});

	describe('Protected routes', () => {
		it('should throw UNAUTHORIZED when session is missing', async () => {
			reflector.getAllAndOverride = mock(() => false);
			mockAuthApi.getSession = mock(() => Promise.resolve(null));

			expect(async () => {
				await guard.canActivate(mockContext);
			}).toThrow(APIError);
		});

		it('should allow access with valid session', async () => {
			const mockSession = {
				user: { id: '1', email: 'test@example.com', name: 'Test User' },
				session: { id: 'session-1', expiresAt: new Date() },
			};

			reflector.getAllAndOverride = mock(() => false);
			mockAuthApi.getSession = mock(() => Promise.resolve(mockSession));

			const result = await guard.canActivate(mockContext);

			expect(result).toBe(true);
			expect(mockRequest.session).toBe(mockSession);
			expect(mockRequest.user).toBe(mockSession.user);
		});

		it('should attach session and user to request for observability', async () => {
			const mockSession = {
				user: { id: '1', email: 'test@example.com' },
				session: { id: 'session-1' },
			};

			reflector.getAllAndOverride = mock(() => false);
			mockAuthApi.getSession = mock(() => Promise.resolve(mockSession));

			await guard.canActivate(mockContext);

			expect(mockRequest.session).toBeDefined();
			expect(mockRequest.user).toBeDefined();
			expect(mockRequest.user.id).toBe('1');
		});
	});

	describe('Performance optimization', () => {
		it('should exit early for public routes without session lookup', async () => {
			reflector.getAllAndOverride = mock(() => true);

			const start = performance.now();
			await guard.canActivate(mockContext);
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(10); // Should be instant
			expect(mockAuthApi.getSession).not.toHaveBeenCalled();
		});
	});
});
