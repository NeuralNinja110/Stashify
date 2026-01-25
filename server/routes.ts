import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import OpenAI, { toFile } from "openai";

// OpenAI client for speech-to-text (using Replit AI Integrations)
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// OpenRouter API helper - using nvidia/nemotron-3-nano-30b-a3b:free-0
async function callOpenRouter(messages: { role: string; content: string }[], systemPrompt?: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-3-nano-30b-a3b:free-0",
      messages: systemPrompt 
        ? [{ role: "system", content: systemPrompt }, ...messages]
        : messages,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "OpenRouter API error");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ===== USER ROUTES =====
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const user = await storage.createUser(req.body);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.post("/api/users/login", async (req: Request, res: Response) => {
    try {
      const { pin } = req.body;
      const user = await storage.getUserByPin(pin);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.patch("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const user = await storage.updateUser(req.params.id, req.body);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // ===== SPEECH-TO-TEXT ROUTE =====
  // Uses OpenAI Whisper via Replit AI Integrations
  app.post("/api/speech-to-text", async (req: Request, res: Response) => {
    try {
      const { audioBase64, language, mimeType } = req.body;
      
      if (!audioBase64) {
        return res.status(400).json({ error: "Audio data is required", transcription: "" });
      }

      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioBase64, "base64");
      
      // Determine file extension from mimeType
      let ext = "wav";
      if (mimeType?.includes("webm")) ext = "webm";
      else if (mimeType?.includes("mp3")) ext = "mp3";
      else if (mimeType?.includes("m4a") || mimeType?.includes("mp4")) ext = "m4a";
      
      // Create file for OpenAI
      const file = await toFile(audioBuffer, `audio.${ext}`);
      
      // Transcribe using OpenAI Whisper
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: "gpt-4o-mini-transcribe",
        language: language === "ta" ? "ta" : "en",
      });

      res.json({ transcription: transcription.text });
    } catch (error: any) {
      console.error("Speech-to-text error:", error);
      res.status(500).json({ 
        error: "Failed to transcribe audio", 
        transcription: "" 
      });
    }
  });

  // ===== AI COMPANION ROUTES =====
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { userId, message, userName, userGender, userLanguage, userInterests } = req.body;
      
      if (!userId || !message) {
        return res.status(400).json({ error: "userId and message are required" });
      }

      // Save user message
      await storage.addChatMessage({
        userId,
        role: "user",
        content: message,
      });

      // Get extended chat history for better context
      const history = await storage.getChatHistory(userId, 30);
      
      // Get user's game scores for context
      const gameScores = await storage.getGameScores(userId);
      const recentGames = gameScores.slice(0, 10);
      
      // Get family members for personalization
      const familyMembers = await storage.getFamilyMembers(userId);
      
      // Get moments/memories
      const moments = await storage.getMoments(userId);
      const recentMoments = moments.slice(0, 5);
      
      // Get reminders
      const reminders = await storage.getReminders(userId);
      
      const companionName = userGender === 'female' ? 'Thunaivi' : 'Thunaivan';
      const lang = userLanguage === 'ta' ? 'Tamil' : 'English';
      
      // Build context about user's data
      let userContext = "";
      
      if (recentGames.length > 0) {
        const gameStats = recentGames.map(g => `${g.gameType}: score ${g.score}`).join(', ');
        userContext += `\nGame History: ${userName} has played ${gameScores.length} games. Recent: ${gameStats}`;
      }
      
      if (familyMembers.length > 0) {
        const familyInfo = familyMembers.map(f => `${f.name} (${f.relationship})`).join(', ');
        userContext += `\nFamily: ${familyInfo}`;
      }
      
      if (recentMoments.length > 0) {
        const momentTitles = recentMoments.map(m => m.title).join(', ');
        userContext += `\nRecent Memories shared: ${momentTitles}`;
      }
      
      if (reminders.length > 0) {
        const activeReminders = reminders.filter(r => r.enabled).map(r => `${r.title} at ${r.time}`).join(', ');
        if (activeReminders) userContext += `\nActive Reminders: ${activeReminders}`;
      }
      
      const systemPrompt = `You are ${companionName}, a warm, caring AI companion for elderly users in India.
You speak ${lang}. You are talking directly to ${userName}.
${userContext}

CRITICAL RULES:
- ALWAYS speak in FIRST PERSON directly to ${userName}
- Say "I think..." or "I would suggest..." NOT "${companionName} thinks..."
- Address ${userName} directly: "You mentioned..." or "How are you feeling?"
- NEVER refer to yourself in third person
- NEVER narrate what you're doing (wrong: "${companionName} smiles warmly")
- Just talk naturally like a caring friend

Guidelines:
- Be warm, patient, and emotionally supportive
- Use simple language appropriate for elderly users
- When asked to play games or riddles, do it directly
- Keep responses conversational (2-4 sentences)
- Reference their interests: ${userInterests?.join(', ') || 'various topics'}`;

      const conversationHistory = history
        .map(h => `${h.role === 'user' ? userName : companionName}: ${h.content}`)
        .join('\n');

      const fullPrompt = `${systemPrompt}

Full Conversation History:
${conversationHistory}

${userName}: ${message}

Respond as ${companionName} (be dynamic, engaging, and context-aware):`;

      // Build messages for OpenRouter
      const messages = history.map(h => ({
        role: h.role as string,
        content: h.content,
      }));
      messages.push({ role: "user", content: message });

      let aiResponse = await callOpenRouter(messages, systemPrompt) || "I'm here with you. How can I help?";
      
      // Strip out thinking process tags from deepseek model
      aiResponse = aiResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      // Save AI response
      await storage.addChatMessage({
        userId,
        role: "assistant",
        content: aiResponse,
      });

      res.json({ 
        response: aiResponse,
        companionName,
      });
    } catch (error: any) {
      console.error("Chat error:", error);
      let errorMsg = "Failed to get response";
      if (error?.status === 503) {
        errorMsg = "The AI is busy right now. Please try again in a moment.";
      } else if (error?.status === 429) {
        errorMsg = "Too many requests. Please wait a moment and try again.";
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  app.get("/api/chat/:userId", async (req: Request, res: Response) => {
    try {
      const history = await storage.getChatHistory(req.params.userId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to get chat history" });
    }
  });

  app.delete("/api/chat/:userId", async (req: Request, res: Response) => {
    try {
      await storage.clearChatHistory(req.params.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear chat history" });
    }
  });

  // ===== MOMENTS ROUTES =====
  // Get all moments for a user
  app.get("/api/moments/user/:userId", async (req: Request, res: Response) => {
    try {
      console.log('GET /api/moments/user/:userId - userId:', req.params.userId);
      const moments = await storage.getMoments(req.params.userId);
      console.log('Found', moments.length, 'moments for user');
      res.json(moments);
    } catch (error) {
      console.error('Error getting moments:', error);
      res.status(500).json({ error: "Failed to get moments" });
    }
  });

  // Get a single moment by ID
  app.get("/api/moments/:id", async (req: Request, res: Response) => {
    try {
      console.log('GET /api/moments/:id - ID:', req.params.id);
      const moment = await storage.getMoment(req.params.id);
      if (!moment) {
        console.log('Moment not found for ID:', req.params.id);
        return res.status(404).json({ error: "Moment not found" });
      }
      console.log('Moment found:', { id: moment.id, title: moment.title, hasAudio: !!moment.audioUri });
      res.json(moment);
    } catch (error) {
      console.error('Error getting moment:', error);
      res.status(500).json({ error: "Failed to get moment" });
    }
  });

  app.post("/api/moments", async (req: Request, res: Response) => {
    try {
      console.log('POST /api/moments - Body:', {
        userId: req.body.userId,
        title: req.body.title,
        hasPhoto: !!req.body.photoUri,
        hasAudio: !!req.body.audioUri,
        audioUriLength: req.body.audioUri?.length || 0
      });
      const moment = await storage.createMoment(req.body);
      console.log('Moment created:', { id: moment.id, title: moment.title });
      res.json(moment);
    } catch (error) {
      console.error('Error creating moment:', error);
      res.status(500).json({ error: "Failed to create moment" });
    }
  });

  app.patch("/api/moments/:id", async (req: Request, res: Response) => {
    try {
      const moment = await storage.updateMoment(req.params.id, req.body);
      if (!moment) return res.status(404).json({ error: "Moment not found" });
      res.json(moment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update moment" });
    }
  });

  app.delete("/api/moments/:id", async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteMoment(req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete moment" });
    }
  });

  // ===== FAMILY MEMBERS ROUTES =====
  app.get("/api/family/:userId", async (req: Request, res: Response) => {
    try {
      const members = await storage.getFamilyMembers(req.params.userId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to get family members" });
    }
  });

  app.post("/api/family", async (req: Request, res: Response) => {
    try {
      const member = await storage.createFamilyMember(req.body);
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to create family member" });
    }
  });

  app.patch("/api/family/:id", async (req: Request, res: Response) => {
    try {
      const member = await storage.updateFamilyMember(req.params.id, req.body);
      if (!member) return res.status(404).json({ error: "Family member not found" });
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to update family member" });
    }
  });

  app.delete("/api/family/:id", async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteFamilyMember(req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete family member" });
    }
  });

  // ===== REMINDERS ROUTES =====
  app.get("/api/reminders/:userId", async (req: Request, res: Response) => {
    try {
      const reminders = await storage.getReminders(req.params.userId);
      res.json(reminders);
    } catch (error) {
      res.status(500).json({ error: "Failed to get reminders" });
    }
  });

  app.post("/api/reminders", async (req: Request, res: Response) => {
    try {
      const reminder = await storage.createReminder(req.body);
      res.json(reminder);
    } catch (error) {
      res.status(500).json({ error: "Failed to create reminder" });
    }
  });

  app.patch("/api/reminders/:id", async (req: Request, res: Response) => {
    try {
      const reminder = await storage.updateReminder(req.params.id, req.body);
      if (!reminder) return res.status(404).json({ error: "Reminder not found" });
      res.json(reminder);
    } catch (error) {
      res.status(500).json({ error: "Failed to update reminder" });
    }
  });

  app.delete("/api/reminders/:id", async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteReminder(req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete reminder" });
    }
  });

  // ===== GAME SESSIONS ROUTES =====
  app.get("/api/games/sessions", async (req: Request, res: Response) => {
    try {
      const gameType = req.query.gameType as string | undefined;
      const sessions = await storage.getActiveGameSessions(gameType);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get game sessions" });
    }
  });

  app.get("/api/games/sessions/:id", async (req: Request, res: Response) => {
    try {
      const session = await storage.getGameSession(req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });
      const players = await storage.getGamePlayers(session.id);
      res.json({ ...session, players });
    } catch (error) {
      res.status(500).json({ error: "Failed to get game session" });
    }
  });

  app.post("/api/games/sessions", async (req: Request, res: Response) => {
    try {
      const session = await storage.createGameSession(req.body);
      // Add host as first player
      await storage.addGamePlayer({
        sessionId: session.id,
        userId: req.body.hostUserId,
        isReady: true,
      });
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to create game session" });
    }
  });

  app.post("/api/games/sessions/join", async (req: Request, res: Response) => {
    try {
      const { roomCode, userId } = req.body;
      const session = await storage.getGameSessionByCode(roomCode);
      if (!session) return res.status(404).json({ error: "Room not found" });
      
      const players = await storage.getGamePlayers(session.id);
      if (players.length >= (session.maxPlayers || 4)) {
        return res.status(400).json({ error: "Room is full" });
      }

      const player = await storage.addGamePlayer({
        sessionId: session.id,
        userId,
      });
      
      res.json({ session, player });
    } catch (error) {
      res.status(500).json({ error: "Failed to join game" });
    }
  });

  app.patch("/api/games/sessions/:id", async (req: Request, res: Response) => {
    try {
      const session = await storage.updateGameSession(req.params.id, req.body);
      if (!session) return res.status(404).json({ error: "Session not found" });
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to update game session" });
    }
  });

  // ===== GAME SCORES ROUTES =====
  app.get("/api/games/scores/:userId", async (req: Request, res: Response) => {
    try {
      const gameType = req.query.gameType as string | undefined;
      const scores = await storage.getGameScores(req.params.userId, gameType);
      res.json(scores);
    } catch (error) {
      res.status(500).json({ error: "Failed to get game scores" });
    }
  });

  app.post("/api/games/scores", async (req: Request, res: Response) => {
    try {
      const score = await storage.createGameScore(req.body);
      res.json(score);
    } catch (error) {
      res.status(500).json({ error: "Failed to save game score" });
    }
  });

  // ===== LEADERBOARD ROUTES =====
  app.get("/api/games/leaderboard", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await storage.getOverallLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to get overall leaderboard" });
    }
  });

  app.get("/api/leaderboard/:gameType", async (req: Request, res: Response) => {
    try {
      const ageGroup = req.query.ageGroup as string | undefined;
      const leaderboard = await storage.getLeaderboard(req.params.gameType, ageGroup);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  // ===== COGNITIVE REPORTS ROUTES =====
  app.get("/api/reports/:userId", async (req: Request, res: Response) => {
    try {
      const reports = await storage.getCognitiveReports(req.params.userId);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to get reports" });
    }
  });

  app.post("/api/reports/:userId/generate", async (req: Request, res: Response) => {
    try {
      const report = await storage.generateCognitiveReport(req.params.userId);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // ===== GAME DATA ROUTES =====
  
  // Get riddles from AI based on user interests
  app.get("/api/games/riddles", async (req: Request, res: Response) => {
    try {
      const language = req.query.language as string || 'en';
      const difficulty = req.query.difficulty as string || 'easy';
      const interestsParam = req.query.interests as string || '';
      const interests = interestsParam ? interestsParam.split(',').filter(i => i.trim()) : [];
      
      let interestContext = '';
      if (interests.length > 0) {
        interestContext = `
The user is interested in: ${interests.join(', ')}.
Create riddles that relate to these interests when possible. For example:
- If they like "music", include riddles about musical instruments or songs
- If they like "cooking", include riddles about kitchen items or food
- If they like "nature", include riddles about plants, animals, or weather
- If they like "family", include riddles about relationships or home life
Make at least 12 of the 20 riddles related to their interests.`;
      }
      
      const prompt = `Generate 20 unique riddles suitable for elderly users (60+ years old) in ${language === 'ta' ? 'Tamil' : 'English'}.
Difficulty: ${difficulty}
${interestContext}

Requirements:
- Each riddle should be thought-provoking but solvable
- Answers should be single words or short phrases (1-3 words)
- Hints should be helpful but not give away the answer
- Make them culturally relevant to Indian users
- Keep questions clear and easy to understand
- Make sure all 20 riddles are unique and different from each other

Format as JSON array with objects containing: question, answer, hint
Only return the JSON array, no other text.`;

      const text = await callOpenRouter([{ role: "user", content: prompt }]);
      const jsonMatch = text?.match(/\[[\s\S]*\]/);
      const riddles = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      
      if (riddles.length >= 10) {
        res.json(riddles);
        return;
      }
      throw new Error("Not enough riddles generated");
    } catch (error) {
      console.error("Riddles error:", error);
      // Fallback riddles - 20 unique riddles
      res.json([
        { question: "What has hands but can't clap?", answer: "clock", hint: "It tells time" },
        { question: "What has a head and a tail but no body?", answer: "coin", hint: "You use it to buy things" },
        { question: "What gets wetter the more it dries?", answer: "towel", hint: "You use it after bathing" },
        { question: "What can you catch but not throw?", answer: "cold", hint: "You might sneeze" },
        { question: "What has keys but no locks?", answer: "piano", hint: "It makes music" },
        { question: "What has one eye but can't see?", answer: "needle", hint: "Used for sewing" },
        { question: "What goes up but never comes down?", answer: "age", hint: "Everyone gets older" },
        { question: "What has a neck but no head?", answer: "bottle", hint: "You drink from it" },
        { question: "What can travel around the world while staying in a corner?", answer: "stamp", hint: "Used for mail" },
        { question: "What has teeth but cannot bite?", answer: "comb", hint: "Used for hair" },
        { question: "What has a face and two hands but no arms or legs?", answer: "clock", hint: "Hangs on the wall" },
        { question: "What building has the most stories?", answer: "library", hint: "Full of books" },
        { question: "What can you break without touching it?", answer: "promise", hint: "Made with words" },
        { question: "What has a thumb and four fingers but is not alive?", answer: "glove", hint: "Worn on hands" },
        { question: "What gets smaller every time it takes a bath?", answer: "soap", hint: "Makes bubbles" },
        { question: "What has legs but doesn't walk?", answer: "table", hint: "You eat on it" },
        { question: "What is full of holes but still holds water?", answer: "sponge", hint: "Used for cleaning" },
        { question: "What can you hold without ever touching it?", answer: "breath", hint: "You do it every moment" },
        { question: "What has ears but cannot hear?", answer: "corn", hint: "A vegetable" },
        { question: "What comes once in a minute, twice in a moment, but never in a thousand years?", answer: "letter m", hint: "Look at the spelling" },
      ]);
    }
  });

  // Get word chain starting words
  app.get("/api/games/wordchain/words", async (req: Request, res: Response) => {
    try {
      const language = req.query.language as string || 'en';
      const category = req.query.category as string || 'general';
      
      const prompt = `Generate 20 simple, common ${language === 'ta' ? 'Tamil' : 'English'} words for a word chain game.
Category: ${category}
Requirements:
- Words should be 3-8 letters
- Easy to spell and remember
- Suitable for elderly users
Format as JSON array of strings only.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text || '[]';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const words = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      
      res.json(words);
    } catch (error) {
      console.error("Word chain error:", error);
      res.json(["apple", "elephant", "tree", "eagle", "egg", "garden", "night", "table", "earth", "house"]);
    }
  });

  // Validate word for word chain
  app.post("/api/games/wordchain/validate", async (req: Request, res: Response) => {
    try {
      const { word, previousWord, language } = req.body;
      
      if (!word || word.length < 2) {
        return res.json({ valid: false, reason: "Word too short" });
      }

      if (previousWord) {
        const lastLetter = previousWord.toLowerCase().slice(-1);
        const firstLetter = word.toLowerCase().charAt(0);
        if (lastLetter !== firstLetter) {
          return res.json({ valid: false, reason: `Word must start with '${lastLetter.toUpperCase()}'` });
        }
      }

      const prompt = `Is "${word}" a valid ${language === 'ta' ? 'Tamil' : 'English'} word? 
Reply with only "yes" or "no".`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const isValid = response.text?.toLowerCase().includes('yes');
      
      res.json({ valid: isValid, reason: isValid ? "" : "Not a valid word" });
    } catch (error) {
      res.json({ valid: true }); // Allow on error
    }
  });

  // Get echo chronicles story prompts
  app.get("/api/games/echo/prompts", async (req: Request, res: Response) => {
    try {
      const language = req.query.language as string || 'en';
      
      const prompt = `Generate 5 memory story prompts for elderly users (60+) in ${language === 'ta' ? 'Tamil' : 'English'}.
These should trigger happy nostalgic memories about:
- Childhood games and activities
- Family gatherings and festivals
- School days and friendships
- Traditional food and cooking
- Cultural celebrations

Format as JSON array of objects with: prompt, category, hints (array of 3 helpful hints)
Only return the JSON array.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text || '[]';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const prompts = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      
      res.json(prompts);
    } catch (error) {
      console.error("Echo prompts error:", error);
      res.json([
        { 
          prompt: "Tell me about your favorite childhood game", 
          category: "childhood",
          hints: ["Who did you play with?", "Where did you play?", "What made it special?"]
        },
        { 
          prompt: "Describe a memorable family festival", 
          category: "festivals",
          hints: ["What foods were prepared?", "Who was there?", "What traditions did you follow?"]
        },
      ]);
    }
  });

  // Family quiz generation
  app.post("/api/games/family-quiz/generate", async (req: Request, res: Response) => {
    try {
      const { familyMembers, language } = req.body;
      
      if (!familyMembers || familyMembers.length === 0) {
        return res.json([]);
      }

      const memberInfo = familyMembers.map((m: any) => 
        `${m.name} (${m.relation}${m.association ? ', ' + m.association : ''})`
      ).join('; ');

      const prompt = `Generate 5 quiz questions about these family members for an elderly user in ${language === 'ta' ? 'Tamil' : 'English'}:
${memberInfo}

Questions should test memory of family relationships, names, and details.
Format as JSON array of objects with: question, correctAnswer, options (array of 4 choices including correct answer)
Only return the JSON array.`;

      const text = await callOpenRouter([{ role: "user", content: prompt }]);
      const jsonMatch = text?.match(/\[[\s\S]*\]/);
      const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      
      if (questions.length >= 3) {
        res.json(questions);
        return;
      }
      throw new Error("Not enough questions generated");
    } catch (error) {
      console.error("Family quiz error:", error);
      res.json([
        { question: "Who is your closest family member?", correctAnswer: "Think about who you see most often", options: ["Parent", "Sibling", "Child", "Spouse"] },
        { question: "How many family members do you have saved?", correctAnswer: "Count them all", options: ["1-2", "3-5", "6-10", "More than 10"] },
      ]);
    }
  });

  // ===== WORD CHAIN MULTIPLAYER ROUTES =====
  
  // Create a Word Chain multiplayer room
  app.post("/api/games/wordchain/rooms", async (req: Request, res: Response) => {
    try {
      const { userId, playerName } = req.body;
      
      if (!userId || !playerName) {
        return res.status(400).json({ error: "userId and playerName are required" });
      }

      // Generate word options for the game
      const wordPool = [
        'apple', 'banana', 'cherry', 'dragon', 'elephant', 'flower', 'garden', 'happy',
        'island', 'jungle', 'kite', 'lemon', 'mango', 'nature', 'orange', 'purple',
        'queen', 'rainbow', 'sunset', 'tiger', 'umbrella', 'village', 'water', 'yellow',
        'zebra', 'anchor', 'basket', 'candle', 'dolphin', 'eagle', 'forest', 'guitar'
      ];
      
      // Select 4 random words as initial options
      const shuffled = [...wordPool].sort(() => Math.random() - 0.5);
      const wordOptions = shuffled.slice(0, 4);
      
      const gameState = {
        wordChain: [] as string[],
        currentTurn: 1,
        player1: { id: userId, name: playerName, score: 0 },
        player2: null as { id: string; name: string; score: number } | null,
        phase: 'waiting', // waiting, selecting, memorizing, recalling, gameOver
        wordOptions,
        wordPool: shuffled.slice(4),
        lastAction: Date.now(),
        winner: null as string | null,
        currentRecallIndex: 0,
        showWords: false,
        failedPlayer: null as number | null,
      };

      const session = await storage.createGameSession({
        gameType: 'word-chain-memory',
        mode: 'multiplayer',
        status: 'waiting',
        hostUserId: userId,
        maxPlayers: 2,
        gameState,
      });

      res.json({ 
        roomCode: session.roomCode, 
        sessionId: session.id,
        gameState: session.gameState
      });
    } catch (error) {
      console.error("Create room error:", error);
      res.status(500).json({ error: "Failed to create room" });
    }
  });

  // Join a Word Chain room
  app.post("/api/games/wordchain/rooms/join", async (req: Request, res: Response) => {
    try {
      const { roomCode, userId, playerName } = req.body;
      
      if (!roomCode || !userId || !playerName) {
        return res.status(400).json({ error: "roomCode, userId, and playerName are required" });
      }

      const session = await storage.getGameSessionByCode(roomCode.toUpperCase());
      
      if (!session) {
        return res.status(404).json({ error: "Room not found or game already started" });
      }

      const gameState = session.gameState as any;
      
      if (gameState.player2) {
        return res.status(400).json({ error: "Room is full" });
      }

      // Add player 2
      gameState.player2 = { id: userId, name: playerName, score: 0 };
      gameState.phase = 'selecting';
      gameState.lastAction = Date.now();

      await storage.updateGameSession(session.id, {
        status: 'active',
        gameState,
      });

      res.json({ 
        sessionId: session.id,
        roomCode: session.roomCode,
        gameState 
      });
    } catch (error) {
      console.error("Join room error:", error);
      res.status(500).json({ error: "Failed to join room" });
    }
  });

  // Get Word Chain game state (polling)
  app.get("/api/games/wordchain/rooms/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getGameSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Game not found" });
      }

      res.json({
        sessionId: session.id,
        roomCode: session.roomCode,
        status: session.status,
        gameState: session.gameState,
      });
    } catch (error) {
      console.error("Get game state error:", error);
      res.status(500).json({ error: "Failed to get game state" });
    }
  });

  // Submit a move in Word Chain
  app.post("/api/games/wordchain/rooms/:sessionId/move", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { userId, action, selectedWord, recalledWord } = req.body;
      
      const session = await storage.getGameSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Game not found" });
      }

      const gameState = session.gameState as any;
      const isPlayer1 = gameState.player1?.id === userId;
      const isPlayer2 = gameState.player2?.id === userId;
      
      if (!isPlayer1 && !isPlayer2) {
        return res.status(403).json({ error: "You are not a player in this game" });
      }

      const playerNum = isPlayer1 ? 1 : 2;
      const isCurrentPlayer = gameState.currentTurn === playerNum;

      if (!isCurrentPlayer && action !== 'ready') {
        return res.status(400).json({ error: "Not your turn" });
      }

      // Handle different actions
      if (action === 'select') {
        // Player is selecting a new word to add to the chain
        if (gameState.phase !== 'selecting') {
          return res.status(400).json({ error: "Cannot select word now" });
        }

        if (!gameState.wordOptions.includes(selectedWord)) {
          return res.status(400).json({ error: "Invalid word selection" });
        }

        // Add word to chain
        gameState.wordChain.push(selectedWord);
        
        // Remove selected word from options and add a new one
        gameState.wordOptions = gameState.wordOptions.filter((w: string) => w !== selectedWord);
        if (gameState.wordPool.length > 0) {
          gameState.wordOptions.push(gameState.wordPool.shift());
        }
        
        // Switch to other player's turn
        gameState.currentTurn = playerNum === 1 ? 2 : 1;
        gameState.phase = 'memorizing';
        gameState.showWords = true;
        gameState.currentRecallIndex = 0;
        gameState.lastAction = Date.now();

        // Update player score
        if (isPlayer1) {
          gameState.player1.score += 10;
        } else {
          gameState.player2.score += 10;
        }

      } else if (action === 'ready_to_recall') {
        // Only the current player (who just saw the words) can trigger recall
        if (!isCurrentPlayer) {
          return res.status(400).json({ error: "Not your turn to recall" });
        }
        if (gameState.phase !== 'memorizing') {
          return res.status(400).json({ error: "Not in memorizing phase" });
        }
        
        gameState.phase = 'recalling';
        gameState.showWords = false;
        gameState.currentRecallIndex = 0;
        gameState.lastAction = Date.now();

      } else if (action === 'recall') {
        // Only the current player can recall
        if (!isCurrentPlayer) {
          return res.status(400).json({ error: "Not your turn to recall" });
        }
        if (gameState.phase !== 'recalling') {
          return res.status(400).json({ error: "Cannot recall now" });
        }

        const expectedWord = gameState.wordChain[gameState.currentRecallIndex];
        
        if (recalledWord !== expectedWord) {
          // Wrong recall - game over
          gameState.phase = 'gameOver';
          gameState.failedPlayer = playerNum;
          gameState.winner = playerNum === 1 ? gameState.player2?.name : gameState.player1?.name;
          gameState.showWords = true;
          
          await storage.updateGameSession(session.id, {
            status: 'completed',
            gameState,
            completedAt: new Date(),
          });

          return res.json({ gameState, result: 'wrong', expectedWord });
        }

        // Correct recall
        gameState.currentRecallIndex++;
        
        // Check if all words recalled
        if (gameState.currentRecallIndex >= gameState.wordChain.length) {
          // Successfully recalled all - now select a new word
          gameState.phase = 'selecting';
          gameState.currentRecallIndex = 0;
          
          // Bonus points for complete recall
          if (isPlayer1) {
            gameState.player1.score += gameState.wordChain.length * 5;
          } else {
            gameState.player2.score += gameState.wordChain.length * 5;
          }
        }

        gameState.lastAction = Date.now();
      }

      await storage.updateGameSession(session.id, { gameState });

      res.json({ gameState });
    } catch (error) {
      console.error("Move error:", error);
      res.status(500).json({ error: "Failed to process move" });
    }
  });

  // Leave/Forfeit Word Chain game
  app.post("/api/games/wordchain/rooms/:sessionId/leave", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { userId } = req.body;
      
      const session = await storage.getGameSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Game not found" });
      }

      const gameState = session.gameState as any;
      const isPlayer1 = gameState.player1?.id === userId;
      const isPlayer2 = gameState.player2?.id === userId;

      if (isPlayer1 || isPlayer2) {
        gameState.phase = 'gameOver';
        gameState.winner = isPlayer1 ? gameState.player2?.name : gameState.player1?.name;
        gameState.failedPlayer = isPlayer1 ? 1 : 2;

        await storage.updateGameSession(session.id, {
          status: 'completed',
          gameState,
          completedAt: new Date(),
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Leave game error:", error);
      res.status(500).json({ error: "Failed to leave game" });
    }
  });

  // ===== LETTER LINK MULTIPLAYER ROUTES =====
  // Word game where players pick words based on starting/ending letters
  
  const letterLinkWordPool = [
    'apple', 'anchor', 'amazing', 'animal', 'arrow',
    'banana', 'basket', 'bridge', 'butter', 'beach',
    'candle', 'castle', 'cherry', 'cloud', 'cream',
    'dolphin', 'dragon', 'dream', 'dance', 'door',
    'eagle', 'earth', 'elephant', 'energy', 'emerald', 'echo', 'escape', 'evening', 'emperor', 'extra',
    'flower', 'forest', 'friend', 'fruit', 'fire',
    'garden', 'great', 'green', 'guitar', 'gold',
    'happy', 'heart', 'home', 'honey', 'hope',
    'island', 'ice', 'iron', 'imagine',
    'jungle', 'jewel', 'journey', 'joy',
    'kangaroo', 'kite', 'king', 'kitchen',
    'lemon', 'love', 'lime', 'lamp', 'lion',
    'mango', 'milk', 'moon', 'mountain', 'music',
    'nature', 'nest', 'night', 'north', 'nerve', 'nice', 'noon',
    'ocean', 'orange', 'open', 'olive',
    'purple', 'peace', 'planet', 'paper', 'piano', 'pearl', 'picnic', 'pillow',
    'queen', 'quiet', 'quilt',
    'rainbow', 'rabbit', 'rain', 'river', 'road', 'rose', 'radio', 'red',
    'sunset', 'star', 'silver', 'smile', 'storm', 'sweet',
    'tiger', 'table', 'train', 'tree', 'tower', 'temple', 'turtle', 'travel',
    'umbrella', 'unique', 'under',
    'village', 'valley', 'violet', 'voice',
    'water', 'winter', 'wonder', 'wind', 'wave',
    'yellow', 'yarn', 'young',
    'zebra', 'zero', 'zone'
  ];

  function getWordsStartingWith(letter: string, usedWords: string[], count: number = 4): string[] {
    const available = letterLinkWordPool.filter(
      w => w.toLowerCase().startsWith(letter.toLowerCase()) && !usedWords.includes(w.toLowerCase())
    );
    const usedStartingWith = usedWords.filter(
      w => w.toLowerCase().startsWith(letter.toLowerCase())
    );
    
    const shuffledAvailable = [...available].sort(() => Math.random() - 0.5);
    const shuffledUsed = [...usedStartingWith].sort(() => Math.random() - 0.5);
    
    let options: string[] = [];
    
    if (usedStartingWith.length > 0 && Math.random() < 0.4) {
      const trapWord = shuffledUsed[0];
      options.push(trapWord);
      options.push(...shuffledAvailable.slice(0, count - 1));
    } else {
      options = shuffledAvailable.slice(0, count);
    }
    
    return options.sort(() => Math.random() - 0.5);
  }

  // Create a Letter Link room
  app.post("/api/games/letterlink/rooms", async (req: Request, res: Response) => {
    try {
      const { userId, playerName } = req.body;
      
      if (!userId || !playerName) {
        return res.status(400).json({ error: "userId and playerName are required" });
      }

      // Start with a random letter
      const startLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'w'];
      const startingLetter = startLetters[Math.floor(Math.random() * startLetters.length)];
      const wordOptions = getWordsStartingWith(startingLetter, [], 4);
      
      const gameState = {
        usedWords: [] as string[],
        currentLetter: startingLetter,
        currentTurn: 1,
        player1: { id: userId, name: playerName, score: 0 },
        player2: null as { id: string; name: string; score: number } | null,
        phase: 'waiting', // waiting, playing, gameOver
        wordOptions,
        lastAction: Date.now(),
        winner: null as string | null,
        loser: null as string | null,
        reason: null as string | null,
      };

      const session = await storage.createGameSession({
        gameType: 'letter-link',
        mode: 'multiplayer',
        status: 'waiting',
        hostUserId: userId,
        maxPlayers: 2,
        gameState,
      });

      res.json({ 
        roomCode: session.roomCode, 
        sessionId: session.id,
        gameState: session.gameState
      });
    } catch (error) {
      console.error("Create Letter Link room error:", error);
      res.status(500).json({ error: "Failed to create room" });
    }
  });

  // Join a Letter Link room
  app.post("/api/games/letterlink/rooms/join", async (req: Request, res: Response) => {
    try {
      const { roomCode, userId, playerName } = req.body;
      
      if (!roomCode || !userId || !playerName) {
        return res.status(400).json({ error: "roomCode, userId, and playerName are required" });
      }

      const session = await storage.getGameSessionByCode(roomCode.toUpperCase());
      
      if (!session) {
        return res.status(404).json({ error: "Room not found" });
      }
      
      if (session.gameType !== 'letter-link') {
        return res.status(400).json({ error: "Invalid room type" });
      }

      const gameState = session.gameState as any;
      
      if (gameState.player2) {
        return res.status(400).json({ error: "Room is full" });
      }

      // Add player 2
      gameState.player2 = { id: userId, name: playerName, score: 0 };
      gameState.phase = 'playing';
      gameState.lastAction = Date.now();

      await storage.updateGameSession(session.id, {
        status: 'active',
        gameState,
      });

      res.json({ 
        sessionId: session.id,
        roomCode: session.roomCode,
        gameState 
      });
    } catch (error) {
      console.error("Join Letter Link room error:", error);
      res.status(500).json({ error: "Failed to join room" });
    }
  });

  // Get Letter Link game state (polling)
  app.get("/api/games/letterlink/rooms/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getGameSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Game not found" });
      }

      res.json({
        sessionId: session.id,
        roomCode: session.roomCode,
        status: session.status,
        gameState: session.gameState,
      });
    } catch (error) {
      console.error("Get Letter Link state error:", error);
      res.status(500).json({ error: "Failed to get game state" });
    }
  });

  // Submit a move in Letter Link
  app.post("/api/games/letterlink/rooms/:sessionId/move", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { userId, selectedWord } = req.body;
      
      const session = await storage.getGameSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Game not found" });
      }

      const gameState = session.gameState as any;
      const isPlayer1 = gameState.player1?.id === userId;
      const isPlayer2 = gameState.player2?.id === userId;
      
      if (!isPlayer1 && !isPlayer2) {
        return res.status(403).json({ error: "You are not a player in this game" });
      }

      const playerNum = isPlayer1 ? 1 : 2;
      const playerName = isPlayer1 ? gameState.player1.name : gameState.player2.name;
      const opponentName = isPlayer1 ? gameState.player2?.name : gameState.player1.name;
      
      if (gameState.currentTurn !== playerNum) {
        return res.status(400).json({ error: "Not your turn" });
      }
      
      if (gameState.phase !== 'playing') {
        return res.status(400).json({ error: "Game is not in playing phase" });
      }

      const wordLower = selectedWord.toLowerCase();
      
      // Check if word was already used - player loses!
      if (gameState.usedWords.includes(wordLower)) {
        gameState.phase = 'gameOver';
        gameState.winner = opponentName;
        gameState.loser = playerName;
        gameState.reason = `${playerName} picked "${selectedWord}" which was already used!`;
        
        await storage.updateGameSession(session.id, {
          status: 'completed',
          gameState,
          completedAt: new Date(),
        });
        
        return res.json({ gameState, result: 'loss' });
      }
      
      // Check if word starts with the correct letter
      if (!wordLower.startsWith(gameState.currentLetter.toLowerCase())) {
        return res.status(400).json({ error: `Word must start with "${gameState.currentLetter.toUpperCase()}"` });
      }
      
      // Valid move - add word to used list
      gameState.usedWords.push(wordLower);
      
      // Update score
      if (isPlayer1) {
        gameState.player1.score += 10;
      } else {
        gameState.player2.score += 10;
      }
      
      // Get the ending letter for the next turn
      const lastLetter = wordLower[wordLower.length - 1];
      gameState.currentLetter = lastLetter;
      
      // Get new word options for next player
      const newOptions = getWordsStartingWith(lastLetter, gameState.usedWords, 4);
      
      // If no words available, current player wins!
      if (newOptions.length === 0) {
        gameState.phase = 'gameOver';
        gameState.winner = playerName;
        gameState.loser = opponentName;
        gameState.reason = `No more words starting with "${lastLetter.toUpperCase()}"! ${playerName} wins!`;
        
        await storage.updateGameSession(session.id, {
          status: 'completed',
          gameState,
          completedAt: new Date(),
        });
        
        return res.json({ gameState, result: 'win' });
      }
      
      gameState.wordOptions = newOptions;
      gameState.currentTurn = playerNum === 1 ? 2 : 1;
      gameState.lastAction = Date.now();

      await storage.updateGameSession(session.id, { gameState });
      
      res.json({ gameState, result: 'continue' });
    } catch (error) {
      console.error("Letter Link move error:", error);
      res.status(500).json({ error: "Failed to process move" });
    }
  });

  // Leave Letter Link game
  app.post("/api/games/letterlink/rooms/:sessionId/leave", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { userId } = req.body;
      
      const session = await storage.getGameSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Game not found" });
      }

      const gameState = session.gameState as any;
      const isPlayer1 = gameState.player1?.id === userId;
      const isPlayer2 = gameState.player2?.id === userId;

      if (isPlayer1 || isPlayer2) {
        const leavingPlayer = isPlayer1 ? gameState.player1.name : gameState.player2?.name;
        const winner = isPlayer1 ? gameState.player2?.name : gameState.player1.name;
        
        gameState.phase = 'gameOver';
        gameState.winner = winner;
        gameState.loser = leavingPlayer;
        gameState.reason = `${leavingPlayer} left the game`;

        await storage.updateGameSession(session.id, {
          status: 'completed',
          gameState,
          completedAt: new Date(),
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Leave Letter Link error:", error);
      res.status(500).json({ error: "Failed to leave game" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
