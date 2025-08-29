import { config } from "dotenv";
import { TwitterApi } from "twitter-api-v2";
import { dbOperations } from "./database.js";
config();

// Note: Console timestamps are handled by index.js

// Store original console methods before any override
const originalConsole = { log: console.log, error: console.error };

// Use global logging functions with file name - lazy evaluation
const log = (...args) => {
  if (global.logWithFile) {
    global.logWithFile('mcp.tool.js', ...args);
  } else {
    const timestamp = new Date().toLocaleString(process.env.LOCALE || 'tr-TR', { 
      timeZone: process.env.TZ || 'Europe/Istanbul' 
    });
    originalConsole.log(`[${timestamp}] mcp.tool.js ->>`, ...args);
  }
};

const error = (...args) => {
  if (global.errorWithFile) {
    global.errorWithFile('mcp.tool.js', ...args);
  } else {
    const timestamp = new Date().toLocaleString(process.env.LOCALE || 'tr-TR', { 
      timeZone: process.env.TZ || 'Europe/Istanbul' 
    });
    originalConsole.error(`[${timestamp}] mcp.tool.js ->>`, ...args);
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

// Create Twitter client for specific user
const createTwitterClient = (userId) => {
  log(`🔑 Twitter istemcisi oluşturuluyor - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
  const credentials = dbOperations.getUserCredentials(userId);

  if (!credentials || !credentials.twitter_api_key || !credentials.twitter_api_secret ||
    !credentials.twitter_access_token || !credentials.twitter_access_token_secret) {
    throw new Error("Kullanıcının Twitter API bilgileri eksik. Lütfen profil ayarlarından API bilgilerinizi girin.");
  }

  log(`✅ Twitter istemcisi oluşturuldu - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
  return new TwitterApi({
    appKey: credentials.twitter_api_key,
    appSecret: credentials.twitter_api_secret,
    accessToken: credentials.twitter_access_token,
    accessSecret: credentials.twitter_access_token_secret,
  });
};

// Get user's Gemini API key and model
const getUserGeminiKey = (userId) => {
  log(`🤖 Gemini API anahtarı alınıyor - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
  const credentials = dbOperations.getUserCredentials(userId);
  const apiKey = credentials?.gemini_api_key || process.env.GEMINI_API_KEY;
  log(`${apiKey ? '✅' : '❌'} Gemini API ${apiKey ? 'bulundu' : 'bulunamadı'}${credentials?.gemini_api_key ? ' (Kullanıcı API)' : ' (Global API)'}`);
  return apiKey;
};

const getUserGeminiModel = (userId) => {
  const credentials = dbOperations.getUserCredentials(userId);
  const model = credentials?.gemini_model || 'gemini-2.5-flash';
  log(`🤖 Gemini modeli: ${model} - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})`);
  return model;
};

// Default prompts (exported for frontend use)
export const DEFAULT_CONTENT_PROMPT = `Bu basit sosyal medya gönderisini etkileşimli ve insancıl bir tweet'e dönüştür:

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

export const DEFAULT_POLL_PROMPT = `Bu anket sorusu için 2-4 tane mantıklı ve gerçekçi seçenek oluştur. Her türlü konuya uygun seçenekler üretebilmelisin.
        
        SADECE JSON array formatında döndür: ["seçenek1", "seçenek2", "seçenek3", "seçenek4"]
        
        Soru: "{question}"
        
        ÖNEMLİ KURALLAR:
        - Sorunun konusunu analiz et ve o konuya uygun seçenekler üret
        - Spor, teknoloji, yemek, müzik, film, eğitim, günlük yaşam gibi her konuda seçenek üretebilmelisin
        - Seçenekler gerçekçi ve popüler olmalı
        - 2-4 seçenek arası döndür
        - SADECE JSON array, başka hiçbir metin ekleme
        
        Yanıt:`;

// Get user's custom prompts with fallbacks
const getUserPrompts = (userId) => {
  const credentials = dbOperations.getUserCredentials(userId);
  return {
    contentPrompt: credentials?.content_enhancement_prompt || DEFAULT_CONTENT_PROMPT,
    pollPrompt: credentials?.poll_generation_prompt || DEFAULT_POLL_PROMPT
  };
};

// Helper function to enhance content with AI
export async function enhanceContent(basicContent, userId = null) {
  try {
    log(`✨ AI içerik geliştirmesi başlatılıyor${userId ? ` - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})` : ' - Global ayar'}`);
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const apiKey = userId ? getUserGeminiKey(userId) : process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Gemini API anahtarı bulunamadı");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = userId ? getUserGeminiModel(userId) : process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    // Get user's custom prompts or use default Turkish prompt
    const userPrompts = userId ? getUserPrompts(userId) : null;

    const prompt = (userPrompts?.contentPrompt || `Bu basit sosyal medya gönderisini etkileşimli ve insancıl bir tweet'e dönüştür:

        Kurallar:
        - Konuşma dilinde ve doğal olsun
        - Doğal emoji kullan 
        - 280 karakterin altında tut
        - Zaman damgalarını temizle
        - Kişisel ve samimi hissettir
        - MUTLAKA TÜRKÇE yanıt ver
        - HİÇBİR HASHTAG KULLANMA
        
        Orijinal: "{content}"
        
        Geliştirilmiş versiyon:`).replace('{content}', basicContent);

    const result = await model.generateContent(prompt);
    const enhanced = result.response.text().trim();
    log(`✅ AI içerik geliştirmesi tamamlandı - ${enhanced.substring(0, 50)}...`);
    
    // Remove quotes if the AI wrapped the response in them
    return enhanced.replace(/^["']|["']$/g, "");
  } catch (error) {
    error("İçerik geliştirme hatası:", error);
    // Fallback: just remove timestamp and return original, with error handling
    try {
      return basicContent.replace(
        /\s*—\s*\d{1,2}:\d{2}:\d{2}\s*(AM|PM)?\s*$/,
        ""
      );
    } catch (regexError) {
      error("Regex işlemi başarısız:", regexError);
      return basicContent; // Return as-is if regex fails
    }
  }
}

// Helper function to extract poll options from question using AI
export async function extractPollOptions(question, userId = null) {
  try {
    log(`🗳️ AI anket seçeneği çıkarma başlatılıyor${userId ? ` - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})` : ' - Global ayar'}`);
    log(`💬 Anket sorusu: ${question}`);
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const apiKey = userId ? getUserGeminiKey(userId) : process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Gemini API anahtarı bulunamadı");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = userId ? getUserGeminiModel(userId) : 'gemini-2.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    // Get user's custom prompts or use default
    const userPrompts = userId ? getUserPrompts(userId) : null;
    const prompt = (userPrompts?.pollPrompt || `Bu anket sorusu için 2-4 tane mantıklı ve gerçekçi seçenek oluştur. Her türlü konuya uygun seçenekler üretebilmelisin.
        
        SADECE JSON array formatında döndür: ["seçenek1", "seçenek2", "seçenek3", "seçenek4"]
        
        Soru: "{question}"
        
        ÖNEMLİ KURALLAR:
        - Sorunun konusunu analiz et ve o konuya uygun seçenekler üret
        - Spor, teknoloji, yemek, müzik, film, eğitim, günlük yaşam gibi her konuda seçenek üretebilmelisin
        - Seçenekler gerçekçi ve popüler olmalı
        - 2-4 seçenek arası döndür
        - SADECE JSON array, başka hiçbir metin ekleme
        
        Örnekler:
        - "En iyi programlama dili?" → ["JavaScript", "Python", "Java", "C++"]
        - "Bu sezon şampiyon kim olacak?" → ["Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor"]
        - "En sevdiğiniz yemek?" → ["Pizza", "Köfte", "Döner", "Makarna"]
        - "Hangi müzik türünü dinliyorsunuz?" → ["Pop", "Rock", "Hip-hop", "Türk Halk Müziği"]
        
        Yanıt:`).replace('{question}', question);

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    // Try to parse the JSON response (handle markdown format)
    try {
      // Clean up markdown formatting if present
      let cleanResponse = response
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/gi, "")
        .trim();

      let options;
      try {
        options = JSON.parse(cleanResponse);
      } catch (jsonError) {
        error("Anket seçenekleri JSON parse hatası:", jsonError);
        throw new Error("AI yanıtı geçersiz JSON formatında");
      }

      if (
        Array.isArray(options) &&
        options.length >= 2 &&
        options.length <= 4
      ) {
        // Ensure each option is max 25 characters (Twitter limit)
        const trimmedOptions = options
          .slice(0, 4)
          .map(option =>
            typeof option === 'string' && option.length > 25
              ? option.substring(0, 25)
              : option
          );
        log(`✅ AI anket seçenekleri başarıyla üretildi: ${trimmedOptions.join(', ')}`);
        return trimmedOptions;
      }
    } catch (parseError) {
      error("AI yanıtı JSON olarak ayrıştırılamadı:", response);
    }

    // Fallback: extract from common patterns
    log('⚠️ AI yanıtı geçersiz, fallback seçenekler kullanılıyor');
    const fallbackOptions = extractFallbackOptions(question);
    log(`🔄 Fallback seçenekler: ${fallbackOptions.join(', ')}`);
    return fallbackOptions;
  } catch (error) {
    error("❌ Anket seçeneği çıkarma hatası:", error);
    log('⚠️ Hata nedeniyle fallback seçenekler kullanılıyor');
    const fallbackOptions = extractFallbackOptions(question);
    log(`🔄 Fallback seçenekler: ${fallbackOptions.join(', ')}`);
    return fallbackOptions;
  }
}

