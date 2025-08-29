import cron from "node-cron";
import { dbOperations } from "./database.js";
import { createPostForScheduler, createPollForScheduler } from "./mcp.tool.js";

// Note: Console timestamps are handled by index.js

// Store original console methods before any override
const originalConsole = { log: console.log, error: console.error };

// Use global logging functions with file name - lazy evaluation
const log = (...args) => {
  if (global.logWithFile) {
    global.logWithFile('scheduler.js', ...args);
  } else {
    const timestamp = new Date().toLocaleString(process.env.LOCALE || 'tr-TR', { 
      timeZone: process.env.TZ || 'Europe/Istanbul' 
    });
    originalConsole.log(`[${timestamp}] scheduler.js ->>`, ...args);
  }
};

const error = (...args) => {
  if (global.errorWithFile) {
    global.errorWithFile('scheduler.js', ...args);
  } else {
    const timestamp = new Date().toLocaleString(process.env.LOCALE || 'tr-TR', { 
      timeZone: process.env.TZ || 'Europe/Istanbul' 
    });
    originalConsole.error(`[${timestamp}] scheduler.js ->>`, ...args);
  }
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

// Note: Using scheduler versions that throw errors instead of returning error responses

// Function to publish a scheduled post
const publishScheduledPost = async (scheduledPost) => {
  const { id, post_type, content, metadata, user_id } = scheduledPost;

  log(`🚀 Zamanlanmış gönderi yayınlanıyor (ID: ${id}, Tür: ${post_type}) - Kullanıcı: ${getUsernameById(user_id)} (ID: ${user_id})`);
  log(`📝 İçerik: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);

  try {
    let result;

    switch (post_type) {
      case "post":
        result = await createPostForScheduler(content, user_id);
        break;

      case "poll":
        // Use preview poll options if available, otherwise fall back to metadata.options
        const pollOptions =
          metadata.previewPollOptions || metadata.options || null;
        result = await createPollForScheduler(
          content,
          pollOptions,
          metadata.durationMinutes || 1440,
          null,
          user_id
        );
        break;

      default:
        throw new Error(`Unknown post type: ${post_type}`);
    }

    // Only update status to posted if we reach this point without errors
    dbOperations.updatePostStatus(id, "posted", null, new Date().toISOString());
    log(`✅ Zamanlanmış gönderi başarıyla yayınlandı (ID: ${id}) - Kullanıcı: ${getUsernameById(user_id)} (ID: ${user_id})`);
    return result;
  } catch (error) {
    error(`❌ Zamanlanmış gönderi yayınlanamadı (ID: ${id}) - Kullanıcı: ${getUsernameById(user_id)} (ID: ${user_id}):`, error.message);

    // Update status to failed with error message
    dbOperations.updatePostStatus(id, "failed", error.message);

    throw error;
  }
};

// Function to check and publish due posts
const checkAndPublishDuePosts = async () => {
  try {
    const duePosts = dbOperations.getPostsDueForPublishing();

    if (duePosts.length === 0) {
      log('ℹ️ Yayınlanacak gönderi bulunamadı');
      return; // No posts due
    }

    log(`⏰ Yayınlanmaya hazır ${duePosts.length} gönderi bulundu`);

    // Process each due post
    for (const post of duePosts) {
      try {
        await publishScheduledPost(post);
      } catch (error) {
        // Continue with other posts even if one fails
        error(`❌ Gönderi yayınlanamadı (ID: ${post.id}), diğer postlarla devam ediliyor...`);
      }
    }
  } catch (error) {
    error("Zamanı gelen gönderiler kontrol edilirken hata:", error);
  }
};

// Start the scheduler
export const startScheduler = () => {
  log("🕐 Gönderi zamanlayıcısı başlatılıyor...");

  // Run every minute to check for due posts
  cron.schedule("* * * * *", async () => {
    log('⏰ Zamanlayıcı çalışıyor - zamanlanmış postlar kontrol ediliyor');
    await checkAndPublishDuePosts();
  });

  log(
    "✅ Zamanlayıcı başlatıldı - her dakika zamanlanmış gönderiler kontrol ediliyor"
  );
};

// Function to schedule a new post
export const schedulePost = (postData, userId) => {
  try {
    log(`⏰ Gönderi zamanlama istendi - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId}), Tür: ${postData.postType}`);
    log(`📅 Hedef zaman: ${new Date(postData.scheduledTime).toLocaleString(process.env.LOCALE || 'tr-TR', { timeZone: process.env.TZ || 'Europe/Istanbul' })}`);
    const postId = dbOperations.createScheduledPost(postData, userId);
    log(`✅ Gönderi başarıyla zamanlandı (ID: ${postId})`);
    return postId;
  } catch (error) {
    error("Gönderi zamanlanırken hata:", error);
    throw error;
  }
};
