import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE } from '../database/database.module';
import type { Database } from '../database/database.module';
import { attachments } from '../database/schema';

@Injectable()
export class AttachmentsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async getById(id: number) {
    const attachment = await this.db.query.attachments.findFirst({
      where: eq(attachments.id, id),
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    return attachment;
  }
}
