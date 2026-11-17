import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const raporStates = pgTable('rapor_states', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  schoolKey: text('school_key').notNull().unique(),
  npsn: text('npsn').notNull(),
  namaSekolah: text('nama_sekolah').notNull(),
  tahunPelajaran: text('tahun_pelajaran').notNull(),
  payloadJson: text('payload_json').notNull(),
  updatedBy: text('updated_by').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const raporBackups = pgTable('rapor_backups', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  backupKey: text('backup_key').notNull().unique(),
  schoolName: text('school_name').notNull(),
  payloadJson: text('payload_json').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  raporStates: many(raporStates),
  raporBackups: many(raporBackups),
}));

export const raporStatesRelations = relations(raporStates, ({ one }) => ({
  owner: one(users, {
    fields: [raporStates.userId],
    references: [users.id],
  }),
}));

export const raporBackupsRelations = relations(raporBackups, ({ one }) => ({
  owner: one(users, {
    fields: [raporBackups.userId],
    references: [users.id],
  }),
}));
