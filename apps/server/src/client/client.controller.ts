import { Controller, Get, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE } from '../database/database.module';
import type { Database } from '../database/database.module';
import { appConfig } from '../database/schema';
import { ClientConfigService } from './client-config.service';

@Controller('client')
export class ClientController {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly clientConfigService: ClientConfigService,
  ) {}

  @Get('bootstrap')
  async getBootstrap() {
    const config = await this.db.query.appConfig.findFirst({
      where: eq(appConfig.id, 1),
    });

    return this.clientConfigService.getBootstrapPayload(!config);
  }
}
