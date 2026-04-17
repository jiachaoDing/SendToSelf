import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const SERVER_VERSION = '0.0.1';
export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

function parseOrigins(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

@Injectable()
export class ClientConfigService {
  constructor(private readonly configService: ConfigService) {}

  getInstanceName() {
    return this.configService.getOrThrow<string>('INSTANCE_NAME');
  }

  getServerVersion() {
    return SERVER_VERSION;
  }

  isRemoteClientEnabled() {
    return this.configService.getOrThrow<boolean>('REMOTE_CLIENT_ENABLED');
  }

  getRemoteClientAllowedOrigins() {
    return parseOrigins(
      this.configService.getOrThrow<string>('REMOTE_CLIENT_ALLOWED_ORIGINS'),
    );
  }

  isOriginAllowed(origin?: string) {
    if (!origin) {
      return true;
    }

    if (!this.isRemoteClientEnabled()) {
      return false;
    }

    return this.getRemoteClientAllowedOrigins().includes(origin);
  }

  getBootstrapPayload() {
    const remoteClientEnabled = this.isRemoteClientEnabled();

    return {
      instance: {
        name: this.getInstanceName(),
        version: this.getServerVersion(),
      },
      remoteClient: {
        enabled: remoteClientEnabled,
      },
      auth: {
        loginPath: '/auth/login',
        tokenPath: '/auth/token',
        logoutPath: '/auth/logout',
        builtInWeb: 'cookie',
        remoteClient: remoteClientEnabled ? 'bearer' : 'disabled',
      },
      uploads: {
        maxBytes: MAX_UPLOAD_SIZE_BYTES,
      },
      attachments: {
        requiresAuth: true,
      },
    };
  }
}
