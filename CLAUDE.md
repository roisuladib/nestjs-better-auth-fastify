# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS authentication module for Fastify adapter using Better Auth. This is a library package that integrates Better Auth's modern authentication system with NestJS applications using the Fastify platform.

## Development Commands

### Build & Development
```bash
# Development build with watch mode
bun run dev

# Production build (bunup + TypeScript declarations)
bun run build

# Type checking (no emit)
bun run tsc
```

### Testing
```bash
# Run all tests (using Bun test runner)
bun test

# Watch mode
bun run test:watch

# Coverage report
bun run test:coverage

# Run single test file
bun test test/auth.guard.test.ts
```

### Code Quality
```bash
# Lint code (Biome)
bun run lint

# Auto-fix linting issues
bun run lint:fix

# Format code
bun run format

# Auto-format code
bun run format:fix
```

### Release
```bash
# Bump version, commit, tag, and push
bun run release
```

## Architecture Overview

### Module Pattern: ConfigurableModuleBuilder

The module uses NestJS's `ConfigurableModuleBuilder` for enhanced type safety and reduced boilerplate:

1. **Module Definition** (`auth.module-definition.ts`):
   - Defines base config type `AuthModuleConfig` with Better Auth instance
   - Extends with `ExtraOptions` for global module features
   - Creates `forRoot()` and `forRootAsync()` static methods
   - Custom injection token: `AUTH_MODULE_OPTIONS`

2. **Module Implementation** (`auth.module.ts`):
   - Extends `ConfigurableModuleClass` from builder
   - Implements `NestModule` for middleware/CORS setup
   - Implements `OnModuleInit` for hook discovery
   - Overrides `forRoot()` and `forRootAsync()` to inject global providers (guard, filter)

### Authentication Flow

**Guard Execution Order** (`auth.guard.ts`):
1. Check `@Public()` → early return (skip session lookup for performance)
2. Fetch session from Better Auth API
3. Attach `session` and `user` to request object
4. Check `@Optional()` → allow access even without session
5. Enforce authentication for protected routes

**Request Context Enrichment**:
- `req.session` - Full session object with user and metadata
- `req.user` - Direct user reference for observability (Sentry, logging)

### Hook System Architecture

**Discovery & Registration** (auth.module.ts:setupHooks):
1. Scan providers for `@Hook()` decorator
2. Extract methods with `@BeforeHook()` or `@AfterHook()` metadata
3. Create middleware wrapper using `createAuthMiddleware`
4. Chain multiple hooks by preserving original hook
5. Match hooks to paths and execute in sequence

**Hook Context**:
- `ctx.body` - Request payload
- `ctx.headers` - Request headers
- `ctx.user` - Authenticated user (available in @AfterHook)
- `ctx.request` - Full Fastify request

### CORS Configuration

**Three Modes** (`auth.module.ts:setupCors`):

1. **Static Origins** (string[]):
   - Uses Fastify's built-in CORS
   - Best performance (no per-request overhead)
   - 24-hour preflight cache

2. **Dynamic Origins** (function):
   - Runs on every request via preHandler hook
   - Converts Fastify request to Web API Request
   - Calls user function for origin validation
   - Handles OPTIONS preflight manually

3. **Disabled**:
   - Skip when `disableTrustedOriginsCors: true`
   - Skip when no `trustedOrigins` configured

### Better Auth Handler Integration

**Request Conversion** (`auth.module.ts:convertToWebApiRequest`):
- Fastify Request → Web API Request
- Better Auth expects standard Request objects
- Handles headers conversion (array/string values)
- Preserves body, method, URL

**Handler Setup** (`auth.module.ts:setupHandler`):
- Registers catch-all route: `{basePath}/*`
- Supports GET and POST methods
- Performance monitoring (logs slow requests >1s)
- Structured error responses

### Type System

**Core Types** (`types/auth.types.ts`):
- `UserSession` - Inferred from Better Auth's `getSession` return type
- `User` - Extracted from UserSession
- `AuthSession` - Session metadata
- `AuthHookContext` - Inferred from Better Auth middleware
- `PluginEndpoints<T>` - Helper to extract endpoints from Better Auth plugins
- `AuthWithPlugins<T>` - Generic interface for composing Better Auth with custom plugin endpoints
- `AuthWithOpenAPI` - Internal default type with openAPI plugin (used as AuthService default generic)
- `OpenAPIEndpoints` - Type for openAPI plugin endpoints

