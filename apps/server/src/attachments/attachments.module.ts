import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DevicesModule } from '../devices/devices.module';
import { MessagesModule } from '../messages/messages.module';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { AttachmentsTusService } from './attachments-tus.service';

@Module({
  imports: [AuthModule, DevicesModule, MessagesModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, AttachmentsTusService],
  exports: [AttachmentsService, AttachmentsTusService],
})
export class AttachmentsModule {}
