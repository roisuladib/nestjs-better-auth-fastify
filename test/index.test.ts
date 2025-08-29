import { AuthFilter, AuthGuard, AuthModule, AuthService } from '../src';
import { expect, test } from 'bun:test';

test('should export AuthModule', () => {
	expect(AuthModule).toBeDefined();
	expect(typeof AuthModule.forRoot).toBe('function');
	expect(typeof AuthModule.forRootAsync).toBe('function');
});

test('should export guards and services', () => {
	expect(AuthGuard).toBeDefined();
	expect(AuthService).toBeDefined();
	expect(AuthFilter).toBeDefined();
});
