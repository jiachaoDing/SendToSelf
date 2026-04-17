import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const appConfig = pgTable('app_config', {
  id: serial('id').primaryKey(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
