/**
 * **Injection token** - AuthModule configuration DI token
 *
 * Internal injection token used by NestJS dependency injection.
 * You typically won't need this - it's used automatically by the framework.
 *
 * **Advanced use case:** Access raw module configuration in custom providers
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class CustomAuthService {
 *   constructor(
 *     @Inject(AUTH_MODULE_OPTIONS)
 *     private config: AuthModuleConfig
 *   ) {}
 *
 *   getAuthInstance() {
 *     return this.config.auth;
 *   }
 * }
 * ```
 *
 * @internal This is primarily for framework internals
 */
export const AUTH_MODULE_OPTIONS: unique symbol = Symbol('AUTH_MODULE_OPTIONS');
