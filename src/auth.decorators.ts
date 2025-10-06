import type { ExecutionContext } from '@nestjs/common';
import type { ReflectableDecorator } from '@nestjs/core';
import type { createAuthMiddleware } from 'better-auth/api';
import type { FastifyRequest } from 'fastify';

import { createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * **Skip authentication** - Make routes publicly accessible
 *
 * Perfect for health checks, landing pages, and public APIs.
 * Zero performance overhead - guard exits immediately without session lookup.
 *
 * @example
 * ```typescript
 * // Health check endpoint
 * @Public()
 * @Get('health')
 * getHealth() {
 *   return { status: 'ok', uptime: process.uptime() };
 * }
 *
 * // Public blog posts
 * @Public()
 * @Get('posts')
 * getPosts() {
 *   return this.postsService.findAll();
 * }
 * ```
 *
 * @see {@link Optional} for routes that work with or without auth
 */
export const Public: ReflectableDecorator<boolean> = Reflector.createDecorator<boolean>();

/**
 * **Optional authentication** - Supercharge UX with personalization
 *
 * Build adaptive experiences that work for everyone:
 * - Logged-in users get personalized content
 * - Anonymous users get public content
 * - No authentication barriers, maximum conversion
 *
 * @example
 * ```typescript
 * // E-commerce product recommendations
 * @Optional()
 * @Get('products')
 * getProducts(@Session() session?: UserSession) {
 *   if (session?.user) {
 *     // Personalized based on purchase history
 *     return this.getRecommendedProducts(session.user.id);
 *   }
 *   // Best sellers for anonymous users
 *   return this.getBestSellers();
 * }
 *
 * // Dashboard with smart defaults
 * @Optional()
 * @Get('dashboard')
 * getDashboard(@Session() session?: UserSession) {
 *   return {
 *     welcome: session?.user
 *       ? `Welcome back, ${session.user.name}!`
 *       : 'Welcome! Sign in for personalized content.',
 *     data: session ? this.getUserData(session.user.id) : this.getPublicData()
 *   };
 * }
 * ```
 *
 * @see {@link Public} for fully public routes
 * @see {@link Session} for extracting user data
 */
export const Optional: ReflectableDecorator<boolean> = Reflector.createDecorator<boolean>();

/**
 * **Extract user session** - Type-safe access to authenticated user
 *
 * Get complete user data and session metadata with full TypeScript support.
 * Works seamlessly with `@Optional()` - returns undefined when not authenticated.
 *
 * **What you get:**
 * - `session.user` - User profile (id, email, name, custom fields)
 * - `session.session` - Session metadata (expiresAt, ipAddress, userAgent)
 * - Full type safety with IntelliSense autocomplete
 *
 * @example
 * ```typescript
 * // User profile endpoint
 * @Get('profile')
 * getProfile(@Session() session: UserSession) {
 *   return {
 *     id: session.user.id,
 *     email: session.user.email,
 *     name: session.user.name,
 *     sessionExpiry: session.session.expiresAt
 *   };
 * }
 *
 * // Personalized content
 * @Get('feed')
 * getFeed(@Session() { user }: UserSession) {
 *   return this.feedService.getPersonalizedFeed(user.id);
 * }
 *
 * // Optional auth with type safety
 * @Optional()
 * @Get('recommendations')
 * getRecommendations(@Session() session?: UserSession) {
 *   const userId = session?.user.id;
 *   return this.recommendationService.get(userId);
 * }
 * ```
 *
 * @see {@link UserSession} for complete type definition
 */
export const Session: ParameterDecorator = createParamDecorator(
	(_data: unknown, context: ExecutionContext): unknown => {
		const request = context.switchToHttp().getRequest<FastifyRequest>();
		return request.session;
	},
);

/**
 * **Hook context** - Complete request/response access in authentication lifecycle
 *
 * Everything you need to implement custom auth logic:
 * - `ctx.body` - Request payload (email, password, etc.)
 * - `ctx.headers` - Request headers for IP, user-agent tracking
 * - `ctx.user` - Authenticated user (available in @AfterHook)
 * - `ctx.request` - Full Fastify request object
 *
 * @see {@link BeforeHook} for pre-authentication hooks
 * @see {@link AfterHook} for post-authentication hooks
 */
export type AuthHookContext = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

/**
 * **Pre-authentication hook** - Intercept and validate before Better Auth processes
 *
 * Build enterprise-grade security with pre-validation:
 * - Rate limiting to prevent brute-force attacks
 * - Email domain whitelisting/blacklisting
 * - IP-based geo-blocking
 * - Custom validation logic
 * - Security event logging
 *
 * **Pro tip:** Throw errors to reject requests before authentication
 *
 * @param path - Better Auth route (e.g., '/sign-in/email', '/sign-up/email')
 * @example
 * ```typescript
 * @Hook()
 * @Injectable()
 * export class SecurityHooks {
 *   constructor(
 *     private rateLimiter: RateLimiterService,
 *     private blocklist: BlocklistService
 *   ) {}
 *
 *   // Prevent brute-force attacks
 *   @BeforeHook('/sign-in/email')
 *   async preventBruteForce(ctx: AuthHookContext) {
 *     const isAllowed = await this.rateLimiter.check(ctx.request.ip, {
 *       max: 5,
 *       window: '15m'
 *     });
 *     if (!isAllowed) {
 *       throw new Error('Too many sign-in attempts. Try again in 15 minutes.');
 *     }
 *   }
 *
 *   // Block disposable emails
 *   @BeforeHook('/sign-up/email')
 *   async validateEmail(ctx: AuthHookContext) {
 *     const { email } = ctx.body;
 *     const domain = email.split('@')[1];
 *
 *     if (await this.blocklist.isDisposable(domain)) {
 *       throw new Error('Disposable email addresses are not allowed');
 *     }
 *   }
 *
 *   // Enterprise domain restriction
 *   @BeforeHook('/sign-up/email')
 *   async enforceWorkEmail(ctx: AuthHookContext) {
 *     const { email } = ctx.body;
 *     if (!email.endsWith('@company.com')) {
 *       throw new Error('Only company email addresses allowed');
 *     }
 *   }
 * }
 * ```
 *
 * @see {@link AfterHook} for post-authentication hooks
 * @see {@link Hook} to mark class as hook provider
 */
export const BeforeHook: ReflectableDecorator<`/${string}`> =
	Reflector.createDecorator<`/${string}`>();

/**
 * **Post-authentication hook** - Execute logic after successful authentication
 *
 * Build complete user onboarding flows:
 * - Welcome emails and notifications
 * - Analytics and conversion tracking
 * - User profile enrichment
 * - Webhook triggers
 * - Audit logging
 *
 * **Pro tip:** Access `ctx.user` to get freshly authenticated user data
 *
 * @param path - Better Auth route (e.g., '/sign-up/email', '/sign-in/email')
 * @example
 * ```typescript
 * @Hook()
 * @Injectable()
 * export class OnboardingHooks {
 *   constructor(
 *     private emailService: EmailService,
 *     private analytics: AnalyticsService,
 *     private crm: CRMService
 *   ) {}
 *
 *   // Welcome new users
 *   @AfterHook('/sign-up/email')
 *   async welcomeNewUser(ctx: AuthHookContext) {
 *     const user = ctx.user!;
 *
 *     // Send welcome email with onboarding guide
 *     await this.emailService.sendTemplate('welcome', {
 *       to: user.email,
 *       name: user.name,
 *       verificationLink: await this.generateVerificationLink(user.id)
 *     });
 *
 *     // Track conversion in analytics
 *     await this.analytics.track('user_signed_up', {
 *       userId: user.id,
 *       email: user.email,
 *       source: ctx.request.headers.referer
 *     });
 *
 *     // Sync to CRM
 *     await this.crm.createContact({
 *       email: user.email,
 *       name: user.name,
 *       signupDate: new Date()
 *     });
 *   }
 *
 *   // Track user activity
 *   @AfterHook('/sign-in/email')
 *   async trackSignIn(ctx: AuthHookContext) {
 *     const user = ctx.user!;
 *
 *     // Update last login timestamp
 *     await this.userService.updateLastLogin(user.id, {
 *       ip: ctx.request.ip,
 *       userAgent: ctx.request.headers['user-agent']
 *     });
 *
 *     // Send security notification for new device
 *     if (await this.isNewDevice(user.id, ctx.request)) {
 *       await this.emailService.sendSecurityAlert(user.email);
 *     }
 *   }
 * }
 * ```
 *
 * @see {@link BeforeHook} for pre-authentication hooks
 * @see {@link Hook} to mark class as hook provider
 */
export const AfterHook: ReflectableDecorator<`/${string}`> =
	Reflector.createDecorator<`/${string}`>();

/**
 * **Hook provider marker** - Enable automatic hook discovery
 *
 * Mark your class to enable automatic registration of `@BeforeHook` and `@AfterHook` methods.
 * Supports full NestJS dependency injection - inject any service you need!
 *
 * **Key features:**
 * - Automatic discovery and registration
 * - Full dependency injection support
 * - Multiple hooks per class
 * - Type-safe hook methods
 *
 * @example
 * ```typescript
 * @Hook()
 * @Injectable()
 * export class AuthLifecycleHooks {
 *   constructor(
 *     private emailService: EmailService,
 *     private logger: Logger,
 *     private analytics: AnalyticsService
 *   ) {}
 *
 *   @BeforeHook('/sign-in/email')
 *   async beforeSignIn(ctx: AuthHookContext) {
 *     this.logger.log(`Sign-in attempt: ${ctx.body.email}`);
 *   }
 *
 *   @AfterHook('/sign-up/email')
 *   async afterSignUp(ctx: AuthHookContext) {
 *     await this.emailService.sendWelcome(ctx.user!.email);
 *     await this.analytics.track('user_signed_up');
 *   }
 * }
 *
 * // Register in module - that's it!
 * @Module({
 *   imports: [AuthModule.forRoot({ auth })],
 *   providers: [AuthLifecycleHooks]
 * })
 * export class AppModule {}
 * ```
 *
 * @see {@link BeforeHook} for pre-authentication hooks
 * @see {@link AfterHook} for post-authentication hooks
 */
export const Hook: ReflectableDecorator<boolean> = Reflector.createDecorator<boolean>();