// Fallback option extraction with pattern matching
function extractFallbackOptions(question) {
  const lowerQuestion = question.toLowerCase();

  // Basic fallback patterns - only used if AI completely fails
  const basicPatterns = {
    programming: ["JavaScript", "Python", "Java", "C++"],
    programlama: ["JavaScript", "Python", "Java", "C++"],
    "social media": ["Instagram", "Twitter/X", "LinkedIn", "TikTok"],
    "sosyal medya": ["Instagram", "Twitter/X", "LinkedIn", "TikTok"],
    time: ["Sabah", "Öğle", "Akşam", "Gece"],
    saat: ["Sabah", "Öğle", "Akşam", "Gece"],
    zaman: ["Sabah", "Öğle", "Akşam", "Gece"],
  };

  // Check for basic pattern matches (only as last resort)
  for (const [pattern, options] of Object.entries(basicPatterns)) {
    if (lowerQuestion.includes(pattern)) {
      return options;
    }
  }

  // If no pattern matches, create generic options based on question type
  if (
    lowerQuestion.includes("best") ||
    lowerQuestion.includes("favorite") ||
    lowerQuestion.includes("en iyi") ||
    lowerQuestion.includes("favori")
  ) {
    return ["Seçenek A", "Seçenek B", "Seçenek C", "Diğer"];
  } else if (
    lowerQuestion.includes("do you") ||
    lowerQuestion.includes("would you") ||
    lowerQuestion.includes("yapıyor musun") ||
    lowerQuestion.includes("ister misin")
  ) {
    return ["Evet", "Hayır", "Belki", "Emin değilim"];
  } else {
    return ["Evet", "Hayır"]; // Final fallback
  }
}

