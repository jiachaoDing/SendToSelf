import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ClientConfigService } from '../client/client-config.service';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { DevicesService } from '../devices/devices.service';
import { extractRequestToken } from './auth-token.util';
import { LoginDto } from './dto/login.dto';
import { SetupDto } from './dto/setup.dto';
import { SESSION_COOKIE_NAME } from './auth.constants';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { AuthService } from './auth.service';

function serializeDevice(device: { id: number; name: string }) {
  return {
    id: device.id,
    name: device.name,
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly clientConfigService: ClientConfigService,
    private readonly devicesService: DevicesService,
  ) {}

  @Post('setup')
  async setup(@Body() body: SetupDto) {
    await this.authService.setup(body.password);
    return { ok: true };
  }

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { token, device } = await this.authService.login(
      body.password,
      body.deviceName,
    );

    response.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    return {
      device: serializeDevice(device),
    };
  }

  @Post('token')
  async createToken(@Body() body: LoginDto) {
    if (!this.clientConfigService.isRemoteClientEnabled()) {
      throw new ForbiddenException('Remote clients are disabled');
    }

    const { token, device } = await this.authService.login(
      body.password,
      body.deviceName,
    );

    return {
      token,
      device: serializeDevice(device),
    };
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.revokeToken(extractRequestToken(request));
    response.clearCookie(SESSION_COOKIE_NAME);
    return { ok: true };
  }

  @UseGuards(SessionAuthGuard)
  @Get('session')
  async session(@Req() request: AuthenticatedRequest) {
    const device = await this.devicesService.getById(request.auth.deviceId);
    return {
      device: device ? serializeDevice(device) : null,
    };
  }
}
