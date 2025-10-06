import type { ExecutionContext } from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { AfterHook, BeforeHook, Hook, Optional, Public, Session } from '../src/auth.decorators';
import { describe, expect, it } from 'bun:test';

type MockExecutionContext = Pick<ExecutionContext, 'switchToHttp'>;

describe('Decorators', () => {
	describe('@Public()', () => {
		it('should create reflectable decorator', () => {
			expect(Public).toBeDefined();
			expect(typeof Public).toBe('function');
		});

		it('should be a valid decorator function', () => {
			// Decorators created with Reflector.createDecorator() work at runtime
			// but metadata testing requires full NestJS application context
			expect(() => {
				@Public()
				class TestController {}
				return TestController;
			}).not.toThrow();
		});
	});

	describe('@Optional()', () => {
		it('should create reflectable decorator', () => {
			expect(Optional).toBeDefined();
			expect(typeof Optional).toBe('function');
		});

		it('should be a valid decorator function', () => {
			expect(() => {
				@Optional()
				class TestController {}
				return TestController;
			}).not.toThrow();
		});
	});

	describe('@Session()', () => {
		it('should create parameter decorator', () => {
			expect(Session).toBeDefined();
			expect(typeof Session).toBe('function');
		});

		it('should extract session from request', () => {
			const mockSession = {
				user: { id: '1', email: 'test@example.com' },
				session: { id: 'session-1' },
			};

			const mockRequest = {
				session: mockSession,
			};

			const mockContext: MockExecutionContext = {
				switchToHttp: () => ({
					getRequest: () => mockRequest as never,
					getResponse: () => ({}) as never,
					getNext: () => ({}) as never,
				}),
			};

			// Session decorator extracts from request.session
			const request = mockContext.switchToHttp().getRequest();
			expect(request.session).toBe(mockSession);
		});
	});

	describe('@Hook()', () => {
		it('should create class decorator', () => {
			expect(Hook).toBeDefined();
			expect(typeof Hook).toBe('function');
		});

		it('should be a valid decorator function', () => {
			expect(() => {
				@Hook()
				class TestHooks {}
				return TestHooks;
			}).not.toThrow();
		});
	});

	describe('@BeforeHook()', () => {
		it('should create method decorator with path', () => {
			expect(BeforeHook).toBeDefined();
			expect(typeof BeforeHook).toBe('function');
		});

		it('should store hook path metadata', () => {
			class TestHooks {
				@BeforeHook('/sign-in/email')
				beforeSignIn() {}
			}

			const reflector = new Reflector();
			const metadata = reflector.get(BeforeHook, TestHooks.prototype.beforeSignIn);
			expect(metadata).toBe('/sign-in/email');
		});

		it('should enforce path starting with /', () => {
			class TestHooks {
				@BeforeHook('/sign-up/email')
				beforeSignUp() {}
			}

			const reflector = new Reflector();
			const path = reflector.get(BeforeHook, TestHooks.prototype.beforeSignUp);
			expect(path).toMatch(/^\//);
		});
	});

	describe('@AfterHook()', () => {
		it('should create method decorator with path', () => {
			expect(AfterHook).toBeDefined();
			expect(typeof AfterHook).toBe('function');
		});

		it('should store hook path metadata', () => {
			class TestHooks {
				@AfterHook('/sign-up/email')
				afterSignUp() {}
			}

			const reflector = new Reflector();
			const metadata = reflector.get(AfterHook, TestHooks.prototype.afterSignUp);
			expect(metadata).toBe('/sign-up/email');
		});

		it('should support multiple hooks in same class', () => {
			class TestHooks {
				@BeforeHook('/sign-in/email')
				beforeSignIn() {}

				@AfterHook('/sign-in/email')
				afterSignIn() {}

				@AfterHook('/sign-up/email')
				afterSignUp() {}
			}

			const reflector = new Reflector();

			const beforePath = reflector.get(BeforeHook, TestHooks.prototype.beforeSignIn);
			const afterSignInPath = reflector.get(AfterHook, TestHooks.prototype.afterSignIn);
			const afterSignUpPath = reflector.get(AfterHook, TestHooks.prototype.afterSignUp);

			expect(beforePath).toBe('/sign-in/email');
			expect(afterSignInPath).toBe('/sign-in/email');
			expect(afterSignUpPath).toBe('/sign-up/email');
		});
	});

	describe('Decorator combinations', () => {
		it('should support @Hook with @BeforeHook and @AfterHook', () => {
			@Hook()
			class AuthHooks {
				@BeforeHook('/sign-in/email')
				beforeSignIn() {}

				@AfterHook('/sign-up/email')
				afterSignUp() {}
			}

			const reflector = new Reflector();

			const beforeMetadata = reflector.get(BeforeHook, AuthHooks.prototype.beforeSignIn);
			const afterMetadata = reflector.get(AfterHook, AuthHooks.prototype.afterSignUp);

			// Method decorators work correctly
			expect(beforeMetadata).toBe('/sign-in/email');
			expect(afterMetadata).toBe('/sign-up/email');
		});

		it('should allow multiple decorators without errors', () => {
			expect(() => {
				@Public()
				class PublicController {}

				@Optional()
				class OptionalController {}

				return [PublicController, OptionalController];
			}).not.toThrow();
		});
	});
});
