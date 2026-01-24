import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean, doublePrecision, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Conversations table for AI chat
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Messages table for AI chat
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Users table for app users
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  pin: text("pin").notNull(),
  birthYear: integer("birth_year"),
  gender: text("gender"),
  language: text("language").default("en"),
  interests: jsonb("interests").$type<string[]>().default([]),
  profilePhoto: text("profile_photo"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Golden Moments table
export const moments = pgTable("moments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  photoUri: text("photo_uri"),
  audioUri: text("audio_uri"),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Family Members table
export const familyMembers = pgTable("family_members", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  relationship: text("relationship").notNull(),
  photoUri: text("photo_uri"),
  birthDate: text("birth_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reminders table
export const reminders = pgTable("reminders", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'medicine', 'appointment', 'task'
  time: text("time").notNull(),
  recurring: boolean("recurring").default(false),
  days: jsonb("days").$type<string[]>().default([]),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Game Sessions table
export const gameSessions = pgTable("game_sessions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  gameType: text("game_type").notNull(), // 'memory-grid', 'word-chain', 'echo-chronicles', 'riddles'
  mode: text("mode").notNull(), // 'solo', 'multiplayer'
  status: text("status").notNull(), // 'waiting', 'active', 'completed'
  hostUserId: varchar("host_user_id").notNull().references(() => users.id),
  maxPlayers: integer("max_players").default(4),
  roomCode: text("room_code"),
  gameState: jsonb("game_state").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Game Scores table
export const gameScores = pgTable("game_scores", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sessionId: varchar("session_id").references(() => gameSessions.id),
  gameType: text("game_type").notNull(),
  score: integer("score").notNull(),
  level: integer("level").default(1),
  accuracy: doublePrecision("accuracy"),
  timeTaken: integer("time_taken"), // in seconds
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Game Players table (for multiplayer)
export const gamePlayers = pgTable("game_players", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => gameSessions.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  score: integer("score").default(0),
  isReady: boolean("is_ready").default(false),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Chat History table
export const chatHistory = pgTable("chat_history", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cognitive Reports table
export const cognitiveReports = pgTable("cognitive_reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  reportDate: timestamp("report_date").defaultNow(),
  overallScore: integer("overall_score"),
  memoryScore: integer("memory_score"),
  attentionScore: integer("attention_score"),
  languageScore: integer("language_score"),
  recommendations: jsonb("recommendations").$type<string[]>(),
  gameStats: jsonb("game_stats").$type<Record<string, any>>(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMomentSchema = createInsertSchema(moments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFamilyMemberSchema = createInsertSchema(familyMembers).omit({ id: true, createdAt: true });
export const insertReminderSchema = createInsertSchema(reminders).omit({ id: true, createdAt: true });
export const insertGameSessionSchema = createInsertSchema(gameSessions).omit({ id: true, createdAt: true });
export const insertGameScoreSchema = createInsertSchema(gameScores).omit({ id: true, createdAt: true });
export const insertGamePlayerSchema = createInsertSchema(gamePlayers).omit({ id: true, joinedAt: true });
export const insertChatHistorySchema = createInsertSchema(chatHistory).omit({ id: true, createdAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertMoment = z.infer<typeof insertMomentSchema>;
export type Moment = typeof moments.$inferSelect;
export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type GameSession = typeof gameSessions.$inferSelect;
export type InsertGameScore = z.infer<typeof insertGameScoreSchema>;
export type GameScore = typeof gameScores.$inferSelect;
export type InsertGamePlayer = z.infer<typeof insertGamePlayerSchema>;
export type GamePlayer = typeof gamePlayers.$inferSelect;
export type InsertChatHistory = z.infer<typeof insertChatHistorySchema>;
export type ChatHistory = typeof chatHistory.$inferSelect;
export type CognitiveReport = typeof cognitiveReports.$inferSelect;

// Leaderboard entry type
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  score: number;
  ageGroup: string;
  gamesPlayed: number;
}
