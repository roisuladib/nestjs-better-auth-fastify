# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS Better Auth Module for Fastify - A high-performance authentication library that integrates Better Auth with NestJS Fastify applications. This is a TypeScript library package that provides decorators, guards, services, and middleware for authentication.

**Key Technologies:**
- Runtime: Bun (package manager, test runner, build tool)
- Build Tool: bunup (produces ESM/CJS dual format)
- Linter/Formatter: Biome
- Framework: NestJS with Fastify adapter
- Auth Provider: Better Auth
- Type System: TypeScript with experimental decorators

## Development Commands

### Building
```bash
bun run build           # Production build (ESM + CJS with minification)
bun run dev             # Development build with watch mode
bun run tsc             # Type checking only (no emit)
```

### Code Quality
```bash
bun run lint            # Check code with Biome
bun run lint:fix        # Fix linting issues
bun run format          # Check formatting
bun run format:fix      # Fix formatting issues
```

### Testing
```bash
bun test                # Run all tests
bun test --watch        # Watch mode for tests
bun test --coverage     # Generate coverage report
```

### Versioning & Release
```bash
bun run release         # Bump version, commit, tag, and push
bun run publish:ci      # Publish to npm (CI only, no git checks)
```

## Architecture

### Module System Architecture

The library provides **two module implementations**:

1. **AuthModule** (`auth.module.ts`) - Manual implementation for learning and simple use cases
2. **AuthNewModule** (`auth-new.module.ts`) - **Recommended** for production using `ConfigurableModuleBuilder`

Both modules support two initialization methods:
- **Synchronous (`forRoot`)**: Direct Better Auth instance injection
- **Asynchronous (`forRootAsync`)**: Factory/class/existing provider patterns for async config

**Key Differences:**
- **AuthModule**: Manual `forRoot(auth, options?)` signature, custom provider management
- **AuthNewModule**: Type-safe `forRoot(config)` signature, auto-generated base from `ConfigurableModuleBuilder`

**Module Initialization Flow (AuthNewModule):**
```
AuthNewModule.forRoot/forRootAsync
  → Extend ConfigurableModuleClass (from auth.module-definition.ts)
  → Initialize hooks object (required for hook registration)
  → Register AUTH_MODULE_OPTIONS provider (module config)
  → Conditionally register AuthFilter (unless disabled)
  → Export AuthService for DI
  → Configure as global module (via isGlobal option)
```

### Core Components

**AuthNewModule** (auth-new.module.ts) - **Recommended**
- Extends ConfigurableModuleClass from auth.module-definition.ts
- Implements NestModule and OnModuleInit
- Uses ConfigurableModuleBuilder for enhanced type safety
- Overrides forRoot/forRootAsync to initialize hooks and exception filter
- Same runtime behavior as AuthModule with better developer experience

**AuthModule** (auth.module.ts) - Manual Implementation
- Implements NestModule and OnModuleInit
- Manual provider registration and validation
- Same runtime behavior as AuthNewModule
- Use for learning NestJS internals or simple use cases

**Common Features (Both Modules)**
- Handles Better Auth middleware registration as Fastify catch-all route
- Manages CORS configuration (static array or dynamic function)
- Discovers and registers hooks from @Hook decorated providers
- Performance optimizations: early returns, header skip list, logging for slow requests

**AuthGuard** (auth.guard.ts)
- Implements CanActivate for route protection
- Supports @Public decorator (skips auth check)
- Supports @Optional decorator (session nullable)
- Calls Better Auth API to get session
- Attaches session and user to request object
- Throws APIError for unauthorized access

**AuthService** (auth.service.ts)
- Injectable service providing access to Better Auth instance
- Exposes `api` property for Better Auth API methods
- Exposes `instance` property for full auth instance access
- Utility methods: isInitialized(), getBaseUrl(), getSecret()

**AuthFilter** (auth.filter.ts)
- Global exception filter for Better Auth APIError
- Converts Better Auth errors to proper HTTP responses
- Can be disabled via module options

### Decorator System

**Route Control Decorators:**
- `@Public()` - Skip authentication (early return in guard)
- `@Optional()` - Allow unauthenticated access with nullable session
- `@Session()` - Extract user session from request

**Hook System Decorators:**
- `@Hook()` - Class decorator marking provider as hook container
- `@BeforeHook(path)` - Method decorator for pre-auth route processing
- `@AfterHook(path)` - Method decorator for post-auth route processing

### Hook Registration Pattern

Hooks are discovered via DiscoveryService and MetadataScanner:
1. Scan all providers for @Hook class decorator
2. Scan all methods in hook providers for @BeforeHook/@AfterHook
3. Wrap existing Better Auth hooks to preserve them
4. Register new hooks that execute on path match (or globally if no path)
5. Better Auth hooks object MUST be initialized before setup (done in forRoot/forRootAsync)

### Request Flow

**Authentication Request:**
```
Fastify Request
  → AuthGuard.canActivate()
    → Check @Public (early return if true)
    → Call Better Auth API getSession()
    → Attach session + user to request
    → Check @Optional (allow null session)
    → Return true or throw UNAUTHORIZED
  → Controller handler receives request with session/user attached
```

**Better Auth Handler:**
```
Fastify Catch-All Route (basePath/*)
  → Convert Fastify Request to Web API Request
  → Execute Better Auth hooks (before)
  → Process with auth.handler()
  → Execute Better Auth hooks (after)
  → Convert Response headers/body back to Fastify
  → Log slow requests (>1000ms)
```

### CORS Handling

Two modes based on Better Auth trustedOrigins configuration:

