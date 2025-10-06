import type { Auth } from 'better-auth';

import { Test } from '@nestjs/testing';

import { AuthService } from '../src/auth.service';
import { AUTH_MODULE_OPTIONS } from '../src/auth.symbols';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

describe('AuthService', () => {
	let service: AuthService;

	beforeEach(async () => {
		const module = await Test.createTestingModule({
			providers: [
				AuthService,
				{
					provide: AUTH_MODULE_OPTIONS,
					useValue: {
						auth: {
							api: {
								getSession: mock(async () => null),
								signInEmail: mock(async () => ({})),
								signUpEmail: mock(async () => ({})),
								signOut: mock(async () => ({})),
							} as any,
							options: {
								baseURL: 'http://localhost:3000',
								secret: 'test-secret',
							},
						},
					},
				},
			],
		}).compile();

		service = module.get<AuthService>(AuthService);
	});

	describe('api getter', () => {
		it('should return Better Auth API', () => {
			expect(service.api).toBeDefined();
			expect(service.api).toHaveProperty('getSession');
		});

		it('should provide access to getSession', () => {
			expect(service.api.getSession).toBeDefined();
			expect(typeof service.api.getSession).toBe('function');
		});

		it('should provide access to signInEmail method', () => {
			expect(service.api.signInEmail).toBeDefined();
			expect(typeof service.api.signInEmail).toBe('function');
		});

		it('should provide access to signUpEmail method', () => {
			expect(service.api.signUpEmail).toBeDefined();
			expect(typeof service.api.signUpEmail).toBe('function');
		});

		it('should provide access to signOut', () => {
			expect(service.api.signOut).toBeDefined();
			expect(typeof service.api.signOut).toBe('function');
		});
	});

	describe('instance getter', () => {
		it('should return complete auth instance', () => {
			expect(service.instance).toBeDefined();
			expect(service.instance).toHaveProperty('api');
			expect(service.instance).toHaveProperty('options');
		});

		it('should provide access to auth options', () => {
			expect(service.instance.options).toBeDefined();
			expect(service.instance.options.baseURL).toBe('http://localhost:3000');
		});
	});

	describe('isInitialized', () => {
		it('should return true when auth instance is valid', () => {
			expect(service.isInitialized()).toBe(true);
		});

		it('should return false when auth instance is invalid', async () => {
			const module = await Test.createTestingModule({
				providers: [
					AuthService,
					{
						provide: AUTH_MODULE_OPTIONS,
						useValue: {
							auth: null,
						},
					},
				],
			}).compile();

			const invalidService = module.get<AuthService>(AuthService);
			expect(invalidService.isInitialized()).toBeFalsy();
		});

		it('should return false when API is missing', async () => {
			const module = await Test.createTestingModule({
				providers: [
					AuthService,
					{
						provide: AUTH_MODULE_OPTIONS,
						useValue: {
							auth: { api: null },
						},
					},
				],
			}).compile();

			const invalidService = module.get<AuthService>(AuthService);
			expect(invalidService.isInitialized()).toBeFalsy();
		});
	});

	describe('getBaseUrl', () => {
		it('should return configured base URL', () => {
			expect(service.getBaseUrl()).toBe('http://localhost:3000');
		});

		it('should return undefined when not configured', async () => {
			const module = await Test.createTestingModule({
				providers: [
					AuthService,
					{
						provide: AUTH_MODULE_OPTIONS,
						useValue: {
							auth: {
								api: {},
								options: {},
							},
						},
					},
				],
			}).compile();

			const testService = module.get<AuthService>(AuthService);
			expect(testService.getBaseUrl()).toBeUndefined();
		});
	});

	describe('getSecret', () => {
		it('should return configured secret', () => {
			expect(service.getSecret()).toBe('test-secret');
		});

		it('should return undefined when not configured', async () => {
			const module = await Test.createTestingModule({
				providers: [
					AuthService,
					{
						provide: AUTH_MODULE_OPTIONS,
						useValue: {
							auth: {
								api: {},
								options: {},
							},
						},
					},
				],
			}).compile();

			const testService = module.get<AuthService>(AuthService);
			expect(testService.getSecret()).toBeUndefined();
		});
	});

	describe('Type safety', () => {
		it('should support custom auth instance types', async () => {
			interface CustomAuth extends Auth {
				customMethod?: () => void;
			}

			const module = await Test.createTestingModule({
				providers: [
					AuthService,
					{
						provide: AUTH_MODULE_OPTIONS,
						useValue: {
							auth: {
								api: {
									getSession: mock(async () => null),
								} as any,
								options: {
									baseURL: 'http://localhost:3000',
									secret: 'test-secret',
								},
								customMethod: () => {},
							},
						},
					},
				],
			}).compile();

			const customService = module.get<AuthService<CustomAuth>>(AuthService);
			expect(customService.instance.customMethod).toBeDefined();
		});
	});
});
