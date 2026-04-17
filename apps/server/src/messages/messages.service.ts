import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gt, lt } from 'drizzle-orm';
import { DATABASE } from '../database/database.module';
import type { Database } from '../database/database.module';
import { attachments, devices, messages } from '../database/schema';
import { DevicesService } from '../devices/devices.service';

type MessageType = 'text' | 'link' | 'image' | 'file';

type ListTimelineOptions = {
  after?: number;
  before?: number;
  limit?: number;
};

@Injectable()
export class MessagesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly devicesService: DevicesService,
  ) {}

  async createTextMessage(deviceId: number, text: string) {
    await this.devicesService.touch(deviceId);
    return this.createMessage(deviceId, 'text', text.trim());
  }

  async createLinkMessage(deviceId: number, url: string) {
    await this.devicesService.touch(deviceId);
    return this.createMessage(deviceId, 'link', url.trim());
  }

  async createAttachmentMessage(params: {
    deviceId: number;
    type: 'image' | 'file';
    originalName: string;
    mimeType: string;
    size: number;
    storagePath: string;
  }) {
    await this.devicesService.touch(params.deviceId);

    const [message] = await this.db
      .insert(messages)
      .values({
        type: params.type,
        deviceId: params.deviceId,
      })
      .returning();

    await this.db.insert(attachments).values({
      messageId: message.id,
      originalName: params.originalName,
      mimeType: params.mimeType,
      size: params.size,
      storagePath: params.storagePath,
    });

    return this.getMessageById(message.id);
  }

  async listTimeline(options: ListTimelineOptions = {}) {
    const whereClause =
      options.after !== undefined && options.before !== undefined
        ? and(gt(messages.id, options.after), lt(messages.id, options.before))
        : options.after !== undefined
          ? gt(messages.id, options.after)
          : options.before !== undefined
            ? lt(messages.id, options.before)
            : undefined;

    const query = this.db
      .select({
        id: messages.id,
        type: messages.type,
        textContent: messages.textContent,
        createdAt: messages.createdAt,
        deviceId: devices.id,
        deviceName: devices.name,
        attachmentId: attachments.id,
        originalName: attachments.originalName,
        mimeType: attachments.mimeType,
        size: attachments.size,
      })
      .from(messages)
      .innerJoin(devices, eq(messages.deviceId, devices.id))
      .leftJoin(attachments, eq(attachments.messageId, messages.id))
      .where(whereClause)
      .orderBy(
        options.before !== undefined || options.after === undefined
          ? desc(messages.id)
          : asc(messages.id),
      );

    const rows = await (options.limit !== undefined
      ? query.limit(options.limit + 1)
      : query);

    const hasMore = options.limit !== undefined && rows.length > options.limit;
    const pageRows =
      options.limit !== undefined ? rows.slice(0, options.limit) : rows;
    const orderedRows =
      options.before !== undefined || options.after === undefined
        ? [...pageRows].reverse()
        : pageRows;

    return {
      items: orderedRows.map((row) => ({
        id: row.id,
        type: row.type,
        textContent: row.textContent,
        createdAt: row.createdAt,
        device: {
          id: row.deviceId,
          name: row.deviceName,
        },
        attachment: row.attachmentId
          ? {
              id: row.attachmentId,
              originalName: row.originalName,
              mimeType: row.mimeType,
              size: row.size,
              url: `/attachments/${row.attachmentId}`,
            }
          : null,
      })),
      hasMore,
    };
  }

  async getMessageById(messageId: number) {
    const { items } = await this.listTimeline({
      after: messageId - 1,
      limit: 1,
    });
    const [message] = items;
    return message;
  }

  private async createMessage(
    deviceId: number,
    type: MessageType,
    textContent: string,
  ) {
    const [message] = await this.db
      .insert(messages)
      .values({
        type,
        textContent,
        deviceId,
      })
      .returning();

    return this.getMessageById(message.id);
  }
}
