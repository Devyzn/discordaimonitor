import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const monitoringSessions = pgTable("monitoring_sessions", {
  id: serial("id").primaryKey(),
  discordToken: text("discord_token").notNull(),
  channelId: text("channel_id").notNull(),
  groqApiKey: text("groq_api_key").notNull(),
  aiModel: text("ai_model").notNull().default("llama3-70b-8192"),
  aiPersonality: text("ai_personality").default("Helpful, friendly, and professional assistant that provides informative responses while maintaining a conversational tone."),
  filterLevel: text("filter_level").notNull().default("moderate"),
  customBlockedWords: text("custom_blocked_words").default(""),
  blockSpam: boolean("block_spam").notNull().default(true),
  blockLinks: boolean("block_links").notNull().default(true),
  responseDelay: integer("response_delay").notNull().default(3),
  maxResponseLength: integer("max_response_length").notNull().default(500),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const discordMessages = pgTable("discord_messages", {
  id: serial("id").primaryKey(),
  messageId: text("message_id").notNull().unique(),
  channelId: text("channel_id").notNull(),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  authorAvatar: text("author_avatar"),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  isAiResponse: boolean("is_ai_response").notNull().default(false),
  replyToMessageId: text("reply_to_message_id"),
  wasFiltered: boolean("was_filtered").notNull().default(false),
});

export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(), // INFO, WARN, ERROR
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  sessionId: integer("session_id").references(() => monitoringSessions.id),
});

export const insertMonitoringSessionSchema = createInsertSchema(monitoringSessions).omit({
  id: true,
  createdAt: true,
});

export const insertDiscordMessageSchema = createInsertSchema(discordMessages).omit({
  id: true,
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertMonitoringSession = z.infer<typeof insertMonitoringSessionSchema>;
export type MonitoringSession = typeof monitoringSessions.$inferSelect;
export type InsertDiscordMessage = z.infer<typeof insertDiscordMessageSchema>;
export type DiscordMessage = typeof discordMessages.$inferSelect;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type SystemLog = typeof systemLogs.$inferSelect;
