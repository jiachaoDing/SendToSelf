import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { ClientConfigService } from '../../client/client-config.service';
import { AuthService } from '../auth.service';
import { extractRequestAuth } from '../auth-token.util';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly clientConfigService: ClientConfigService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const { token, source } = extractRequestAuth(request);

    if (
      source === 'bearer' &&
      !this.clientConfigService.isRemoteClientEnabled()
    ) {
      throw new ForbiddenException('Remote clients are disabled');
    }

    const auth = await this.authService.validateToken(token ?? '');
    Object.assign(request, { auth });
    return true;
  }
}
