# NestJS Better Auth Module for fastify adapter

<div align="center">

[![npm version](https://badge.fury.io/js/nestjs-better-auth-fastify.svg)](https://badge.fury.io/js/nestjs-better-auth-fastify)
[![npm downloads](https://img.shields.io/npm/dm/nestjs-better-auth-fastify.svg)](https://npmjs.org/package/nestjs-better-auth-fastify)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)

**High-performance authentication for NestJS Fastify applications using Better Auth**

📦 [Installation](#installation) • 🚀 [Quick Start](#quick-start) • ⚙️ [Configuration](#configuration) • 📖 [Usage Guide](#usage-guide) • 🎯 [Common Use Cases](#common-use-cases) • 🔧 [Advanced Setup](#advanced-setup) • 📚 [API Reference](#api-reference)

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

- 🚀 **Zero Configuration** - Works out of the box with sensible defaults
- ⚡ **Performance Optimized** - Early exits for public routes, minimal overhead
- 🔒 **Smart Guards** - Automatic global protection with `@Public()` and `@Optional()` support
- 🎯 **Type-Safe Decorators** - Full IntelliSense with `@Session()`, `@BeforeHook()`, `@AfterHook()`
- 🪝 **Enterprise Hooks** - Build onboarding flows, rate limiting, and security checks with DI
- 🛡️ **Automatic Error Handling** - Consistent error responses across all auth endpoints
- 🌐 **Smart CORS** - Auto-configured from Better Auth `trustedOrigins`
- 📊 **Observability Ready** - Request enrichment with `req.user` and `req.session`
- 🔧 **Flexible Setup** - Sync/async configuration with ConfigModule support
- 📝 **Full TypeScript** - Complete type safety from config to runtime

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

Get authentication running in 5 minutes! 🚀

### 1. Install Dependencies

```bash
npm install nestjs-better-auth-fastify better-auth drizzle-orm pg
```

### 2. Setup Database

```typescript
// lib/db.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);
```

### 3. Configure Authentication

```typescript
// auth.config.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './lib/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
});
```

### 4. Register Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from 'nestjs-better-auth-fastify';
import { auth } from './auth.config';

@Module({
  imports: [
    AuthModule.forRoot({ auth }),
  ],
})
export class AppModule {}
```

### 5. Protect Routes

```typescript
// app.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard, Session, UserSession } from 'nestjs-better-auth-fastify';

@Controller()
export class AppController {
  @Get('profile')
  @UseGuards(AuthGuard)
  getProfile(@Session() session: UserSession) {
    return { user: session.user };
  }
}
```

✅ **Done!** Your authentication is ready. See [Configuration](#configuration) for customization options or [Advanced Setup](#advanced-setup) for production-ready configuration.

## Configuration

### Module Options

Configure the AuthModule with these options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `auth` | `Auth` | *required* | Better Auth instance created with `betterAuth()` |
| `isGlobal` | `boolean` | `true` | Make the module globally available |
| `disableExceptionFilter` | `boolean` | `false` | Disable the built-in exception filter for authentication errors |
| `disableGlobalAuthGuard` | `boolean` | `false` | Disable the automatic global auth guard |
| `disableTrustedOriginsCors` | `boolean` | `false` | Disable automatic CORS handling for trusted origins |

### Static Configuration with `forRoot()`

For static configuration without async dependencies:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from 'nestjs-better-auth-fastify';
import { auth } from './auth.config';

@Module({
  imports: [
    AuthModule.forRoot({
      auth,
      isGlobal: true,                   // Make module global (default)
      disableExceptionFilter: false,    // Enable exception filter (default)
      disableGlobalAuthGuard: false,    // Enable global auth guard (default)
      disableTrustedOriginsCors: false, // Enable trusted origins CORS (default)
    }),
  ],
})
export class AppModule {}
```

### Async Configuration with `forRootAsync()`

For dynamic configuration using environment variables:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
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
        const db = await setupDatabase(config);

        return {
          auth: betterAuth({
            database: drizzleAdapter(db, {
              provider: config.get('DB_PROVIDER', 'pg'),
            }),
            secret: config.getOrThrow('AUTH_SECRET'),
            baseURL: config.get('BASE_URL', 'http://localhost:3000'),
            trustedOrigins: config.get('TRUSTED_ORIGINS', '').split(','),
            emailAndPassword: {
              enabled: true,
            },
            session: {
              expiresIn: parseInt(config.get('AUTH_SESSION_EXPIRES', '604800')),
            },
          }),
          disableExceptionFilter: config.get('NODE_ENV') === 'test',
          disableTrustedOriginsCors: config.get('AUTH_DISABLE_CORS') === 'true',
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Environment Variables

Recommended `.env` configuration:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/myapp
DB_PROVIDER=pg

# Authentication
AUTH_SECRET=your-secret-key-min-32-chars
BASE_URL=http://localhost:3000
TRUSTED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Features
AUTH_SESSION_EXPIRES=604800
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
  imports: [
    AuthModule.forRoot({
      auth: authInstance,
      disableGlobalAuthGuard: true, // Disable global guard to manually apply
    }),
  ],
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

#### @Session() - Extract User Data

Get type-safe access to authenticated user with full IntelliSense support:

```typescript
import { Controller, Get } from '@nestjs/common';
import { Session, UserSession } from 'nestjs-better-auth-fastify';

@Controller('api/user')
export class UserController {
  @Get('profile')
  async getCurrentProfile(@Session() session: UserSession) {
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      sessionExpiry: session.session.expiresAt
    };
  }

  // Destructuring for cleaner code
  @Get('feed')
  async getFeed(@Session() { user }: UserSession) {
    return this.feedService.getPersonalizedFeed(user.id);
  }
}
```

#### @Public() - Skip Authentication

Make routes publicly accessible with **zero performance overhead**:

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from 'nestjs-better-auth-fastify';

@Controller('api')
export class PublicController {
  @Public()
  @Get('health')
  getHealth() {
    return { status: 'ok', uptime: process.uptime() };
  }

  @Public()
  @Get('posts')
  getPosts() {
    return this.postsService.findAll();
  }
}
```

#### @Optional() - Adaptive User Experience

Build experiences that work for everyone - logged in or anonymous:

```typescript
import { Controller, Get } from '@nestjs/common';
import { Optional, Session, UserSession } from 'nestjs-better-auth-fastify';

@Controller('api')
@Optional()
export class AdaptiveController {
  // E-commerce personalization
  @Get('products')
  getProducts(@Session() session?: UserSession) {
    if (session?.user) {
      return this.getRecommendedProducts(session.user.id);
    }
    return this.getBestSellers();
  }

  // Smart dashboard
  @Get('dashboard')
  getDashboard(@Session() session?: UserSession) {
    return {
      welcome: session?.user
        ? `Welcome back, ${session.user.name}!`
        : 'Welcome! Sign in for personalized content.',
      data: session ? this.getUserData(session.user.id) : this.getPublicData()
    };
  }
}
```

### Lifecycle Hooks

Build enterprise-grade authentication flows with dependency injection:

```typescript
// auth/security-hooks.service.ts
import { Injectable } from '@nestjs/common';
import {
  Hook,
  BeforeHook,
  AfterHook,
  AuthHookContext
} from 'nestjs-better-auth-fastify';

@Hook()
@Injectable()
export class SecurityHooks {
  constructor(
    private readonly rateLimiter: RateLimiterService,
    private readonly blocklist: BlocklistService,
    private readonly emailService: EmailService,
    private readonly analytics: AnalyticsService,
    private readonly crm: CRMService
  ) {}

  // Prevent brute-force attacks
  @BeforeHook('/sign-in/email')
  async preventBruteForce(ctx: AuthHookContext) {
    const isAllowed = await this.rateLimiter.check(ctx.request.ip, {
      max: 5,
      window: '15m'
    });

    if (!isAllowed) {
      throw new Error('Too many sign-in attempts. Try again in 15 minutes.');
    }
  }

  // Block disposable emails
  @BeforeHook('/sign-up/email')
  async validateEmail(ctx: AuthHookContext) {
    const { email } = ctx.body;
    const domain = email.split('@')[1];

    if (await this.blocklist.isDisposable(domain)) {
      throw new Error('Disposable email addresses are not allowed');
    }
  }

  // Welcome new users with complete onboarding
  @AfterHook('/sign-up/email')
  async welcomeNewUser(ctx: AuthHookContext) {
    const user = ctx.user!;

    // Send welcome email
    await this.emailService.sendTemplate('welcome', {
      to: user.email,
      name: user.name,
      verificationLink: await this.generateVerificationLink(user.id)
    });

    // Track conversion
    await this.analytics.track('user_signed_up', {
      userId: user.id,
      source: ctx.request.headers.referer
    });

    // Sync to CRM
    await this.crm.createContact({
      email: user.email,
      name: user.name,
      signupDate: new Date()
    });
  }

  // Track user activity and send security alerts
  @AfterHook('/sign-in/email')
  async trackSignIn(ctx: AuthHookContext) {
    const user = ctx.user!;

    // Update last login
    await this.userService.updateLastLogin(user.id, {
      ip: ctx.request.ip,
      userAgent: ctx.request.headers['user-agent']
    });

    // Security notification for new device
    if (await this.isNewDevice(user.id, ctx.request)) {
      await this.emailService.sendSecurityAlert(user.email);
    }
  }
}
```

Register lifecycle hooks in your module:

```typescript
// app.module.ts
@Module({
  imports: [
    AuthModule.forRoot({
      auth: authInstance,
    }),
  ],
  providers: [
    SecurityHooks,
    RateLimiterService,
    BlocklistService,
    EmailService,
    AnalyticsService,
    CRMService
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

@Controller('api/user-management')
@UseGuards(AuthGuard)
export class UserManagementController {
  constructor(
    private readonly authService: AuthService
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

## Common Use Cases

Real-world patterns for production applications.

### E-Commerce with Personalization

Deliver personalized shopping experiences:

```typescript
import { Controller, Get } from '@nestjs/common';
import { Optional, Session, UserSession } from 'nestjs-better-auth-fastify';

@Controller('api')
@Optional()
export class ProductsController {
  @Get('products')
  getProducts(@Session() session?: UserSession) {
    if (session?.user) {
      // Personalized based on purchase history
      return this.getRecommendedProducts(session.user.id);
    }
    // Best sellers for anonymous users
    return this.getBestSellers();
  }

  @Get('cart')
  getCart(@Session() session?: UserSession) {
    return session?.user
      ? this.getUserCart(session.user.id)
      : this.getGuestCart();
  }
}
```

### Role-Based Access Control

Implement granular permissions:

```typescript
import { Controller, Get, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard, Session, UserSession } from 'nestjs-better-auth-fastify';

@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  @Get('dashboard')
  getDashboard(@Session() { user }: UserSession) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.getAdminDashboard();
  }

  @Get('users')
  getUsers(@Session() { user }: UserSession) {
    if (!['admin', 'moderator'].includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return this.userService.findAll();
  }
}
```

### Security & Rate Limiting

Prevent abuse with enterprise-grade protection:

```typescript
@Hook()
@Injectable()
export class SecurityHooks {
  constructor(private rateLimiter: RateLimiterService) {}

  @BeforeHook('/sign-in/email')
  async preventBruteForce(ctx: AuthHookContext) {
    const isAllowed = await this.rateLimiter.check(ctx.request.ip, {
      max: 5,
      window: '15m',
    });

    if (!isAllowed) {
      throw new Error('Too many sign-in attempts. Try again in 15 minutes.');
    }
  }

  @BeforeHook('/sign-up/email')
  async blockDisposableEmails(ctx: AuthHookContext) {
    const domain = ctx.body.email.split('@')[1];
    if (await this.blocklist.isDisposable(domain)) {
      throw new Error('Disposable email addresses not allowed');
    }
  }
}
```

## Advanced Setup

Production-ready configuration with optimizations.

### Database Schema

Complete Better Auth schema:

```typescript
import * as t from 'drizzle-orm/pg-core';

export const users = t.pgTable('users', {
  id: t.text().primaryKey(),
  email: t.text().notNull().unique(),
  name: t.text().notNull(),
  // ... other fields
});

export const sessions = t.pgTable('sessions', {
  id: t.text().primaryKey(),
  userId: t.text().notNull().references(() => users.id, { onDelete: 'cascade' }),
  // ... other fields
});
```

See [Better Auth Documentation](https://www.better-auth.com/docs/concepts/database) for complete schema.

### Performance Optimization

```typescript
// Optimized connection pool
const pool = new Pool({
  max: 20,                     // Adjust for your load
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Session caching
session: {
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60,            // 5 minutes
  }
}

// Production Fastify settings
new FastifyAdapter({
  logger: false,
  disableRequestLogging: true,
})
```

### Custom Plugins and Type Safety

**🎯 Default Behavior**: `AuthService` automatically includes **openAPI plugin methods** out of the box. No configuration needed!

For additional plugins (twoFactor, phoneNumber, admin, etc.), you must manually define types.

---

**Default Usage (openAPI included automatically):**
```typescript
@Injectable()
export class UserService {
  constructor(private authService: AuthService) {}

  async getOpenAPISpec() {
    // openAPI methods available by default
    return this.authService.api.generateOpenAPISchema();
  }
}
```

**Custom Plugins (Manual Type Definition):**

```typescript
// types/custom-auth.types.ts
import type { Auth } from 'better-auth';
import type {
  twoFactor,
  phoneNumber,
  admin,
  openAPI
} from 'better-auth/plugins';
import type { AdminOptions } from 'better-auth/plugins/admin';

// Define type matching ALL your installed plugins
export type CustomAuth = Auth & {
  api: Auth['api']
    & ReturnType<typeof openAPI>['endpoints']       // Keep openAPI for docs
    & ReturnType<typeof twoFactor>['endpoints']
    & ReturnType<typeof phoneNumber>['endpoints']
    & ReturnType<typeof admin<AdminOptions>>['endpoints'];
};
```

```typescript
// services/user.service.ts
import type { CustomAuth } from '../types/custom-auth.types';

@Injectable()
export class UserService {
  // Use custom type as generic
  constructor(private authService: AuthService<CustomAuth>) {}

  async sendOTP(phoneNumber: string) {
    // Type-safe access to ALL plugin methods
    return this.authService.api.sendPhoneNumberOTP({ phoneNumber });
  }

  async enableTwoFactor(userId: string) {
    // twoFactor plugin methods available
    return this.authService.api.generateTwoFactorSecret({ userId });
  }
}
```

**Important Notes:**
- ✅ **openAPI included by default** - AuthService automatically provides openAPI plugin methods
- ⚠️ **No automatic type inference** - You must manually define types for custom plugins
- 📝 **Include ALL plugins** - List every plugin you install (including openAPI for custom types)
- 🎯 **Use `Auth` as base** - Don't extend `AuthWithOpenAPI` for custom types
- 💡 **DI Limitation** - TypeScript cannot infer types from runtime Better Auth configuration

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
interface AuthModuleFeatures {
  disableExceptionFilter?: boolean;
  disableTrustedOriginsCors?: boolean;
}
```

#### Constants

**Injection Tokens:**
```typescript
// For advanced users who need direct access to injection tokens
export const AUTH_MODULE_OPTIONS: unique symbol;
```

## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

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
