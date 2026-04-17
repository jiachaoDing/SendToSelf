import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { devices } from './devices.schema';

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  type: text('type', { enum: ['text', 'link', 'image', 'file'] }).notNull(),
  textContent: text('text_content'),
  deviceId: integer('device_id')
    .notNull()
    .references(() => devices.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