// Your existing createPost function - without enhancement (done at schedule time)
// Scheduler version that throws errors
export async function createPostForScheduler(status, userId = null) {
  try {
    log(`🚀 Tweet gönderimi başlatılıyor${userId ? ` - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})` : ' - Global API'}`);
    log(`📝 Tweet içeriği: ${status.substring(0, 100)}${status.length > 100 ? '...' : ''}`);
    const twitterClient = userId ? createTwitterClient(userId) :
      new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
      });

    const response = await twitterClient.v2.tweet(status);
    log(`✅ Tweet başarıyla gönderildi - ID: ${response.data?.id}`);
    return response;
  } catch (error) {
    error("❌ Tweet gönderme hatası:", error);
    throw error; // Throw for scheduler
  }
}

// API version that returns error response
export async function createPost(status, userId = null) {
  try {
    log(`🚀 Tweet gönderimi başlatılıyor${userId ? ` - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})` : ' - Global API'}`);
    log(`📝 Tweet içeriği: ${status.substring(0, 100)}${status.length > 100 ? '...' : ''}`);
    const twitterClient = userId ? createTwitterClient(userId) :
      new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
      });

    const response = await twitterClient.v2.tweet(status);
    
    // Validate response before logging success
    if (!response.data?.id) {
      throw new Error('Tweet gönderildi ancak geçerli response alınamadı');
    }
    
    log(`✅ Tweet başarıyla gönderildi - ID: ${response.data.id}${userId ? ` - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})` : ' - Global API'}`);

    return {
      content: [
        {
          type: "text",
          text: `✅ Tweeted: ${status}`,
        },
      ],
    };
  } catch (error) {
    error("Twitter API Hatası:", error);

    // For API calls, throw the error so endpoint can handle it properly
    throw new Error(`Twitter API Hatası: ${error.message || error.code || 'Bilinmeyen hata'}`);
  }
}

