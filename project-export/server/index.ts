import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";
import path from "path";
import fs from "fs";

const app = express();
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      // Preserve raw body bytes so signed webhooks (e.g. /api/inbound-email)
      // can verify provider signatures over the exact payload.
      req.rawBody = buf.toString("utf8");
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files from uploads directory
const uploadsDir = path.join(import.meta.dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// SEO: explicitly tell crawlers the production app is indexable. This overrides
// any upstream `X-Robots-Tag: noindex` header (e.g. on some preview domains)
// when serving the real custom domain.
app.use((req, res, next) => {
  res.setHeader("X-Robots-Tag", "index, follow");
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Ensure required database columns exist (critical for production)
    // Retry logic for transient database errors (3 retries with 1s, 2s, 3s backoff)
    const maxRetries = 4; // Initial attempt + 3 retries
    let retryCount = 0;
    let schemaValidated = false;
    
    while (!schemaValidated && retryCount < maxRetries) {
      try {
        log(`Checking database schema... (attempt ${retryCount + 1}/${maxRetries})`);
        
        // Check if users table exists
        const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'users'
          );
        `);
        
        if (!tableCheck.rows[0].exists) {
          throw new Error("Users table does not exist. Database not initialized. Run: npm run db:push");
        }

        // Add missing columns (production may not have them yet)
        await pool.query(`
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS first_name VARCHAR,
          ADD COLUMN IF NOT EXISTS last_name VARCHAR;
        `);
        
        // Add extended profile fields for user directory
        await pool.query(`
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS tag VARCHAR UNIQUE,
          ADD COLUMN IF NOT EXISTS city VARCHAR,
          ADD COLUMN IF NOT EXISTS company VARCHAR,
          ADD COLUMN IF NOT EXISTS category VARCHAR,
          ADD COLUMN IF NOT EXISTS position VARCHAR,
          ADD COLUMN IF NOT EXISTS interests TEXT,
          ADD COLUMN IF NOT EXISTS about_me TEXT,
          ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
        `);
        
        // Backfill tags for existing users who don't have one
        const animals = ['cat', 'dog', 'fox', 'owl', 'bee', 'elk', 'bat', 'ant', 'emu', 'jay', 'ram', 'yak', 'cod', 'eel', 'koi', 'ray'];
        const usersWithoutTags = await pool.query(`SELECT id FROM users WHERE tag IS NULL`);
        for (const row of usersWithoutTags.rows) {
          let tag = '';
          let attempts = 0;
          while (attempts < 100) {
            const animal = animals[Math.floor(Math.random() * animals.length)];
            const number = Math.floor(100 + Math.random() * 900);
            tag = `${animal}${number}`;
            const existing = await pool.query(`SELECT id FROM users WHERE tag = $1`, [tag]);
            if (existing.rows.length === 0) break;
            attempts++;
          }
          if (tag) {
            await pool.query(`UPDATE users SET tag = $1 WHERE id = $2`, [tag, row.id]);
          }
        }
        
        // Add status column to livestreams for past/upcoming tracking
        await pool.query(`
          ALTER TABLE livestreams 
          ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'upcoming';
        `);

        // Add attendance tracking columns to event_registrations (critical for QR code attendance feature)
        await pool.query(`
          ALTER TABLE event_registrations 
          ADD COLUMN IF NOT EXISTS attendance_marked BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS attendance_time TIMESTAMP;
        `);
        
        // Add missing columns to course_tasks table (for LMS module organization and assessments)
        await pool.query(`
          ALTER TABLE course_tasks 
          ADD COLUMN IF NOT EXISTS module_id VARCHAR REFERENCES course_modules(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS task_type VARCHAR(20) NOT NULL DEFAULT 'assignment',
          ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 100,
          ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 60,
          ADD COLUMN IF NOT EXISTS due_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS available_from TIMESTAMP,
          ADD COLUMN IF NOT EXISTS time_limit INTEGER,
          ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 1,
          ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'published';
        `);
        
        // Add candidate_id and resume_url columns to job_applications
        await pool.query(`
          ALTER TABLE job_applications 
          ADD COLUMN IF NOT EXISTS candidate_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS resume_url TEXT;
        `);

        // Add missing columns to challenges table (debate challenges feature)
        await pool.query(`
          ALTER TABLE challenges 
          ADD COLUMN IF NOT EXISTS start_date TIMESTAMP,
          ADD COLUMN IF NOT EXISTS end_date TIMESTAMP,
          ADD COLUMN IF NOT EXISTS response_time_limit INTEGER,
          ADD COLUMN IF NOT EXISTS thumbnail_storage_key TEXT;
        `);
        
        // Create WhatsApp-style chat tables
        await pool.query(`
          CREATE TABLE IF NOT EXISTS conversations (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
            participant1_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            participant2_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            last_message_at TIMESTAMP DEFAULT NOW(),
            last_message_content TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          );
        `);
        
        await pool.query(`
          CREATE TABLE IF NOT EXISTS chat_messages_private (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
            conversation_id VARCHAR NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            sender_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            mentions TEXT[],
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            read_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
          );
        `);
        
        // Create multi-institution & community tables
        await pool.query(`
          CREATE TABLE IF NOT EXISTS universities (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, city TEXT, region TEXT,
            type VARCHAR(30) NOT NULL DEFAULT 'university', logo_url TEXT, website TEXT,
            short_description TEXT, created_at TIMESTAMP DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS clubs (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
            university_id VARCHAR REFERENCES universities(id) ON DELETE SET NULL,
            focus VARCHAR(30), description TEXT, logo_url TEXT,
            is_official BOOLEAN NOT NULL DEFAULT FALSE,
            is_partner_club BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS user_university_memberships (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            university_id VARCHAR NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
            role VARCHAR(20) NOT NULL DEFAULT 'student', created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, university_id)
          );
          CREATE TABLE IF NOT EXISTS user_club_memberships (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            club_id VARCHAR NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
            role VARCHAR(20) NOT NULL DEFAULT 'member', created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, club_id)
          );
          CREATE TABLE IF NOT EXISTS startup_affiliations (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            startup_id VARCHAR NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
            university_id VARCHAR REFERENCES universities(id) ON DELETE SET NULL,
            club_id VARCHAR REFERENCES clubs(id) ON DELETE SET NULL,
            is_primary BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS startup_readiness (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            startup_id VARCHAR NOT NULL REFERENCES startups(id) ON DELETE CASCADE UNIQUE,
            has_live_b2b_pilots BOOLEAN NOT NULL DEFAULT FALSE,
            has_bank_fintech_experience BOOLEAN NOT NULL DEFAULT FALSE,
            is_regulated BOOLEAN NOT NULL DEFAULT FALSE,
            is_security_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
            problem_statement TEXT, target_units TEXT,
            integration_model VARCHAR(30), data_requirements TEXT,
            existing_references TEXT, completeness_score INTEGER DEFAULT 0,
            visibility_scope VARCHAR(20) NOT NULL DEFAULT 'global',
            visible_to_company_ids TEXT[], updated_at TIMESTAMP DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS reviewer_assignments (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            entity_type VARCHAR(30) NOT NULL, entity_id VARCHAR NOT NULL,
            reviewer_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            assigned_by VARCHAR NOT NULL REFERENCES users(id),
            company_id VARCHAR REFERENCES companies(id) ON DELETE CASCADE,
            due_date TIMESTAMP, status VARCHAR(20) NOT NULL DEFAULT 'assigned',
            completed_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS activity_logs (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            actor_id VARCHAR NOT NULL REFERENCES users(id),
            actor_type VARCHAR(20) NOT NULL DEFAULT 'user',
            company_id VARCHAR REFERENCES companies(id) ON DELETE CASCADE,
            action_type VARCHAR(30) NOT NULL, entity_type VARCHAR(30),
            entity_id VARCHAR, entity_name TEXT, metadata JSONB,
            created_at TIMESTAMP DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS company_plans (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
            tier VARCHAR(20) NOT NULL DEFAULT 'pilot',
            max_briefs_per_year INTEGER NOT NULL DEFAULT 3,
            max_programs_per_year INTEGER NOT NULL DEFAULT 1,
            max_startups_in_pipeline INTEGER NOT NULL DEFAULT 50,
            max_corporate_users INTEGER NOT NULL DEFAULT 5,
            included_services TEXT, start_date TIMESTAMP, end_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS company_usage (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
            briefs_ytd INTEGER NOT NULL DEFAULT 0, programs_ytd INTEGER NOT NULL DEFAULT 0,
            startups_in_pipeline INTEGER NOT NULL DEFAULT 0, evaluations_ytd INTEGER NOT NULL DEFAULT 0,
            current_users INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMP DEFAULT NOW()
          );
        `);

        // Signals foundation + Group 7 (unified timeline & auto milestones)
        await pool.query(`
          CREATE TABLE IF NOT EXISTS signal_sources (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            source_key VARCHAR(80) NOT NULL UNIQUE, display_name TEXT NOT NULL,
            category VARCHAR(30) NOT NULL, description TEXT,
            requires_credentials BOOLEAN NOT NULL DEFAULT FALSE,
            credential_kind VARCHAR(60), status VARCHAR(30) NOT NULL DEFAULT 'idle',
            is_paused BOOLEAN NOT NULL DEFAULT FALSE, last_run_at TIMESTAMP,
            last_error TEXT, created_at TIMESTAMP DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS signal_events (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            startup_id VARCHAR REFERENCES startups(id) ON DELETE CASCADE,
            source_key VARCHAR(80) NOT NULL, event_type VARCHAR(60) NOT NULL,
            severity VARCHAR(20) NOT NULL DEFAULT 'info',
            title TEXT, summary TEXT, url TEXT,
            occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
            payload JSONB, dedupe_hash VARCHAR(120) NOT NULL UNIQUE,
            verified_by TEXT[], created_at TIMESTAMP DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_signal_events_startup ON signal_events(startup_id);
          CREATE INDEX IF NOT EXISTS idx_signal_events_occurred ON signal_events(occurred_at);
          CREATE INDEX IF NOT EXISTS idx_signal_events_source ON signal_events(source_key);
          CREATE TABLE IF NOT EXISTS ingestion_runs (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            source_key VARCHAR(80) NOT NULL,
            startup_id VARCHAR REFERENCES startups(id) ON DELETE CASCADE,
            started_at TIMESTAMP NOT NULL DEFAULT NOW(), finished_at TIMESTAMP,
            events_created INTEGER NOT NULL DEFAULT 0,
            status VARCHAR(30) NOT NULL DEFAULT 'running',
            error TEXT
          );
          CREATE INDEX IF NOT EXISTS idx_ingestion_runs_source ON ingestion_runs(source_key);
          CREATE INDEX IF NOT EXISTS idx_ingestion_runs_started ON ingestion_runs(started_at);
          CREATE TABLE IF NOT EXISTS cron_jobs (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            job_name VARCHAR(80) NOT NULL UNIQUE, schedule VARCHAR(80) NOT NULL,
            description TEXT, handler VARCHAR(80) NOT NULL,
            is_paused BOOLEAN NOT NULL DEFAULT FALSE,
            is_heavy BOOLEAN NOT NULL DEFAULT FALSE,
            last_run_at TIMESTAMP, last_status VARCHAR(30), last_error TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS integration_credentials (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            startup_id VARCHAR REFERENCES startups(id) ON DELETE CASCADE,
            kind VARCHAR(60) NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'active',
            encrypted_config JSONB, created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          CREATE UNIQUE INDEX IF NOT EXISTS integration_credentials_startup_kind_idx
            ON integration_credentials(startup_id, kind) WHERE startup_id IS NOT NULL;
          CREATE UNIQUE INDEX IF NOT EXISTS integration_credentials_global_kind_idx
            ON integration_credentials(kind) WHERE startup_id IS NULL;
          CREATE TABLE IF NOT EXISTS vitality_scores (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            startup_id VARCHAR NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
            score INTEGER NOT NULL, subscores JSONB,
            is_latest BOOLEAN NOT NULL DEFAULT TRUE,
            computed_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_vitality_startup ON vitality_scores(startup_id);
          CREATE INDEX IF NOT EXISTS idx_vitality_latest ON vitality_scores(startup_id, is_latest);
          CREATE TABLE IF NOT EXISTS milestones (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            startup_id VARCHAR NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
            kind VARCHAR(40) NOT NULL, title TEXT NOT NULL, description TEXT,
            occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
            confidence INTEGER NOT NULL DEFAULT 50,
            source_event_ids TEXT[], llm_model VARCHAR(60),
            created_at TIMESTAMP DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_milestones_startup ON milestones(startup_id);
          CREATE INDEX IF NOT EXISTS idx_milestones_occurred ON milestones(occurred_at);
        `);
        
        // Add case-insensitive unique constraint on email to prevent duplicates
        // Step 1: Normalize all existing emails (trim + lowercase) to match runtime normalization
        await pool.query(`
          UPDATE users 
          SET email = LOWER(TRIM(email))
          WHERE email != LOWER(TRIM(email));
        `);
        
        // Step 2: Check for duplicate emails after normalization
        const duplicateCheck = await pool.query(`
          SELECT LOWER(TRIM(email)) as email_normalized, COUNT(*) as count
          FROM users
          GROUP BY LOWER(TRIM(email))
          HAVING COUNT(*) > 1;
        `);
        
        if (duplicateCheck.rows.length > 0) {
          console.warn("\n⚠️  WARNING: Duplicate email addresses detected after normalization:");
          duplicateCheck.rows.forEach(row => {
            console.warn(`   - Email: ${row.email_normalized} (${row.count} accounts)`);
          });
          console.warn("\n   These duplicates must be resolved manually before continuing.");
          console.warn("   You can find duplicate accounts with:");
          console.warn("   SELECT id, email, created_at FROM users WHERE LOWER(TRIM(email)) IN (" + 
            duplicateCheck.rows.map(r => `'${r.email_normalized}'`).join(', ') + ") ORDER BY LOWER(TRIM(email)), created_at;\n");
          throw new Error("Cannot apply email uniqueness constraint with existing duplicates");
        }
        
        // Step 3: Drop the old unique constraint and old index if they exist
        await pool.query(`
          DO $$ 
          BEGIN
            ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique;
          EXCEPTION 
            WHEN undefined_object THEN NULL;
          END $$;
        `);
        
        // Drop the old index (which may be on LOWER(email) without TRIM)
        await pool.query(`
          DROP INDEX IF EXISTS users_email_lower_unique;
        `);
        
        // Step 4: Create unique index on LOWER(TRIM(email)) for case-insensitive uniqueness
        // This matches the runtime normalization and prevents whitespace/case variants
        await pool.query(`
          CREATE UNIQUE INDEX users_email_lower_unique ON users (LOWER(TRIM(email)));
        `);
        
        log("✓ Database schema verified and ready");
        schemaValidated = true;
      } catch (schemaError: any) {
        retryCount++;
        
        if (retryCount >= maxRetries) {
          console.error("FATAL: Database schema validation failed after", maxRetries, "attempts:", schemaError);
          console.error("The application cannot start without a valid database schema.");
          console.error("Please ensure:");
          console.error("  1. Database is accessible");
          console.error("  2. Database is properly initialized (run: npm run db:push)");
          console.error("  3. DATABASE_URL environment variable is correct");
          process.exit(1);
        }
        
        const backoffMs = 1000 * retryCount; // 1s, 2s, 3s
        console.warn(`Schema validation attempt ${retryCount} failed:`, schemaError.message);
        console.warn(`Retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // Serve static files from public directory in both dev and production
    const publicDir = path.join(import.meta.dirname, "..", "public");
    app.use(express.static(publicDir));

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    
    // Handle server errors (register before listen to catch all errors)
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
      } else {
        console.error('Server error:', error);
      }
      process.exit(1);
    });

    // Use callback function syntax instead of object options for better compatibility
    server.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
