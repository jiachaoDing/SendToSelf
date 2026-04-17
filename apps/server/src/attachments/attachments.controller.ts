import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { extname, isAbsolute, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { MAX_UPLOAD_SIZE_BYTES } from '../client/client-config.service';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { MessagesService } from '../messages/messages.service';
import { AttachmentsService } from './attachments.service';

function resolveUploadDir(uploadDir: string) {
  const absoluteDir = isAbsolute(uploadDir)
    ? uploadDir
    : resolve(process.cwd(), uploadDir);
  mkdirSync(absoluteDir, { recursive: true });
  return absoluteDir;
}

@UseGuards(SessionAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly messagesService: MessagesService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          callback(
            null,
            resolveUploadDir(process.env.UPLOAD_DIR ?? './uploads'),
          );
        },
        filename: (_request, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: MAX_UPLOAD_SIZE_BYTES,
      },
    }),
  )
  async upload(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const type = file.mimetype.startsWith('image/') ? 'image' : 'file';

    return this.messagesService.createAttachmentMessage({
      deviceId: request.auth.deviceId,
      type,
      originalName: file.originalname,
      mimeType: file.mimetype || 'application/octet-stream',
      size: file.size,
      storagePath: file.path,
    });
  }

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
