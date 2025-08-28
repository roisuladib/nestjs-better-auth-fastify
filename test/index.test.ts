import { greet } from '../src';
import { expect, test } from 'bun:test';

test('should greet correctly', () => {
	expect(greet('World')).toBe('Hello, World!');
});