1. **Static (string[])**: Uses Fastify/NestJS enableCors() with validated origins
2. **Dynamic (function)**: Fastify preHandler hook that:
   - Converts Fastify Request to Web API Request
   - Calls trustedOrigins function
   - Sets CORS headers if origin allowed
   - Handles OPTIONS preflight

**Security:** Origins are validated for proper URL format and http/https protocols only.

### Type System

**Core Types (types/auth.types.ts):**
- `UserSession`: Non-nullable session type from Better Auth
- `User`: User object extracted from session
- `AuthSession`: Session metadata from Better Auth
- `AuthModuleFeatures`: Module configuration options
- `AuthModuleConfig`: Factory return type with auth + options
- `AuthConfigProvider`: Interface for async config providers
- `AuthModuleAsyncOptions`: Options for forRootAsync()

**Fastify Extension (types/fastify.d.ts):**
Extends Fastify Request with session and user properties.

### Module Definition Pattern

**auth.module-definition.ts:**
- Uses NestJS `ConfigurableModuleBuilder` for type-safe dynamic module creation
- Defines `ConfigurableModuleClass` base class that AuthNewModule extends
- Exports `ASYNC_OPTIONS_TYPE` and `OPTIONS_TYPE` for type inference
- Sets `isGlobal`, `disableExceptionFilter`, `disableTrustedOriginsCors` as extra options
- Custom method names: `forRoot` and `createAuthConfig` (factory method name)

**Pattern Benefits:**
- Reduced boilerplate (~180 lines saved vs manual implementation)
- Auto-generated async configuration handling (useFactory, useClass, useExisting)
- Better TypeScript type inference
- Consistent with NestJS best practices

### Build Configuration

**bunup.config.ts:**
- Entry: src/index.ts
- Output: ESM + CJS formats
- Features: exports validation, unused code elimination, minification
- Type declarations: Generated with splitting enabled

**Package Exports:**
- `import` → dist/index.mjs (ESM with .d.mts types)
- `require` → dist/index.js (CJS with .d.ts types)
- Named export: `AuthNewModule` (recommended)
- Namespace export: All other exports via `export *`

### Code Style (Biome)

**Key Settings:**
- Line width: 100
- Indent: 2 spaces (tabs in output)
- Quotes: single
- Semicolons: always
- Arrow parentheses: as needed
- Import organization: types first → @nestjs → packages → aliases → relative
- Unsafe parameter decorators: enabled (required for NestJS)

**Pre-commit Hook:** Runs `bun run lint` via simple-git-hooks

## Important Patterns

### Using AuthNewModule (Recommended)

For new projects, use `AuthNewModule` for better type safety:

```typescript
// Synchronous
AuthNewModule.forRoot({
  auth: betterAuth(config),
  disableExceptionFilter: false,
  disableTrustedOriginsCors: false,
  isGlobal: true
})

// Asynchronous
AuthNewModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (config: ConfigService) => ({
    auth: betterAuth(config.get('auth')),
    disableExceptionFilter: false,
    disableTrustedOriginsCors: false
  }),
  inject: [ConfigService]
})
```

### Adding New Hooks

When adding support for new hook types, ensure:
1. Better Auth options.hooks object is initialized (done in forRoot/forRootAsync)
2. Hook wrapper preserves existing hooks by storing references
3. Path matching handles both path-specific and global hooks
4. Error handling re-throws to let Better Auth handle it

### Performance Considerations

- CORS: Static origins preferred over dynamic for better performance
- Guards: @Public decorator enables early return before session API call
- Headers: Skip unnecessary headers (content-length, transfer-encoding, connection)
- Logging: Only log slow requests (>1000ms) to reduce noise
- Request conversion: Minimal overhead converting Fastify to Web API Request

### Testing Strategy

Tests should use Bun's built-in test runner. The codebase currently lacks test files, so when adding tests:
- Place in `src/**/*.test.ts` or `test/**/*.test.ts`
- Use Bun's native assertions and test functions
- Focus on module initialization, guard behavior, hook registration, CORS handling

### Working with Better Auth

The library acts as an adapter layer between NestJS/Fastify and Better Auth:
- Never directly modify Better Auth behavior
- Use hooks for customization (before/after)
- Expose Better Auth API through AuthService
- Convert between Fastify Request and Web API Request formats
- Let Better Auth handle authentication logic, just provide integration

### Extending Module Functionality

When extending AuthNewModule or AuthModule:
- Override `forRoot` to add custom initialization logic before/after base module setup
- Override `forRootAsync` to modify async provider registration
- Preserve hook initialization (`auth.options.hooks = { ...auth.options.hooks }`)
- Maintain exception filter conditional registration pattern
- Use `ConfigurableModuleClass.forRoot(config)` instead of `super.forRoot(config)` (Biome lint preference)
- Pattern: `return { ...ConfigurableModuleClass.forRoot(config), providers: [...] }`

### Migration from AuthModule to AuthNewModule

**API Changes:**
- Before: `AuthModule.forRoot(auth, { disableExceptionFilter: false })`
- After: `AuthNewModule.forRoot({ auth, disableExceptionFilter: false, isGlobal: true })`

**Async Changes:**
- Before: Return `{ auth, options: { disableExceptionFilter } }` from factory
- After: Return flat `{ auth, disableExceptionFilter, disableTrustedOriginsCors }` from factory

**Type Changes:**
- `AuthModuleConfig` now extends `AuthModuleFeatures` (has all options as required properties)
- Use `Partial<AuthModuleFeatures>` for optional configurations
