import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import { resolve } from 'node:path';
import type { Response } from 'express';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { AttachmentsService } from './attachments.service';

@UseGuards(SessionAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get(':id')
  async download(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const attachment = await this.attachmentsService.getById(id);

    if (attachment.mimeType.startsWith('image/')) {
      response.type(attachment.mimeType);
      return response.sendFile(resolve(attachment.storagePath));
    }

    return response.download(
      resolve(attachment.storagePath),
      attachment.originalName,
    );
  }
}
