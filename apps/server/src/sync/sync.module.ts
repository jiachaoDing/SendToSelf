import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DevicesModule } from '../devices/devices.module';
import { MessagesModule } from '../messages/messages.module';
import { SyncController } from './sync.controller';

@Module({
  imports: [AuthModule, MessagesModule, DevicesModule],
  controllers: [SyncController],
})
export class SyncModule {}
