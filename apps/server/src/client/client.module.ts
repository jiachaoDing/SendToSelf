import { Module } from '@nestjs/common';
import { ClientController } from './client.controller';
import { ClientConfigService } from './client-config.service';

@Module({
  controllers: [ClientController],
  providers: [ClientConfigService],
  exports: [ClientConfigService],
})
export class ClientModule {}
