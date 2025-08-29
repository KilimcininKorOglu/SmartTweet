import 'dotenv/config';
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createPost, createPoll } from "./mcp.tool.js";
import { dbOperations } from "./database.js";
import { startScheduler, schedulePost } from "./scheduler.js";
import { runMigrations } from "./migrate.js";
import { z } from "zod";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Set timezone to Turkey if not set
if (!process.env.TZ) {
  process.env.TZ = 'Europe/Istanbul';
}

// Centralized locale and timezone configuration from env
const LOCALE = process.env.LOCALE || 'tr-TR';
const TIMEZONE = process.env.TZ || 'Europe/Istanbul';

// File identifier for logging
const FILE_NAME = 'index.js';

// Helper function to get username from request
const getUsernameFromRequest = (req) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  return SESSIONS[token]?.username || 'Bilinmeyen';
};

// Helper function to get username by user ID from database
const getUsernameById = (userId) => {
  try {
    const user = dbOperations.getUserById(userId);
    return user?.username || 'Bilinmeyen';
  } catch (error) {
    return 'Bilinmeyen';
  }
};

// Helper function to add timestamp to console logs
const getTimestamp = () => {
  return new Date().toLocaleString(LOCALE, { 
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: TIMEZONE
  });
};

// Store original console methods (override will be set after migration)
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

const server = new McpServer({
  name: "example-server",
  version: "1.0.0",
});

const app = express();

// Enable CORS and JSON parsing
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Simple single-user auth configuration
// Multi-user session management
let SESSIONS = {}; // { token: { userId, expiry } }

// Load persisted sessions from file if exists
const SESSIONS_FILE = path.join(process.cwd(), ".sessions");
try {
  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      const sessionsData = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf8"));
      // Filter out expired sessions
      const now = Date.now();
      for (const [token, session] of Object.entries(sessionsData)) {
        if (session.expiry && now < session.expiry) {
          SESSIONS[token] = session;
        }
      }
      if (Object.keys(SESSIONS).length > 0) {
        console.log(`${Object.keys(SESSIONS).length} aktif oturum geri yüklendi`);
      }
    } catch (parseError) {
      console.error("Oturum dosyası JSON formatı bozuk, yeni başlatılıyor:", parseError);
      SESSIONS = {};
    }
  }
} catch (error) {
  console.log("Oturum dosyası okunamadı, yeni oturum sistemi başlatılıyor");
}

// Helper to persist sessions
const persistSessions = () => {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(SESSIONS));
  } catch (error) {
    console.error("Oturumlar kaydedilemedi:", error);
  }
};

// Session check middleware
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token || !SESSIONS[token]) {
    return res
      .status(401)
      .json({ success: false, message: "Oturum geçersiz veya süresi dolmuş" });
  }

  const session = SESSIONS[token];

  // Check if session is expired
  if (Date.now() > session.expiry) {
    delete SESSIONS[token];
    persistSessions();
    return res
      .status(401)
      .json({ success: false, message: "Oturum geçersiz veya süresi dolmuş" });
  }

  // Add user ID and role to request for use in endpoints
  req.userId = session.userId;
  req.userRole = session.role;
  next();
};

// MCP Server Tools
server.tool(
  "addTwoNumbers",
  "Add two numbers",
  {
    a: z.number(),
    b: z.number(),
  },
  async (arg) => {
    const { a, b } = arg;
    return {
      content: [
        {
          type: "text",
          text: `The sum of ${a} and ${b} is ${a + b}`,
        },
      ],
    };
  }
);

server.tool(
  "createPost",
  "Create a post on X formally known as Twitter",
  {
    status: z.string(),
  },
  async (arg) => {
    const { status } = arg;
    return createPost(status);
  }
);

server.tool(
  "createPoll",
  "Create an interactive poll on X (formerly Twitter)",
  {
    question: z.string().describe("The poll question/text"),
    options: z
      .array(z.string())
      .min(2)
      .max(4)
      .describe("Poll options (2-4 choices)"),
    durationMinutes: z
      .number()
      .min(5)
      .max(10080)
      .default(1440)
      .describe("Poll duration in minutes (default 24 hours)"),
  },
  async (arg) => {
    const { question, options, durationMinutes } = arg;
    return createPoll(question, options, durationMinutes);
  }
);

// MCP Server Transport Setup
const transports = {};

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;
  res.on("close", () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: "Geçerli sessionId gerekli" });
  }

  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

// Authentication endpoints
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Kullanıcı adı ve şifre gerekli" });
    }

    const passwordHash = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    // Check user in database
    console.log(`Giriş denemesi başlatıldı: ${username}`);
    const user = dbOperations.getUserByUsername(username);

    if (user && user.password_hash === passwordHash) {
      // Create session token (24 hours)
      const sessionToken = crypto.randomBytes(32).toString("hex");
      const sessionExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

      // Store session
      SESSIONS[sessionToken] = {
        userId: user.id,
        expiry: sessionExpiry,
        username: user.username,
        role: user.role
      };

      // Persist sessions to file
      persistSessions();

      console.log(`✅ Başarılı giriş: ${username} (ID: ${user.id}, Rol: ${user.role})`);

      res.json({
        success: true,
        message: "Giriş başarılı",
        token: sessionToken,
        expiresAt: new Date(sessionExpiry).toISOString(),
      });
    } else {
      console.log(`❌ Başarısız giriş denemesi: ${username}`);
      res
        .status(401)
        .json({ success: false, message: "Kullanıcı adı veya şifre hatalı" });
    }
  } catch (error) {
    console.error("Giriş hatası:", error);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Kullanıcı adı ve şifre gerekli" });
    }

    // Validate username
    if (username.length < 3) {
      return res
        .status(400)
        .json({ success: false, message: "Kullanıcı adı en az 3 karakter olmalı" });
    }

    // Validate password
    if (password.length < 6) {
      return res
        .status(400)
        .json({ success: false, message: "Şifre en az 6 karakter olmalı" });
    }

    // Check if user already exists
    const existingUser = dbOperations.getUserByUsername(username);
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: "Bu kullanıcı adı zaten alınmış" });
    }

    // Create password hash
    const passwordHash = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    // Check if this is the first user (should be admin)
    const userCount = dbOperations.getUserCount();
    const role = userCount === 0 ? 'admin' : 'user';
    console.log(`Yeni kullanıcı kaydı başlatıldı: ${username} (${userCount === 0 ? 'İlk kullanıcı - Admin' : 'Normal kullanıcı'})`);

    // Create user
    const userId = dbOperations.createUser(username, passwordHash, role);

    console.log(`✅ Yeni kullanıcı başarıyla oluşturuldu: ${username} (ID: ${userId}, Rol: ${role})`);

    res.json({
      success: true,
      message: "Kullanıcı başarıyla oluşturuldu",
      userId
    });
  } catch (error) {
    console.error("Kayıt hatası:", error);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

app.post("/api/logout", requireAuth, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (token && SESSIONS[token]) {
      const username = SESSIONS[token].username;
      const userId = SESSIONS[token].userId;
      delete SESSIONS[token];
      persistSessions();
      console.log(`🚪 Kullanıcı çıkış yaptı: ${username} (ID: ${userId})`);
    }

    res.json({ success: true, message: "Çıkış başarılı" });
  } catch (error) {
    console.error("Çıkış hatası:", error);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

app.get("/api/auth-status", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const session = token ? SESSIONS[token] : null;
  const isValid = session && Date.now() < session.expiry;

  // Always include authenticated field to avoid undefined behavior
  res.json({
    success: true,
    authenticated: Boolean(isValid), // Ensure it's always a boolean
    expiresAt: isValid
      ? new Date(session.expiry).toISOString()
      : null,
    username: isValid ? session.username : null,
    role: isValid ? session.role : null,
    userId: isValid ? session.userId : null
  });
});

// Admin endpoints
app.get("/api/admin/users", requireAuth, async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ success: false, message: "Bu işlem için admin yetkisi gerekli" });
    }

    console.log(`📋 Admin kullanıcı listesi istedi: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username}`);
    const users = dbOperations.getAllUsers();
    console.log(`📊 ${users.length} kullanıcı bilgisi döndürüldü`);
    res.json({ success: true, users });
  } catch (error) {
    console.error("Admin kullanıcı listesi hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/admin/all-posts", requireAuth, async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ success: false, message: "Bu işlem için admin yetkisi gerekli" });
    }

    console.log(`📋 Admin tüm postları istedi: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username}`);
    const posts = dbOperations.getAllPostsForAdmin();
    console.log(`📊 ${posts.length} post bilgisi döndürüldü`);
    res.json({ success: true, posts });
  } catch (error) {
    console.error("Admin tüm postlar hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin user management endpoints
app.put("/api/admin/users/:id/role", requireAuth, async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ success: false, message: "Bu işlem için admin yetkisi gerekli" });
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: "Geçersiz kullanıcı ID" });
    }
    const { role } = req.body;

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ success: false, message: "Geçersiz rol" });
    }

    // Prevent admin from demoting themselves
    if (userId === req.userId && role === 'user') {
      return res.status(400).json({ success: false, message: "Kendi admin yetkisini kaldıramazsınız" });
    }

    const result = dbOperations.updateUserRole(userId, role);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    // Update active sessions if user role changed
    for (const [token, session] of Object.entries(SESSIONS)) {
      if (session.userId === userId) {
        session.role = role;
      }
    }
    persistSessions();

    const targetUser = dbOperations.getUserById(userId);
    console.log(`🔧 Admin tarafından kullanıcı rolü güncellendi: ${targetUser?.username} (ID: ${userId}) -> ${role}`);
    res.json({ success: true, message: "Kullanıcı rolü güncellendi" });
  } catch (error) {
    console.error("Rol güncelleme hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put("/api/admin/users/:id/password", requireAuth, async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ success: false, message: "Bu işlem için admin yetkisi gerekli" });
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: "Geçersiz kullanıcı ID" });
    }
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Şifre en az 6 karakter olmalı" });
    }

    const passwordHash = crypto.createHash("sha256").update(newPassword).digest("hex");
    const result = dbOperations.updateUserPassword(userId, passwordHash);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    // Invalidate all sessions for this user (force re-login)
    const userSessions = Object.keys(SESSIONS).filter(token => SESSIONS[token].userId === userId);
    userSessions.forEach(token => delete SESSIONS[token]);
    persistSessions();

    const targetUser = dbOperations.getUserById(userId);
    console.log(`🔒 Admin tarafından kullanıcı şifresi sıfırlandı: ${targetUser?.username} (ID: ${userId})`);
    res.json({ success: true, message: "Kullanıcı şifresi güncellendi. Kullanıcının yeniden giriş yapması gerekiyor." });
  } catch (error) {
    console.error("Şifre güncelleme hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// HTTP API endpoints for the frontend
app.post("/api/createPost", requireAuth, async (req, res) => {
  try {
    const { status, enhanceContent = false } = req.body;
    if (!status) {
      return res
        .status(400)
        .json({ success: false, message: "Status is required" });
    }
    // Apply enhancement if enabled
    let finalStatus = status;
    if (enhanceContent) {
      try {
        const { enhanceContent: enhanceContentFunction } = await import(
          "./mcp.tool.js"
        );
        finalStatus = await enhanceContentFunction(status, req.userId);
        console.log(`📝 AI geliştirmesi uygulandı - Kullanıcı: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username}`);
        console.log("📄 Şimdi Gönder - Orijinal:", status);
        console.log("✨ Şimdi Gönder - Geliştirilmiş:", finalStatus);
      } catch (error) {
        console.log(
          "Geliştirme başarısız, orijinal içerik kullanılıyor:",
          error.message
        );
        finalStatus = status;
      }
    } else {
      console.log(`📤 Direkt gönderi - Kullanıcı: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username}`);
      console.log("📄 Şimdi Gönder - Geliştirme kapalı, orijinal kullanılıyor:", status);
    }

    console.log(`🚀 Tweet gönderimi başlatıldı - Kullanıcı: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username}`);
    const result = await createPost(finalStatus, req.userId);
    
    // Save posted tweet to database for history
    dbOperations.createPostedPost(finalStatus, 'post', req.userId);
    
    console.log(`✅ Tweet başarıyla gönderildi - İçerik: ${finalStatus.substring(0, 50)}...`);
    res.json({ success: true, message: result.content[0].text });
  } catch (error) {
    console.error("API gönderi oluşturma hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/createPoll", requireAuth, async (req, res) => {
  try {
    const {
      question,
      options,
      durationMinutes = 1440,
      enhanceContent = false,
    } = req.body;
    if (!question) {
      return res
        .status(400)
        .json({ success: false, message: "Question is required" });
    }

    // Handle case where options is empty array or null - let the tool extract them
    let pollOptions = options;
    if (!pollOptions || pollOptions.length === 0) {
      pollOptions = null; // Let the tool handle option extraction
    }

    // Apply enhancement if enabled
    let finalQuestion = question;
    if (enhanceContent) {
      try {
        const { enhanceContent: enhanceContentFunction } = await import(
          "./mcp.tool.js"
        );
        finalQuestion = await enhanceContentFunction(question, req.userId);
        console.log(`📊 Anket AI geliştirmesi uygulandı - Kullanıcı: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username}`);
        console.log("📄 Anket - Orijinal:", question);
        console.log("✨ Anket - Geliştirilmiş:", finalQuestion);
      } catch (error) {
        console.log(
          "Geliştirme başarısız, orijinal içerik kullanılıyor:",
          error.message
        );
        finalQuestion = question;
      }
    } else {
      console.log(`📊 Direkt anket - Kullanıcı: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username}`);
      console.log("📄 Anket - Geliştirme kapalı, orijinal kullanılıyor:", question);
    }

    console.log(`🗳️ Anket gönderimi başlatıldı - Kullanıcı: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username}`);
    // Extract options from original question, but use enhanced question for posting
    const result = await createPoll(
      finalQuestion,
      pollOptions,
      durationMinutes,
      question,
      req.userId
    );
    
    // Save posted poll to database for history
    const pollMetadata = {
      options: pollOptions,
      durationMinutes: durationMinutes,
      originalQuestion: question !== finalQuestion ? question : null
    };
    dbOperations.createPostedPost(finalQuestion, 'poll', req.userId, pollMetadata);
    
    console.log(`✅ Anket başarıyla gönderildi - Soru: ${finalQuestion.substring(0, 50)}...`);
    res.json({ success: true, message: result.content[0].text });
  } catch (error) {
    console.error("API anket oluşturma hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  console.log('❤️ Sağlık kontrolü istendi');
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Get default prompts endpoint
app.get("/api/default-prompts", async (req, res) => {
  try {
    const { DEFAULT_CONTENT_PROMPT, DEFAULT_POLL_PROMPT } = await import("./mcp.tool.js");
    res.json({
      success: true,
      prompts: {
        contentPrompt: DEFAULT_CONTENT_PROMPT,
        pollPrompt: DEFAULT_POLL_PROMPT
      }
    });
  } catch (error) {
    console.error("Varsayılan promptlar yüklenemedi:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// AI Preview endpoint
app.post("/api/enhance-preview", requireAuth, async (req, res) => {
  try {
    const { content, postType } = req.body;
    if (!content) {
      return res
        .status(400)
        .json({ success: false, message: "Content is required" });
    }

    console.log(`🔍 AI önizleme istendi - Kullanıcı: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username}, Tür: ${postType}`);
    // Use the provided postType instead of automatic detection
    const isPoll = postType === "poll";

    const { enhanceContent } = await import("./mcp.tool.js");
    console.log(`✨ AI ile içerik geliştiriliyor...`);
    const enhancedContent = await enhanceContent(content, req.userId);
    console.log(`✅ İçerik AI ile geliştirildi: ${enhancedContent.substring(0, 50)}...`);

    let pollOptions = null;
    if (isPoll) {
      // Extract poll options for preview when postType is 'poll'
      const { extractPollOptions } = await import("./mcp.tool.js");
      try {
        console.log(`🗳️ Anket seçenekleri AI ile oluşturuluyor...`);
        pollOptions = await extractPollOptions(content, req.userId); // Use original content for options
        console.log(`✅ AI anket seçenekleri: ${pollOptions?.join(', ')}`);
      } catch (error) {
        console.error("❌ Önizlemede anket seçeneği çıkarma başarısız:", error);
      }
    }

    res.json({
      success: true,
      enhancedContent,
      isPoll,
      pollOptions,
    });
  } catch (error) {
    console.error("API önizleme geliştirme hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Scheduling API endpoints
app.post("/api/schedule-post", requireAuth, async (req, res) => {
  try {
    const {
      content,
      postType,
      scheduledTime,
      metadata,
      enhanceContent = false,
    } = req.body;

    // Validate required fields
    if (!content || !postType || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: "Content, postType, and scheduledTime are required",
      });
    }

    // Validate post type
    const validPostTypes = ["post", "poll"];
    if (!validPostTypes.includes(postType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post type",
      });
    }

    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduledTime);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Scheduled time must be in the future",
      });
    }

    let finalContent = content;

    // Only enhance if user selected the option
    if (enhanceContent) {
      try {
        const { enhanceContent: enhanceContentFunction } = await import(
          "./mcp.tool.js"
        );
        finalContent = await enhanceContentFunction(content, req.userId);
        console.log(`📅 Zamanlanmış gönderi AI geliştirmesi - Kullanıcı: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username}`);
        console.log("📄 Zamanla - Orijinal:", content);
        console.log("✨ Zamanla - Geliştirilmiş:", finalContent);
      } catch (error) {
        console.log(
          "Geliştirme başarısız, orijinal içerik kullanılıyor:",
          error.message
        );
        finalContent = content;
      }
    } else {
      console.log(`📅 Zamanlanmış gönderi - Kullanıcı: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username}`);
      console.log("📄 Zamanla - Geliştirme kapalı, orijinal kullanılıyor:", content);
    }

    console.log(`⏰ Gönderi zamanlanıyor - ${scheduledDate.toLocaleString(LOCALE, { timeZone: TIMEZONE })}`);
    const postId = schedulePost(
      {
        content: finalContent,
        postType,
        scheduledTime: scheduledDate.toISOString(),
        metadata: metadata || {},
      },
      req.userId
    );
    console.log(`✅ Gönderi başarıyla zamanlandı (ID: ${postId}) - Tür: ${postType}`);

    res.json({
      success: true,
      message: "Post scheduled successfully",
      postId,
      scheduledTime: scheduledDate.toISOString(),
    });
  } catch (error) {
    console.error("API gönderi zamanlama hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/scheduled-posts", requireAuth, async (req, res) => {
  try {
    console.log(`📋 Zamanlanmış gönderiler listesi istendi - Kullanıcı: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username} (ID: ${req.userId})`);
    const posts = dbOperations.getAllScheduledPosts(req.userId);
    console.log(`📊 ${posts.length} zamanlanmış gönderi döndürüldü`);
    res.json({ success: true, posts });
  } catch (error) {
    console.error("API zamanlanmış gönderiler hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/scheduled-posts/pending", requireAuth, async (req, res) => {
  try {
    console.log(`⏳ Bekleyen gönderiler listesi istendi - Kullanıcı: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username}`);
    const posts = dbOperations.getPendingScheduledPosts(req.userId);
    console.log(`📊 ${posts.length} bekleyen gönderi döndürüldü`);
    res.json({ success: true, posts });
  } catch (error) {
    console.error("API bekleyen zamanlanmış gönderiler hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all posts history (scheduled + posted) for a user
app.get("/api/posts-history", requireAuth, async (req, res) => {
  try {
    console.log(`📚 Post geçmişi istendi - Kullanıcı: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username}`);
    const posts = dbOperations.getAllPostsHistory(req.userId);
    console.log(`📊 ${posts.length} post geçmişi döndürüldü`);
    res.json({ success: true, posts });
  } catch (error) {
    console.error("API post geçmişi hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/api/scheduled-posts/:id", requireAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return res.status(400).json({ success: false, message: "Geçersiz gönderi ID" });
    }
    console.log(`❌ Gönderi iptali istendi - Post ID: ${postId}, Kullanıcı: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username}`);
    const result = dbOperations.cancelScheduledPost(postId, req.userId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Post not found or already processed",
      });
    }

    console.log(`✅ Gönderi başarıyla iptal edildi (ID: ${postId})`);
    res.json({ success: true, message: "Post cancelled successfully" });
  } catch (error) {
    console.error("API zamanlanmış gönderi iptal etme hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Permanently delete a scheduled post
app.delete(
  "/api/scheduled-posts/:id/permanent",
  requireAuth,
  async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ success: false, message: "Geçersiz gönderi ID" });
      }
      console.log(`🗑️ Gönderi kalıcı silme istendi - Post ID: ${postId}, Kullanıcı: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username}`);
      const result = dbOperations.deleteScheduledPost(postId, req.userId);

      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          message: "Post not found or already processed",
        });
      }

      console.log(`🗑️ Gönderi kalıcı olarak silindi (ID: ${postId})`);
      res.json({ success: true, message: "Post permanently deleted" });
    } catch (error) {
      console.error("API zamanlanmış gönderi kalıcı silme hatası:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Update a scheduled post
app.put("/api/scheduled-posts/:id", requireAuth, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return res.status(400).json({ success: false, message: "Geçersiz gönderi ID" });
    }
    const { content, scheduledTime, metadata, resetStatus } = req.body;

    // Validate required fields
    if (!content || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: "Content and scheduledTime are required",
      });
    }

    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduledTime);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Scheduled time must be in the future",
      });
    }

    console.log(`📝 Gönderi güncelleme istendi - Post ID: ${postId}, Kullanıcı: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username}`);
    if (resetStatus) {
      console.log(`🔄 Gönderi durumu 'pending'e sıfırlanacak (ID: ${postId})`);
    }
    const result = dbOperations.updateScheduledPost(
      postId,
      {
        content,
        scheduledTime: scheduledDate.toISOString(),
        metadata: metadata || {},
        resetStatus: resetStatus // Reset to pending if requested
      },
      req.userId
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Post not found, already processed, or cannot be updated",
      });
    }

    console.log(`✅ Gönderi başarıyla güncellendi (ID: ${postId}) - Yeni zaman: ${scheduledDate.toLocaleString(LOCALE, { timeZone: TIMEZONE })}`);
    res.json({
      success: true,
      message: "Post updated successfully",
      scheduledTime: scheduledDate.toISOString(),
    });
  } catch (error) {
    console.error("API zamanlanmış gönderi güncelleme hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/admin/create-user", requireAuth, async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ success: false, message: "Bu işlem için admin yetkisi gerekli" });
    }

    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Kullanıcı adı ve şifre gerekli" });
    }

    if (username.length < 3) {
      return res.status(400).json({ success: false, message: "Kullanıcı adı en az 3 karakter olmalı" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Şifre en az 6 karakter olmalı" });
    }

    // Check if user already exists
    const existingUser = dbOperations.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Bu kullanıcı adı zaten alınmış" });
    }

    // Create password hash
    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");

    // Create user with specified role
    const userId = dbOperations.createUser(username, passwordHash, role || 'user');

    console.log(`✅ Admin tarafından yeni kullanıcı oluşturuldu: ${username} (ID: ${userId}, Rol: ${role})`);

    res.json({
      success: true,
      message: "Kullanıcı başarıyla oluşturuldu",
      userId
    });
  } catch (error) {
    console.error("Admin kullanıcı oluşturma hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put("/api/admin/users/:id/username", requireAuth, async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ success: false, message: "Bu işlem için admin yetkisi gerekli" });
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: "Geçersiz kullanıcı ID" });
    }
    const { username } = req.body;

    if (!username || username.length < 3) {
      return res.status(400).json({ success: false, message: "Kullanıcı adı en az 3 karakter olmalı" });
    }

    // Check if username is already taken by someone else
    const existingUser = dbOperations.getUserByUsername(username);
    if (existingUser && existingUser.id !== userId) {
      return res.status(409).json({ success: false, message: "Bu kullanıcı adı zaten alınmış" });
    }

    const result = dbOperations.updateUsername(userId, username);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    // Update all sessions for this user with new username
    Object.keys(SESSIONS).forEach(token => {
      if (SESSIONS[token].userId === userId) {
        SESSIONS[token].username = username;
      }
    });
    persistSessions();

    const targetUser = dbOperations.getUserById(userId);
    console.log(`📝 Admin tarafından kullanıcı adı güncellendi: ${targetUser?.username || 'Bilinmeyen'} (ID: ${userId}) -> ${username}`);
    res.json({ success: true, message: "Kullanıcı adı güncellendi" });
  } catch (error) {
    console.error("Admin kullanıcı adı güncelleme hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Profile endpoints
app.put("/api/profile/username", requireAuth, async (req, res) => {
  try {
    const { username } = req.body;
    const currentUserId = req.userId;

    if (!username || username.length < 3) {
      return res.status(400).json({ success: false, message: "Kullanıcı adı en az 3 karakter olmalı" });
    }

    // Check if username is already taken by someone else
    const existingUser = dbOperations.getUserByUsername(username);
    if (existingUser && existingUser.id !== currentUserId) {
      return res.status(409).json({ success: false, message: "Bu kullanıcı adı zaten alınmış" });
    }

    // Update username in database (we need to add this function)
    try {
      const result = dbOperations.updateUsername(currentUserId, username);
      if (result.changes === 0) {
        return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı" });
      }

      // Update session with new username
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (token && SESSIONS[token]) {
        SESSIONS[token].username = username;
        persistSessions();
      }

      console.log(`📝 Kullanıcı kendi adını güncelledi: ${getUsernameById(currentUserId)} (ID: ${currentUserId}) -> ${username}`);
      res.json({ success: true, message: "Kullanıcı adı güncellendi" });
    } catch (error) {
      console.error("Kullanıcı adı güncelleme hatası:", error);
      res.status(500).json({ success: false, message: "Kullanıcı adı güncellenemedi" });
    }
  } catch (error) {
    console.error("Profil güncelleme hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put("/api/profile/password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Mevcut şifre ve yeni şifre gerekli" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Yeni şifre en az 6 karakter olmalı" });
    }

    // Get current user
    const user = dbOperations.getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    // Verify current password
    const currentPasswordHash = crypto.createHash("sha256").update(currentPassword).digest("hex");
    if (currentPasswordHash !== user.password_hash) {
      return res.status(401).json({ success: false, message: "Mevcut şifre yanlış" });
    }

    // Update password
    const newPasswordHash = crypto.createHash("sha256").update(newPassword).digest("hex");
    const result = dbOperations.updateUserPassword(userId, newPasswordHash);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    console.log(`🔒 Kullanıcı kendi şifresini değiştirdi: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username} (ID: ${userId})`);
    res.json({ success: true, message: "Şifre başarıyla değiştirildi" });
  } catch (error) {
    console.error("Şifre değiştirme hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Profile credentials endpoints
app.get("/api/profile/credentials", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    console.log(`🔑 API bilgileri istendi - Kullanıcı: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username}`);
    const credentials = dbOperations.getUserCredentials(userId);

    res.json({
      success: true,
      credentials: credentials || {
        twitter_api_key: null,
        twitter_api_secret: null,
        twitter_access_token: null,
        twitter_access_token_secret: null,
        gemini_api_key: null,
        gemini_model: 'gemini-2.5-flash'
      }
    });
  } catch (error) {
    console.error("API bilgileri yükleme hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put("/api/profile/credentials", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const credentials = req.body;

    const result = dbOperations.updateUserCredentials(userId, credentials);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    console.log(`🔧 Kullanıcı API bilgileri güncellendi: ${SESSIONS[req.headers.authorization?.replace("Bearer ", "")]?.username} (ID: ${userId})`);
    res.json({ success: true, message: "API bilgileri güncellendi" });
  } catch (error) {
    console.error("API bilgileri güncelleme hatası:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(3001, async () => {
  // Run database migrations first
  try {
    await runMigrations();
  } catch (error) {
    console.error("Migration hatası:", error);
    process.exit(1);
  }
  
  // Set up console override after migrations are complete
  global.logWithFile = (fileName, ...args) => originalLog(`[${getTimestamp()}] ${fileName} ->>`, ...args);
  global.errorWithFile = (fileName, ...args) => originalError(`[${getTimestamp()}] ${fileName} ->>`, ...args);
  
  console.log = (...args) => originalLog(`[${getTimestamp()}] ${FILE_NAME} ->>`, ...args);
  console.error = (...args) => originalError(`[${getTimestamp()}] ${FILE_NAME} ->>`, ...args);
  console.warn = (...args) => originalWarn(`[${getTimestamp()}] ${FILE_NAME} ->>`, ...args);

  console.log("Sunucu http://localhost:3001 adresinde çalışıyor");
  console.log("Desteklenen özellikler: tweetler ve anketler!");
  console.log("API endpoint'leri /api/* adresinde mevcut");

  // Start the scheduler
  startScheduler();
});
