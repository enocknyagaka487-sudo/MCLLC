import { pgTable, serial, text, timestamp, integer, boolean, doublePrecision } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table keyed by Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Trading Accounts persisted state
export const tradingAccounts = pgTable('trading_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  balance: doublePrecision('balance').default(10000.0).notNull(),
  equity: doublePrecision('equity').default(10000.0).notNull(),
  targetProfitPercent: doublePrecision('target_profit_percent').default(0.10).notNull(),
  liquidationsCount: integer('liquidations_count').default(0).notNull(),
  riskLiquidationsCount: integer('risk_liquidations_count').default(0).notNull(),
  totalRealizedProfit: doublePrecision('total_realized_profit').default(0.0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Trade execution logs and history
export const tradeLogs = pgTable('trade_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  symbol: text('symbol').notNull(),
  orderType: text('order_type').notNull(), // BUY | SELL
  volume: doublePrecision('volume').default(0.05).notNull(),
  subTradesCount: integer('sub_trades_count').default(4).notNull(),
  openPrice: doublePrecision('open_price').notNull(),
  closePrice: doublePrecision('close_price'),
  profitUsd: doublePrecision('profit_usd').default(0.0).notNull(),
  magicNumber: integer('magic_number').default(998877).notNull(),
  reason: text('reason'),
  batchId: text('batch_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Bot configuration settings
export const botSettings = pgTable('bot_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull()
    .unique(),
  pollIntervalSec: integer('poll_interval_sec').default(30).notNull(),
  defaultLotSize: doublePrecision('default_lot_size').default(0.05).notNull(),
  maxSubTrades: integer('max_sub_trades').default(4).notNull(),
  targetProfitPercent: doublePrecision('target_profit_percent').default(0.10).notNull(),
  magicNumber: integer('magic_number').default(998877).notNull(),
  autoExecute: boolean('auto_execute').default(true).notNull(),
  soundAlerts: boolean('sound_alerts').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Gemini Multi-turn Chat messages
export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  role: text('role').notNull(), // 'user' | 'model'
  content: text('content').notNull(),
  modelUsed: text('model_used').notNull(), // 'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-argon'
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  account: one(tradingAccounts, {
    fields: [users.id],
    references: [tradingAccounts.userId],
  }),
  settings: one(botSettings, {
    fields: [users.id],
    references: [botSettings.userId],
  }),
  trades: many(tradeLogs),
  messages: many(chatMessages),
}));

export const tradeLogsRelations = relations(tradeLogs, ({ one }) => ({
  user: one(users, {
    fields: [tradeLogs.userId],
    references: [users.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));
