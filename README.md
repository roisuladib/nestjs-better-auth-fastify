# nestjs-better-auth-fastify

A NestJS integration for Better Auth with Fastify adapter. This library provides seamless authentication integration for NestJS applications using Fastify as the HTTP adapter.

## Features

- 🚀 **Easy Integration** - Simple setup with NestJS modules
- 🔒 **Authentication Guards** - Built-in guards for protected routes
- 🎯 **Decorators** - Convenient decorators for accessing user sessions
- ⚡ **Fastify Support** - Optimized for NestJS Fastify adapter
- 🔧 **Flexible Configuration** - Support for custom auth configurations
- 🪝 **Hooks Support** - Before/After hooks for auth routes
- 🛡️ **Exception Handling** - Built-in error handling for auth errors

## Installation

```bash
npm install nestjs-better-auth-fastify
```

## Dependencies

This library requires the following peer dependencies:

```bash
npm install @nestjs/common @nestjs/core @nestjs/platform-fastify better-auth fastify
```

## Usage

### 1. Setup Better Auth

First, create your Better Auth configuration:

```typescript
// auth.config.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  emailAndPassword: {
    enabled: true
  },
  // other Better Auth options...
});
```

### 2. Import AuthModule

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from 'nestjs-better-auth-fastify';
import { auth } from './auth.config';

@Module({
  imports: [
    AuthModule.forRoot(auth, {
      // Optional configuration
      disableExceptionFilter: false,
      disableTrustedOriginsCors: false,
    }),
  ],
})
export class AppModule {}
```

### 3. Use Authentication in Controllers

```typescript
// app.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard, Session, Public, Optional } from 'nestjs-better-auth-fastify';

@Controller()
@UseGuards(AuthGuard)
export class AppController {

  @Get('public')
  @Public() // Skip authentication
  getPublicData() {
    return { message: 'This is public' };
  }

  @Get('optional')
  @Optional() // Authentication is optional
  getOptionalData(@Session() session: any) {
    return {
      message: 'This works with or without auth',
      user: session?.user || null
    };
  }

  @Get('protected')
  getProtectedData(@Session() session: any) {
    return {
      message: 'This requires authentication',
      user: session.user
    };
  }
}
```

### 4. Using Auth Hooks

```typescript
// auth-hooks.service.ts
import { Injectable } from '@nestjs/common';
import { Hook, BeforeHook, AfterHook, AuthHookContext } from 'nestjs-better-auth-fastify';

@Hook()
@Injectable()
export class AuthHooksService {

  @BeforeHook('/sign-in')
  async beforeSignIn(context: AuthHookContext) {
    console.log('Before sign in:', context.request.url);
    // Add custom logic before sign in
  }

  @AfterHook('/sign-in')
  async afterSignIn(context: AuthHookContext) {
    console.log('After sign in:', context.request.url);
    // Add custom logic after sign in
  }
}
```

### 5. Async Configuration

For dynamic configuration, use `forRootAsync`:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from 'nestjs-better-auth-fastify';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const auth = betterAuth({
          database: configService.get('DATABASE_URL'),
          // other config from environment
        });

        return {
          auth,
          options: {
            disableExceptionFilter: false,
          }
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## API Reference

### Decorators

- `@Public()` - Mark routes as public (skip authentication)
- `@Optional()` - Mark routes as having optional authentication
- `@Session()` - Inject user session into route handler
- `@Hook()` - Mark class as containing auth hooks
- `@BeforeHook(path)` - Register before hook for auth route
- `@AfterHook(path)` - Register after hook for auth route

### Guards

- `AuthGuard` - Main authentication guard

### Services

- `AuthService` - Access to Better Auth instance and API

### Types

- `UserSession` - Type for authenticated user session
- `AuthHookContext` - Context object for hooks

## Configuration Options

```typescript
interface AuthModuleOptions {
  disableExceptionFilter?: boolean;      // Disable built-in exception filter
  disableTrustedOriginsCors?: boolean;   // Disable CORS setup
  disableBodyParser?: boolean;           // Disable body parser setup
}
```

## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT
