import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import OpenAI, { toFile } from "openai";

// OpenAI client for speech-to-text (using Replit AI Integrations)
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// OpenRouter API helper - using Mistral Small (natural responses, no thinking)
async function callOpenRouter(messages: { role: string; content: string }[], systemPrompt?: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-3-nano-30b-a3b:free",
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
  app.get("/api/moments/:userId", async (req: Request, res: Response) => {
    try {
      const moments = await storage.getMoments(req.params.userId);
      res.json(moments);
    } catch (error) {
      res.status(500).json({ error: "Failed to get moments" });
    }
  });

  app.post("/api/moments", async (req: Request, res: Response) => {
    try {
      const moment = await storage.createMoment(req.body);
      res.json(moment);
    } catch (error) {
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
        `${m.name} (${m.relationship}${m.birthDate ? ', born ' + m.birthDate : ''})`
      ).join('; ');

      const prompt = `Generate 5 quiz questions about these family members for an elderly user in ${language === 'ta' ? 'Tamil' : 'English'}:
${memberInfo}

Questions should test memory of family relationships, names, and details.
Format as JSON array of objects with: question, correctAnswer, options (array of 4 choices including correct answer)
Only return the JSON array.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text || '[]';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      
      res.json(questions);
    } catch (error) {
      console.error("Family quiz error:", error);
      res.json([]);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
