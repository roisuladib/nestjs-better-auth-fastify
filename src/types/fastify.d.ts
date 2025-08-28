import 'fastify';

import type { UserSession } from './auth.types';

declare module 'fastify' {
	interface FastifyRequest {
		session?: UserSession | null;
		user?: UserSession['user'] | null;
	}
}
