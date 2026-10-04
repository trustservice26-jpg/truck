import { relations } from 'drizzle-orm';
import { integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users / Driver & Admin Profiles
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  vehicleNumber: text('vehicle_number').notNull().unique(),
  name: text('name').notNull(),
  phone: text('phone').notNull().default(''),
  role: text('role').notNull().default('user'), // 'user' | 'admin'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Daily Financial Records
export const dailyRecords = pgTable('daily_records', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  vehicleNumber: text('vehicle_number').notNull().default(''),
  recordDate: text('record_date').notNull(), // YYYY-MM-DD
  income: numeric('income', { precision: 14, scale: 2 }).notNull().default('0'),
  incomeDetails: text('income_details').notNull().default(''),
  cost: numeric('cost', { precision: 14, scale: 2 }).notNull().default('0'),
  other: numeric('other', { precision: 14, scale: 2 }).notNull().default('0'),
  otherDetails: text('other_details').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Security Login History
export const loginHistory = pgTable('login_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  loggedInAt: timestamp('logged_in_at', { withTimezone: true }).defaultNow(),
});

// Drizzle relations
export const usersRelations = relations(users, ({ many }) => ({
  dailyRecords: many(dailyRecords),
  loginHistory: many(loginHistory),
}));

export const dailyRecordsRelations = relations(dailyRecords, ({ one }) => ({
  driver: one(users, {
    fields: [dailyRecords.userId],
    references: [users.id],
  }),
}));

export const loginHistoryRelations = relations(loginHistory, ({ one }) => ({
  user: one(users, {
    fields: [loginHistory.userId],
    references: [users.id],
  }),
}));