// Scheduler version that throws errors
export async function createPollForScheduler(
  question,
  options = null,
  durationMinutes = 1440,
  originalQuestion = null,
  userId = null
) {
  try {
    log(`🗳️ Anket oluşturma başlatılıyor${userId ? ` - Kullanıcı: ${getUsernameById(userId)} (ID: ${userId})` : ' - Global API'}`);
    log(`📬 Anket sorusu: ${question}`);
    log(`⏱️ Süre: ${Math.floor(durationMinutes / 60)} saat`);
    let pollOptions = options;

    // If no options provided (null/undefined), extract them from the ORIGINAL question
    if (pollOptions === null || pollOptions === undefined) {
      log("⚠️ Anket seçeneği yok, AI ile üretilecek");
      const questionForOptions = originalQuestion || question; // Use original question if provided
      pollOptions = await extractPollOptions(questionForOptions, userId);
    } else {
      log(`📋 Hazır anket seçenekleri kullanılıyor: ${pollOptions.join(', ')}`);
    }

    // Validate options
    if (
      !Array.isArray(pollOptions) ||
      pollOptions.length < 2 ||
      pollOptions.length > 4
    ) {
      throw new Error("Polls must have between 2 and 4 options");
    }

    log(`🗳️ Final anket seçenekleri: ${pollOptions.join(', ')}`);

    const twitterClient = userId ? createTwitterClient(userId) :
      new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
      });

    log(`🚀 Anket Twitter'a gönderiliyor...`);
    const response = await twitterClient.v2.tweet({
      text: question,
      poll: {
        options: pollOptions,
        duration_minutes: durationMinutes,
      },
    });
    log(`✅ Anket başarıyla oluşturuldu - ID: ${response.data?.id}`);
    return response;
  } catch (error) {
    error("❌ Anket oluşturma hatası:", error);
    throw error; // Throw for scheduler
  }
}

// API version that returns error response
export async function createPoll(
  question,
  options = null,
  durationMinutes = 1440,
  originalQuestion = null,
  userId = null
) {
  try {
    log(`🗳️ Anket oluşturma başlatılıyor${userId ? ` - Kullanıcı ID: ${userId}` : ' - Global API'}`);
    log(`💬 Anket sorusu: ${question}`);
    log(`⏱️ Süre: ${Math.floor(durationMinutes / 60)} saat`);
    let pollOptions = options;

    // If no options provided (null/undefined), extract them from the ORIGINAL question
    if (pollOptions === null || pollOptions === undefined) {
      log("⚠️ Anket seçeneği yok, AI ile üretilecek");
      const questionForOptions = originalQuestion || question; // Use original question if provided
      pollOptions = await extractPollOptions(questionForOptions, userId);
    } else {
      log(`📋 Hazır anket seçenekleri kullanılıyor: ${pollOptions.join(', ')}`);
    }

    // Validate options
    if (
      !Array.isArray(pollOptions) ||
      pollOptions.length < 2 ||
      pollOptions.length > 4
    ) {
      return {
        content: [
          {
            type: "text",
            text: "❌ Error: Polls must have between 2 and 4 options.",
          },
        ],
      };
    }

    // Enhance the poll question
    // Content enhancement is now done at schedule time
    log(`🗳️ Final anket seçenekleri: ${pollOptions.join(', ')}`);

    const twitterClient = userId ? createTwitterClient(userId) :
      new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
      });

    log(`🚀 Anket Twitter'a gönderiliyor...`);
    const response = await twitterClient.v2.tweet({
      text: question,
      poll: {
        options: pollOptions,
        duration_minutes: durationMinutes,
      },
    });
    log(`✅ Anket başarıyla oluşturuldu - ID: ${response.data?.id}`);

    return {
      content: [
        {
          type: "text",
          text: `🗳️ Poll created: ${question}\nOptions: ${pollOptions.join(
            ", "
          )}\nDuration: ${Math.floor(durationMinutes / 60)} hours`,
        },
      ],
    };
  } catch (error) {
    error("Anket oluşturma hatası:", error);
    
    // For API calls, throw the error so endpoint can handle it properly
    throw new Error(`Anket oluşturma hatası: ${error.message || error.code || 'Bilinmeyen hata'}`);
  }
}
