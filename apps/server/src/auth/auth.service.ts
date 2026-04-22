import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { eq } from 'drizzle-orm';
import { compare, hash } from 'bcryptjs';
import { ClientConfigService } from '../client/client-config.service';
import { DATABASE } from '../database/database.module';
import type { Database } from '../database/database.module';
import { appConfig } from '../database/schema';
import { DevicesService } from '../devices/devices.service';
import { extractRequestAuth } from './auth-token.util';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly clientConfigService: ClientConfigService,
    private readonly devicesService: DevicesService,
    private readonly jwtService: JwtService,
  ) {}

  async isInitialized() {
    return (await this.getConfig()) !== undefined;
  }

  async assertInitialized() {
    if (!(await this.isInitialized())) {
      throw new ConflictException('Authentication setup is required');
    }
  }

  async assertNotInitialized() {
    if (await this.isInitialized()) {
      throw new ConflictException('Authentication is already initialized');
    }
  }

  async setup(password: string) {
    await this.assertNotInitialized();

    const passwordHash = await hash(password, 10);
    await this.db.insert(appConfig).values({
      id: 1,
      passwordHash,
      updatedAt: new Date(),
    });
  }

  async login(password: string, deviceName: string) {
    const config = await this.getConfig();

    if (!config) {
      throw new ConflictException('Authentication setup is required');
    }

    const valid = await compare(password, config.passwordHash);

    if (!valid) {
      throw new UnauthorizedException('Invalid password');
    }

    const device = await this.devicesService.register(deviceName.trim());
    const token = await this.jwtService.signAsync({
      deviceId: device.id,
      authVersion: device.authVersion,
    });

    return { token, device };
  }

  async validateToken(token: string) {
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        deviceId: number;
        authVersion: number;
      }>(token);
      const device = await this.devicesService.getById(payload.deviceId);

      if (!device || device.authVersion !== payload.authVersion) {
        throw new UnauthorizedException('Invalid session');
      }

      return {
        deviceId: device.id,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid session');
    }
  }

  async authenticateRequest(request: Request) {
    const { token, source } = extractRequestAuth(request);

    if (
      source === 'bearer' &&
      !this.clientConfigService.isRemoteClientEnabled()
    ) {
      throw new ForbiddenException('Remote clients are disabled');
    }

    return this.validateToken(token ?? '');
  }

  async revokeToken(token?: string) {
    if (!token) {
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        deviceId: number;
        authVersion: number;
      }>(token);
      const device = await this.devicesService.getById(payload.deviceId);

      if (!device || device.authVersion !== payload.authVersion) {
        return;
      }

      await this.devicesService.bumpAuthVersion(device.id);
    } catch {
      return;
    }
  }

  private getConfig() {
    return this.db.query.appConfig.findFirst({
      where: eq(appConfig.id, 1),
    });
  }
}
