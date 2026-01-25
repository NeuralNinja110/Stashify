import { 
  type User, type InsertUser,
  type Moment, type InsertMoment,
  type FamilyMember, type InsertFamilyMember,
  type Reminder, type InsertReminder,
  type GameSession, type InsertGameSession,
  type GameScore, type InsertGameScore,
  type GamePlayer, type InsertGamePlayer,
  type ChatHistory, type InsertChatHistory,
  type CognitiveReport,
  type LeaderboardEntry,
  users, moments, familyMembers, reminders,
  gameSessions, gameScores, gamePlayers, chatHistory, cognitiveReports
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, asc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByPin(pin: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  // Moments
  getMoments(userId: string): Promise<Moment[]>;
  getMoment(id: string): Promise<Moment | undefined>;
  createMoment(moment: InsertMoment): Promise<Moment>;
  updateMoment(id: string, updates: Partial<InsertMoment>): Promise<Moment | undefined>;
  deleteMoment(id: string): Promise<boolean>;
  
  // Family Members
  getFamilyMembers(userId: string): Promise<FamilyMember[]>;
  getFamilyMember(id: string): Promise<FamilyMember | undefined>;
  createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember>;
  updateFamilyMember(id: string, updates: Partial<InsertFamilyMember>): Promise<FamilyMember | undefined>;
  deleteFamilyMember(id: string): Promise<boolean>;
  
  // Reminders
  getReminders(userId: string): Promise<Reminder[]>;
  getReminder(id: string): Promise<Reminder | undefined>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, updates: Partial<InsertReminder>): Promise<Reminder | undefined>;
  deleteReminder(id: string): Promise<boolean>;
  
  // Game Sessions
  getGameSession(id: string): Promise<GameSession | undefined>;
  getGameSessionByCode(code: string): Promise<GameSession | undefined>;
  getActiveGameSessions(gameType?: string): Promise<GameSession[]>;
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  updateGameSession(id: string, updates: Partial<InsertGameSession>): Promise<GameSession | undefined>;
  
  // Game Scores
  getGameScores(userId: string, gameType?: string): Promise<GameScore[]>;
  getTopScores(gameType: string, limit?: number): Promise<GameScore[]>;
  createGameScore(score: InsertGameScore): Promise<GameScore>;
  getLeaderboard(gameType: string, ageGroup?: string): Promise<LeaderboardEntry[]>;
  getOverallLeaderboard(limit?: number): Promise<LeaderboardEntry[]>;
  
  // Game Players
  getGamePlayers(sessionId: string): Promise<GamePlayer[]>;
  addGamePlayer(player: InsertGamePlayer): Promise<GamePlayer>;
  updateGamePlayer(id: string, updates: Partial<InsertGamePlayer>): Promise<GamePlayer | undefined>;
  removeGamePlayer(sessionId: string, userId: string): Promise<boolean>;
  
  // Chat History
  getChatHistory(userId: string, limit?: number): Promise<ChatHistory[]>;
  addChatMessage(message: InsertChatHistory): Promise<ChatHistory>;
  clearChatHistory(userId: string): Promise<boolean>;
  
  // Cognitive Reports
  getCognitiveReports(userId: string): Promise<CognitiveReport[]>;
  generateCognitiveReport(userId: string): Promise<CognitiveReport>;
}

