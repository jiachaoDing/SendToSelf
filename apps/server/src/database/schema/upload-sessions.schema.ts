import { bigint, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { attachments } from './attachments.schema';
import { devices } from './devices.schema';
import { messages } from './messages.schema';

export const uploadSessions = pgTable('upload_sessions', {
  tusUploadId: text('tus_upload_id').primaryKey(),
  deviceId: integer('device_id')
    .notNull()
    .references(() => devices.id, { onDelete: 'restrict' }),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),
  status: text('status', {
    enum: ['pending', 'processing', 'completed', 'terminated'],
  })
    .default('pending')
    .notNull(),
  storagePath: text('storage_path').notNull(),
  messageId: integer('message_id').references(() => messages.id, {
    onDelete: 'set null',
  }),
  attachmentId: integer('attachment_id').references(() => attachments.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});
