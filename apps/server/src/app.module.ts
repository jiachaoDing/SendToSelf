import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ClientModule } from './client/client.module';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { DevicesModule } from './devices/devices.module';
import { MessagesModule } from './messages/messages.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    ClientModule,
    AuthModule,
    DevicesModule,
    MessagesModule,
    AttachmentsModule,
    SyncModule,
  ],
})
export class AppModule {}
