import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// Note: Console timestamps are handled by index.js

// Store original console methods before any override
const originalConsole = { log: console.log, error: console.error };

// Use global logging functions with file name - lazy evaluation
const log = (...args) => {
  if (global.logWithFile) {
    global.logWithFile('database.js', ...args);
  } else {
    // Fallback for early initialization
    const timestamp = new Date().toLocaleString(process.env.LOCALE || 'tr-TR', { 
      timeZone: process.env.TZ || 'Europe/Istanbul' 
    });
    originalConsole.log(`[${timestamp}] database.js ->>`, ...args);
  }
};

const error = (...args) => {
  if (global.errorWithFile) {
    global.errorWithFile('database.js', ...args);
  } else {
    // Fallback for early initialization
    const timestamp = new Date().toLocaleString(process.env.LOCALE || 'tr-TR', { 
      timeZone: process.env.TZ || 'Europe/Istanbul' 
    });
    originalConsole.error(`[${timestamp}] database.js ->>`, ...args);
  }
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "smarttweet.db");

// Initialize database
const db = new Database(dbPath);

// Helper function to get username by user ID from database
const getUsernameById = (userId) => {
  try {
    const stmt = db.prepare("SELECT username FROM users WHERE id = ?");
    const user = stmt.get(userId);
    return user?.username || 'Bilinmeyen';
  } catch (error) {
    return 'Bilinmeyen';
  }
};

