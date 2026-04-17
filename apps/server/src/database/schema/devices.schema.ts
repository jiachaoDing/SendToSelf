import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const devices = pgTable('devices', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  authVersion: integer('auth_version').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