**Type Safety Strategy**:
- Use Better Auth's types as source of truth
- Infer types from Better Auth APIs (no duplication)
- Generic `AuthService<T extends AuthWithOpenAPI = AuthWithOpenAPI>` with openAPI by default
- Users define custom types using `AuthWithPlugins<T>` + `PluginEndpoints<T>` for clean type composition

**Plugin Type Handling**:
- **Default Behavior**: `AuthService` automatically includes **openAPI plugin methods** out of the box (via `AuthWithOpenAPI` default generic)
- **Custom plugins**: Use `PluginEndpoints<T>` helper with `AuthWithPlugins<T>` for type-safe plugin composition:
  ```typescript
  import type { twoFactor, phoneNumber, admin } from 'better-auth/plugins';
  import type { AdminOptions } from 'better-auth/plugins/admin';
  import type { AuthWithPlugins, PluginEndpoints } from 'nestjs-better-auth-fastify';

  // Single plugin - clean syntax
  interface MyAuth extends AuthWithPlugins<PluginEndpoints<typeof twoFactor>> {}

  // Multiple plugins - combine with intersection
  interface MyAuth extends AuthWithPlugins<
    PluginEndpoints<typeof twoFactor> &
    PluginEndpoints<typeof phoneNumber> &
    PluginEndpoints<typeof admin<AdminOptions>>
  > {}

  // Use in services
  constructor(private authService: AuthService<MyAuth>) {}
  ```
- **Type Safety**: `AuthWithPlugins<T>` automatically includes `OpenAPIEndpoints` for documentation generation
- **Helper Utility**: `PluginEndpoints<T>` eliminates verbose `ReturnType<typeof plugin>['endpoints']` pattern
- **Important**: No automatic type inference from runtime plugins due to TypeScript + DI limitations

### Multi-Context Support

**Context Extraction** (`auth.utils.ts`):
- HTTP: `context.switchToHttp().getRequest()`
- GraphQL: `GqlExecutionContext.create(context).getContext().req`
- WebSocket: `context.switchToWs().getClient().handshake`
- RPC: `context.switchToRpc().getContext().request`

## Testing Patterns

### Test Setup (Bun Test Runner)
- Use `@nestjs/testing` for module setup
- Mock Better Auth API with `bun:test` mock utilities
- Create mock ExecutionContext for guard/interceptor testing

### Common Test Patterns
```typescript
// Mock Better Auth API
const mockAuthApi = {
  getSession: mock(() => Promise.resolve(mockSession))
};

// Mock Reflector for decorator testing
const mockReflector = {
  getAllAndOverride: mock(() => false)
};

// Mock ExecutionContext
const mockContext = {
  switchToHttp: () => ({ getRequest: () => mockRequest }),
  getHandler: () => ({}),
  getClass: () => ({}),
  getType: () => 'http'
};
```

## Build Configuration

### Bunup (bunup.config.ts)
- Entry: `src/index.ts`
- Output formats: ESM + CJS
- Auto-detect exports from package.json
- Tree-shaking unused exports
- Minification enabled
- TypeScript declarations via tsc (not bunup)

### TypeScript (tsconfig.json)
- Target: ES2021
- Module: ESNext with bundler resolution
- Decorators: experimental + emit metadata
- Isolated declarations for type safety
- Strict mode enabled

### Biome (biome.json)
- Import organization with custom groups:
  1. Type imports
  2. @nestjs/** imports
  3. External packages
  4. Aliases
  5. Relative paths
- Single quotes, semicolons, minimal arrow parens
- Line width: 100
- Unsafe parameter decorators enabled (for NestJS)

## Key Design Decisions

1. **ConfigurableModuleBuilder over manual DynamicModule**: Type safety and less boilerplate
2. **Global guard/filter by default**: Opt-out model for better security
3. **Early exit for @Public()**: Performance optimization (skip session lookup)
4. **Request enrichment (req.user/session)**: Observability and middleware access
5. **Web API Request conversion**: Better Auth compatibility with Fastify
6. **Hook chaining**: Support multiple hooks per path without conflicts
7. **Bun for build/test**: Fast development workflow

## Common Gotchas

- Hooks require `hooks: {}` in Better Auth config (even if empty)
- Hook providers must use DEFAULT scope (not REQUEST/TRANSIENT)
- Dynamic CORS runs on every request (prefer static string[])
- Better Auth uses flat API names on server (`signInEmail` vs `signIn.email`)
- TypeScript declarations generated separately from bunup (tsc --emitDeclarationOnly)