// Create tables
const initDatabase = async () => {
  // Create users table
  const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
            twitter_api_key TEXT,
            twitter_api_secret TEXT,
            twitter_access_token TEXT,
            twitter_access_token_secret TEXT,
            gemini_api_key TEXT,
            gemini_model TEXT DEFAULT 'gemini-2.5-flash',
            content_enhancement_prompt TEXT,
            poll_generation_prompt TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

  db.exec(createUsersTable);

  // Create scheduled_posts table with user_id foreign key
  const createScheduledPostsTable = `
        CREATE TABLE IF NOT EXISTS scheduled_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            post_type TEXT NOT NULL CHECK(post_type IN ('post', 'poll')),
            scheduled_time DATETIME NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'posted', 'failed', 'cancelled')),
            platform TEXT DEFAULT 'twitter',
            metadata TEXT, -- JSON string for poll options, etc.
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            posted_at DATETIME,
            error_message TEXT,
            is_immediate BOOLEAN DEFAULT 0, -- 1 for immediate posts, 0 for scheduled
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `;

  db.exec(createScheduledPostsTable);


  // Create index for faster queries
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_scheduled_time ON scheduled_posts(scheduled_time, status)`
  );


  log("Veritabanı başarıyla başlatıldı");
};

// Database operations
export const dbOperations = {
  // User operations
  getUserByUsername: (username) => {
    try {
      log(`🔍 Kullanıcı sorgulanıyor: ${username}`);
      const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
      const user = stmt.get(username);
      log(`${user ? '✅' : '❌'} Kullanıcı ${user ? 'bulundu' : 'bulunamadı'}: ${username}`);
      return user;
    } catch (error) {
      error("Kullanıcı sorgulama hatası:", error);
      throw error;
    }
  },

  getUserById: (userId) => {
    try {
      log(`🔍 Kullanıcı ID sorgulanıyor: ${userId}`);
      const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
      const user = stmt.get(userId);
      log(`${user ? '✅' : '❌'} Kullanıcı ${user ? `bulundu: ${user.username}` : 'bulunamadı'} (ID: ${userId})`);
      return user;
    } catch (error) {
      error("Kullanıcı ID sorgulama hatası:", error);
      throw error;
    }
  },

  createUser: (username, passwordHash, role = 'user') => {
    try {
      const defaultContentPrompt = `Bu basit sosyal medya gönderisini etkileşimli ve insancıl bir tweet'e dönüştür:

        Kurallar:
        - Konuşma dilinde ve doğal olsun
        - Doğal emoji kullan 
        - 280 karakterin altında tut
        - Zaman damgalarını temizle
        - Kişisel ve samimi hissettir
        - MUTLAKA TÜRKÇE yanıt ver
        - HİÇBİR HASHTAG KULLANMA
        
        Orijinal: "{content}"
        
        Geliştirilmiş versiyon:`;

      const defaultPollPrompt = `Bu anket sorusu için 2-4 tane mantıklı ve gerçekçi seçenek oluştur. Her türlü konuya uygun seçenekler üretebilmelisin.
        
        SADECE JSON array formatında döndür: ["seçenek1", "seçenek2", "seçenek3", "seçenek4"]
        
        Soru: "{question}"
        
        ÖNEMLİ KURALLAR:
        - Sorunun konusunu analiz et ve o konuya uygun seçenekler üret
        - Spor, teknoloji, yemek, müzik, film, eğitim, günlük yaşam gibi her konuda seçenek üretebilmelisin
        - Seçenekler gerçekçi ve popüler olmalı
        - 2-4 seçenek arası döndür
        - SADECE JSON array, başka hiçbir metin ekleme
        
        Yanıt:`;

      const stmt = db.prepare(
        "INSERT INTO users (username, password_hash, role, content_enhancement_prompt, poll_generation_prompt) VALUES (?, ?, ?, ?, ?)"
      );
      log(`👤 Yeni kullanıcı oluşturuluyor: ${username} (Rol: ${role})`);
      const result = stmt.run(username, passwordHash, role, defaultContentPrompt, defaultPollPrompt);
      log(`✅ Kullanıcı başarıyla oluşturuldu: ${username} (ID: ${result.lastInsertRowid})`);
      return result.lastInsertRowid;
    } catch (error) {
      error("Kullanıcı oluşturma hatası:", error);
      throw error;
    }
  },

  getUserCount: () => {
    try {
      log('📊 Toplam kullanıcı sayısı sorgulanıyor');
      const stmt = db.prepare("SELECT COUNT(*) as count FROM users");
      const count = stmt.get().count;
      log(`📈 Toplam kullanıcı sayısı: ${count}`);
      return count;
    } catch (error) {
      error("Kullanıcı sayısı sorgulama hatası:", error);
      throw error;
    }
  },

  getAllUsers: () => {
    try {
      log('👥 Tüm kullanıcı listesi sorgulanıyor');
      const stmt = db.prepare("SELECT id, username, role, created_at FROM users ORDER BY created_at DESC");
      const users = stmt.all();
      log(`📋 ${users.length} kullanıcı bilgisi alındı`);
      return users;
    } catch (error) {
      error("Tüm kullanıcıları sorgulama hatası:", error);
      throw error;
    }
  },

  getAllPostsForAdmin: () => {
    log('📊 Admin için tüm postlar sorgulanıyor');
    const stmt = db.prepare(`
      SELECT sp.*, u.username 
      FROM scheduled_posts sp 
      JOIN users u ON sp.user_id = u.id 
      ORDER BY sp.scheduled_time DESC
    `);

    const posts = stmt.all();
    log(`📈 Admin için ${posts.length} post bilgisi alındı`);
    return posts.map(post => ({
      ...post,
      metadata: JSON.parse(post.metadata || '{}')
    }));
  },

  updateUserRole: (userId, role) => {
    try {
      log(`🔧 Kullanıcı rolü güncelleniyor - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId}) -> ${role}`);
      const stmt = db.prepare("UPDATE users SET role = ? WHERE id = ?");
      const result = stmt.run(role, userId);
      log(`${result.changes > 0 ? '✅' : '❌'} Rol güncelleme ${result.changes > 0 ? 'başarılı' : 'başarısız'} - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
      return result;
    } catch (error) {
      error("Kullanıcı rolü güncelleme hatası:", error);
      throw error;
    }
  },

  updateUserPassword: (userId, passwordHash) => {
    try {
      log(`🔒 Kullanıcı şifresi güncelleniyor - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
      const stmt = db.prepare("UPDATE users SET password_hash = ? WHERE id = ?");
      const result = stmt.run(passwordHash, userId);
      log(`${result.changes > 0 ? '✅' : '❌'} Şifre güncelleme ${result.changes > 0 ? 'başarılı' : 'başarısız'} - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
      return result;
    } catch (error) {
      error("Kullanıcı şifresi güncelleme hatası:", error);
      throw error;
    }
  },

  updateUsername: (userId, username) => {
    try {
      const oldUsername = getUsernameById(userId);
      log(`📝 Kullanıcı adı güncelleniyor - Kullanıcı: ${oldUsername} (ID: ${userId}) -> ${username}`);
      const stmt = db.prepare("UPDATE users SET username = ? WHERE id = ?");
      const result = stmt.run(username, userId);
      log(`${result.changes > 0 ? '✅' : '❌'} Kullanıcı adı güncelleme ${result.changes > 0 ? 'başarılı' : 'başarısız'} - ${oldUsername} -> ${username} (ID: ${userId})`);
      return result;
    } catch (error) {
      error("Kullanıcı adı güncelleme hatası:", error);
      throw error;
    }
  },

  updateUserCredentials: (userId, credentials) => {
    try {
      const { twitterApiKey, twitterApiSecret, twitterAccessToken, twitterAccessTokenSecret, geminiApiKey, geminiModel, contentPrompt, pollPrompt } = credentials;
      const stmt = db.prepare(`
        UPDATE users SET 
          twitter_api_key = ?,
          twitter_api_secret = ?,
          twitter_access_token = ?,
          twitter_access_token_secret = ?,
          gemini_api_key = ?,
          gemini_model = ?,
          content_enhancement_prompt = ?,
          poll_generation_prompt = ?
        WHERE id = ?
      `);
      log(`🔧 API bilgileri güncelleniyor - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
      const result = stmt.run(twitterApiKey, twitterApiSecret, twitterAccessToken, twitterAccessTokenSecret, geminiApiKey, geminiModel, contentPrompt, pollPrompt, userId);
      log(`${result.changes > 0 ? '✅' : '❌'} API bilgileri güncelleme ${result.changes > 0 ? 'başarılı' : 'başarısız'} - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
      return result;
    } catch (error) {
      error("Kullanıcı bilgileri güncelleme hatası:", error);
      throw error;
    }
  },

  getUserCredentials: (userId) => {
    try {
      log(`🔑 API bilgileri alınıyor - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
      const stmt = db.prepare(`
        SELECT twitter_api_key, twitter_api_secret, twitter_access_token, twitter_access_token_secret, gemini_api_key, gemini_model,
               content_enhancement_prompt, poll_generation_prompt
        FROM users WHERE id = ?
      `);
      const credentials = stmt.get(userId);
      log(`${credentials ? '✅' : '❌'} API bilgileri ${credentials ? 'alındı' : 'bulunamadı'} - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
      return credentials;
    } catch (error) {
      error("Kullanıcı bilgileri sorgulama hatası:", error);
      throw error;
    }
  },
  // Create a posted (immediate) post record
  createPostedPost: (content, postType, userId, metadata = {}) => {
    try {
      const now = new Date().toISOString();
      const stmt = db.prepare(`
              INSERT INTO scheduled_posts (user_id, content, post_type, scheduled_time, status, posted_at, metadata, is_immediate, created_at)
              VALUES (?, ?, ?, ?, 'posted', ?, ?, 1, ?)
          `);

      log(`📝 Gönderilen post kaydediliyor - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId}), Tür: ${postType}`);
      const result = stmt.run(
        userId,
        content,
        postType,
        now, // scheduled_time = posted_at for immediate posts
        now, // posted_at
        JSON.stringify(metadata),
        now // created_at
      );
      log(`✅ Gönderilen post kaydedildi (ID: ${result.lastInsertRowid})`);
      return result.lastInsertRowid;
    } catch (error) {
      error("Gönderilen post kaydetme hatası:", error);
      throw error;
    }
  },

  // Create a new scheduled post
  createScheduledPost: (postData, userId) => {
    try {
      const now = new Date().toISOString();
      const stmt = db.prepare(`
              INSERT INTO scheduled_posts (user_id, content, post_type, scheduled_time, metadata, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
          `);

      log(`📝 Zamanlanmış gönderi oluşturuluyor - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId}), Tür: ${postData.postType}`);
      const result = stmt.run(
        userId,
        postData.content,
        postData.postType,
        postData.scheduledTime,
        JSON.stringify(postData.metadata || {}),
        now
      );
      log(`✅ Zamanlanmış gönderi oluşturuldu (ID: ${result.lastInsertRowid}) - ${postData.scheduledTime}`);
      return result.lastInsertRowid;
    } catch (error) {
      error("Zamanlanmış gönderi oluşturma hatası:", error);
      throw error;
    }
  },

  // Get posts due for publishing
  getPostsDueForPublishing: () => {
    try {
      log('⏰ Yayınlanmaya hazır postlar sorgulanıyor');
      const stmt = db.prepare(`
              SELECT * FROM scheduled_posts 
              WHERE status = 'pending' 
              ORDER BY scheduled_time ASC
          `);

      const now = new Date();

      const allPending = stmt.all();
      const duePosts = allPending
        .map((post) => ({
          ...post,
          metadata: JSON.parse(post.metadata || "{}"),
        }))
        .filter((post) => new Date(post.scheduled_time) <= now);
      log(`📊 ${allPending.length} bekleyen post, ${duePosts.length} tanesi yayınlanmaya hazır`);
      return duePosts;
    } catch (error) {
      error("Yayınlanacak gönderiler sorgulama hatası:", error);
      throw error;
    }
  },

  // Get all scheduled posts for a user
  getAllScheduledPosts: (userId) => {
    log(`📋 Kullanıcının tüm zamanlanmış postları sorgulanıyor - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
    const stmt = db.prepare(`
            SELECT * FROM scheduled_posts 
            WHERE user_id = ? AND is_immediate = 0
            ORDER BY scheduled_time DESC
        `);

    const posts = stmt.all(userId);
    log(`📊 Kullanıcı için ${posts.length} zamanlanmış gönderi alındı - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
    return posts.map((post) => ({
      ...post,
      metadata: JSON.parse(post.metadata || "{}"),
    }));
  },

  // Get only immediate (directly posted) posts for history view
  getAllPostsHistory: (userId) => {
    log(`📚 Kullanıcının sadece direkt gönderilmiş post geçmişi sorgulanıyor - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
    const stmt = db.prepare(`
            SELECT * FROM scheduled_posts 
            WHERE user_id = ? AND status = 'posted' AND is_immediate = 1
            ORDER BY posted_at DESC
        `);

    const posts = stmt.all(userId);
    log(`📊 Kullanıcı için ${posts.length} gönderilmiş post geçmişi alındı - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
    return posts.map((post) => ({
      ...post,
      metadata: JSON.parse(post.metadata || "{}"),
    }));
  },

  // Get pending scheduled posts for a user
  getPendingScheduledPosts: (userId) => {
    log(`⏳ Kullanıcının bekleyen postları sorgulanıyor - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
    const stmt = db.prepare(`
            SELECT * FROM scheduled_posts 
            WHERE user_id = ? AND status = 'pending'
            ORDER BY scheduled_time ASC
        `);

    const posts = stmt.all(userId);
    log(`📊 Kullanıcı için ${posts.length} bekleyen gönderi alındı - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
    return posts.map((post) => ({
      ...post,
      metadata: JSON.parse(post.metadata || "{}"),
    }));
  },

  // Update post status
  updatePostStatus: (postId, status, errorMessage = null, postedAt = null) => {
    try {
      const stmt = db.prepare(`
              UPDATE scheduled_posts 
              SET status = ?, error_message = ?, posted_at = ?
              WHERE id = ?
          `);

      log(`🔄 Post durumu güncelleniyor: ID ${postId} -> ${status}`);
      const result = stmt.run(
        status,
        errorMessage,
        postedAt || new Date().toISOString(),
        postId
      );
      log(`${result.changes > 0 ? '✅' : '❌'} Post durumu ${result.changes > 0 ? 'güncellendi' : 'güncellenemedi'}: ID ${postId}`);
      return result;
    } catch (error) {
      error("Gönderi durumu güncelleme hatası:", error);
      throw error;
    }
  },

  // Delete/cancel a scheduled post
  cancelScheduledPost: (postId, userId) => {
    log(`❌ Post iptal ediliyor: ID ${postId} - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
    const stmt = db.prepare(`
            UPDATE scheduled_posts 
            SET status = 'cancelled'
            WHERE id = ? AND user_id = ? AND status = 'pending'
        `);

    const result = stmt.run(postId, userId);
    log(`${result.changes > 0 ? '✅' : '❌'} Post ${result.changes > 0 ? 'başarıyla iptal edildi' : 'iptal edilemedi'}: ID ${postId}`);
    return result;
  },

  // Permanently delete a scheduled post
  deleteScheduledPost: (postId, userId) => {
    log(`🗑️ Post kalıcı olarak siliniyor: ID ${postId} - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
    const stmt = db.prepare(`
            DELETE FROM scheduled_posts 
            WHERE id = ? AND user_id = ? AND status IN ('pending', 'cancelled')
        `);

    const result = stmt.run(postId, userId);
    log(`${result.changes > 0 ? '✅' : '❌'} Post ${result.changes > 0 ? 'başarıyla silindi' : 'silinemedi'}: ID ${postId}`);
    return result;
  },

  // Update a scheduled post
  updateScheduledPost: (postId, updateData, userId) => {
    const { content, scheduledTime, metadata, resetStatus } = updateData;

    let stmt;
    if (resetStatus) {
      // If resetting status, also reset error_message and posted_at
      stmt = db.prepare(`
              UPDATE scheduled_posts 
              SET content = ?, scheduled_time = ?, metadata = ?, status = 'pending', error_message = NULL, posted_at = NULL
              WHERE id = ? AND user_id = ?
          `);
    } else {
      stmt = db.prepare(`
              UPDATE scheduled_posts 
              SET content = ?, scheduled_time = ?, metadata = ?
              WHERE id = ? AND user_id = ? AND status = 'pending'
          `);
    }

    log(`📝 Post güncelleniyor: ID ${postId}, ${resetStatus ? 'Durum sıfırlanacak' : 'Durum korunacak'}`);
    const result = stmt.run(
      content,
      scheduledTime,
      JSON.stringify(metadata || {}),
      postId,
      userId
    );
    log(`${result.changes > 0 ? '✅' : '❌'} Post ${result.changes > 0 ? 'başarıyla güncellendi' : 'güncellenemedi'}: ID ${postId}`);
    return result;
  },

  // Get post by ID (with user check)
  getScheduledPostById: (postId, userId) => {
    log(`🔍 Belirli post sorgulanıyor: ID ${postId} - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
    const stmt = db.prepare(`
            SELECT * FROM scheduled_posts WHERE id = ? AND user_id = ?
        `);

    const post = stmt.get(postId, userId);
    if (post) {
      post.metadata = JSON.parse(post.metadata || "{}");
    }
    log(`${post ? '✅' : '❌'} Post ${post ? 'bulundu' : 'bulunamadı'}: ID ${postId}`);
    return post;
  },
};

// Initialize database on import
(async () => {
  await initDatabase();
})();

export default db;
