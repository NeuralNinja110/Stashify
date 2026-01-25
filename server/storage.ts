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
  type LeaderboardEntry
} from "@shared/schema";
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

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private moments: Map<string, Moment> = new Map();
  private familyMembers: Map<string, FamilyMember> = new Map();
  private reminders: Map<string, Reminder> = new Map();
  private gameSessions: Map<string, GameSession> = new Map();
  private gameScores: Map<string, GameScore> = new Map();
  private gamePlayers: Map<string, GamePlayer> = new Map();
  private chatHistory: Map<string, ChatHistory> = new Map();
  private cognitiveReports: Map<string, CognitiveReport> = new Map();

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByPin(pin: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.pin === pin);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const newUser: User = { 
      ...user, 
      id, 
      interests: user.interests || [],
      language: user.language || 'en',
      createdAt: now, 
      updatedAt: now 
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  // Moments
  async getMoments(userId: string): Promise<Moment[]> {
    return Array.from(this.moments.values())
      .filter(m => m.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getMoment(id: string): Promise<Moment | undefined> {
    return this.moments.get(id);
  }

  async createMoment(moment: InsertMoment): Promise<Moment> {
    const id = randomUUID();
    const now = new Date();
    const newMoment: Moment = { 
      ...moment, 
      id, 
      tags: moment.tags || [],
      createdAt: now, 
      updatedAt: now 
    };
    this.moments.set(id, newMoment);
    return newMoment;
  }

  async updateMoment(id: string, updates: Partial<InsertMoment>): Promise<Moment | undefined> {
    const moment = this.moments.get(id);
    if (!moment) return undefined;
    const updated = { ...moment, ...updates, updatedAt: new Date() };
    this.moments.set(id, updated);
    return updated;
  }

  async deleteMoment(id: string): Promise<boolean> {
    return this.moments.delete(id);
  }

  // Family Members
  async getFamilyMembers(userId: string): Promise<FamilyMember[]> {
    return Array.from(this.familyMembers.values()).filter(m => m.userId === userId);
  }

  async getFamilyMember(id: string): Promise<FamilyMember | undefined> {
    return this.familyMembers.get(id);
  }

  async createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember> {
    const id = randomUUID();
    const newMember: FamilyMember = { ...member, id, createdAt: new Date() };
    this.familyMembers.set(id, newMember);
    return newMember;
  }

  async updateFamilyMember(id: string, updates: Partial<InsertFamilyMember>): Promise<FamilyMember | undefined> {
    const member = this.familyMembers.get(id);
    if (!member) return undefined;
    const updated = { ...member, ...updates };
    this.familyMembers.set(id, updated);
    return updated;
  }

  async deleteFamilyMember(id: string): Promise<boolean> {
    return this.familyMembers.delete(id);
  }

  // Reminders
  async getReminders(userId: string): Promise<Reminder[]> {
    return Array.from(this.reminders.values()).filter(r => r.userId === userId);
  }

  async getReminder(id: string): Promise<Reminder | undefined> {
    return this.reminders.get(id);
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const id = randomUUID();
    const newReminder: Reminder = { 
      ...reminder, 
      id, 
      days: reminder.days || [],
      recurring: reminder.recurring || false,
      enabled: reminder.enabled !== false,
      createdAt: new Date() 
    };
    this.reminders.set(id, newReminder);
    return newReminder;
  }

  async updateReminder(id: string, updates: Partial<InsertReminder>): Promise<Reminder | undefined> {
    const reminder = this.reminders.get(id);
    if (!reminder) return undefined;
    const updated = { ...reminder, ...updates };
    this.reminders.set(id, updated);
    return updated;
  }

  async deleteReminder(id: string): Promise<boolean> {
    return this.reminders.delete(id);
  }

  // Game Sessions
  async getGameSession(id: string): Promise<GameSession | undefined> {
    return this.gameSessions.get(id);
  }

  async getGameSessionByCode(code: string): Promise<GameSession | undefined> {
    return Array.from(this.gameSessions.values()).find(s => s.roomCode === code && s.status === 'waiting');
  }

  async getActiveGameSessions(gameType?: string): Promise<GameSession[]> {
    return Array.from(this.gameSessions.values())
      .filter(s => s.status === 'waiting' && (!gameType || s.gameType === gameType));
  }

  async createGameSession(session: InsertGameSession): Promise<GameSession> {
    const id = randomUUID();
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newSession: GameSession = { 
      ...session, 
      id, 
      roomCode,
      maxPlayers: session.maxPlayers || 4,
      createdAt: new Date(),
      completedAt: null
    };
    this.gameSessions.set(id, newSession);
    return newSession;
  }

  async updateGameSession(id: string, updates: Partial<InsertGameSession>): Promise<GameSession | undefined> {
    const session = this.gameSessions.get(id);
    if (!session) return undefined;
    const updated = { ...session, ...updates };
    this.gameSessions.set(id, updated);
    return updated;
  }

  // Game Scores
  async getGameScores(userId: string, gameType?: string): Promise<GameScore[]> {
    return Array.from(this.gameScores.values())
      .filter(s => s.userId === userId && (!gameType || s.gameType === gameType))
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getTopScores(gameType: string, limit = 10): Promise<GameScore[]> {
    return Array.from(this.gameScores.values())
      .filter(s => s.gameType === gameType)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async createGameScore(score: InsertGameScore): Promise<GameScore> {
    const id = randomUUID();
    const newScore: GameScore = { 
      ...score, 
      id, 
      level: score.level || 1,
      createdAt: new Date() 
    };
    this.gameScores.set(id, newScore);
    return newScore;
  }

  async getLeaderboard(gameType: string, ageGroup?: string): Promise<LeaderboardEntry[]> {
    const scores = Array.from(this.gameScores.values())
      .filter(s => s.gameType === gameType);
    
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
      
      // Use user name if found, otherwise use "Player" with a short ID
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
    const scores = Array.from(this.gameScores.values());
    
    const userScores = new Map<string, { totalScore: number; gamesPlayed: number; userName?: string }>();
    
    for (const score of scores) {
      const existing = userScores.get(score.userId) || { totalScore: 0, gamesPlayed: 0 };
      existing.totalScore += score.score;
      existing.gamesPlayed += 1;
      userScores.set(score.userId, existing);
    }

    const entries: LeaderboardEntry[] = [];
    for (const [userId, data] of userScores.entries()) {
      const user = await this.getUser(userId);
      
      // Use user name if found, otherwise use "Player" with a short ID
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
    return Array.from(this.gamePlayers.values()).filter(p => p.sessionId === sessionId);
  }

  async addGamePlayer(player: InsertGamePlayer): Promise<GamePlayer> {
    const id = randomUUID();
    const newPlayer: GamePlayer = { 
      ...player, 
      id, 
      score: player.score || 0,
      isReady: player.isReady || false,
      joinedAt: new Date() 
    };
    this.gamePlayers.set(id, newPlayer);
    return newPlayer;
  }

  async updateGamePlayer(id: string, updates: Partial<InsertGamePlayer>): Promise<GamePlayer | undefined> {
    const player = this.gamePlayers.get(id);
    if (!player) return undefined;
    const updated = { ...player, ...updates };
    this.gamePlayers.set(id, updated);
    return updated;
  }

  async removeGamePlayer(sessionId: string, userId: string): Promise<boolean> {
    for (const [id, player] of this.gamePlayers.entries()) {
      if (player.sessionId === sessionId && player.userId === userId) {
        return this.gamePlayers.delete(id);
      }
    }
    return false;
  }

  // Chat History
  async getChatHistory(userId: string, limit = 50): Promise<ChatHistory[]> {
    return Array.from(this.chatHistory.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0))
      .slice(-limit);
  }

  async addChatMessage(message: InsertChatHistory): Promise<ChatHistory> {
    const id = randomUUID();
    const newMessage: ChatHistory = { ...message, id, createdAt: new Date() };
    this.chatHistory.set(id, newMessage);
    return newMessage;
  }

  async clearChatHistory(userId: string): Promise<boolean> {
    for (const [id, msg] of this.chatHistory.entries()) {
      if (msg.userId === userId) {
        this.chatHistory.delete(id);
      }
    }
    return true;
  }

  // Cognitive Reports
  async getCognitiveReports(userId: string): Promise<CognitiveReport[]> {
    return Array.from(this.cognitiveReports.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => (b.reportDate?.getTime() || 0) - (a.reportDate?.getTime() || 0));
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

    const report: CognitiveReport = {
      id: randomUUID(),
      userId,
      reportDate: new Date(),
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
    };

    this.cognitiveReports.set(report.id, report);
    return report;
  }
}

export const storage = new MemStorage();
