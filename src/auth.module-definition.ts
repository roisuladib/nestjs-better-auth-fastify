import type { ConfigurableModuleAsyncOptions, ConfigurableModuleCls } from '@nestjs/common';
import type { AuthModuleConfig, AuthModuleFeatures } from './types';

import { ConfigurableModuleBuilder } from '@nestjs/common';

import { AUTH_MODULE_OPTIONS } from './auth.symbols';

interface ExtraOptions extends AuthModuleFeatures {
	isGlobal: boolean;
}

const MODULE_DEFINITION = new ConfigurableModuleBuilder<AuthModuleConfig>({
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

export const ConfigurableModuleClass: ConfigurableModuleCls<
	AuthModuleConfig,
	'forRoot',
	'createAuthConfig',
	ExtraOptions
> = MODULE_DEFINITION.ConfigurableModuleClass;

export const ASYNC_OPTIONS_TYPE: ConfigurableModuleAsyncOptions<
	AuthModuleConfig,
	'createAuthConfig'
> &
	Partial<ExtraOptions> = MODULE_DEFINITION.ASYNC_OPTIONS_TYPE;

export const OPTIONS_TYPE: AuthModuleConfig & Partial<ExtraOptions> =
	MODULE_DEFINITION.OPTIONS_TYPE;
