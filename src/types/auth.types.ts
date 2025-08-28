import type { getSession } from 'better-auth/api';

/**
 * Type representing a valid user session after authentication
 * Excludes null and undefined values from the session return type
 */
export type UserSession = NonNullable<Awaited<ReturnType<ReturnType<typeof getSession>>>>;
