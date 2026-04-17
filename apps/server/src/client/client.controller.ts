import { Controller, Get } from '@nestjs/common';
import { ClientConfigService } from './client-config.service';

@Controller('client')
export class ClientController {
  constructor(private readonly clientConfigService: ClientConfigService) {}

  @Get('bootstrap')
  getBootstrap() {
    return this.clientConfigService.getBootstrapPayload();
  }
}
