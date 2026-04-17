import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DATABASE } from '../database/database.module';
import type { Database } from '../database/database.module';
import { attachments, messages, uploadSessions } from '../database/schema';
import { DevicesService } from '../devices/devices.service';
import { MessagesService } from '../messages/messages.service';

type CreateUploadSessionParams = {
  tusUploadId: string;
  deviceId: number;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
};

const PROCESSING_WAIT_INTERVAL_MS = 200;
const PROCESSING_WAIT_ATTEMPTS = 5;

function getAttachmentMessageType(mimeType: string) {
  return mimeType.startsWith('image/') ? 'image' : 'file';
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

@Injectable()
export class AttachmentsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly devicesService: DevicesService,
    private readonly messagesService: MessagesService,
  ) {}

  async getById(id: number) {
    const attachment = await this.db.query.attachments.findFirst({
      where: eq(attachments.id, id),
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    return attachment;
  }

  async createUploadSession(params: CreateUploadSessionParams) {
    await this.db
      .insert(uploadSessions)
      .values({
        tusUploadId: params.tusUploadId,
        deviceId: params.deviceId,
        originalName: params.originalName,
        mimeType: params.mimeType,
        size: params.size,
        storagePath: params.storagePath,
      })
      .onConflictDoNothing();

    return this.getUploadSession(params.tusUploadId);
  }

  async markUploadSessionTerminated(tusUploadId: string) {
    await this.db
      .update(uploadSessions)
      .set({ status: 'terminated' })
      .where(
        and(
          eq(uploadSessions.tusUploadId, tusUploadId),
          isNull(uploadSessions.messageId),
          isNull(uploadSessions.attachmentId),
        ),
      );
  }

  async finalizeUploadSession(tusUploadId: string) {
    const existing = await this.getUploadSession(tusUploadId);

    if (existing.status === 'completed' && existing.messageId !== null) {
      return this.messagesService.getMessageById(existing.messageId);
    }

    if (existing.status === 'terminated') {
      throw new BadRequestException('Upload has been terminated');
    }

    const [claimed] = await this.db
      .update(uploadSessions)
      .set({ status: 'processing' })
      .where(
        and(
          eq(uploadSessions.tusUploadId, tusUploadId),
          eq(uploadSessions.status, 'pending'),
          isNull(uploadSessions.messageId),
          isNull(uploadSessions.attachmentId),
        ),
      )
      .returning();

    if (!claimed) {
      const message = await this.waitForCompletedMessage(tusUploadId);

      if (message) {
        return message;
      }

      throw new ConflictException('Upload is already being finalized');
    }

    try {
      await this.devicesService.touch(claimed.deviceId);

      const messageId = await this.db.transaction(async (tx) => {
        const [message] = await tx
          .insert(messages)
          .values({
            type: getAttachmentMessageType(claimed.mimeType),
            deviceId: claimed.deviceId,
          })
          .returning();

        const [attachment] = await tx
          .insert(attachments)
          .values({
            messageId: message.id,
            originalName: claimed.originalName,
            mimeType: claimed.mimeType,
            size: claimed.size,
            storagePath: claimed.storagePath,
          })
          .returning();

        await tx
          .update(uploadSessions)
          .set({
            status: 'completed',
            messageId: message.id,
            attachmentId: attachment.id,
            completedAt: new Date(),
          })
          .where(eq(uploadSessions.tusUploadId, tusUploadId));

        return message.id;
      });

      return this.messagesService.getMessageById(messageId);
    } catch (error) {
      await this.db
        .update(uploadSessions)
        .set({ status: 'pending' })
        .where(
          and(
            eq(uploadSessions.tusUploadId, tusUploadId),
            eq(uploadSessions.status, 'processing'),
            isNull(uploadSessions.messageId),
            isNull(uploadSessions.attachmentId),
          ),
        );

      throw error;
    }
  }

  private async getUploadSession(tusUploadId: string) {
    const session = await this.db.query.uploadSessions.findFirst({
      where: eq(uploadSessions.tusUploadId, tusUploadId),
    });

    if (!session) {
      throw new NotFoundException('Upload session not found');
    }

    return session;
  }

  private async waitForCompletedMessage(tusUploadId: string) {
    for (let attempt = 0; attempt < PROCESSING_WAIT_ATTEMPTS; attempt += 1) {
      const session = await this.getUploadSession(tusUploadId);

      if (session.status === 'completed' && session.messageId !== null) {
        return this.messagesService.getMessageById(session.messageId);
      }

      if (session.status !== 'processing') {
        break;
      }

      await sleep(PROCESSING_WAIT_INTERVAL_MS);
    }

    return null;
  }
}