// DatabaseStorage using Drizzle ORM with PostgreSQL
export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByPin(pin: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.pin, pin));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values({
      ...user,
      interests: user.interests || [],
      language: user.language || 'en',
    }).returning();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  // Moments
  async getMoments(userId: string): Promise<Moment[]> {
    return await db.select().from(moments)
      .where(eq(moments.userId, userId))
      .orderBy(desc(moments.createdAt));
  }

  async getMoment(id: string): Promise<Moment | undefined> {
    const [moment] = await db.select().from(moments).where(eq(moments.id, id));
    return moment || undefined;
  }

  async createMoment(moment: InsertMoment): Promise<Moment> {
    console.log('DatabaseStorage.createMoment called with:', {
      userId: moment.userId,
      title: moment.title,
      hasAudio: !!moment.audioUri,
      audioLength: moment.audioUri?.length || 0
    });
    const [newMoment] = await db.insert(moments).values({
      ...moment,
      tags: moment.tags || [],
    }).returning();
    console.log('Moment saved to database:', { id: newMoment.id, title: newMoment.title });
    return newMoment;
  }

  async updateMoment(id: string, updates: Partial<InsertMoment>): Promise<Moment | undefined> {
    const [updated] = await db.update(moments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(moments.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMoment(id: string): Promise<boolean> {
    const result = await db.delete(moments).where(eq(moments.id, id));
    return true;
  }

  // Family Members
  async getFamilyMembers(userId: string): Promise<FamilyMember[]> {
    return await db.select().from(familyMembers).where(eq(familyMembers.userId, userId));
  }

  async getFamilyMember(id: string): Promise<FamilyMember | undefined> {
    const [member] = await db.select().from(familyMembers).where(eq(familyMembers.id, id));
    return member || undefined;
  }

  async createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember> {
    const [newMember] = await db.insert(familyMembers).values(member).returning();
    return newMember;
  }

  async updateFamilyMember(id: string, updates: Partial<InsertFamilyMember>): Promise<FamilyMember | undefined> {
    const [updated] = await db.update(familyMembers)
      .set(updates)
      .where(eq(familyMembers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteFamilyMember(id: string): Promise<boolean> {
    await db.delete(familyMembers).where(eq(familyMembers.id, id));
    return true;
  }

  // Reminders
  async getReminders(userId: string): Promise<Reminder[]> {
    return await db.select().from(reminders).where(eq(reminders.userId, userId));
  }

  async getReminder(id: string): Promise<Reminder | undefined> {
    const [reminder] = await db.select().from(reminders).where(eq(reminders.id, id));
    return reminder || undefined;
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [newReminder] = await db.insert(reminders).values({
      ...reminder,
      days: reminder.days || [],
      recurring: reminder.recurring || false,
      enabled: reminder.enabled !== false,
    }).returning();
    return newReminder;
  }

  async updateReminder(id: string, updates: Partial<InsertReminder>): Promise<Reminder | undefined> {
    const [updated] = await db.update(reminders)
      .set(updates)
      .where(eq(reminders.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteReminder(id: string): Promise<boolean> {
    await db.delete(reminders).where(eq(reminders.id, id));
    return true;
  }

  // Game Sessions
  async getGameSession(id: string): Promise<GameSession | undefined> {
    const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, id));
    return session || undefined;
  }

  async getGameSessionByCode(code: string): Promise<GameSession | undefined> {
    const [session] = await db.select().from(gameSessions)
      .where(and(eq(gameSessions.roomCode, code), eq(gameSessions.status, 'waiting')));
    return session || undefined;
  }

  async getActiveGameSessions(gameType?: string): Promise<GameSession[]> {
    if (gameType) {
      return await db.select().from(gameSessions)
        .where(and(eq(gameSessions.status, 'waiting'), eq(gameSessions.gameType, gameType)));
    }
    return await db.select().from(gameSessions).where(eq(gameSessions.status, 'waiting'));
  }

  async createGameSession(session: InsertGameSession): Promise<GameSession> {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const [newSession] = await db.insert(gameSessions).values({
      ...session,
      roomCode,
      maxPlayers: session.maxPlayers || 4,
    }).returning();
    return newSession;
  }

  async updateGameSession(id: string, updates: Partial<InsertGameSession>): Promise<GameSession | undefined> {
    const [updated] = await db.update(gameSessions)
      .set(updates)
      .where(eq(gameSessions.id, id))
      .returning();
    return updated || undefined;
  }

  // Game Scores
  async getGameScores(userId: string, gameType?: string): Promise<GameScore[]> {
    if (gameType) {
      return await db.select().from(gameScores)
        .where(and(eq(gameScores.userId, userId), eq(gameScores.gameType, gameType)))
        .orderBy(desc(gameScores.createdAt));
    }
    return await db.select().from(gameScores)
      .where(eq(gameScores.userId, userId))
      .orderBy(desc(gameScores.createdAt));
  }

  async getTopScores(gameType: string, limit = 10): Promise<GameScore[]> {
    return await db.select().from(gameScores)
      .where(eq(gameScores.gameType, gameType))
      .orderBy(desc(gameScores.score))
      .limit(limit);
  }

  async createGameScore(score: InsertGameScore): Promise<GameScore> {
    const [newScore] = await db.insert(gameScores).values({
      ...score,
      level: score.level || 1,
    }).returning();
    return newScore;
  }

  async getLeaderboard(gameType: string, ageGroup?: string): Promise<LeaderboardEntry[]> {
    const scores = await db.select().from(gameScores).where(eq(gameScores.gameType, gameType));
    
    const userScores = new Map<string, { totalScore: number; gamesPlayed: number }>();
    
    for (const score of scores) {
      const existing = userScores.get(score.userId) || { totalScore: 0, gamesPlayed: 0 };
      existing.totalScore += score.score;
      existing.gamesPlayed += 1;
      userScores.set(score.userId, existing);
    }

    const entries: LeaderboardEntry[] = [];
    for (const [userId, data] of userScores.entries()) {
      const user = await this.getUser(userId);
      const userName = user?.name || `Player ${userId.slice(-4)}`;
      
      const currentYear = new Date().getFullYear();
      const age = user?.birthYear ? currentYear - user.birthYear : 65;
      let userAgeGroup = '60-69';
      if (age >= 70 && age < 80) userAgeGroup = '70-79';
      else if (age >= 80) userAgeGroup = '80+';
      else if (age < 60) userAgeGroup = '50-59';

      if (ageGroup && userAgeGroup !== ageGroup) continue;

      entries.push({
        rank: 0,
        userId,
        userName,
        score: data.totalScore,
        ageGroup: userAgeGroup,
        gamesPlayed: data.gamesPlayed,
      });
    }

    entries.sort((a, b) => b.score - a.score);
    entries.forEach((e, i) => e.rank = i + 1);

    return entries.slice(0, 50);
  }

  async getOverallLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
    const scores = await db.select().from(gameScores);
    
    const userScores = new Map<string, { totalScore: number; gamesPlayed: number }>();
    
    for (const score of scores) {
      const existing = userScores.get(score.userId) || { totalScore: 0, gamesPlayed: 0 };
      existing.totalScore += score.score;
      existing.gamesPlayed += 1;
      userScores.set(score.userId, existing);
    }

    const entries: LeaderboardEntry[] = [];
    for (const [userId, data] of userScores.entries()) {
      const user = await this.getUser(userId);
      const userName = user?.name || `Player ${userId.slice(-4)}`;
      
      const currentYear = new Date().getFullYear();
      const age = user?.birthYear ? currentYear - user.birthYear : 65;
      let userAgeGroup = '60-69';
      if (age >= 70 && age < 80) userAgeGroup = '70-79';
      else if (age >= 80) userAgeGroup = '80+';
      else if (age < 60) userAgeGroup = '50-59';

      entries.push({
        rank: 0,
        userId,
        userName,
        score: data.totalScore,
        ageGroup: userAgeGroup,
        gamesPlayed: data.gamesPlayed,
      });
    }

    entries.sort((a, b) => b.score - a.score);
    entries.forEach((e, i) => e.rank = i + 1);

    return entries.slice(0, limit);
  }

  // Game Players
  async getGamePlayers(sessionId: string): Promise<GamePlayer[]> {
    return await db.select().from(gamePlayers).where(eq(gamePlayers.sessionId, sessionId));
  }

  async addGamePlayer(player: InsertGamePlayer): Promise<GamePlayer> {
    const [newPlayer] = await db.insert(gamePlayers).values({
      ...player,
      score: player.score || 0,
      isReady: player.isReady || false,
    }).returning();
    return newPlayer;
  }

  async updateGamePlayer(id: string, updates: Partial<InsertGamePlayer>): Promise<GamePlayer | undefined> {
    const [updated] = await db.update(gamePlayers)
      .set(updates)
      .where(eq(gamePlayers.id, id))
      .returning();
    return updated || undefined;
  }

  async removeGamePlayer(sessionId: string, userId: string): Promise<boolean> {
    await db.delete(gamePlayers)
      .where(and(eq(gamePlayers.sessionId, sessionId), eq(gamePlayers.userId, userId)));
    return true;
  }

  // Chat History
  async getChatHistory(userId: string, limit = 50): Promise<ChatHistory[]> {
    return await db.select().from(chatHistory)
      .where(eq(chatHistory.userId, userId))
      .orderBy(asc(chatHistory.createdAt))
      .limit(limit);
  }

  async addChatMessage(message: InsertChatHistory): Promise<ChatHistory> {
    const [newMessage] = await db.insert(chatHistory).values(message).returning();
    return newMessage;
  }

  async clearChatHistory(userId: string): Promise<boolean> {
    await db.delete(chatHistory).where(eq(chatHistory.userId, userId));
    return true;
  }

  // Cognitive Reports
  async getCognitiveReports(userId: string): Promise<CognitiveReport[]> {
    return await db.select().from(cognitiveReports)
      .where(eq(cognitiveReports.userId, userId))
      .orderBy(desc(cognitiveReports.reportDate));
  }

  async generateCognitiveReport(userId: string): Promise<CognitiveReport> {
    const scores = await this.getGameScores(userId);
    
    const memoryScores = scores.filter(s => s.gameType === 'memory-grid');
    const languageScores = scores.filter(s => ['word-chain', 'riddles'].includes(s.gameType));
    const attentionScores = scores.filter(s => s.gameType === 'echo-chronicles');

    const avgScore = (arr: GameScore[]) => 
      arr.length ? Math.round(arr.reduce((sum, s) => sum + s.score, 0) / arr.length) : 0;

    const memoryScore = avgScore(memoryScores);
    const languageScore = avgScore(languageScores);
    const attentionScore = avgScore(attentionScores);
    const overallScore = Math.round((memoryScore + languageScore + attentionScore) / 3);

    const recommendations: string[] = [];
    if (memoryScore < 50) recommendations.push("Practice Memory Grid daily to improve spatial memory");
    if (languageScore < 50) recommendations.push("Play Word Chain and Riddles to boost language skills");
    if (attentionScore < 50) recommendations.push("Try Echo Chronicles for better attention span");

    const [report] = await db.insert(cognitiveReports).values({
      userId,
      overallScore,
      memoryScore,
      attentionScore,
      languageScore,
      recommendations,
      gameStats: {
        totalGamesPlayed: scores.length,
        memoryGames: memoryScores.length,
        languageGames: languageScores.length,
        attentionGames: attentionScores.length,
      },
    }).returning();

    return report;
  }
}

export const storage = new DatabaseStorage();
