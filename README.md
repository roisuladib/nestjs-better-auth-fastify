# NestJS Better Auth Module for fastify adapter

<div align="center">

[![npm version](https://badge.fury.io/js/nestjs-better-auth-fastify.svg)](https://badge.fury.io/js/nestjs-better-auth-fastify)
[![npm downloads](https://img.shields.io/npm/dm/nestjs-better-auth-fastify.svg)](https://npmjs.org/package/nestjs-better-auth-fastify)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)

**High-performance authentication for NestJS Fastify applications using Better Auth**

[Getting Started](#getting-started) • [Configuration](#configuration) • [Usage Guide](#usage-guide) • [Performance](#performance) • [Examples](#examples)

</div>

> [!IMPORTANT]
> ⚡ **Fastify-Optimized** - This library is engineered specifically for NestJS applications using the Fastify adapter, leveraging Fastify's superior performance and modern architecture.
>
> 🔄 **Express Users** - If you're using Express, check out [@thallesp/nestjs-better-auth](https://github.com/ThallesP/nestjs-better-auth) for Express-optimized implementation.

## Why Choose This Library?

- 🚀 **Fastify Performance** - Built from ground up for Fastify's high-throughput architecture
- 🛡️ **Better Auth Integration** - Seamless integration with Better Auth's modern authentication system
- 🎯 **Type Safety** - Full TypeScript support with intelligent type inference
- 🔧 **Modular Design** - Flexible configuration options for any use case
- 🪝 **Extensible Hooks** - Custom authentication lifecycle management
- 📦 **Zero Config** - Works out of the box with sensible defaults
- 🌐 **Production Ready** - Built for scale with enterprise-grade error handling

## Features

- 🚀 **Easy Integration** - Simple setup with NestJS modules
- 🔒 **Authentication Guards** - Built-in guards for protected routes
- 🎯 **Decorators** - Convenient decorators for accessing user sessions
- ⚡ **Fastify Optimized** - Built specifically for NestJS Fastify adapter
- 🔧 **Flexible Configuration** - Synchronous and asynchronous setup
- 🪝 **Hooks Support** - Before/After hooks with dependency injection
- 🛡️ **Exception Handling** - Built-in error handling with custom filters
- 🌐 **CORS Support** - Automatic CORS configuration from Better Auth
- 📝 **TypeScript First** - Full TypeScript support with proper type inference

### Installation

```bash
# Core packages
npm install nestjs-better-auth-fastify better-auth

# Database driver (choose one)
npm install pg drizzle-orm              # PostgreSQL
npm install mysql2 drizzle-orm          # MySQL
npm install better-sqlite3 drizzle-orm  # SQLite
```

### System Requirements

- Node.js 18+
- NestJS 10+ with Fastify adapter
- TypeScript 4.5+
- Better Auth 1.3.7+

### Platform Dependencies

<details>
<summary>📦 Database Dependencies</summary>

**PostgreSQL Setup:**
```bash
npm install pg drizzle-orm
npm install -D drizzle-kit @types/pg
```

**MySQL Setup:**
```bash
npm install mysql2 drizzle-orm
npm install -D drizzle-kit @types/mysql2
```

**SQLite Setup:**
```bash
npm install better-sqlite3 drizzle-orm
npm install -D drizzle-kit @types/better-sqlite3
```

</details>

<details>
<summary>🎯 NestJS Dependencies</summary>

```bash
npm install @nestjs/common @nestjs/core @nestjs/platform-fastify fastify
```

**Minimum Versions:**
- `@nestjs/common`: >=11.1.6
- `@nestjs/core`: >=11.1.6
- `@nestjs/platform-fastify`: >=11.1.6
- `fastify`: >=5.5.0

</details>

## Quick Start

### Step 1: Database Configuration

Set up your database connection with optimized pool settings:

```typescript
// lib/db.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Connection pool size for high throughput
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, {
  schema,
  logger: true,
  casing: 'snake_case'
});
```

Define your authentication schema:

```typescript
// lib/schema.ts
import * as t from 'drizzle-orm/pg-core';

export const users = t.pgTable('users', {
  id: t.text().primaryKey(),
  name: t.text().notNull(),
  email: t.text().notNull().unique(),
  emailVerified: t
    .boolean()
    .$defaultFn(() => false)
    .notNull(),
  image: t.text(),
  createdAt: t
    .timestamp()
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: t
    .timestamp()
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const sessions = t.pgTable('sessions', {
  id: t.text().primaryKey(),
  expiresAt: t.timestamp().notNull(),
  token: t.text().notNull().unique(),
  createdAt: t.timestamp().notNull(),
  updatedAt: t.timestamp().notNull(),
  ipAddress: t.text(),
  userAgent: t.text(),
  userId: t
    .text()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = t.pgTable('accounts', {
  id: t.text().primaryKey(),
  accountId: t.text().notNull(),
  providerId: t.text().notNull(),
  userId: t
    .text()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: t.text(),
  refreshToken: t.text(),
  idToken: t.text(),
  accessTokenExpiresAt: t.timestamp(),
  refreshTokenExpiresAt: t.timestamp(),
  scope: t.text(),
  password: t.text(),
  createdAt: t.timestamp().notNull(),
  updatedAt: t.timestamp().notNull(),
});

export const verifications = t.pgTable('verifications', {
  id: t.text().primaryKey(),
  identifier: t.text().notNull(),
  value: t.text().notNull(),
  expiresAt: t.timestamp().notNull(),
  createdAt: t.timestamp().$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: t.timestamp().$defaultFn(() => /* @__PURE__ */ new Date()),
});
```

### Step 2: Authentication Setup

Create your Better Auth configuration optimized for Fastify:

```typescript
// auth.config.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './lib/db';

export const authInstance = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true, // Uses plural table names (users, sessions, etc.)
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session daily
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes cache
    }
  },
  trustedOrigins: [
    "http://localhost:3000",
    process.env.FRONTEND_URL,
  ].filter(Boolean),
});

export type AuthInstance = typeof authInstance;
```

### Step 3: NestJS Integration

Integrate with your NestJS Fastify application:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from 'nestjs-better-auth-fastify';
import { authInstance } from './auth.config';
import { AppController } from './app.controller';

@Module({
  imports: [
    AuthModule.forRoot(authInstance, {
      disableExceptionFilter: false,    // Enable exception filter (default)
      disableTrustedOriginsCors: false  // Enable trusted origins CORS (default)
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

### Step 4: Application Bootstrap

Configure your Fastify application for optimal performance:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      maxParamLength: 100,
      bodyLimit: 1048576, // 1MB
    })
  );

  // Enable trust proxy for production
  await app.register(import('@fastify/helmet'));

  await app.listen(3000, '0.0.0.0');
  console.log('🚀 Authentication server running on http://localhost:3000');
}
bootstrap();
```

## Usage Guide

### Authentication Guard

Protect your routes using the authentication guard with flexible configurations:

#### Method 1: Selective Route Protection

Apply authentication to specific controllers or endpoints:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'nestjs-better-auth-fastify';

@Controller('api/protected')
@UseGuards(AuthGuard)
export class ProtectedController {
  @Get('profile')
  getUserProfile() {
    return { message: 'This endpoint requires authentication' };
  }
}
```

#### Method 2: Application-Wide Protection

Secure all routes by default using global guard registration:

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule, AuthGuard } from 'nestjs-better-auth-fastify';
import { authInstance } from './auth.config';

@Module({
  imports: [AuthModule.forRoot(authInstance)],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
```

> [!TIP]
> Choose the approach that best fits your application's security model. Global protection with selective exemptions is often more secure.

### Access Control Decorators

Control authentication requirements with powerful decorators:

#### @Session() - Session Access

Extract authenticated user information in your route handlers:

```typescript
import { Controller, Get } from '@nestjs/common';
import { Session, UserSession } from 'nestjs-better-auth-fastify';

@Controller('api/user')
export class UserController {
  @Get('profile')
  async getCurrentProfile(@Session() userSession: UserSession) {
    return {
      id: userSession.user.id,
      email: userSession.user.email,
      metadata: userSession.session,
    };
  }
}
```

#### @Public() - Public Access

Mark specific routes as publicly accessible:

```typescript
import { Controller, Get, Post } from '@nestjs/common';
import { Public, Session, UserSession } from 'nestjs-better-auth-fastify';

@Controller('api/content')
export class ContentController {
  @Get('public')
  @Public()
  getPublicContent() {
    return { message: 'Available to everyone' };
  }

  @Get('mixed')
  @Public()
  getMixedContent(@Session() user?: UserSession) {
    return {
      message: 'Content for everyone',
      personalized: user ? `Welcome back, ${user.user.name}` : null,
    };
  }
}
```

#### @Optional() - Flexible Authentication

Enable optional authentication for enhanced user experience:

```typescript
import { Controller, Get } from '@nestjs/common';
import { Optional, Session, UserSession } from 'nestjs-better-auth-fastify';

@Controller('api/recommendations')
@Optional()
export class RecommendationsController {
  @Get()
  getRecommendations(@Session() user?: UserSession) {
    if (user) {
      return this.getPersonalizedRecommendations(user.user.id);
    }
    return this.getGeneralRecommendations();
  }

  private getPersonalizedRecommendations(userId: string) {
    // Personalized logic
  }

  private getGeneralRecommendations() {
    // General logic
  }
}
```

### Lifecycle Hooks

Implement custom authentication lifecycle management with dependency injection:

```typescript
// auth/lifecycle.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  Hook,
  BeforeHook,
  AfterHook,
  AuthHookContext
} from 'nestjs-better-auth-fastify';
import { UserService } from '../user/user.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Hook()
@Injectable()
export class AuthenticationLifecycle {
  private readonly logger = new Logger(AuthenticationLifecycle.name);

  constructor(
    private readonly userService: UserService,
    private readonly analytics: AnalyticsService,
  ) {}

  @BeforeHook('/sign-up/email')
  async validateSignUp(context: AuthHookContext) {
    const { email } = context.body;

    // Custom validation logic
    if (await this.userService.isEmailBlacklisted(email)) {
      throw new Error('Email domain not allowed');
    }

    this.logger.log(`Sign-up validation passed for: ${email}`);
  }

  @AfterHook('/sign-in/email')
  async trackSignIn(context: AuthHookContext) {
    const userId = context.user?.id;
    if (userId) {
      await this.analytics.trackEvent('user_signed_in', { userId });
      await this.userService.updateLastLogin(userId);
    }
  }

  @BeforeHook('/sign-out')
  async beforeSignOut(context: AuthHookContext) {
    // Cleanup user sessions, invalidate tokens, etc.
    this.logger.log('User signing out, performing cleanup');
  }
}
```

Register lifecycle hooks in your module:

```typescript
// app.module.ts
@Module({
  imports: [AuthModule.forRoot(authInstance)],
  providers: [
    AuthenticationLifecycle,
    UserService,
    AnalyticsService,
  ],
})
export class AppModule {}
```

### Authentication Service

Access Better Auth functionality through the injected service:

```typescript
// user/user-management.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthService } from 'nestjs-better-auth-fastify';
import type { FastifyRequest } from 'fastify';
import type { AuthInstance } from '../auth.config';

@Controller('api/user-management')
@UseGuards(AuthGuard)
export class UserManagementController {
  constructor(
    private readonly authService: AuthService<AuthInstance>
  ) {}

  @Get('session')
  async getSession(@Request() req: FastifyRequest) {
    // Access Better Auth API with type safety
    const session = await this.authService.api.getSession({
      headers: req.headers,
    });

    return { session };
  }

  @Post('sign-out')
  async signOut(@Request() req: FastifyRequest) {
    return this.authService.api.signOut({
      headers: req.headers,
    });
  }

  @Get('auth-info')
  async getAuthInfo() {
    // Access the complete auth instance for advanced use cases
    const authInstance = this.authService.instance;

    return {
      providers: authInstance.options.socialProviders ? Object.keys(authInstance.options.socialProviders) : [],
      sessionOptions: authInstance.options.session,
    };
  }
}
```

### Request Context Access

Access authentication data through Fastify request context:

```typescript
import { Controller, Get, Request } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

@Controller('api/context')
export class ContextController {
  @Get('session-info')
  async getSessionInfo(@Request() req: FastifyRequest) {
    return {
      // Full session object with user data and metadata
      session: req.session,
      // Direct user reference for quick access
      user: req.user,
      // Request metadata
      requestId: req.id,
      userAgent: req.headers['user-agent'],
    };
  }
}
```

**Available Request Properties:**
- `req.session` - Complete session object with authentication state
- `req.user` - Direct reference to authenticated user object
- Standard Fastify request properties for enhanced observability

## Performance

### Fastify Advantages

This library leverages Fastify's performance benefits for authentication:

| Feature | Benefit | Impact |
|---------|---------|--------|
| **Async/Await Native** | Better Auth operations use modern async patterns | 20-30% faster request processing |
| **Schema Validation** | Built-in request/response validation | Reduced validation overhead |
| **Connection Pooling** | Optimized database connections | Higher concurrent user support |
| **Memory Efficiency** | Lower memory footprint than Express | Better resource utilization |

### Performance Tips

1. **Connection Pool Optimization**:
```typescript
const pool = new Pool({
  max: 20, // Adjust based on your load
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

2. **Session Caching**:
```typescript
session: {
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60, // Cache for 5 minutes
  }
}
```

3. **Production Settings**:
```typescript
// main.ts
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({
    logger: false, // Disable in production
    disableRequestLogging: true,
  })
);
```

## Configuration

### Asynchronous Setup with `forRootAsync()`

Configure authentication dynamically using environment variables and async configuration:

```typescript
// config/auth.config.ts
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from 'nestjs-better-auth-fastify';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { setupDatabase } from './database.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        // Dynamic database setup
        const db = await setupDatabase(config);

        const authInstance = betterAuth({
          database: drizzleAdapter(db, {
            provider: config.get('DB_PROVIDER'),
            usePlural: true,
          }),
          secret: config.getOrThrow('AUTH_SECRET'),
          baseURL: config.get('BASE_URL', 'http://localhost:3000'),
          trustedOrigins: config.get('TRUSTED_ORIGINS', '').split(','),
          emailAndPassword: {
            enabled: config.get('AUTH_EMAIL_PASSWORD', 'true') === 'true',
            requireEmailVerification: config.get('AUTH_REQUIRE_EMAIL_VERIFICATION', 'false') === 'true',
          },
          session: {
            expiresIn: parseInt(config.get('AUTH_SESSION_EXPIRES', '604800')), // 7 days
            updateAge: parseInt(config.get('AUTH_SESSION_UPDATE_AGE', '86400')), // 1 day
          },
        });

        return {
          auth: authInstance,
          options: {
            disableExceptionFilter: config.get('NODE_ENV') === 'test',  // Disable in test environment
            disableTrustedOriginsCors: config.get('AUTH_DISABLE_CORS', 'false') === 'true',
          }
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AuthConfigModule {}
```

### Synchronous Setup with `forRoot()`

For static configuration without async dependencies:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from 'nestjs-better-auth-fastify';
import { authInstance } from './auth.config';

@Module({
  imports: [
    AuthModule.forRoot(authInstance, {
      disableExceptionFilter: false,    // Enable exception filter (default)
      disableTrustedOriginsCors: false  // Enable trusted origins CORS (default)
    }),
  ],
})
export class AppModule {}
```

### Module Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `disableExceptionFilter` | `boolean` | `false` | Disable the built-in exception filter for authentication errors |
| `disableTrustedOriginsCors` | `boolean` | `false` | Disable automatic CORS handling for trusted origins |

## API Reference

### Core Components

#### Decorators

**Authentication Decorators:**
| Decorator | Purpose | Example |
|-----------|---------|---------|
| `@Session()` | Extract authenticated user from request | `getProfile(@Session() user: UserSession)` |
| `@Public()` | Mark routes as publicly accessible | `@Get() @Public() getPublic()` |
| `@Optional()` | Enable optional authentication | `@Optional() class MixedController` |
| `@Hook()` | Mark class as authentication lifecycle handler | `@Hook() class AuthHooks` |
| `@BeforeHook(path)` | Register pre-authentication handler | `@BeforeHook('/sign-in') validate()` |
| `@AfterHook(path)` | Register post-authentication handler | `@AfterHook('/sign-up') notify()` |

#### Guards

**Authentication Guards:**
- **`AuthGuard`** - Primary authentication protection for Better Auth sessions
- **`@Public()`** - Skip authentication for public routes
- **`@Optional()`** - Allow optional authentication

#### Filters

**Exception Filters:**
- **`AuthFilter`** - Handles Better Auth API errors and converts them to proper HTTP responses

```typescript
import { APP_FILTER } from '@nestjs/core';
import { AuthFilter } from 'nestjs-better-auth-fastify';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: AuthFilter,
    },
  ],
})
export class AppModule {}
```


#### Types

**Authentication Types:**
```typescript
// User session with authentication context
interface UserSession {
  session: Session;
  user: User;
}

// Hook context for authentication lifecycle
interface AuthHookContext {
  body: any;
  headers: Headers;
  user?: User;
  request: FastifyRequest;
}

// Module configuration options
interface AuthModuleOptions {
  disableExceptionFilter?: boolean;
  disableTrustedOriginsCors?: boolean;
}
```

#### Constants

**Injection Tokens:**
```typescript
// For advanced users who need direct access to injection tokens
export const AUTH_INSTANCE_KEY: unique symbol;
export const AUTH_MODULE_OPTIONS_KEY: unique symbol;
export const BEFORE_HOOK_KEY: unique symbol;
export const AFTER_HOOK_KEY: unique symbol;
export const HOOK_KEY: unique symbol;
```

## License

MIT License

Copyright (c) 2025 roisuladib

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

<div align="center">

**[⬆ Back to Top](#nestjs-better-auth-fastify)**

Built with ❤️ for the **Fastify + NestJS** community

[![Built with NestJS](https://img.shields.io/badge/Built%20with-NestJS-red?logo=nestjs)](https://nestjs.com/)
[![Powered by Fastify](https://img.shields.io/badge/Powered%20by-Fastify-black?logo=fastify)](https://www.fastify.io/)
[![Better Auth](https://img.shields.io/badge/Auth-Better%20Auth-blue)](https://www.better-auth.com/)

</div>
