import 'dotenv/config';
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "smarttweet.db");

// File identifier for logging
const log = (message) => {
  const timestamp = new Date().toLocaleString(process.env.LOCALE || 'tr-TR', { 
    timeZone: process.env.TZ || 'Europe/Istanbul' 
  });
  console.log(`[${timestamp}] migrate.js ->>`, message);
};

const error = (message, err) => {
  const timestamp = new Date().toLocaleString(process.env.LOCALE || 'tr-TR', { 
    timeZone: process.env.TZ || 'Europe/Istanbul' 
  });
  console.error(`[${timestamp}] migrate.js ->>`, message, err);
};

// Initialize database connection
const db = new Database(dbPath);

// Migration functions
const migrations = [
  {
    id: 1,
    name: 'add_is_immediate_column',
    description: 'Add is_immediate column to distinguish direct vs scheduled posts',
    run: () => {
      log('📊 Migration 1: is_immediate kolonu ekleniyor...');
      
      // Check if column already exists
      const columns = db.pragma("table_info(scheduled_posts)");
      const hasColumn = columns.some(col => col.name === 'is_immediate');
      
      if (hasColumn) {
        log('⚠️ is_immediate kolonu zaten mevcut, atlanıyor');
        return;
      }
      
      // Add the column
      db.exec('ALTER TABLE scheduled_posts ADD COLUMN is_immediate BOOLEAN DEFAULT 0');
      
      // Update existing records - all existing posts are considered scheduled (is_immediate = 0)
      const updateResult = db.exec('UPDATE scheduled_posts SET is_immediate = 0 WHERE is_immediate IS NULL');
      
      log('✅ is_immediate kolonu eklendi, mevcut kayıtlar güncellendi');
    }
  }
];

// Migration tracking table
const createMigrationTable = () => {
  log('🔧 Migration tablosu oluşturuluyor...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  log('✅ Migration tablosu hazır');
};

// Get applied migrations
const getAppliedMigrations = () => {
  const stmt = db.prepare('SELECT name FROM migrations');
  return stmt.all().map(row => row.name);
};

// Mark migration as applied
const markMigrationApplied = (migrationName) => {
  const stmt = db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)');
  stmt.run(migrationName.id, migrationName.name);
};

// Run all pending migrations
const runMigrations = () => {
  log('🚀 Migration işlemi başlatılıyor...');
  
  createMigrationTable();
  const appliedMigrations = getAppliedMigrations();
  
  log(`📋 ${appliedMigrations.length} migration zaten uygulanmış`);
  
  let pendingCount = 0;
  
  for (const migration of migrations) {
    if (!appliedMigrations.includes(migration.name)) {
      log(`⚡ Migration uygulanıyor: ${migration.name} - ${migration.description}`);
      
      try {
        migration.run();
        markMigrationApplied(migration);
        log(`✅ Migration tamamlandı: ${migration.name}`);
        pendingCount++;
      } catch (err) {
        error(`❌ Migration başarısız: ${migration.name}`, err);
        throw err;
      }
    } else {
      log(`⏭️ Migration atlanıyor (zaten uygulanmış): ${migration.name}`);
    }
  }
  
  if (pendingCount === 0) {
    log('ℹ️ Uygulanacak migration yok');
  } else {
    log(`🎉 ${pendingCount} migration başarıyla tamamlandı`);
  }
  
  db.close();
  log('🔒 Veritabanı bağlantısı kapatıldı');
};

// Run migrations if this file is executed directly
const currentFile = fileURLToPath(import.meta.url);
if (currentFile === process.argv[1]) {
  runMigrations();
}

export { runMigrations };