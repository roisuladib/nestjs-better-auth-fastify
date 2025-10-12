import type { AuthModuleConfig, AuthModuleFeatures } from './types';

import { ConfigurableModuleBuilder } from '@nestjs/common';

import { AUTH_MODULE_OPTIONS } from './auth.symbols';

interface ExtraOptions extends AuthModuleFeatures {
	isGlobal: boolean;
}

export const { ConfigurableModuleClass, OPTIONS_TYPE, ASYNC_OPTIONS_TYPE } =
	new ConfigurableModuleBuilder<AuthModuleConfig>({
		optionsInjectionToken: AUTH_MODULE_OPTIONS,
		moduleName: 'AuthModule',
	})
		.setExtras<ExtraOptions>(
			{
				isGlobal: true,
				disableExceptionFilter: false,
				disableGlobalAuthGuard: false,
				disableTrustedOriginsCors: false,
			},
			(definition, extras) => ({
				...definition,
				exports: [AUTH_MODULE_OPTIONS],
				global: extras.isGlobal,
			}),
		)
		.setClassMethodName('forRoot')
		.setFactoryMethodName('createAuthConfig')
		.build();
