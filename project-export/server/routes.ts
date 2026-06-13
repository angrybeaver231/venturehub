import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isNotFrozen, isAdmin, isHeadAdmin, isTeacher, isTeacherOrAdmin, isPlatformAdminMiddleware, isLmsAdmin, isEventAdmin, isInnoLabsAdmin } from "./auth";
import { setupLocalAuth, isAuthenticatedLocal, isAdminLocal } from "./localAuth";
import {
  insertEventSchema,
  insertEventRegistrationSchema,
  insertVideoSchema,
  insertVideoCommentSchema,
  insertLivestreamSchema,
  insertCourseSchema,
  insertCourseModuleSchema,
  insertCourseLessonSchema,
  insertCourseTaskSchema,
  insertCourseSubmissionSchema,
  insertCourseProgressSchema,
  insertQuizQuestionSchema,
  insertQuizAttemptSchema,
  gradeSubmissionSchema,
  updateCourseSchema,
  updateCourseModuleSchema,
  updateCourseLessonSchema,
  registerSchema,
  loginSchema,
  updatePasswordSchema,
  adminChangePasswordSchema,
  createAdminSchema,
  forgotPasswordSchema,
  verifyResetCodeSchema,
  resetPasswordSchema,
  updateProfileSchema,
  createFormFieldSchema,
  updateFormFieldSchema,
  submitFormAnswersSchema,
  FORM_FIELD_TYPES,
  createChallengeSchema,
  updateChallengeSchema,
  startChallengeSchema,
  type ChallengeMessage,
  // Phase 3 & 4 schemas
  insertAnnouncementSchema,
  insertDiscussionForumSchema,
  insertDiscussionThreadSchema,
  insertDiscussionReplySchema,
  insertPrivateMessageSchema,
  insertLessonCommentSchema,
  insertGradeCategorySchema,
  insertRubricSchema,
  insertRubricCriteriaSchema,
  insertRubricLevelSchema,
  insertGradebookEntrySchema,
  // Career Portal schemas
  createJobOpeningSchema,
  applyJobSchema,
  updateApplicationStatusSchema,
  sendApplicationMessageSchema,
  candidateRegisterSchema,
  candidateLoginSchema,
  verifyEmailSchema,
  sendVerificationSchema,
  setPinSchema,
  createCompanySchema,
  createStartupSchema,
  createBriefSchema,
  applyToBriefSchema,
  createProgramSchema,
  createEvaluationSchema,
  createCompanyNoteSchema,
  insertStartupMemberSchema,
  createTeamMemberSchema,
  insertStartupMetricSchema,
  insertProgramParticipantSchema,
  createInvestorSchema,
  insertInvestorMemberSchema,
  createInvestorInvitationSchema,
  INVESTOR_MEMBER_ROLES,
  type Startup,
  getCorporationLevelLimits,
  CORPORATION_LEVEL_LIMITS,
  getUniRoleTier,
  getClubRoleTier,
  getCompanyRoleTier,
  UNI_ROLE_TIERS,
  CLUB_ROLE_TIERS,
  COMPANY_ROLE_TIERS,
  CLUB_HEAD_ADMIN_EQUIVALENT_UNI_TIER,
  isUniAdmin,
  isClubAdmin,
  isCompanyAdmin,
  setMainOrgSchema,
  insertNewsArticleSchema,
  insertLandingPageSchema,
  STARTUP_SHOWCASE_EVENT_TYPES,
  insertEventShowcaseStartupSchema,
} from "@shared/schema";
import { sendEmail, BULK_FROM, TRANSACTIONAL_FROM } from "./emailService";
import multer from "multer";
import sanitizeHtml from "sanitize-html";
import path from "path";
import bcrypt from "bcrypt";
import passport from "passport";
import { nanoid } from "nanoid";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import {
  ObjectStorageService,
  ObjectNotFoundError,
  parseObjectPath,
  objectStorageClient,
} from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { generateShowcaseCover, isCoverGenerationAvailable } from "./showcase-cover";
import {
  sendChatMessage,
  getEventRegistrationPrompt,
  getOnboardingPrompt,
  extractRegistrationData,
  type ChatMessage as GigaChatMessage,
} from "./gigachat";

// Configure multer for image uploads (using memory storage for object storage)
const imageFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images only
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
};

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFilter,
});

// Configure multer for chat file uploads (documents, images, PDFs)
const chatFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|txt|csv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ];
  const mimetypeAllowed = allowedMimes.includes(file.mimetype);
  
  if (mimetypeAllowed && extname) {
    return cb(null, true);
  }
  cb(new Error("Only images, PDFs, and office documents are allowed"));
};

const uploadChatFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for chat files
  fileFilter: chatFileFilter,
});

// Configure multer for lesson video uploads (MP4)
const videoFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /mp4|webm|mov/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
  const mimetypeAllowed = allowedMimes.includes(file.mimetype);
  
  if (mimetypeAllowed && extname) {
    return cb(null, true);
  }
  cb(new Error("Only video files are allowed (mp4, webm, mov)"));
};

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit for videos
  fileFilter: videoFilter,
});

const resumeFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetypeAllowed = file.mimetype === 'application/pdf';
  if (mimetypeAllowed && extname) {
    return cb(null, true);
  }
  cb(new Error("Only PDF files are allowed"));
};

const uploadResume = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: resumeFilter,
});

// Showcase startup attachments: pitch deck (PDF/PPTX), demo video, or logo image.
const showcaseFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExt = /\.(pdf|pptx|ppt|mp4|webm|mov|m4v|jpg|jpeg|png|gif|webp)$/;
  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/octet-stream', // some browsers send pptx as octet-stream
  ];
  if (allowedExt.test(ext) && allowedMimes.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error("Only PDF, PPTX, video (mp4, webm, mov) or image files are allowed"));
};

const uploadShowcaseFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB (videos)
  fileFilter: showcaseFileFilter,
});

const uploadEmailAttachments = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, fieldSize: 50 * 1024 * 1024 },
}).array('attachments', 10);

const audioFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/flac', 'audio/x-flac'];
  if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(webm|ogg|wav|mp3|m4a|aac|flac|mpeg|mp4)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed (MP3, WAV, OGG, M4A, AAC, FLAC, WebM)'));
  }
};

const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: audioFilter,
});

const upload = multer({ dest: "uploads/" });

let maintenanceMode = false;

async function loadMaintenanceMode() {
  try {
    const result = await storage.getSystemSetting("maintenance_mode");
    maintenanceMode = result === "true";
  } catch (e) {
    maintenanceMode = false;
  }
}

type EmailVerificationJwtPayload = {
  email: string;
  purpose: 'email_verification';
  iat?: number;
  exp?: number;
};

function getRequiredJwtSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return secret;
}

function signEmailVerificationToken(email: string): string {
  return jwt.sign(
    { email, purpose: 'email_verification' } satisfies Omit<EmailVerificationJwtPayload, 'iat' | 'exp'>,
    getRequiredJwtSecret(),
    { expiresIn: '30m' }
  );
}

function verifyEmailVerificationToken(token: string): EmailVerificationJwtPayload | null {
  try {
    const decoded = jwt.verify(token, getRequiredJwtSecret());
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      'email' in decoded &&
      typeof (decoded as { email: unknown }).email === 'string' &&
      'purpose' in decoded &&
      (decoded as { purpose: unknown }).purpose === 'email_verification'
    ) {
      return decoded as EmailVerificationJwtPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);
  setupLocalAuth(app);

  // Pre-Revenue Discovery Engine — admin + privacy endpoints.
  try {
    const { registerScoutRoutes } = await import("./scout/routes");
    registerScoutRoutes(app);
  } catch (err) {
    console.error("[routes] scout routes failed to register:", err);
  }

  // "View as" / impersonation for head admins. Middleware swaps req.user
  // when an active impersonation session exists; routes register the
  // start/stop endpoints. Must run after passport.session().
  const { impersonationMiddleware, registerImpersonationRoutes } = await import(
    "./impersonation"
  );
  app.use(impersonationMiddleware);
  registerImpersonationRoutes(app);

  // --- Platform activity tracker ---------------------------------------------
  // Any successful authenticated mutation under /api/startups/:id/* counts as
  // a founder action: bumps lastActivityAt and emits a daily positive
  // platform-events signal so the vitality score reflects real engagement.
  const { recordFounderAction } = await import("./signals/platform-activity");
  app.use((req: any, res, next) => {
    const m = req.method;
    if (m !== "POST" && m !== "PATCH" && m !== "PUT" && m !== "DELETE") return next();
    const match = req.path.match(/^\/api\/startups\/([A-Za-z0-9_-]+)/);
    if (!match) return next();
    const startupId = match[1];
    if (!startupId || startupId === "verified-mrr") return next();
    res.on("finish", () => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 400 && req.isAuthenticated?.()) {
          const userId = req.user?.claims?.sub || req.user?.id;
          if (userId) {
            void recordFounderAction({ userId, startupId, action: `${m} ${req.path}` });
          }
        }
      } catch {/* noop */}
    });
    next();
  });

  await loadMaintenanceMode();

  try {
    const slugFixDone = await storage.getSystemSetting("club_slug_fix_v1");
    if (!slugFixDone) {
      const allClubs = await storage.getClubs();
      for (const club of allClubs) {
        if (club.slug && (club.slug.startsWith('/') || club.slug.startsWith('http'))) {
          const sanitized = club.slug.replace(/^https?:\/\/[^/]+\/?/i, '').replace(/[^a-z0-9а-яё-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
          const finalSlug = sanitized || club.name.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '') || `club-${club.id.substring(0, 8)}`;
          await storage.updateClub(club.id, { slug: finalSlug });
          console.log(`Fixed club slug: "${club.slug}" -> "${finalSlug}"`);
        }
      }
      await storage.setSystemSetting("club_slug_fix_v1", "done");
    }
  } catch (e) {
    console.log("Club slug fix check completed");
  }

  app.get('/api/maintenance/status', (_req, res) => {
    res.json({ enabled: maintenanceMode });
  });

  app.post('/api/maintenance/toggle', isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      const { enabled } = req.body;
      maintenanceMode = !!enabled;
      await storage.setSystemSetting("maintenance_mode", maintenanceMode ? "true" : "false");
      res.json({ enabled: maintenanceMode });
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle maintenance mode" });
    }
  });

  app.use('/api', (req: any, res, next) => {
    if (!maintenanceMode) return next();

    const exemptPaths = [
      '/api/maintenance/status',
      '/api/maintenance/toggle',
      '/api/auth/user',
      '/api/login',
      '/api/register',
      '/api/universities',
    ];
    if (exemptPaths.some(p => req.originalUrl.startsWith(p))) return next();

    if (req.isAuthenticated?.()) {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (userId) {
        return storage.getUser(userId).then(user => {
          if (user?.isHeadAdmin) return next();
          return res.status(503).json({ message: "Platform is under maintenance" });
        }).catch(() => res.status(503).json({ message: "Platform is under maintenance" }));
      }
    }

    return res.status(503).json({ message: "Platform is under maintenance" });
  });

  // Global freeze enforcement: frozen users cannot perform any mutation (POST/PUT/PATCH/DELETE)
  app.use('/api', async (req: any, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
    
    const exemptPaths = [
      '/api/login',
      '/api/register',
      '/api/logout',
      '/api/auth/',
      '/api/forgot-password',
      '/api/verify-reset-code',
      '/api/reset-password',
      '/api/admin/users/', // Allow admin freeze/unfreeze operations
    ];
    if (exemptPaths.some(p => req.originalUrl.startsWith(p))) return next();
    
    if (req.isAuthenticated?.()) {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (userId) {
        try {
          const user = await storage.getUser(userId);
          if (user?.isFrozen) {
            return res.status(403).json({
              message: "Account frozen",
              frozen: true,
              frozenReason: user.frozenReason || "Your account has been frozen by an administrator."
            });
          }
        } catch {}
      }
    }
    return next();
  });

  // Newsletter unsubscribe endpoint (no auth required - accessed from email links)
  app.get('/api/unsubscribe/:token', async (req, res) => {
    try {
      const { verifyUnsubscribeToken } = await import('./emailTemplates');
      const email = verifyUnsubscribeToken(req.params.token);
      if (!email) {
        return res.status(400).send(`
          <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ошибка</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 60px 20px;">
            <h2>Неверная ссылка для отписки</h2>
            <p>Ссылка недействительна или повреждена. Пожалуйста, свяжитесь с нами для помощи.</p>
          </body></html>
        `);
      }
      const user = await storage.getUserByEmail(email);
      if (user) {
        await storage.setNewsletterOptOut(user.id, true);
      }
      res.send(`
        <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Отписка от рассылки</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 60px 20px; background: #f5f5f5;">
          <div style="max-width: 500px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h2 style="color: #333;">Вы успешно отписались от рассылки</h2>
            <p style="color: #666; line-height: 1.6;">Вы больше не будете получать наши информационные рассылки. Если вы передумаете, вы всегда сможете подписаться заново в настройках профиля.</p>
            <p style="margin-top: 24px; font-size: 13px; color: #999;">Предпринимательский Клуб ФУ</p>
          </div>
        </body></html>
      `);
    } catch (error) {
      console.error("Unsubscribe error:", error);
      res.status(500).send(`
        <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ошибка</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 60px 20px;">
          <h2>Произошла ошибка</h2><p>Пожалуйста, попробуйте позже.</p>
        </body></html>
      `);
    }
  });

  // Local auth routes (email/password)
  app.post('/api/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Check if email is the head admin email
      const isHeadAdminEmail = validatedData.email === "bogdanfom.1002@yandex.ru".toLowerCase();

      // If a verification token was supplied, validate it matches the registering email.
      // Email verification is optional today; when provided it must be valid.
      let emailVerified = false;
      if (validatedData.verificationToken) {
        const payload = verifyEmailVerificationToken(validatedData.verificationToken);
        if (!payload || payload.email !== validatedData.email) {
          return res.status(400).json({ message: "Invalid or expired verification token" });
        }
        emailVerified = true;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Create user with hashed password
      const user = await storage.upsertUser({
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        patronymic: validatedData.patronymic,
        organizationType: validatedData.organizationType,
        organizationName: validatedData.organizationName,
        faculty: validatedData.faculty,
        groupNumber: validatedData.groupNumber,
        role: "member",
        isHeadAdmin: isHeadAdminEmail,
        emailVerified,
        newsletterOptOut: validatedData.marketingConsent === false,
      });

      // Mark verification codes consumed (history preserved for rate limiting)
      if (emailVerified) {
        await storage.consumeEmailVerificationCodesByEmail(validatedData.email);
      }

      // Log the user in automatically after registration
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Registration successful but login failed" });
        }
        import("./signals/platform-activity").then(m => m.recordFounderLogin(user.id)).catch(() => {});
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error: any) {
      console.error("Error during registration:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post('/api/login', (req, res, next) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      passport.authenticate('local', (err: any, user: any, info: any) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ message: info?.message || "Invalid credentials" });
        }
        req.login(user, (err) => {
          if (err) {
            return next(err);
          }
          import("./signals/platform-activity").then(m => m.recordFounderLogin(user.id)).catch(() => {});
          // Return user without password
          const { password, ...userWithoutPassword } = user;
          res.json(userWithoutPassword);
        });
      })(req, res, next);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Password update endpoint - requires authentication and current password
  app.post('/api/update-password', async (req: any, res) => {
    try {
      // Require authentication
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Validate request body
      const validatedData = updatePasswordSchema.parse(req.body);

      // Get the authenticated user
      const userId = req.user.id;
      if (!userId) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.password) {
        return res.status(400).json({ message: "This account cannot update password" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(validatedData.currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10);

      // Update user with hashed password
      await storage.upsertUser({
        id: userId,
        email: user.email,
        password: hashedPassword,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
      });

      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      console.error("Error updating password:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Profile update endpoint - requires authentication and verified email
  app.patch('/api/user/profile', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {

      // Validate request body
      const validatedData = updateProfileSchema.parse(req.body);

      // Get the authenticated user
      const userId = req.user.id;
      if (!userId) {
        return res.status(401).json({ message: "Invalid session" });
      }

      // Update user profile
      const updatedUser = await storage.updateUserProfile(userId, validatedData);

      req.user = updatedUser;

      // Return user without password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Quick endpoint to set group number (used by AI chat when an event requires it)
  app.patch('/api/user/group-number', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const raw = typeof req.body?.groupNumber === "string" ? req.body.groupNumber.trim() : "";
      if (!raw) {
        return res.status(400).json({ message: "Group number is required" });
      }
      if (raw.length > 32) {
        return res.status(400).json({ message: "Group number is too long" });
      }
      const updated = await storage.updateUserProfile(userId, { groupNumber: raw });
      req.user = updated;
      const { password, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error updating group number:", error);
      res.status(500).json({ message: "Failed to update group number" });
    }
  });

  app.patch('/api/user/main-organization', isAuthenticated, async (req: any, res) => {
    try {
      const { mainOrgType, mainOrgId } = setMainOrgSchema.parse(req.body);
      const userId = req.user.id;
      
      if (mainOrgType && mainOrgId) {
        if (mainOrgType === 'club') {
          const membership = await storage.getUserClubMembership(userId, mainOrgId);
          if (!membership) {
            return res.status(403).json({ message: "You must be a member of this club" });
          }
        } else if (mainOrgType === 'university') {
          const membership = await storage.getUserUniversityMembership(userId, mainOrgId);
          if (!membership) {
            return res.status(403).json({ message: "You must be a member of this university" });
          }
        } else if (mainOrgType === 'company') {
          const companyUsers = await storage.getCompanyUsers(mainOrgId);
          const isMember = companyUsers.some((cu: any) => cu.userId === userId);
          if (!isMember) {
            return res.status(403).json({ message: "You must be a member of this company" });
          }
        }
      }
      
      const updated = await storage.updateUserProfile(userId, { mainOrgType, mainOrgId });
      
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }
      req.user = updated;
      const { password, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error setting main organization:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to set main organization" });
    }
  });

  app.get('/api/user/main-organization/branding', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.mainOrgType || !user.mainOrgId) {
        return res.json(null);
      }
      
      let branding: { name: string; logoUrl: string | null; type: string; id: string } | null = null;
      
      if (user.mainOrgType === 'club') {
        const club = await storage.getClub(user.mainOrgId);
        if (club) {
          branding = { name: club.name, logoUrl: club.logoUrl, type: 'club', id: club.id };
        }
      } else if (user.mainOrgType === 'university') {
        const uni = await storage.getUniversity(user.mainOrgId);
        if (uni) {
          branding = { name: uni.name, logoUrl: uni.logoUrl, type: 'university', id: uni.id };
        }
      } else if (user.mainOrgType === 'company') {
        const company = await storage.getCompany(user.mainOrgId);
        if (company) {
          branding = { name: company.name, logoUrl: company.logo || null, type: 'company', id: company.id };
        }
      }
      
      res.json(branding);
    } catch (error: any) {
      console.error("Error fetching main org branding:", error);
      res.status(500).json({ message: "Failed to fetch branding" });
    }
  });

  // Forgot password - send reset code via email
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      
      // Check if user exists
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "If this email is registered, you will receive a password reset code" });
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store code in database with 15-minute expiration
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await storage.createPasswordResetToken({
        email: validatedData.email,
        code,
        expiresAt,
      });

      // Send email with code using branded template
      const { createPasswordResetEmail } = await import('./emailTemplates');
      const { html, text } = createPasswordResetEmail(
        {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          patronymic: user.patronymic,
        },
        code
      );
      
      await sendEmail({
        to: [validatedData.email],
        subject: 'Код для сброса пароля - Предпринимательский Клуб',
        html,
        text,
        fromOverride: TRANSACTIONAL_FROM,
      });

      res.json({ message: "If this email is registered, you will receive a password reset code" });
    } catch (error: any) {
      console.error("Error in forgot password:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Verify reset code
  app.post('/api/auth/verify-reset-code', async (req, res) => {
    try {
      const validatedData = verifyResetCodeSchema.parse(req.body);
      
      // Find valid token
      const token = await storage.getPasswordResetToken(validatedData.email, validatedData.code);
      
      if (!token || new Date() > new Date(token.expiresAt)) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }

      res.json({ message: "Code verified successfully" });
    } catch (error: any) {
      console.error("Error verifying reset code:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to verify code" });
    }
  });

  // Reset password with code
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      
      // Find valid token
      const token = await storage.getPasswordResetToken(validatedData.email, validatedData.code);
      
      if (!token || new Date() > new Date(token.expiresAt)) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }

      // Get user
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10);

      // Update user password
      await storage.upsertUser({
        id: user.id,
        email: user.email,
        password: hashedPassword,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
      });

      // Delete the used token
      await storage.deletePasswordResetToken(token.id);

      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Send a 6-digit email verification code (for onboarding)
  app.post('/api/auth/send-verification', async (req, res) => {
    try {
      const { email } = sendVerificationSchema.parse(req.body);

      // Rate limit: max 5 codes per hour per email
      const hourly = await storage.countRecentEmailVerificationCodes(email, 60 * 60 * 1000);
      if (hourly >= 5) {
        return res.status(429).json({ message: "Too many verification requests. Try again later." });
      }

      // Rate limit: at most 1 per 60 seconds (regardless of consumed status,
      // so a successful verify followed by an immediate resend is throttled)
      const existing = await storage.getLatestEmailVerificationCodeByEmail(email);
      if (existing?.createdAt) {
        const ageMs = Date.now() - new Date(existing.createdAt).getTime();
        if (ageMs < 60 * 1000) {
          const retryAfter = Math.ceil((60 * 1000 - ageMs) / 1000);
          res.setHeader('Retry-After', String(retryAfter));
          return res.status(429).json({ message: `Please wait ${retryAfter}s before requesting another code` });
        }
      }

      // Generate 6-digit code, store its bcrypt hash with 10-minute TTL
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = await bcrypt.hash(code, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await storage.createEmailVerificationCode({
        email,
        codeHash,
        expiresAt,
        attempts: 0,
      });

      const subject = 'Код подтверждения e-mail — Предпринимательский Клуб';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #111;">Подтверждение e-mail</h2>
          <p>Ваш код подтверждения:</p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111;">${code}</p>
          <p style="color: #555;">Код действителен 10 минут. Если вы не запрашивали регистрацию, проигнорируйте это письмо.</p>
        </div>
      `;
      const text = `Ваш код подтверждения: ${code}\nКод действителен 10 минут.`;

      await sendEmail({
        to: [email],
        subject,
        html,
        text,
        fromOverride: TRANSACTIONAL_FROM,
      });

      res.json({ message: "Verification code sent" });
    } catch (error: any) {
      console.error("Error sending verification code:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  // Verify the 6-digit code and return a short-lived verification token
  app.post('/api/auth/verify-email', async (req, res) => {
    try {
      const { email, code } = verifyEmailSchema.parse(req.body);

      const record = await storage.getEmailVerificationCodeByEmail(email);
      if (!record) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }
      if (new Date() > new Date(record.expiresAt)) {
        await storage.deleteEmailVerificationCodesByEmail(email);
        return res.status(400).json({ message: "Invalid or expired code" });
      }
      if (record.attempts >= 5) {
        await storage.consumeEmailVerificationCodesByEmail(email);
        return res.status(429).json({ message: "Too many attempts. Request a new code." });
      }

      const ok = await bcrypt.compare(code, record.codeHash);
      if (!ok) {
        await storage.incrementEmailVerificationAttempts(record.id);
        return res.status(400).json({ message: "Invalid or expired code" });
      }

      // Mark code consumed (history preserved for rate-limit accounting)
      await storage.consumeEmailVerificationCodesByEmail(email);

      const verificationToken = signEmailVerificationToken(email);
      // Per spec, the field is `verification_token`. We also include the
      // camelCase alias for older clients that may already consume it.
      res.json({
        message: "Email verified",
        verification_token: verificationToken,
        verificationToken,
      });
    } catch (error: any) {
      console.error("Error verifying email:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Set a 6-digit PIN for the authenticated user
  app.post('/api/auth/set-pin', async (req: any, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { pin } = setPinSchema.parse(req.body);
      const pinHash = await bcrypt.hash(pin, 10);
      await storage.setUserPinHash(req.user.id, pinHash);
      res.json({ message: "PIN set successfully" });
    } catch (error: any) {
      console.error("Error setting PIN:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to set PIN" });
    }
  });

  // Unified auth route - works for both OAuth and local auth
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;

      // Surface impersonation state so the UI can show a banner and a
      // "Stop viewing as" button.
      let impersonation: any = null;
      if ((req as any).isImpersonating && (req as any).realUser) {
        const real = (req as any).realUser;
        impersonation = {
          active: true,
          realUser: {
            id: real.id,
            email: real.email,
            firstName: real.firstName,
            lastName: real.lastName,
            profileImageUrl: real.profileImageUrl,
          },
        };
      }

      let mainOrgBranding: { name: string; logoUrl: string | null; type: string; id: string } | null = null;
      if (user.mainOrgType && user.mainOrgId) {
        if (user.mainOrgType === 'club') {
          const club = await storage.getClub(user.mainOrgId);
          if (club) {
            mainOrgBranding = { name: club.name, logoUrl: club.logoUrl, type: 'club', id: club.id };
          }
        } else if (user.mainOrgType === 'university') {
          const uni = await storage.getUniversity(user.mainOrgId);
          if (uni) {
            mainOrgBranding = { name: uni.name, logoUrl: uni.logoUrl, type: 'university', id: uni.id };
          }
        } else if (user.mainOrgType === 'company') {
          const company = await storage.getCompany(user.mainOrgId);
          if (company) {
            mainOrgBranding = { name: company.name, logoUrl: company.logo || null, type: 'company', id: company.id };
          }
        }
      }
      return res.json({ ...userWithoutPassword, mainOrgBranding, impersonation });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Internal members directory — visible to platform users only (candidates excluded)
  app.get('/api/members', isAuthenticated, async (req: any, res) => {
    try {
      const viewer = req.user;
      const viewerRole = viewer?.role || viewer?.claims?.role;
      if (viewerRole === 'candidate') {
        return res.status(403).json({ message: "Forbidden" });
      }
      const all = await storage.getAllUsers();

      // Hidden ranking: profiles with more filled-in fields appear higher.
      // Weights are tuned so that visual / discoverable fields (photo, position,
      // company, bio-like fields) carry the most weight.
      const completionWeights: Array<{ key: keyof typeof all[number]; weight: number }> = [
        { key: 'profileImageUrl', weight: 18 },
        { key: 'position', weight: 14 },
        { key: 'company', weight: 12 },
        { key: 'organizationName', weight: 8 },
        { key: 'category', weight: 8 },
        { key: 'city', weight: 6 },
        { key: 'interests', weight: 10 },
        { key: 'skills', weight: 10 },
        { key: 'tag', weight: 6 },
        { key: 'patronymic', weight: 4 },
        { key: 'faculty', weight: 4 },
      ];
      const totalWeight = completionWeights.reduce((s, w) => s + w.weight, 0);

      const scoreOf = (u: typeof all[number]) => {
        let s = 0;
        for (const { key, weight } of completionWeights) {
          const v = (u as any)[key];
          if (typeof v === 'string' ? v.trim().length > 0 : Boolean(v)) {
            s += weight;
          }
        }
        return Math.round((s / totalWeight) * 100);
      };

      const directory = all
        .filter((u) => !u.isFrozen && u.role !== 'candidate')
        .map((u) => ({
          id: u.id,
          tag: u.tag,
          firstName: u.firstName,
          lastName: u.lastName,
          profileImageUrl: u.profileImageUrl,
          position: u.position,
          company: u.company,
          category: u.category,
          organizationName: u.organizationName,
          city: u.city,
          role: u.role,
          isHeadAdmin: u.isHeadAdmin,
          isFrozen: u.isFrozen,
          profileCompletion: scoreOf(u),
        }))
        .sort((a, b) => {
          if (b.profileCompletion !== a.profileCompletion) {
            return b.profileCompletion - a.profileCompletion;
          }
          const an = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
          const bn = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase();
          return an.localeCompare(bn);
        });
      res.json(directory);
    } catch (error) {
      console.error("Error fetching members directory:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  // Public-ish member detail (any authenticated non-candidate viewer).
  app.get('/api/members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const viewer = req.user;
      const viewerRole = viewer?.role || viewer?.claims?.role;
      if (viewerRole === 'candidate') return res.status(403).json({ message: "Forbidden" });
      const u = await storage.getUser(req.params.id);
      if (!u || u.isFrozen || u.role === 'candidate') return res.status(404).json({ message: "Not found" });
      res.json({
        id: u.id,
        tag: u.tag,
        firstName: u.firstName,
        lastName: u.lastName,
        patronymic: u.patronymic,
        profileImageUrl: u.profileImageUrl,
        position: u.position,
        company: u.company,
        category: u.category,
        organizationName: u.organizationName,
        organizationType: u.organizationType,
        faculty: u.faculty,
        city: u.city,
        role: u.role,
        isHeadAdmin: u.isHeadAdmin,
        isFounder: u.isFounder,
        isSpeaker: u.isSpeaker,
        isPartner: u.isPartner,
        isResident: u.isResident,
        aboutMe: u.aboutMe,
        interests: u.interests,
        skills: u.skills,
        previousStartups: u.previousStartups,
        pitchDeckLink: u.pitchDeckLink,
        telegramUsername: u.telegramUsername,
      });
    } catch (error) {
      console.error("Error fetching member:", error);
      res.status(500).json({ message: "Failed to fetch member" });
    }
  });

  // Head Admin routes - User management
  app.get('/api/admin/users', isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/admin/users/:userId/password', isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      const validatedData = adminChangePasswordSchema.parse({
        userId: req.params.userId,
        newPassword: req.body.newPassword,
      });

      // Hash the new password
      const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10);

      // Update user password
      const updatedUser = await storage.updateUserPassword(validatedData.userId, hashedPassword);
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error updating user password:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.post('/api/admin/users', isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      const validatedData = createAdminSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Create new admin user
      const newUser = await storage.upsertUser({
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: "member",
        isHeadAdmin: false,
      });

      const { password, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error creating admin:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create admin" });
    }
  });

  // Head Admin: Update user role
  app.put('/api/admin/users/:userId/role', isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      // Validate role against all platform roles
      const validRoles = ['member', 'teacher', 'expert', 'lmsAdmin', 'eventAdmin', 'innoLabsAdmin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      // Get user to update
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Cannot change role of head admin
      if (user.isHeadAdmin) {
        return res.status(400).json({ message: "Cannot change role of head admin" });
      }
      
      // Update user role
      const updatedUser = await storage.updateUserRole(userId, role);
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // SEO: Sitemap.xml endpoint
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const baseUrl = 'https://ecfinuni.com';
      const currentDate = new Date().toISOString().split('T')[0];

      // Static pages
      const staticPages = [
        { url: '/', changefreq: 'daily', priority: '1.0' },
        { url: '/events', changefreq: 'daily', priority: '0.9' },
        { url: '/videos', changefreq: 'weekly', priority: '0.8' },
        { url: '/livestreams', changefreq: 'weekly', priority: '0.8' },
        { url: '/courses', changefreq: 'weekly', priority: '0.8' },
        { url: '/login', changefreq: 'monthly', priority: '0.5' },
        { url: '/register', changefreq: 'monthly', priority: '0.5' },
      ];

      // Fetch dynamic content
      const [events, videos, courses] = await Promise.all([
        storage.getEvents(),
        storage.getVideos(),
        storage.getCourses(),
      ]);

      // Build XML sitemap
      let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
      sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      // Add static pages
      staticPages.forEach(page => {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}${page.url}</loc>\n`;
        sitemap += `    <lastmod>${currentDate}</lastmod>\n`;
        sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
        sitemap += `    <priority>${page.priority}</priority>\n`;
        sitemap += '  </url>\n';
      });

      // Add dynamic event pages
      events.forEach(event => {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}/events/${event.id}</loc>\n`;
        sitemap += `    <lastmod>${currentDate}</lastmod>\n`;
        sitemap += `    <changefreq>weekly</changefreq>\n`;
        sitemap += `    <priority>0.7</priority>\n`;
        sitemap += '  </url>\n';
      });

      // Add dynamic video pages
      videos.forEach(video => {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}/videos/${video.id}</loc>\n`;
        sitemap += `    <lastmod>${currentDate}</lastmod>\n`;
        sitemap += `    <changefreq>monthly</changefreq>\n`;
        sitemap += `    <priority>0.6</priority>\n`;
        sitemap += '  </url>\n';
      });

      // Add dynamic course pages
      courses.forEach(course => {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}/courses/${course.id}</loc>\n`;
        sitemap += `    <lastmod>${currentDate}</lastmod>\n`;
        sitemap += `    <changefreq>monthly</changefreq>\n`;
        sitemap += `    <priority>0.7</priority>\n`;
        sitemap += '  </url>\n';
      });

      sitemap += '</urlset>';

      res.header('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).send('Error generating sitemap');
    }
  });

  // SEO: robots.txt endpoint
  app.get('/robots.txt', (req, res) => {
    const robotsTxt = `User-agent: *
Allow: /
Sitemap: https://ecfinuni.com/sitemap.xml

# Disallow private/admin areas
Disallow: /api/
`;
    res.header('Content-Type', 'text/plain');
    res.send(robotsTxt);
  });

  // Image upload endpoints (using object storage)
  app.post('/api/upload/image', isAuthenticated, isPlatformAdminMiddleware, uploadImage.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      
      if (!publicPaths || publicPaths.length === 0) {
        return res.status(500).json({ message: "Object storage public path not configured" });
      }
      
      const ext = path.extname(req.file.originalname);
      const filename = `${nanoid()}-${Date.now()}${ext}`;
      const publicPath = publicPaths[0];
      const fullPath = `${publicPath}/${filename}`;
      
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });
      
      const imageUrl = `/${filename}`;
      res.json({ url: imageUrl });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      
      if (error.code === 401 || error.code === 403 || error.message?.includes('credentials')) {
        return res.status(503).json({ message: "Object storage authentication failed. Please check configuration." });
      }
      
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Avatar upload — any authenticated user can upload their own profile photo
  app.post('/api/user/avatar', isAuthenticated, isNotFrozen, uploadImage.single('avatar'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      if (!publicPaths || publicPaths.length === 0) {
        return res.status(500).json({ message: "Object storage public path not configured" });
      }

      const mimeExtMap: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
      };
      const ext = mimeExtMap[req.file.mimetype] || (path.extname(req.file.originalname) || '.png').toLowerCase();
      const filename = `avatar-${nanoid()}-${Date.now()}${ext}`;
      const fullPath = `${publicPaths[0]}/${filename}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      await file.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
      });

      const imageUrl = `/${filename}`;
      const updated = await storage.updateUserProfile(userId, { profileImageUrl: imageUrl });
      const { password, ...userWithoutPassword } = updated;
      res.json({ url: imageUrl, user: userWithoutPassword });
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      if (error.code === 401 || error.code === 403 || error.message?.includes('credentials')) {
        return res.status(503).json({ message: "Object storage authentication failed. Please check configuration." });
      }
      res.status(500).json({ message: "Failed to upload avatar" });
    }
  });

  app.post('/api/upload/images', isAuthenticated, isPlatformAdminMiddleware, uploadImage.array('images', 10), async (req: any, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No image files uploaded" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      
      if (!publicPaths || publicPaths.length === 0) {
        return res.status(500).json({ message: "Object storage public path not configured" });
      }
      
      const publicPath = publicPaths[0];
      
      const uploadPromises = (req.files as Express.Multer.File[]).map(async (file) => {
        const ext = path.extname(file.originalname);
        const filename = `${nanoid()}-${Date.now()}${ext}`;
        const fullPath = `${publicPath}/${filename}`;
        
        const { bucketName, objectName } = parseObjectPath(fullPath);
        const bucket = objectStorageClient.bucket(bucketName);
        const gcsFile = bucket.file(objectName);
        
        await gcsFile.save(file.buffer, {
          metadata: {
            contentType: file.mimetype,
          },
        });
        
        return `/${filename}`;
      });
      
      const imageUrls = await Promise.all(uploadPromises);
      res.json({ urls: imageUrls });
    } catch (error: any) {
      console.error("Error uploading images:", error);
      
      if (error.code === 401 || error.code === 403 || error.message?.includes('credentials')) {
        return res.status(503).json({ message: "Object storage authentication failed. Please check configuration." });
      }
      
      res.status(500).json({ message: "Failed to upload images" });
    }
  });

  app.get("/api/public/email-images/:filename", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      const publicDir = publicPaths[0];
      const fullPath = `${publicDir}/email-images/${req.params.filename}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (!exists) {
        return res.sendStatus(404);
      }
      objectStorageService.downloadObject(file, res, 31536000);
    } catch (error) {
      console.error("Error serving email image:", error);
      res.sendStatus(500);
    }
  });

  // Object storage routes for file uploads
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub || req.user?.id;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, isPlatformAdminMiddleware, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // File upload endpoint for form answers (authenticated users, not just admins)
  // Note: Archive formats (zip, rar) excluded for security - they can contain active content
  const allowedFormFileTypes = [
    '.pdf', '.doc', '.docx', '.txt', '.rtf',
    '.png', '.jpg', '.jpeg', '.gif', '.webp',
    '.xls', '.xlsx', '.ppt', '.pptx'
  ];
  const maxFormFileSize = 20 * 1024 * 1024; // 20MB

  const uploadFormFile = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFormFileSize },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedFormFileTypes.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${ext} is not allowed. Allowed types: ${allowedFormFileTypes.join(', ')}`));
      }
    },
  });

  app.post('/api/upload/form-file', isAuthenticated, uploadFormFile.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const privateDir = process.env.PRIVATE_OBJECT_DIR;
      
      if (!privateDir) {
        return res.status(500).json({ message: "Object storage private directory not configured" });
      }
      
      const ext = path.extname(req.file.originalname).toLowerCase();
      // Include userId in the path for ownership tracking
      const filename = `form-answers/${userId}/${nanoid()}-${Date.now()}${ext}`;
      const fullPath = `${privateDir}/${filename}`;
      
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
          userId: userId,
          uploadedAt: new Date().toISOString(),
        },
      });
      
      res.json({ 
        path: filename,
        filename: req.file.originalname,
      });
    } catch (error: any) {
      console.error("Error uploading form file:", error);
      
      if (error.message?.includes('File type')) {
        return res.status(400).json({ message: error.message });
      }
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: `File size exceeds ${maxFormFileSize / 1024 / 1024}MB limit` });
      }
      
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.put("/api/videos/files", isAuthenticated, isPlatformAdminMiddleware, async (req: any, res) => {
    const userId = req.user?.claims?.sub || req.user?.id;
    const objectStorageService = new ObjectStorageService();
    let videoPath = null;
    let thumbnailPath = null;
    const errors: string[] = [];

    if (req.body.videoUrl) {
      try {
        videoPath = await objectStorageService.trySetObjectEntityAclPolicy(
          req.body.videoUrl,
          {
            owner: userId,
            visibility: "public",
          },
        );
      } catch (error) {
        console.error("Error setting video ACL:", error);
        errors.push(`Video: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    if (req.body.thumbnailUrl) {
      try {
        thumbnailPath = await objectStorageService.trySetObjectEntityAclPolicy(
          req.body.thumbnailUrl,
          {
            owner: userId,
            visibility: "public",
          },
        );
      } catch (error) {
        console.error("Error setting thumbnail ACL:", error);
        errors.push(`Thumbnail: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Return success if at least one file was processed
    if (videoPath || thumbnailPath) {
      return res.status(200).json({
        videoPath: videoPath,
        thumbnailPath: thumbnailPath,
        warnings: errors.length > 0 ? errors : undefined,
      });
    }

    // If both failed, return error
    return res.status(400).json({
      error: "Failed to process files",
      details: errors,
    });
  });

  // Event routes
  app.get('/api/events', async (req: any, res) => {
    try {
      const events = await storage.getEvents();
      const clubFilter = req.query.clubId as string | undefined;
      const universityFilter = req.query.universityId as string | undefined;
      
      // Check if user is admin - if so, return all events including drafts
      const userId = req.user?.claims?.sub || req.user?.id;
      const isAdmin = userId ? await (async () => {
        const user = await storage.getUser(userId);
        return user && (user.role === 'eventAdmin' || user.isHeadAdmin);
      })() : false;

      let filtered = isAdmin ? events : events.filter((e: any) => !e.isDraft);

      // For the main events tab, only include platform events + Pro/Pro+ club events
      const enriched = await Promise.all(filtered.map(async (event: any) => {
        let clubTier = null;
        let clubName = null;
        let universityName = null;
        if (event.clubId) {
          const club = await storage.getClub(event.clubId);
          if (club) {
            clubTier = (club as any).tier || 'basic';
            clubName = club.name;
          }
        }
        if (event.universityId) {
          const uni = await storage.getUniversity(event.universityId);
          if (uni) universityName = uni.name;
        }
        return { ...event, clubTier, clubName, universityName };
      }));

      let result = enriched;

      // Apply filters
      if (clubFilter) {
        result = result.filter(e => e.clubId === clubFilter);
      }
      if (universityFilter) {
        result = result.filter(e => e.universityId === universityFilter);
      }

      // For non-filtered main view, admins see all events, regular users see platform events + Pro/Pro+ tier club events
      if (!clubFilter && !universityFilter && !isAdmin) {
        result = result.filter(e => !e.clubId || e.clubTier === 'pro' || e.clubTier === 'pro_plus');
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // IMPORTANT: Specific routes with exact paths must come before parameterized routes
  // Get all registrations for current user (must be before /api/events/:id)
  app.get('/api/events/registrations', isAuthenticated, async (req: any, res) => {
    try {
      // Get user ID from either OAuth or local auth
      const userId = req.user.id;
      const registrations = await storage.getUserRegistrations(userId);
      res.json(registrations);
    } catch (error) {
      console.error("Error fetching user registrations:", error);
      res.status(500).json({ message: "Failed to fetch user registrations" });
    }
  });

  app.get('/api/events/featured-by-clubs', async (req, res) => {
    try {
      const allEvents = await storage.getEvents();
      const featuredClubEvents = [];
      for (const event of allEvents) {
        if ((event as any).isFeaturedByClub && (event as any).clubId) {
          const club = await storage.getClub((event as any).clubId);
          if (club && ((club as any).tier === 'pro_plus')) {
            featuredClubEvents.push({ ...event, clubName: club.name, clubTier: (club as any).tier });
          }
        }
      }
      res.json(featuredClubEvents);
    } catch (error) {
      console.error("Error fetching featured club events:", error);
      res.status(500).json({ message: "Failed to fetch featured club events" });
    }
  });

  app.get('/api/events/:id', async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  // Presenting (showcase) startups for pitch day / demo day events.
  // Entries are fully custom — a startup does NOT need to exist on the platform.
  const ensureShowcaseEvent = async (eventId: string, res: any): Promise<boolean> => {
    const event = await storage.getEvent(eventId);
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return false;
    }
    if (!STARTUP_SHOWCASE_EVENT_TYPES.includes(event.eventType as any)) {
      res.status(422).json({ message: "Presenting startups are only allowed on Pitch Day / Demo Day events" });
      return false;
    }
    return true;
  };

  // Full (unsanitized) lineup — includes founder contacts, presentation/video
  // links and the long description. Authenticated-only: anonymous visitors must
  // use the sanitized `/api/public/events/:id/showcase` endpoint instead.
  app.get('/api/events/:id/startups', isAuthenticated, async (req, res) => {
    try {
      const lineup = await storage.getEventShowcaseStartups(req.params.id);
      res.json(lineup);
    } catch (error) {
      console.error("Error fetching event startups:", error);
      res.status(500).json({ message: "Failed to fetch event startups" });
    }
  });

  // PUBLIC showcase view for unauthenticated visitors. Returns only a showcase
  // event (pitch day / demo day) plus a sanitized lineup. Anyone with the link
  // can see project names, sectors, short descriptions, covers, logos, website
  // links, founder/cofounder names + avatars, and attached photos — but NEVER
  // founder contacts (telegram), presentation files/links, demo video, or the
  // long description. Sanitization happens server-side so private data never
  // leaves the server.
  app.get('/api/public/events/:id/showcase', async (req, res) => {
    try {
      // The :id param may be either the raw event id or a custom showcase slug.
      let event = await storage.getEvent(req.params.id);
      if (!event) {
        event = await storage.getEventByShowcaseSlug(req.params.id);
      }
      if (!event || !STARTUP_SHOWCASE_EVENT_TYPES.includes(event.eventType as any)) {
        return res.status(404).json({ message: "Showcase not found" });
      }
      const lineup = await storage.getEventShowcaseStartups(event.id);
      const startups = lineup.map((s) => ({
        id: s.id,
        name: s.name,
        sector: s.sector ?? null,
        shortDescription: s.shortDescription ?? null,
        websiteUrl: s.websiteUrl ?? null,
        founderName: s.founderName ?? null,
        founderAvatarUrl: s.founderAvatarUrl ?? null,
        cofounders: (s.cofounders ?? []).map((c) => ({
          name: c.name,
          avatarUrl: c.avatarUrl ?? "",
        })),
        logoUrl: s.logoUrl ?? null,
        coverImageUrl: s.coverImageUrl ?? null,
        materialImages: s.materialImages ?? [],
        // Booleans only — the actual private content is never sent publicly.
        // The public view renders a "verify to access" placeholder for each.
        locked: {
          longDescription: !!s.longDescription,
          materials: !!(s.presentationPdfUrl || s.presentationPptxUrl || s.presentationUrl),
          video: !!s.videoUrl,
          contact: !!(s.founderTelegram || (s.cofounders ?? []).some((c) => (c as any).telegram)),
        },
      }));
      res.json({
        event: {
          id: event.id,
          name: event.name,
          date: event.date,
          time: event.time,
          location: event.location,
          eventType: event.eventType ?? null,
          description: event.description ?? null,
          customImage: event.customImage ?? null,
          photos: event.photos ?? null,
          showcaseSlug: event.showcaseSlug ?? null,
        },
        startups,
      });
    } catch (error) {
      console.error("Error fetching public showcase:", error);
      res.status(500).json({ message: "Failed to fetch showcase" });
    }
  });

  // Set (or clear) the custom showcase slug for an event. Admins only. Sending
  // an empty/null slug clears it (the showcase remains reachable by event id).
  const SHOWCASE_RESERVED_SLUGS = new Set([
    "www", "api", "app", "admin", "mail", "ftp", "blog", "static", "cdn",
    "assets", "dashboard", "showcase", "login", "register", "logout", "auth",
    "events", "startups", "investors", "news", "careers", "p", "candidate",
  ]);
  const SHOWCASE_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
  app.patch('/api/events/:id/showcase-slug', isAuthenticated, isEventAdmin, async (req: any, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event || !STARTUP_SHOWCASE_EVENT_TYPES.includes(event.eventType as any)) {
        return res.status(404).json({ message: "Showcase not found" });
      }
      const raw = typeof req.body?.slug === "string" ? req.body.slug.trim().toLowerCase() : "";
      // Empty clears the slug.
      if (!raw) {
        const updated = await storage.updateEvent(req.params.id, { showcaseSlug: null });
        return res.json({ showcaseSlug: updated.showcaseSlug ?? null });
      }
      if (raw.length < 2 || raw.length > 64) {
        return res.status(400).json({ message: "Ссылка должна содержать от 2 до 64 символов" });
      }
      if (!SHOWCASE_SLUG_RE.test(raw)) {
        return res.status(400).json({ message: "Используйте только строчные латинские буквы, цифры и дефис" });
      }
      if (SHOWCASE_RESERVED_SLUGS.has(raw)) {
        return res.status(400).json({ message: "Эта ссылка зарезервирована, выберите другую" });
      }
      const existing = await storage.getEventByShowcaseSlug(raw);
      if (existing && existing.id !== req.params.id) {
        return res.status(409).json({ message: "Эта ссылка уже занята, выберите другую" });
      }
      const updated = await storage.updateEvent(req.params.id, { showcaseSlug: raw });
      res.json({ showcaseSlug: updated.showcaseSlug ?? null });
    } catch (error) {
      console.error("Error setting showcase slug:", error);
      res.status(500).json({ message: "Failed to set showcase slug" });
    }
  });

  // Upload a pitch deck (PDF/PPTX) or demo video for a showcase startup.
  // Presigned direct-to-object-storage upload for showcase media. The browser
  // PUTs the file straight to object storage, bypassing the proxy request-size
  // limit (which otherwise rejects large videos with a 413 before they reach
  // this server). No re-encoding, so there is zero quality loss.
  app.post('/api/events/:id/startups/upload-url', isAuthenticated, isEventAdmin, async (req: any, res) => {
    try {
      if (!(await ensureShowcaseEvent(req.params.id, res))) return;
      const ext = typeof req.body?.ext === 'string' ? req.body.ext.toLowerCase() : '';
      const allowedShowcaseExt = [
        '.pdf', '.pptx', '.ppt',
        '.mp4', '.webm', '.mov', '.m4v',
        '.jpg', '.jpeg', '.png', '.gif', '.webp',
      ];
      if (!allowedShowcaseExt.includes(ext)) {
        return res.status(400).json({ message: "Unsupported file type" });
      }
      const objectStorageService = new ObjectStorageService();
      const result = await objectStorageService.getShowcaseUploadURL(ext);
      res.json(result);
    } catch (error: any) {
      console.error("Error creating showcase upload URL:", error);
      if (error.code === 401 || error.code === 403 || error.message?.includes('credentials')) {
        return res.status(503).json({ message: "Object storage authentication failed. Please check configuration." });
      }
      res.status(500).json({ message: "Failed to create upload URL" });
    }
  });

  app.post('/api/events/:id/startups/upload', isAuthenticated, isEventAdmin, uploadShowcaseFile.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      if (!(await ensureShowcaseEvent(req.params.id, res))) return;

      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      if (!publicPaths || publicPaths.length === 0) {
        return res.status(500).json({ message: "Object storage public path not configured" });
      }
      const ext = (path.extname(req.file.originalname) || "").toLowerCase();
      const filename = `showcase-${nanoid()}-${Date.now()}${ext}`;
      const fullPath = `${publicPaths[0]}/${filename}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      await file.save(req.file.buffer, { metadata: { contentType: req.file.mimetype } });
      res.json({ url: `/${filename}` });
    } catch (error: any) {
      console.error("Error uploading showcase file:", error);
      if (error.code === 401 || error.code === 403 || error.message?.includes('credentials')) {
        return res.status(503).json({ message: "Object storage authentication failed. Please check configuration." });
      }
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Generate an AI cover image for a showcase startup from its card content.
  // Works for both create (no startupId yet) and edit flows: the client sends
  // the current form content, we generate + store the image, and return its URL.
  app.post('/api/events/:id/startups/cover/generate', isAuthenticated, isEventAdmin, async (req: any, res) => {
    try {
      if (!(await ensureShowcaseEvent(req.params.id, res))) return;
      if (!isCoverGenerationAvailable()) {
        return res.status(503).json({ message: "AI image generation is not configured." });
      }
      const coverSchema = z.object({
        name: z.string().trim().min(1).max(200),
        shortDescription: z.string().trim().max(500).optional().default(""),
        longDescription: z.string().trim().max(4000).optional().default(""),
        sector: z.string().trim().max(200).optional().default(""),
      });
      const parsedCover = coverSchema.safeParse(req.body ?? {});
      if (!parsedCover.success) {
        return res.status(400).json({ message: "Project name is required to generate a cover" });
      }
      const imageBuffer = await generateShowcaseCover(parsedCover.data);

      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      if (!publicPaths || publicPaths.length === 0) {
        return res.status(500).json({ message: "Object storage public path not configured" });
      }
      const filename = `showcase-cover-${nanoid()}-${Date.now()}.png`;
      const fullPath = `${publicPaths[0]}/${filename}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      await file.save(imageBuffer, { metadata: { contentType: "image/png" } });
      res.json({ url: `/${filename}` });
    } catch (error: any) {
      console.error("Error generating showcase cover:", error);
      res.status(500).json({ message: "Failed to generate cover image" });
    }
  });

  // One-click import of a pitch-day showcase project into the main platform
  // startups directory. Idempotent: if already imported (and the platform
  // startup still exists) it returns the existing one instead of duplicating.
  app.post('/api/events/:id/startups/:startupId/import-to-platform', isAuthenticated, isEventAdmin, async (req: any, res) => {
    try {
      if (!(await ensureShowcaseEvent(req.params.id, res))) return;
      const showcase = await storage.getEventShowcaseStartup(req.params.startupId);
      if (!showcase || showcase.eventId !== req.params.id) {
        return res.status(404).json({ message: "Startup not found for this event" });
      }
      const userId = req.user?.claims?.sub || req.user?.id;
      const { startup, alreadyImported } = await storage.importShowcaseStartupToPlatform(showcase.id, userId);
      res.status(alreadyImported ? 200 : 201).json({ startup, alreadyImported });
    } catch (error) {
      console.error("Error importing showcase startup to platform:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to import startup" });
    }
  });

  app.post('/api/events/:id/startups', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      if (!(await ensureShowcaseEvent(req.params.id, res))) return;
      const parsed = insertEventShowcaseStartupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid startup data", errors: parsed.error.flatten() });
      }
      const created = await storage.createEventShowcaseStartup(req.params.id, parsed.data);
      res.status(201).json(created);
    } catch (error) {
      console.error("Error creating event startup:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create event startup" });
    }
  });

  app.patch('/api/events/:id/startups/:startupId', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      if (!(await ensureShowcaseEvent(req.params.id, res))) return;
      const existing = await storage.getEventShowcaseStartup(req.params.startupId);
      if (!existing || existing.eventId !== req.params.id) {
        return res.status(404).json({ message: "Startup not found for this event" });
      }
      const parsed = insertEventShowcaseStartupSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid startup data", errors: parsed.error.flatten() });
      }
      const updated = await storage.updateEventShowcaseStartup(req.params.startupId, parsed.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating event startup:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update event startup" });
    }
  });

  app.delete('/api/events/:id/startups/:startupId', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      if (!(await ensureShowcaseEvent(req.params.id, res))) return;
      const existing = await storage.getEventShowcaseStartup(req.params.startupId);
      if (!existing || existing.eventId !== req.params.id) {
        return res.status(404).json({ message: "Startup not found for this event" });
      }
      await storage.deleteEventShowcaseStartup(req.params.startupId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting event startup:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to delete event startup" });
    }
  });

  // Landing page routes (event microsites)
  const LANDING_RESERVED_SLUGS = new Set(["www", "api", "app", "admin", "mail", "ftp", "blog", "static", "cdn", "assets", "dashboard"]);
  const sanitizeLandingHtml = (html: unknown): string => {
    if (typeof html !== "string") return "";
    return sanitizeHtml(html, {
      allowedTags: ["p","br","strong","em","u","s","ol","ul","li","a","h1","h2","h3","h4","h5","blockquote","code","pre","img","figure","figcaption","hr","span","div"],
      allowedAttributes: { a: ["href","target","rel"], img: ["src","alt"], "*": ["class"] },
      allowedSchemes: ["http","https","data","mailto"],
      transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }) },
    });
  };
  const sanitizeLandingSections = (sections: any): any[] => {
    if (!Array.isArray(sections)) return [];
    return sections.map((s) => {
      if (!s || typeof s !== "object") return null;
      const data = { ...(s.data || {}) };
      // Sanitize any rich-text-ish fields
      for (const key of Object.keys(data)) {
        const v = data[key];
        if (typeof v === "string" && /<[^>]+>/.test(v)) data[key] = sanitizeLandingHtml(v);
        if (Array.isArray(v)) {
          data[key] = v.map((item) => {
            if (item && typeof item === "object") {
              const cleaned: any = {};
              for (const ik of Object.keys(item)) {
                const iv = item[ik];
                cleaned[ik] = typeof iv === "string" && /<[^>]+>/.test(iv) ? sanitizeLandingHtml(iv) : iv;
              }
              return cleaned;
            }
            return item;
          });
        }
      }
      return { id: String(s.id || ""), type: String(s.type || ""), data };
    }).filter(Boolean);
  };

  // Public: lookup published landing page by slug
  app.get('/api/landing/by-slug/:slug', async (req, res) => {
    try {
      const slug = String(req.params.slug || "").toLowerCase();
      if (LANDING_RESERVED_SLUGS.has(slug)) return res.status(404).json({ message: "Not found" });
      const page = await storage.getLandingPageBySlug(slug);
      if (!page || !page.isPublished) return res.status(404).json({ message: "Landing page not found" });
      res.json(page);
    } catch (error) {
      console.error("Error fetching landing page:", error);
      res.status(500).json({ message: "Failed to fetch landing page" });
    }
  });

  // Admin: list/get/create/update/delete (eventAdmin or headAdmin)
  app.get('/api/admin/landing', isAuthenticated, isEventAdmin, async (_req, res) => {
    try {
      res.json(await storage.getAllLandingPages());
    } catch (error) {
      console.error("Error fetching landing pages:", error);
      res.status(500).json({ message: "Failed to fetch landing pages" });
    }
  });

  app.get('/api/admin/landing/:id', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const page = await storage.getLandingPage(req.params.id);
      if (!page) return res.status(404).json({ message: "Not found" });
      res.json(page);
    } catch (error) {
      console.error("Error fetching landing page:", error);
      res.status(500).json({ message: "Failed to fetch landing page" });
    }
  });

  app.post('/api/admin/landing', isAuthenticated, isEventAdmin, async (req: any, res) => {
    try {
      const slug = String(req.body?.slug || "").toLowerCase();
      if (LANDING_RESERVED_SLUGS.has(slug)) {
        return res.status(400).json({ message: "Slug is reserved" });
      }
      const existing = slug ? await storage.getLandingPageBySlug(slug) : null;
      if (existing) return res.status(409).json({ message: "Slug already in use" });
      const validated = insertLandingPageSchema.parse({
        ...req.body,
        sections: sanitizeLandingSections(req.body?.sections),
        authorId: req.user?.id || null,
      });
      const created = await storage.createLandingPage(validated);
      res.status(201).json(created);
    } catch (error: any) {
      console.error("Error creating landing page:", error);
      res.status(400).json({ message: error?.message || "Failed to create landing page" });
    }
  });

  app.patch('/api/admin/landing/:id', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const incoming: any = { ...req.body };
      if (typeof incoming.slug === "string") {
        incoming.slug = incoming.slug.toLowerCase();
        if (LANDING_RESERVED_SLUGS.has(incoming.slug)) {
          return res.status(400).json({ message: "Slug is reserved" });
        }
        const conflict = await storage.getLandingPageBySlug(incoming.slug);
        if (conflict && conflict.id !== req.params.id) {
          return res.status(409).json({ message: "Slug already in use" });
        }
      }
      if (incoming.sections) incoming.sections = sanitizeLandingSections(incoming.sections);
      const validated = insertLandingPageSchema.partial().parse(incoming);
      const updated = await storage.updateLandingPage(req.params.id, validated);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating landing page:", error);
      res.status(400).json({ message: error?.message || "Failed to update landing page" });
    }
  });

  app.delete('/api/admin/landing/:id', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      await storage.deleteLandingPage(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting landing page:", error);
      res.status(500).json({ message: "Failed to delete landing page" });
    }
  });

  // News routes
  const NEWS_ALLOWED_TAGS = [
    "p", "br", "strong", "em", "u", "s", "ol", "ul", "li", "a",
    "h1", "h2", "h3", "h4", "blockquote", "code", "pre",
    "img", "figure", "figcaption", "hr", "span", "div",
  ];
  const sanitizeNewsBody = (html: unknown): string => {
    if (typeof html !== "string") return "";
    return sanitizeHtml(html, {
      allowedTags: NEWS_ALLOWED_TAGS,
      allowedAttributes: {
        a: ["href", "target", "rel"],
        img: ["src", "alt"],
        "*": ["class"],
      },
      allowedSchemes: ["http", "https", "data", "mailto"],
      transformTags: {
        a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
      },
    });
  };

  app.get('/api/news', async (_req, res) => {
    try {
      const items = await storage.getPublishedNews();
      res.json(items);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  app.get('/api/news/:id', async (req, res) => {
    try {
      const article = await storage.getNewsArticle(req.params.id);
      if (!article || !article.isPublished) {
        return res.status(404).json({ message: "News article not found" });
      }
      res.json(article);
    } catch (error) {
      console.error("Error fetching news article:", error);
      res.status(500).json({ message: "Failed to fetch news article" });
    }
  });

  app.get('/api/admin/news', isAuthenticated, isEventAdmin, async (_req, res) => {
    try {
      const items = await storage.getAllNews();
      res.json(items);
    } catch (error) {
      console.error("Error fetching admin news:", error);
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  app.post('/api/admin/news', isAuthenticated, isEventAdmin, async (req: any, res) => {
    try {
      const validated = insertNewsArticleSchema.parse({
        ...req.body,
        body: sanitizeNewsBody(req.body?.body),
        authorId: req.user?.id || null,
      });
      const created = await storage.createNewsArticle(validated);
      res.status(201).json(created);
    } catch (error: any) {
      console.error("Error creating news article:", error);
      res.status(400).json({ message: error?.message || "Failed to create news article" });
    }
  });

  app.patch('/api/admin/news/:id', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const incoming = { ...req.body };
      if (typeof incoming.body === "string") {
        incoming.body = sanitizeNewsBody(incoming.body);
      }
      const validated = insertNewsArticleSchema.partial().parse(incoming);
      const updated = await storage.updateNewsArticle(req.params.id, validated);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating news article:", error);
      res.status(400).json({ message: error?.message || "Failed to update news article" });
    }
  });

  app.delete('/api/admin/news/:id', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      await storage.deleteNewsArticle(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting news article:", error);
      res.status(500).json({ message: "Failed to delete news article" });
    }
  });

  app.post('/api/events', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const validatedData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(400).json({ message: "Failed to create event" });
    }
  });

  app.patch('/api/events/:id', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const event = await storage.updateEvent(req.params.id, req.body);
      res.json(event);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(400).json({ message: "Failed to update event" });
    }
  });

  app.delete('/api/events/:id', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      await storage.deleteEvent(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Publish event (questions are optional)
  app.post('/api/events/:id/publish', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const event = await storage.getEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Publish the event (questions are optional - admins can add them if needed)
      const updatedEvent = await storage.updateEvent(id, { isDraft: false });
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error publishing event:", error);
      res.status(500).json({ message: "Failed to publish event" });
    }
  });

  // Unpublish event (move back to draft)
  app.post('/api/events/:id/unpublish', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const event = await storage.getEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Close registration when unpublishing
      const updatedEvent = await storage.updateEvent(id, { isDraft: true, registrationOpen: false });
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error unpublishing event:", error);
      res.status(500).json({ message: "Failed to unpublish event" });
    }
  });

  // Featured event management (head admin only)
  app.patch('/api/events/:id/feature', isAuthenticated, isHeadAdmin, async (req, res) => {
    try {
      const { isFeatured } = req.body;
      if (typeof isFeatured !== 'boolean') {
        return res.status(400).json({ message: "isFeatured must be a boolean" });
      }
      const event = await storage.setFeaturedEvent(req.params.id, isFeatured);
      res.json(event);
    } catch (error: any) {
      console.error("Error setting featured event:", error);
      res.status(400).json({ message: error.message || "Failed to set featured event" });
    }
  });

  app.get('/api/events/featured/current', async (req, res) => {
    try {
      const event = await storage.getFeaturedEvent();
      res.json(event || null);
    } catch (error) {
      console.error("Error fetching featured event:", error);
      res.status(500).json({ message: "Failed to fetch featured event" });
    }
  });

  app.patch('/api/events/:id/highlight', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = req.params.id;
      const { isHighlighted } = req.body;
      const userId = req.user?.claims?.sub || req.user?.id;
      
      const event = await storage.getEvent(eventId);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (!(event as any).clubId) return res.status(400).json({ message: "Only club events can be highlighted" });
      
      const currentUser = await storage.getUser(userId);
      const isPlatformAdmin = currentUser && (currentUser.role === 'eventAdmin' || currentUser.isHeadAdmin);
      
      if (!isPlatformAdmin) {
        const club = await storage.getClub((event as any).clubId);
        if (!club) return res.status(404).json({ message: "Club not found" });
        if ((club as any).tier !== 'pro_plus') return res.status(403).json({ message: "Only Pro+ clubs can highlight events" });
        
        const membership = await storage.getUserClubMembership(userId, (event as any).clubId);
        if (!membership || !['admin', 'headAdmin'].includes((membership as any).role)) {
          return res.status(403).json({ message: "Only club admins can highlight events" });
        }
      }
      
      const updated = await storage.updateEvent(eventId, { isHighlighted: !!isHighlighted });
      res.json(updated);
    } catch (error) {
      console.error("Error highlighting event:", error);
      res.status(500).json({ message: "Failed to highlight event" });
    }
  });

  app.patch('/api/events/:id/feature-by-club', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = req.params.id;
      const { isFeaturedByClub } = req.body;
      const userId = req.user?.claims?.sub || req.user?.id;
      
      const event = await storage.getEvent(eventId);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (!(event as any).clubId) return res.status(400).json({ message: "Only club events can be featured" });
      
      const currentUser = await storage.getUser(userId);
      const isPlatformAdmin = currentUser && (currentUser.role === 'eventAdmin' || currentUser.isHeadAdmin);
      
      if (!isPlatformAdmin) {
        const club = await storage.getClub((event as any).clubId);
        if (!club) return res.status(404).json({ message: "Club not found" });
        if ((club as any).tier !== 'pro_plus') return res.status(403).json({ message: "Only Pro+ clubs can feature events" });
        
        const membership = await storage.getUserClubMembership(userId, (event as any).clubId);
        if (!membership || !['admin', 'headAdmin'].includes((membership as any).role)) {
          return res.status(403).json({ message: "Only club admins can feature events" });
        }
      }
      
      if (isFeaturedByClub) {
        const allEvents = await storage.getEvents();
        for (const e of allEvents) {
          if ((e as any).clubId === (event as any).clubId && (e as any).isFeaturedByClub && e.id !== eventId) {
            await storage.updateEvent(e.id, { isFeaturedByClub: false });
          }
        }
      }
      
      const updated = await storage.updateEvent(eventId, { isFeaturedByClub: !!isFeaturedByClub });
      res.json(updated);
    } catch (error) {
      console.error("Error featuring club event:", error);
      res.status(500).json({ message: "Failed to feature club event" });
    }
  });

  // Registration status management (admin)
  app.patch('/api/events/:id/registration-status', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const { isOpen } = req.body;
      if (typeof isOpen !== 'boolean') {
        return res.status(400).json({ message: "isOpen must be a boolean" });
      }
      const event = await storage.setRegistrationStatus(req.params.id, isOpen);
      res.json(event);
    } catch (error: any) {
      console.error("Error updating registration status:", error);
      res.status(400).json({ message: error.message || "Failed to update registration status" });
    }
  });

  // Event registration routes
  app.get('/api/events/:id/registrations', isAuthenticated, async (req, res) => {
    try {
      const registrations = await storage.getEventRegistrations(req.params.id);
      res.json(registrations);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  app.post('/api/events/:id/register', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const dbUser = await storage.getUser(userId);

      if (event.registrationRestrictedTo && event.registrationRestrictedTo.length > 0) {
        if (dbUser && !event.registrationRestrictedTo.includes(dbUser.organizationType || "")) {
          return res.status(403).json({ message: "Registration is restricted based on organization type" });
        }
      }

      if (event.requiresGroupNumber && dbUser) {
        const orgType = dbUser.organizationType || "";
        const isFU = orgType === "financial-university" || orgType === "financial_university";
        if (isFU && !dbUser.groupNumber?.trim()) {
          return res.status(412).json({
            code: "GROUP_NUMBER_REQUIRED",
            message: "Group number is required to register for this event",
          });
        }
      }

      const existingRegistration = await storage.getUserEventRegistration(req.params.id, userId);
      
      if (existingRegistration) {
        return res.status(200).json(existingRegistration);
      }
      
      const validatedData = insertEventRegistrationSchema.parse({
        eventId: req.params.id,
        userId: userId,
      });
      const registration = await storage.createEventRegistration(validatedData);
      res.status(201).json(registration);
    } catch (error) {
      console.error("Error registering for event:", error);
      res.status(400).json({ message: "Failed to register for event" });
    }
  });

  app.get('/api/events/:id/my-registration', isAuthenticated, async (req: any, res) => {
    try {
      // Get user ID from either OAuth or local auth
      const userId = req.user.id;
      const registration = await storage.getUserEventRegistration(req.params.id, userId);
      res.json(registration || null);
    } catch (error) {
      console.error("Error fetching registration:", error);
      res.status(500).json({ message: "Failed to fetch registration" });
    }
  });

  // Event-specific registration management (admin only)
  app.get('/api/events/:id/registrations/export', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const registrations = await storage.getEventRegistrations(req.params.id);
      const event = await storage.getEvent(req.params.id);
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Registrations');
      
      worksheet.columns = [
        { header: 'Registration ID', key: 'id', width: 30 },
        { header: 'User Email', key: 'userEmail', width: 30 },
        { header: 'First Name', key: 'firstName', width: 20 },
        { header: 'Last Name', key: 'lastName', width: 20 },
        { header: 'Patronymic', key: 'patronymic', width: 20 },
        { header: 'Organization Type', key: 'organizationType', width: 30 },
        { header: 'Organization Name', key: 'organizationName', width: 40 },
        { header: 'Faculty', key: 'faculty', width: 40 },
        { header: 'Group Number', key: 'groupNumber', width: 20 },
        { header: 'Registration Date', key: 'createdAt', width: 20 },
      ];
      
      const isFU = (t?: string | null) => t === 'financial_university' || t === 'financial-university';
      registrations.forEach(reg => {
        const fu = isFU(reg.userOrganizationType);
        worksheet.addRow({
          id: reg.id,
          userEmail: reg.userEmail || reg.guestEmail || '',
          firstName: reg.userFirstName || reg.guestName || '',
          lastName: reg.userLastName || '',
          patronymic: reg.userPatronymic || '',
          organizationType: reg.userOrganizationType || '',
          organizationName: reg.userOrganizationName || '',
          faculty: fu ? (reg.userFaculty || '') : '',
          groupNumber: fu ? (reg.userGroupNumber || '') : '',
          createdAt: reg.createdAt ? new Date(reg.createdAt).toLocaleDateString() : '',
        });
      });
      
      const eventName = event?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'event';
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${eventName}_registrations.xlsx`);
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error exporting event registrations:", error);
      res.status(500).json({ message: "Failed to export registrations" });
    }
  });

  app.post('/api/events/:id/registrations/send-email', isAuthenticated, isEventAdmin, (req, res, next) => {
    uploadEmailAttachments(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  }, async (req, res) => {
    try {
      const { subject, message } = req.body;
      
      if (!subject || !message) {
        return res.status(400).json({ message: "Subject and message are required" });
      }
      
      const { validateEmailContent, extractBase64Images } = await import('./emailTemplates');
      const validation = validateEmailContent(message);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }
      
      const { cleanedHtml, extractedImages } = extractBase64Images(message);
      
      let processedMessage = cleanedHtml;
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();

      if (extractedImages.length > 0) {
        for (let i = 0; i < extractedImages.length; i++) {
          const img = extractedImages[i];
          try {
            const uniqueFilename = `editor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${img.filename}`;
            const imageUrl = await objectStorageService.uploadEmailImage(uniqueFilename, img.buffer, img.contentType);
            processedMessage = processedMessage.replace(`__EMAIL_IMAGE_PLACEHOLDER_${i}__`, imageUrl);
            console.log(`[Email] Editor image uploaded: ${uniqueFilename}, URL: ${imageUrl.substring(0, 120)}...`);
          } catch (err: any) {
            console.error(`[Email] Failed to upload editor image:`, err.message);
            processedMessage = processedMessage.replace(`__EMAIL_IMAGE_PLACEHOLDER_${i}__`, '');
          }
        }
      }
      
      const { sendPersonalizedEmail } = await import('./emailService');
      const { createBulkEmail } = await import('./emailTemplates');
      const registrations = await storage.getEventRegistrations(req.params.id);
      
      const recipientsMap = new Map();
      registrations.forEach(reg => {
        const email = reg.userEmail || reg.guestEmail;
        if (email && !recipientsMap.has(email)) {
          recipientsMap.set(email, {
            email,
            firstName: reg.userFirstName || reg.guestName || null,
            lastName: reg.userLastName || null,
            patronymic: reg.userPatronymic || null,
          });
        }
      });
      
      const recipients = Array.from(recipientsMap.values());
      
      if (recipients.length === 0) {
        return res.status(400).json({ message: "No registered users with email addresses for this event" });
      }

      const files = (req.files as Express.Multer.File[]) || [];
      const fileAttachments = files.map(f => ({
        filename: f.originalname,
        content: f.buffer,
        contentType: f.mimetype,
      }));
      
      const result = await sendPersonalizedEmail({
        recipients,
        subject,
        contentGenerator: (recipient) => createBulkEmail(recipient, processedMessage),
        attachments: fileAttachments.length > 0 ? fileAttachments : undefined,
        fromOverride: BULK_FROM,
      });
      
      let message_text = `Email sent to ${result.successful} of ${recipients.length} recipients`;
      if (result.failed > 0) {
        message_text += `. ${result.failed} failed: ${result.failedEmails.join(', ')}`;
      }
      
      res.json({ 
        message: message_text, 
        successful: result.successful,
        failed: result.failed,
        failedEmails: result.failedEmails,
      });
    } catch (error) {
      console.error("Error sending email to event registrations:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // QR Code and Attendance routes
  app.get('/api/registrations/:id/qr-code', isAuthenticated, async (req: any, res) => {
    try {
      const registration = await storage.getRegistrationById(req.params.id);
      
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      
      // Verify user owns this registration or is admin
      const userId = req.user.id;
      const isOwner = registration.userId === userId;
      const isAdminUser = req.user.role === 'eventAdmin' || req.user.isHeadAdmin;
      
      if (!isOwner && !isAdminUser) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Generate signed token valid for 4 hours (covers event duration)
      const token = jwt.sign(
        { registrationId: registration.id, eventId: registration.eventId },
        process.env.SESSION_SECRET || 'default-secret',
        { expiresIn: '4h' }
      );
      
      // Generate QR code as data URL
      const qrCodeDataURL = await QRCode.toDataURL(token, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
      });
      
      res.json({ 
        qrCode: qrCodeDataURL, 
        token,
        attendanceMarked: registration.attendanceMarked || false,
        attendanceTime: registration.attendanceTime || null,
      });
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // Get ticket data for a registration
  app.get('/api/registrations/:id/ticket', isAuthenticated, async (req: any, res) => {
    try {
      const registration = await storage.getRegistrationById(req.params.id);
      
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      
      // Verify user owns this registration or is admin
      const userId = req.user.id;
      const isOwner = registration.userId === userId;
      const isAdminUser = req.user.role === 'eventAdmin' || req.user.isHeadAdmin;
      
      if (!isOwner && !isAdminUser) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get event details
      const event = await storage.getEvent(registration.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Get user details
      const user = registration.userId ? await storage.getUser(registration.userId) : null;
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate signed token valid for 4 hours (covers event duration)
      const token = jwt.sign(
        { registrationId: registration.id, eventId: registration.eventId },
        process.env.SESSION_SECRET || 'default-secret',
        { expiresIn: '4h' }
      );
      
      // Generate QR code as data URL
      const qrCodeDataURL = await QRCode.toDataURL(token, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
      });
      
      res.json({
        qrCode: qrCodeDataURL,
        registration: {
          id: registration.id,
          eventId: registration.eventId,
          userId: registration.userId,
          attendanceMarked: registration.attendanceMarked || false,
          attendanceTime: registration.attendanceTime || null,
        },
        event: {
          name: event.name,
          date: event.date,
          time: event.time,
          location: event.location,
          duration: event.duration,
        },
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          patronymic: user.patronymic,
        },
      });
    } catch (error) {
      console.error("Error generating ticket:", error);
      res.status(500).json({ message: "Failed to generate ticket" });
    }
  });

  app.post('/api/registrations/mark-attendance', isAuthenticated, isEventAdmin, async (req, res) => {
    const timestamp = new Date().toISOString();
    try {
      const { token } = req.body;
      
      console.log(`[${timestamp}] QR attendance scan initiated`);
      
      if (!token) {
        console.log(`[${timestamp}] ERROR: No token provided`);
        return res.status(400).json({ message: "Token is required" });
      }
      
      // Verify JWT token
      let decoded: any;
      try {
        decoded = jwt.verify(token, process.env.SESSION_SECRET || 'default-secret');
        console.log(`[${timestamp}] Token verified successfully for registrationId: ${decoded.registrationId}`);
      } catch (error: any) {
        console.error(`[${timestamp}] ERROR: JWT verification failed:`, {
          error: error.message,
          name: error.name,
          tokenPreview: token.substring(0, 20) + '...'
        });
        return res.status(401).json({ 
          message: error.name === 'TokenExpiredError' 
            ? "QR code has expired. Please generate a new one." 
            : "Invalid QR code token" 
        });
      }
      
      const { registrationId, eventId } = decoded;
      
      // Check if registration exists
      const registration = await storage.getRegistrationById(registrationId);
      if (!registration) {
        console.error(`[${timestamp}] ERROR: Registration not found:`, { registrationId, eventId });
        return res.status(404).json({ message: "Registration not found" });
      }
      
      console.log(`[${timestamp}] Registration found:`, {
        registrationId: registration.id,
        eventId: registration.eventId,
        userId: registration.userId,
        alreadyMarked: registration.attendanceMarked
      });
      
      // Check if already marked
      if (registration.attendanceMarked) {
        console.log(`[${timestamp}] Attendance already marked for registration ${registrationId} at ${registration.attendanceTime}`);
        
        // Get user and event details for response
        const user = registration.userId ? await storage.getUser(registration.userId) : null;
        const event = await storage.getEvent(registration.eventId);
        
        return res.status(200).json({
          message: "Attendance already marked",
          userName: user ? `${user.firstName} ${user.lastName}` : undefined,
          eventName: event?.name,
          alreadyMarked: true,
        });
      }
      
      // Mark attendance
      console.log(`[${timestamp}] Marking attendance for registration ${registrationId}...`);
      const updatedRegistration = await storage.markAttendance(registrationId);
      console.log(`[${timestamp}] ✓ Attendance marked successfully:`, {
        registrationId: updatedRegistration.id,
        attendanceTime: updatedRegistration.attendanceTime
      });
      
      // Get user and event details for response
      const user = updatedRegistration.userId ? await storage.getUser(updatedRegistration.userId) : null;
      const event = await storage.getEvent(updatedRegistration.eventId);
      
      res.json({
        message: "Attendance marked successfully",
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        eventName: event?.name,
        alreadyMarked: false,
      });
    } catch (error: any) {
      console.error(`[${timestamp}] ERROR: Failed to mark attendance:`, {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ message: "Failed to mark attendance: " + error.message });
    }
  });

  // Manual attendance marking (admin only)
  app.patch('/api/events/:eventId/registrations/:registrationId/attendance', isAuthenticated, isEventAdmin, async (req, res) => {
    const timestamp = new Date().toISOString();
    try {
      const { eventId, registrationId } = req.params;
      const { attendanceMarked } = req.body;
      
      const adminIdentifier = (req.user as any)?.claims?.sub || (req.user as any)?.id || 'unknown';
      console.log(`[${timestamp}] Manual attendance marking initiated by admin ${adminIdentifier}:`, {
        eventId,
        registrationId,
        attendanceMarked
      });
      
      // Validate input
      if (typeof attendanceMarked !== 'boolean') {
        return res.status(400).json({ message: "attendanceMarked must be a boolean" });
      }
      
      // Check if registration exists
      const registration = await storage.getRegistrationById(registrationId);
      if (!registration) {
        console.error(`[${timestamp}] ERROR: Registration not found:`, { registrationId, eventId });
        return res.status(404).json({ message: "Registration not found" });
      }
      
      // Verify registration belongs to the event
      if (registration.eventId !== eventId) {
        console.error(`[${timestamp}] ERROR: Registration does not belong to event:`, { 
          registrationId, 
          registrationEventId: registration.eventId,
          requestedEventId: eventId 
        });
        return res.status(400).json({ message: "Registration does not belong to this event" });
      }
      
      console.log(`[${timestamp}] Current registration state:`, {
        registrationId: registration.id,
        currentlyMarked: registration.attendanceMarked,
        requestedState: attendanceMarked
      });
      
      // Update attendance status
      let updatedRegistration;
      if (attendanceMarked) {
        // Mark attendance
        console.log(`[${timestamp}] Marking attendance for registration ${registrationId}...`);
        updatedRegistration = await storage.markAttendance(registrationId);
        console.log(`[${timestamp}] ✓ Attendance marked successfully (manual):`, {
          registrationId: updatedRegistration.id,
          attendanceTime: updatedRegistration.attendanceTime
        });
      } else {
        // Unmark attendance
        console.log(`[${timestamp}] Unmarking attendance for registration ${registrationId}...`);
        updatedRegistration = await storage.unmarkAttendance(registrationId);
        console.log(`[${timestamp}] ✓ Attendance unmarked successfully:`, {
          registrationId: updatedRegistration.id
        });
      }
      
      // Get user and event details for response
      const user = updatedRegistration.userId ? await storage.getUser(updatedRegistration.userId) : null;
      const event = await storage.getEvent(updatedRegistration.eventId);
      
      res.json({
        message: attendanceMarked ? "Attendance marked successfully" : "Attendance unmarked successfully",
        registration: updatedRegistration,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        eventName: event?.name,
      });
    } catch (error: any) {
      console.error(`[${timestamp}] ERROR: Failed to update attendance:`, {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({ message: "Failed to update attendance: " + error.message });
    }
  });

  // Registration management routes (admin only)
  app.get('/api/admin/organizations', isAuthenticated, isHeadAdmin, async (_req, res) => {
    try {
      const orgs = await storage.getOrganizationStats();
      res.json(orgs);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.post('/api/admin/organizations/merge', isAuthenticated, isHeadAdmin, async (req, res) => {
    try {
      const { sourceNames, targetName, targetType } = req.body || {};
      if (!Array.isArray(sourceNames) || sourceNames.length === 0) {
        return res.status(400).json({ message: "sourceNames must be a non-empty array" });
      }
      if (typeof targetName !== "string" || !targetName.trim()) {
        return res.status(400).json({ message: "targetName is required" });
      }
      const cleanedSources = Array.from(
        new Set(
          sourceNames
            .filter((n: unknown): n is string => typeof n === "string")
            .map((n) => n),
        ),
      );
      const result = await storage.mergeOrganizations(
        cleanedSources,
        targetName,
        typeof targetType === "string" ? targetType : null,
      );
      res.json({
        message: `Merged ${cleanedSources.length} organization name(s) into "${targetName.trim()}"`,
        updatedUsers: result.updatedUsers,
      });
    } catch (error) {
      console.error("Error merging organizations:", error);
      res.status(500).json({ message: "Failed to merge organizations" });
    }
  });

  app.get('/api/admin/registrations', isAuthenticated, isHeadAdmin, async (req, res) => {
    try {
      const registrations = await storage.getAllRegistrations();
      res.json(registrations);
    } catch (error) {
      console.error("Error fetching all registrations:", error);
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  app.get('/api/admin/registrations/export', isAuthenticated, isHeadAdmin, async (req, res) => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const registrations = await storage.getAllRegistrations();
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Registrations');
      
      worksheet.columns = [
        { header: 'Registration ID', key: 'id', width: 30 },
        { header: 'Event ID', key: 'eventId', width: 30 },
        { header: 'User Email', key: 'userEmail', width: 30 },
        { header: 'First Name', key: 'firstName', width: 20 },
        { header: 'Last Name', key: 'lastName', width: 20 },
        { header: 'Patronymic', key: 'patronymic', width: 20 },
        { header: 'Organization Type', key: 'organizationType', width: 30 },
        { header: 'Organization Name', key: 'organizationName', width: 40 },
        { header: 'Faculty', key: 'faculty', width: 40 },
        { header: 'Group Number', key: 'groupNumber', width: 20 },
        { header: 'Registration Date', key: 'createdAt', width: 20 },
      ];
      
      const isFU = (t?: string | null) => t === 'financial_university' || t === 'financial-university';
      registrations.forEach(reg => {
        const fu = isFU(reg.userOrganizationType);
        worksheet.addRow({
          id: reg.id,
          eventId: reg.eventId,
          userEmail: reg.userEmail || reg.guestEmail || '',
          firstName: reg.userFirstName || reg.guestName || '',
          lastName: reg.userLastName || '',
          patronymic: reg.userPatronymic || '',
          organizationType: reg.userOrganizationType || '',
          organizationName: reg.userOrganizationName || '',
          faculty: fu ? (reg.userFaculty || '') : '',
          groupNumber: fu ? (reg.userGroupNumber || '') : '',
          createdAt: reg.createdAt ? new Date(reg.createdAt).toLocaleDateString() : '',
        });
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=registrations.xlsx');
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error exporting registrations:", error);
      res.status(500).json({ message: "Failed to export registrations" });
    }
  });

  // Admin Reports - Event Statistics
  app.get('/api/admin/reports/statistics', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const parseEventDate = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        
        // Try standard parsing first
        let date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
        
        // Handle Russian month names
        const russianMonths: Record<string, number> = {
          'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3,
          'мая': 4, 'июня': 5, 'июля': 6, 'августа': 7,
          'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11,
          'янв': 0, 'фев': 1, 'мар': 2, 'апр': 3,
          'май': 4, 'июн': 5, 'июл': 6, 'авг': 7,
          'сен': 8, 'окт': 9, 'ноя': 10, 'дек': 11
        };
        
        const russianMatch = dateStr.toLowerCase().match(/(\d{1,2})\s+([а-яё]+)\s+(\d{4})/i);
        if (russianMatch) {
          const day = parseInt(russianMatch[1]);
          const monthName = russianMatch[2].toLowerCase();
          const year = parseInt(russianMatch[3]);
          const month = russianMonths[monthName];
          if (month !== undefined) {
            return new Date(year, month, day);
          }
        }
        
        return null;
      };

      const allEvents = await storage.getEvents();
      const eventsInPeriod = allEvents.filter(event => {
        if (!event.date) return false;
        const eventDate = parseEventDate(event.date);
        if (!eventDate) return false;
        return eventDate >= start && eventDate <= end;
      });

      const reportData: Array<{
        eventId: string;
        eventName: string;
        eventDate: string;
        totalRegistrations: number;
        financialUniversityStudents: number;
        percentage: number;
      }> = [];

      let overallTotal = 0;
      let overallFinUniStudents = 0;

      const isFinancialUniversityStudent = (orgType: string | null | undefined): boolean => {
        if (!orgType) return false;
        const normalized = orgType.toLowerCase().trim();
        return normalized === 'financial-university' || 
               normalized === 'финансовый университет' ||
               normalized === 'фу' ||
               normalized.includes('financial') && normalized.includes('university');
      };

      for (const event of eventsInPeriod) {
        const registrations = await storage.getEventRegistrations(event.id);
        const totalReg = registrations.length;
        
        const finUniStudents = registrations.filter(reg => 
          isFinancialUniversityStudent(reg.userOrganizationType)
        ).length;

        overallTotal += totalReg;
        overallFinUniStudents += finUniStudents;

        reportData.push({
          eventId: event.id,
          eventName: event.name,
          eventDate: event.date || '',
          totalRegistrations: totalReg,
          financialUniversityStudents: finUniStudents,
          percentage: totalReg > 0 ? Math.round((finUniStudents / totalReg) * 100) : 0,
        });
      }

      res.json({
        period: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        events: reportData,
        overall: {
          totalEvents: eventsInPeriod.length,
          totalRegistrations: overallTotal,
          financialUniversityStudents: overallFinUniStudents,
          percentage: overallTotal > 0 ? Math.round((overallFinUniStudents / overallTotal) * 100) : 0,
        },
      });
    } catch (error) {
      console.error("Error generating report statistics:", error);
      res.status(500).json({ message: "Failed to generate report statistics" });
    }
  });

  app.get('/api/admin/reports/export', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const { startDate, endDate, language = 'ru' } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Business Club Platform';
      workbook.created = new Date();

      const isRussian = language === 'ru';
      
      const worksheet = workbook.addWorksheet(isRussian ? 'Статистика мероприятий' : 'Event Statistics');

      worksheet.mergeCells('A1:F1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = isRussian 
        ? 'Отчёт по мероприятиям Предпринимательского Клуба'
        : 'Business Club Events Report';
      titleCell.font = { bold: true, size: 16, color: { argb: 'FF1E3A5F' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 30;

      worksheet.mergeCells('A2:F2');
      const periodCell = worksheet.getCell('A2');
      const startFormatted = start.toLocaleDateString(isRussian ? 'ru-RU' : 'en-US');
      const endFormatted = end.toLocaleDateString(isRussian ? 'ru-RU' : 'en-US');
      periodCell.value = isRussian 
        ? `Период: ${startFormatted} — ${endFormatted}`
        : `Period: ${startFormatted} — ${endFormatted}`;
      periodCell.font = { size: 12, italic: true };
      periodCell.alignment = { horizontal: 'center' };
      worksheet.getRow(2).height = 20;

      worksheet.addRow([]);

      const headerRow = worksheet.addRow([
        isRussian ? '№' : '#',
        isRussian ? 'Название мероприятия' : 'Event Name',
        isRussian ? 'Дата' : 'Date',
        isRussian ? 'Всего регистраций' : 'Total Registrations',
        isRussian ? 'Студенты ФУ' : 'FU Students',
        isRussian ? 'Процент ФУ' : 'FU Percentage',
      ]);
      
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E3A5F' },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      worksheet.getRow(4).height = 25;

      worksheet.getColumn(1).width = 5;
      worksheet.getColumn(2).width = 45;
      worksheet.getColumn(3).width = 15;
      worksheet.getColumn(4).width = 20;
      worksheet.getColumn(5).width = 15;
      worksheet.getColumn(6).width = 15;

      const isFinancialUniversityStudent = (orgType: string | null | undefined): boolean => {
        if (!orgType) return false;
        const normalized = orgType.toLowerCase().trim();
        return normalized === 'financial-university' || 
               normalized === 'финансовый университет' ||
               normalized === 'фу' ||
               normalized.includes('financial') && normalized.includes('university');
      };

      const parseEventDate = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        
        // Try standard parsing first
        let date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
        
        // Handle Russian month names
        const russianMonths: Record<string, number> = {
          'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3,
          'мая': 4, 'июня': 5, 'июля': 6, 'августа': 7,
          'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11,
          'янв': 0, 'фев': 1, 'мар': 2, 'апр': 3,
          'май': 4, 'июн': 5, 'июл': 6, 'авг': 7,
          'сен': 8, 'окт': 9, 'ноя': 10, 'дек': 11
        };
        
        const russianMatch = dateStr.toLowerCase().match(/(\d{1,2})\s+([а-яё]+)\s+(\d{4})/i);
        if (russianMatch) {
          const day = parseInt(russianMatch[1]);
          const monthName = russianMatch[2].toLowerCase();
          const year = parseInt(russianMatch[3]);
          const month = russianMonths[monthName];
          if (month !== undefined) {
            return new Date(year, month, day);
          }
        }
        
        return null;
      };

      const allEvents = await storage.getEvents();
      const eventsInPeriod = allEvents.filter(event => {
        if (!event.date) return false;
        const eventDate = parseEventDate(event.date);
        if (!eventDate) return false;
        return eventDate >= start && eventDate <= end;
      });

      let overallTotal = 0;
      let overallFinUniStudents = 0;
      let rowNum = 1;

      for (const event of eventsInPeriod) {
        const registrations = await storage.getEventRegistrations(event.id);
        const totalReg = registrations.length;
        const finUniStudents = registrations.filter(reg => 
          isFinancialUniversityStudent(reg.userOrganizationType)
        ).length;

        overallTotal += totalReg;
        overallFinUniStudents += finUniStudents;

        const eventDate = event.date ? new Date(event.date).toLocaleDateString(isRussian ? 'ru-RU' : 'en-US') : '';
        const percentage = totalReg > 0 ? Math.round((finUniStudents / totalReg) * 100) : 0;

        const dataRow = worksheet.addRow([
          rowNum++,
          event.name,
          eventDate,
          totalReg,
          finUniStudents,
          `${percentage}%`,
        ]);

        dataRow.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
          if (colNumber >= 4) {
            cell.alignment = { horizontal: 'center' };
          }
        });
      }

      worksheet.addRow([]);

      const overallPercentage = overallTotal > 0 ? Math.round((overallFinUniStudents / overallTotal) * 100) : 0;
      
      const summaryRow = worksheet.addRow([
        '',
        isRussian ? 'ИТОГО:' : 'TOTAL:',
        '',
        overallTotal,
        overallFinUniStudents,
        `${overallPercentage}%`,
      ]);

      summaryRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F4FD' },
        };
        cell.border = {
          top: { style: 'medium' },
          left: { style: 'thin' },
          bottom: { style: 'medium' },
          right: { style: 'thin' },
        };
        if (colNumber >= 4) {
          cell.alignment = { horizontal: 'center' };
        }
      });

      worksheet.addRow([]);
      worksheet.addRow([]);

      const statsRow1 = worksheet.addRow([
        '',
        isRussian ? 'Всего мероприятий в периоде:' : 'Total events in period:',
        eventsInPeriod.length,
      ]);
      statsRow1.getCell(2).font = { italic: true };

      const statsRow2 = worksheet.addRow([
        '',
        isRussian ? 'Дата формирования отчёта:' : 'Report generated:',
        new Date().toLocaleDateString(isRussian ? 'ru-RU' : 'en-US'),
      ]);
      statsRow2.getCell(2).font = { italic: true };

      const filename = isRussian 
        ? `Otchet_meropriyatiy_${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}.xlsx`
        : `Events_Report_${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error exporting report:", error);
      res.status(500).json({ message: "Failed to export report" });
    }
  });

  app.post('/api/admin/registrations/send-email', isAuthenticated, isHeadAdmin, (req, res, next) => {
    uploadEmailAttachments(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  }, async (req, res) => {
    try {
      const { subject, message } = req.body;
      
      if (!subject || !message) {
        return res.status(400).json({ message: "Subject and message are required" });
      }
      
      const { validateEmailContent, extractBase64Images } = await import('./emailTemplates');
      const validation = validateEmailContent(message);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }
      
      const { cleanedHtml, extractedImages } = extractBase64Images(message);
      
      let processedMessage = cleanedHtml;
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService2 = new ObjectStorageService();

      if (extractedImages.length > 0) {
        for (let i = 0; i < extractedImages.length; i++) {
          const img = extractedImages[i];
          try {
            const uniqueFilename = `editor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${img.filename}`;
            const imageUrl = await objectStorageService2.uploadEmailImage(uniqueFilename, img.buffer, img.contentType);
            processedMessage = processedMessage.replace(`__EMAIL_IMAGE_PLACEHOLDER_${i}__`, imageUrl);
          } catch (err: any) {
            console.error(`[Email] Failed to upload editor image:`, err.message);
            processedMessage = processedMessage.replace(`__EMAIL_IMAGE_PLACEHOLDER_${i}__`, '');
          }
        }
      }
      
      const { sendPersonalizedEmail } = await import('./emailService');
      const { createBulkEmail } = await import('./emailTemplates');
      const registrations = await storage.getAllRegistrations();
      const allUsersForOptOut = await storage.getAllUsers();
      const optedOutEmails = new Set(
        allUsersForOptOut.filter(u => u.newsletterOptOut).map(u => u.email.toLowerCase())
      );
      
      const recipientsMap = new Map();
      registrations.forEach(reg => {
        const email = reg.userEmail || reg.guestEmail;
        if (email && !recipientsMap.has(email) && !optedOutEmails.has(email.toLowerCase())) {
          recipientsMap.set(email, {
            email,
            firstName: reg.userFirstName || reg.guestName || null,
            lastName: reg.userLastName || null,
            patronymic: reg.userPatronymic || null,
          });
        }
      });
      
      const recipients = Array.from(recipientsMap.values());
      
      if (recipients.length === 0) {
        return res.status(400).json({ message: "No registered users with email addresses (or all have unsubscribed)" });
      }

      const files = (req.files as Express.Multer.File[]) || [];
      const fileAttachments2 = files.map(f => ({
        filename: f.originalname,
        content: f.buffer,
        contentType: f.mimetype,
      }));
      
      const result = await sendPersonalizedEmail({
        recipients,
        subject,
        contentGenerator: (recipient) => createBulkEmail(recipient, processedMessage),
        attachments: fileAttachments2.length > 0 ? fileAttachments2 : undefined,
        fromOverride: BULK_FROM,
      });
      
      let message_text = `Email sent to ${result.successful} of ${recipients.length} recipients`;
      if (result.failed > 0) {
        message_text += `. ${result.failed} failed: ${result.failedEmails.join(', ')}`;
      }
      
      res.json({ 
        message: message_text, 
        successful: result.successful,
        failed: result.failed,
        failedEmails: result.failedEmails,
      });
    } catch (error) {
      console.error("Error sending email to registrations:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  const bulkEmailJobs = new Map<string, {
    id: string;
    status: 'processing' | 'completed' | 'failed';
    total: number;
    successful: number;
    failed: number;
    failedEmails: string[];
    startedAt: string;
    completedAt?: string;
    subject: string;
  }>();

  app.get('/api/admin/bulk-email-status/:jobId', isAuthenticated, isHeadAdmin, (req, res) => {
    const job = bulkEmailJobs.get(req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(job);
  });

  app.post('/api/admin/users/send-email', isAuthenticated, isHeadAdmin, (req, res, next) => {
    uploadEmailAttachments(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  }, async (req, res) => {
    try {
      const { subject, message } = req.body;
      
      if (!subject || !message) {
        return res.status(400).json({ message: "Subject and message are required" });
      }
      
      const { validateEmailContent, extractBase64Images } = await import('./emailTemplates');
      const validation = validateEmailContent(message);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }
      
      const { cleanedHtml: cleanedHtml3, extractedImages: extractedImages3 } = extractBase64Images(message);
      
      let processedMessage3 = cleanedHtml3;
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService3 = new ObjectStorageService();

      if (extractedImages3.length > 0) {
        for (let i = 0; i < extractedImages3.length; i++) {
          const img = extractedImages3[i];
          try {
            const uniqueFilename = `editor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${img.filename}`;
            const imageUrl = await objectStorageService3.uploadEmailImage(uniqueFilename, img.buffer, img.contentType);
            processedMessage3 = processedMessage3.replace(`__EMAIL_IMAGE_PLACEHOLDER_${i}__`, imageUrl);
          } catch (err: any) {
            console.error(`[Email] Failed to upload editor image:`, err.message);
            processedMessage3 = processedMessage3.replace(`__EMAIL_IMAGE_PLACEHOLDER_${i}__`, '');
          }
        }
      }
      
      const { createBulkEmail } = await import('./emailTemplates');
      const allUsers = await storage.getAllUsers();
      
      const recipients = allUsers
        .filter(user => user.email && !user.newsletterOptOut)
        .map(user => ({
          email: user.email,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          patronymic: user.patronymic || null,
        }));
      
      if (recipients.length === 0) {
        return res.status(400).json({ message: "No users with email addresses (or all have unsubscribed)" });
      }

      const files = (req.files as Express.Multer.File[]) || [];
      const fileAttachments3 = files.map(f => ({
        filename: f.originalname,
        content: f.buffer,
        contentType: f.mimetype,
      }));

      const jobId = `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const job: {
        id: string;
        status: 'processing' | 'completed' | 'failed';
        total: number;
        successful: number;
        failed: number;
        failedEmails: string[];
        startedAt: string;
        completedAt?: string;
        subject: string;
      } = {
        id: jobId,
        status: 'processing',
        total: recipients.length,
        successful: 0,
        failed: 0,
        failedEmails: [],
        startedAt: new Date().toISOString(),
        subject,
      };
      bulkEmailJobs.set(jobId, job);

      res.json({ 
        message: `Bulk email job started. Sending to ${recipients.length} recipients in the background.`,
        jobId,
        total: recipients.length,
      });

      const { sendPersonalizedEmail } = await import('./emailService');
      sendPersonalizedEmail({
        recipients,
        subject,
        contentGenerator: (recipient) => createBulkEmail(recipient, processedMessage3),
        attachments: fileAttachments3.length > 0 ? fileAttachments3 : undefined,
        fromOverride: BULK_FROM,
      }).then(result => {
        job.status = 'completed';
        job.successful = result.successful;
        job.failed = result.failed;
        job.failedEmails = result.failedEmails;
        job.completedAt = new Date().toISOString();
        console.log(`[BulkEmail] Job ${jobId} completed: ${result.successful} sent, ${result.failed} failed`);
      }).catch(error => {
        job.status = 'failed';
        job.completedAt = new Date().toISOString();
        console.error(`[BulkEmail] Job ${jobId} failed:`, error);
      });
    } catch (error) {
      console.error("Error starting bulk email job:", error);
      res.status(500).json({ message: "Failed to start email send" });
    }
  });

  // Video routes
  app.get('/api/videos', async (req, res) => {
    try {
      const videos = await storage.getVideos();
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  app.get('/api/videos/:id', async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      console.error("Error fetching video:", error);
      res.status(500).json({ message: "Failed to fetch video" });
    }
  });

  app.post('/api/videos', isAuthenticated, isEventAdmin, async (req: any, res) => {
    try {
      // Get user ID from either OAuth or local auth
      const userId = req.user.id;
      const validatedData = insertVideoSchema.parse({
        ...req.body,
        uploadedBy: userId,
      });
      const video = await storage.createVideo(validatedData);
      res.status(201).json(video);
    } catch (error) {
      console.error("Error creating video:", error);
      res.status(400).json({ message: "Failed to create video" });
    }
  });

  app.delete('/api/videos/:id', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      await storage.deleteVideo(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ message: "Failed to delete video" });
    }
  });

  // Video comment routes
  app.get('/api/videos/:id/comments', async (req, res) => {
    try {
      const comments = await storage.getVideoComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post('/api/videos/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      // Get user ID from either OAuth or local auth
      const userId = req.user.id;
      const validatedData = insertVideoCommentSchema.parse({
        ...req.body,
        videoId: req.params.id,
        userId,
      });
      const comment = await storage.createVideoComment(validatedData);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(400).json({ message: "Failed to create comment" });
    }
  });

  // ============================================
  // Event Form Builder Routes (Admin only)
  // ============================================

  // Get all form fields for an event
  app.get('/api/events/:eventId/form/fields', async (req, res) => {
    try {
      const fields = await storage.getEventFormFields(req.params.eventId);
      res.json(fields);
    } catch (error) {
      console.error("Error fetching form fields:", error);
      res.status(500).json({ message: "Failed to fetch form fields" });
    }
  });

  // Create a new form field
  app.post('/api/events/:eventId/form/fields', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const validatedData = createFormFieldSchema.parse({
        ...req.body,
        eventId: req.params.eventId,
      });
      
      // Validate options for choice types
      if ((validatedData.type === 'single_choice' || validatedData.type === 'multiple_choice') 
          && (!validatedData.options || validatedData.options.length === 0)) {
        return res.status(400).json({ message: "Choice questions require at least one option" });
      }
      
      const field = await storage.createEventFormField(validatedData);
      res.status(201).json(field);
    } catch (error: any) {
      console.error("Error creating form field:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create form field" });
    }
  });

  // Update a form field
  app.patch('/api/events/:eventId/form/fields/:fieldId', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const validatedData = updateFormFieldSchema.parse(req.body);
      
      // Validate options for choice types
      if ((validatedData.type === 'single_choice' || validatedData.type === 'multiple_choice') 
          && validatedData.options && validatedData.options.length === 0) {
        return res.status(400).json({ message: "Choice questions require at least one option" });
      }
      
      const field = await storage.updateEventFormField(req.params.fieldId, validatedData);
      res.json(field);
    } catch (error: any) {
      console.error("Error updating form field:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update form field" });
    }
  });

  // Delete a form field
  app.delete('/api/events/:eventId/form/fields/:fieldId', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      await storage.deleteEventFormField(req.params.fieldId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting form field:", error);
      res.status(500).json({ message: "Failed to delete form field" });
    }
  });

  // Reorder form fields
  app.patch('/api/events/:eventId/form/reorder', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const { fieldIds } = req.body;
      if (!Array.isArray(fieldIds)) {
        return res.status(400).json({ message: "fieldIds must be an array" });
      }
      await storage.reorderEventFormFields(req.params.eventId, fieldIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering form fields:", error);
      res.status(500).json({ message: "Failed to reorder form fields" });
    }
  });

  // ============================================
  // Event Form Responses Routes
  // ============================================

  // Get all form responses for an event (admin only)
  app.get('/api/events/:eventId/form/responses', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const responses = await storage.getEventFormResponses(req.params.eventId);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching form responses:", error);
      res.status(500).json({ message: "Failed to fetch form responses" });
    }
  });

  // Get a single form response (admin only)
  app.get('/api/events/:eventId/form/responses/:responseId', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const response = await storage.getEventFormResponse(req.params.responseId);
      if (!response) {
        return res.status(404).json({ message: "Response not found" });
      }
      res.json(response);
    } catch (error) {
      console.error("Error fetching form response:", error);
      res.status(500).json({ message: "Failed to fetch form response" });
    }
  });

  // Submit form answers with registration
  app.post('/api/events/:eventId/register-with-form', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const eventId = req.params.eventId;
      const { answers } = submitFormAnswersSchema.parse(req.body);

      // Check if event exists
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (!event.registrationOpen) {
        return res.status(400).json({ message: "Registration is closed" });
      }

      const dbUser = await storage.getUser(userId);

      if (event.registrationRestrictedTo && event.registrationRestrictedTo.length > 0) {
        if (dbUser && !event.registrationRestrictedTo.includes(dbUser.organizationType || "")) {
          return res.status(403).json({ message: "Registration is restricted based on organization type" });
        }
      }

      if (event.requiresGroupNumber && dbUser) {
        const orgType = dbUser.organizationType || "";
        const isFU = orgType === "financial-university" || orgType === "financial_university";
        if (isFU && !dbUser.groupNumber?.trim()) {
          return res.status(412).json({
            code: "GROUP_NUMBER_REQUIRED",
            message: "Group number is required to register for this event",
          });
        }
      }

      const existingRegistration = await storage.getUserEventRegistration(eventId, userId);
      if (existingRegistration) {
        return res.status(400).json({ message: "Already registered for this event" });
      }

      // Get form fields for validation
      const formFields = await storage.getEventFormFields(eventId);
      const fieldMap = new Map(formFields.map(f => [f.id, f]));
      
      // Validate each answer against defined fields
      const validationErrors: { fieldId: string; message: string }[] = [];
      
      for (const answer of answers) {
        const field = fieldMap.get(answer.fieldId);
        
        // Reject answers for unknown fields
        if (!field) {
          validationErrors.push({
            fieldId: answer.fieldId,
            message: "Unknown question",
          });
          continue;
        }
        
        // Validate based on field type
        switch (field.type) {
          case 'short_text':
          case 'long_text':
            if (answer.valueText !== undefined && typeof answer.valueText !== 'string') {
              validationErrors.push({
                fieldId: field.id,
                message: `${field.label}: Invalid text value`,
              });
            }
            break;
          case 'single_choice':
            if (answer.valueOptions) {
              if (answer.valueOptions.length !== 1) {
                validationErrors.push({
                  fieldId: field.id,
                  message: `${field.label}: Must select exactly one option`,
                });
              } else if (field.options && !field.options.includes(answer.valueOptions[0])) {
                validationErrors.push({
                  fieldId: field.id,
                  message: `${field.label}: Invalid option selected`,
                });
              }
            }
            break;
          case 'multiple_choice':
            if (answer.valueOptions && field.options) {
              const invalidOptions = answer.valueOptions.filter(o => !field.options!.includes(o));
              if (invalidOptions.length > 0) {
                validationErrors.push({
                  fieldId: field.id,
                  message: `${field.label}: Invalid options selected`,
                });
              }
            }
            break;
          case 'file':
            // Validate file against field-specific constraints if provided
            if (answer.filePath && field.allowedFileTypes && field.allowedFileTypes.length > 0) {
              const fileExt = answer.fileName?.split('.').pop()?.toLowerCase();
              const allowedExts = field.allowedFileTypes.map(t => t.toLowerCase().replace('.', ''));
              if (fileExt && !allowedExts.includes(fileExt)) {
                validationErrors.push({
                  fieldId: field.id,
                  message: `${field.label}: File type .${fileExt} not allowed`,
                });
              }
            }
            break;
        }
      }
      
      // Validate required fields have values
      for (const field of formFields) {
        if (!field.required) continue;
        
        const answer = answers.find(a => a.fieldId === field.id);
        if (!answer) {
          validationErrors.push({
            fieldId: field.id,
            message: `${field.label}: This field is required`,
          });
          continue;
        }
        
        // Check if answer has a non-empty value based on field type
        const hasValue = field.type === 'file' 
          ? !!answer.filePath
          : field.type === 'single_choice' || field.type === 'multiple_choice'
            ? answer.valueOptions && answer.valueOptions.length > 0
            : !!answer.valueText?.trim();
            
        if (!hasValue) {
          validationErrors.push({
            fieldId: field.id,
            message: `${field.label}: This field is required`,
          });
        }
      }
      
      // Return structured validation errors if any
      if (validationErrors.length > 0) {
        return res.status(400).json({ 
          message: "Validation failed",
          fieldErrors: validationErrors.reduce((acc, err) => {
            acc[err.fieldId] = err.message;
            return acc;
          }, {} as Record<string, string>),
          errors: validationErrors,
        });
      }
      
      // Filter answers to only include valid fields
      const validAnswers = answers.filter(a => fieldMap.has(a.fieldId));

      // Create registration
      const registration = await storage.createEventRegistration({
        eventId,
        userId,
      });

      // Create form response
      const formResponse = await storage.createEventFormResponse({
        eventId,
        registrationId: registration.id,
        userId,
      });

      // Create form answers (only for valid fields)
      if (validAnswers.length > 0) {
        const answerData = validAnswers.map(a => ({
          responseId: formResponse.id,
          fieldId: a.fieldId,
          valueText: a.valueText,
          valueOptions: a.valueOptions,
          filePath: a.filePath,
          fileName: a.fileName,
        }));
        await storage.createEventFormAnswers(answerData);
      }

      res.status(201).json({
        registration,
        formResponse,
        message: "Successfully registered for event",
      });
    } catch (error: any) {
      console.error("Error registering with form:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to register for event" });
    }
  });

  // Livestream routes
  app.get('/api/livestreams', async (req, res) => {
    try {
      const streams = await storage.getLivestreams();
      res.json(streams);
    } catch (error) {
      console.error("Error fetching livestreams:", error);
      res.status(500).json({ message: "Failed to fetch livestreams" });
    }
  });

  app.get('/api/livestreams/active', async (req, res) => {
    try {
      const stream = await storage.getActiveLivestream();
      res.json(stream || null);
    } catch (error) {
      console.error("Error fetching active livestream:", error);
      res.status(500).json({ message: "Failed to fetch active livestream" });
    }
  });

  app.post('/api/livestreams', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const validatedData = insertLivestreamSchema.parse(req.body);
      const stream = await storage.createLivestream(validatedData);
      res.status(201).json(stream);
    } catch (error) {
      console.error("Error creating livestream:", error);
      res.status(400).json({ message: "Failed to create livestream" });
    }
  });

  app.patch('/api/livestreams/:id', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const stream = await storage.updateLivestream(req.params.id, req.body);
      res.json(stream);
    } catch (error) {
      console.error("Error updating livestream:", error);
      res.status(400).json({ message: "Failed to update livestream" });
    }
  });

  app.delete('/api/livestreams/:id', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      await storage.deleteLivestream(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting livestream:", error);
      res.status(500).json({ message: "Failed to delete livestream" });
    }
  });

  // Course routes - public endpoint returns only published courses for non-admins
  app.get('/api/courses', async (req: any, res) => {
    try {
      // Check if user is authenticated and has elevated permissions
      let canSeeAllCourses = false;
      if (req.isAuthenticated && req.isAuthenticated()) {
        const userId = req.user?.claims?.sub || req.user?.id;
        if (userId) {
          const user = await storage.getUser(userId);
          canSeeAllCourses = user?.role === 'teacher' || user?.isHeadAdmin === true || user?.role === 'lmsAdmin';
        }
      }
      
      // Admins and teachers see all courses, others see only published
      const courses = canSeeAllCourses 
        ? await storage.getCourses()
        : await storage.getPublishedCourses();
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get('/api/courses/:id', async (req: any, res) => {
    try {
      const course = await storage.getCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Check if user is authenticated and has elevated permissions
      let canSeeAllCourses = false;
      if (req.isAuthenticated && req.isAuthenticated()) {
        const userId = req.user?.claims?.sub || req.user?.id;
        if (userId) {
          const user = await storage.getUser(userId);
          canSeeAllCourses = user?.role === 'teacher' || user?.isHeadAdmin === true || user?.role === 'lmsAdmin';
        }
      }
      
      // Non-admins/non-teachers can only see published courses
      if (!canSeeAllCourses && course.visibility !== 'published') {
        return res.status(404).json({ message: "Course not found" });
      }
      
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  app.post('/api/courses', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      const validatedData = insertCourseSchema.parse(req.body);
      const course = await storage.createCourse(validatedData);
      res.status(201).json(course);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(400).json({ message: "Failed to create course" });
    }
  });

  // Course lesson routes
  app.get('/api/courses/:id/lessons', async (req, res) => {
    try {
      const lessons = await storage.getCourseLessons(req.params.id);
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  });

  app.post('/api/courses/:id/lessons', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      const validatedData = insertCourseLessonSchema.parse({
        ...req.body,
        courseId: req.params.id,
      });
      const lesson = await storage.createCourseLesson(validatedData);
      res.status(201).json(lesson);
    } catch (error) {
      console.error("Error creating lesson:", error);
      res.status(400).json({ message: "Failed to create lesson" });
    }
  });

  // Lesson video upload route
  app.post('/api/lessons/:id/upload-video', isAuthenticated, isLmsAdmin, uploadVideo.single('video'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No video file uploaded" });
      }

      const lessonId = req.params.id;
      const lesson = await storage.getCourseLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      // Upload video to object storage
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (!bucketId) {
        return res.status(500).json({ message: "Object storage not configured" });
      }

      const { Storage } = await import("@google-cloud/storage");
      const gcs = new Storage();
      const bucket = gcs.bucket(bucketId);

      const timestamp = Date.now();
      const ext = path.extname(req.file.originalname).toLowerCase();
      const fileName = `lesson-videos/${lessonId}-${timestamp}${ext}`;
      const file = bucket.file(fileName);

      await file.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
      });

      // Make file publicly accessible
      await file.makePublic();

      const videoUrl = `https://storage.googleapis.com/${bucketId}/${fileName}`;

      // Update lesson with video URL
      const updatedLesson = await storage.updateCourseLesson(lessonId, {
        videoUrl,
        lessonType: 'video',
      });

      res.json({ videoUrl, lesson: updatedLesson });
    } catch (error) {
      console.error("Error uploading lesson video:", error);
      res.status(500).json({ message: "Failed to upload video" });
    }
  });

  // Course task routes
  app.get('/api/courses/:id/tasks', async (req, res) => {
    try {
      const tasks = await storage.getCourseTasks(req.params.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post('/api/courses/:id/tasks', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const validatedData = insertCourseTaskSchema.parse({
        ...req.body,
        courseId: req.params.id,
      });
      const task = await storage.createCourseTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: "Failed to create task" });
    }
  });

  // Course submission routes
  app.get('/api/tasks/:id/my-submission', isAuthenticated, async (req: any, res) => {
    try {
      // Get user ID from either OAuth or local auth
      const userId = req.user.id;
      const submission = await storage.getUserTaskSubmission(req.params.id, userId);
      res.json(submission || null);
    } catch (error) {
      console.error("Error fetching submission:", error);
      res.status(500).json({ message: "Failed to fetch submission" });
    }
  });

  app.post('/api/tasks/:id/submit', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      // Get user ID from either OAuth or local auth
      const userId = req.user.id;
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const fileUrl = `/uploads/${req.file.filename}`;
      const validatedData = insertCourseSubmissionSchema.parse({
        taskId: req.params.id,
        userId,
        fileUrl,
      });
      const submission = await storage.createCourseSubmission(validatedData);
      res.status(201).json(submission);
    } catch (error) {
      console.error("Error creating submission:", error);
      res.status(400).json({ message: "Failed to create submission" });
    }
  });

  // Enhanced task routes
  app.get('/api/tasks/:id', async (req, res) => {
    try {
      const task = await storage.getCourseTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.patch('/api/tasks/:id', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const task = await storage.updateCourseTask(req.params.id, req.body);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(400).json({ message: "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:id', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      await storage.deleteCourseTask(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Quiz question routes (admin only)
  app.get('/api/tasks/:id/questions', async (req, res) => {
    try {
      const questions = await storage.getQuizQuestions(req.params.id);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.post('/api/tasks/:id/questions', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      const validatedData = insertQuizQuestionSchema.parse({
        ...req.body,
        taskId: req.params.id,
      });
      const question = await storage.createQuizQuestion(validatedData);
      res.status(201).json(question);
    } catch (error) {
      console.error("Error creating question:", error);
      res.status(400).json({ message: "Failed to create question" });
    }
  });

  app.patch('/api/questions/:id', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      const question = await storage.updateQuizQuestion(req.params.id, req.body);
      res.json(question);
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(400).json({ message: "Failed to update question" });
    }
  });

  app.delete('/api/questions/:id', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      await storage.deleteQuizQuestion(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  app.post('/api/tasks/:id/questions/reorder', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      const { questionIds } = req.body;
      if (!Array.isArray(questionIds)) {
        return res.status(400).json({ message: "questionIds must be an array" });
      }
      await storage.reorderQuizQuestions(req.params.id, questionIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering questions:", error);
      res.status(400).json({ message: "Failed to reorder questions" });
    }
  });

  // Quiz attempt routes (for enrolled students)
  app.get('/api/tasks/:id/my-attempts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const attempts = await storage.getQuizAttempts(req.params.id, userId);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching attempts:", error);
      res.status(500).json({ message: "Failed to fetch attempts" });
    }
  });

  app.get('/api/tasks/:id/latest-attempt', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const attempt = await storage.getLatestQuizAttempt(req.params.id, userId);
      res.json(attempt || null);
    } catch (error) {
      console.error("Error fetching latest attempt:", error);
      res.status(500).json({ message: "Failed to fetch latest attempt" });
    }
  });

  app.post('/api/tasks/:id/start-quiz', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const taskId = req.params.id;
      
      // Check task exists and is a quiz
      const task = await storage.getCourseTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      if (task.taskType !== 'quiz') {
        return res.status(400).json({ message: "This task is not a quiz" });
      }
      
      // Check max attempts if configured
      if (task.maxAttempts) {
        const attemptCount = await storage.countUserAttempts(taskId, userId);
        if (attemptCount >= task.maxAttempts) {
          return res.status(400).json({ message: "Maximum attempts reached" });
        }
      }
      
      // Check for existing incomplete attempt
      const latestAttempt = await storage.getLatestQuizAttempt(taskId, userId);
      if (latestAttempt && latestAttempt.status === 'in_progress') {
        return res.json(latestAttempt); // Return existing in-progress attempt
      }
      
      // Create new attempt
      const attempt = await storage.createQuizAttempt({
        taskId,
        userId,
      });
      res.status(201).json(attempt);
    } catch (error) {
      console.error("Error starting quiz:", error);
      res.status(500).json({ message: "Failed to start quiz" });
    }
  });

  app.post('/api/attempts/:id/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const attemptId = req.params.id;
      const { answers } = req.body;
      
      // Verify attempt belongs to user
      const attempt = await storage.getQuizAttempt(attemptId);
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }
      if (attempt.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (attempt.status === 'completed') {
        return res.status(400).json({ message: "Attempt already submitted" });
      }
      
      // Get quiz questions for auto-grading
      const questions = await storage.getQuizQuestions(attempt.taskId);
      const task = await storage.getCourseTask(attempt.taskId);
      
      // Auto-grade objective questions
      let score = 0;
      let maxScore = 0;
      const parsedAnswers = typeof answers === 'string' ? JSON.parse(answers) : answers;
      
      for (const question of questions) {
        const points = question.points || 1;
        maxScore += points;
        
        const userAnswer = parsedAnswers[question.id];
        if (!userAnswer) continue;
        
        if (question.questionType === 'multiple_choice' || question.questionType === 'true_false') {
          // Auto-grade: compare with correct answer
          if (question.correctAnswer && userAnswer === question.correctAnswer) {
            score += points;
          }
        } else if (question.questionType === 'multiple_select') {
          // Auto-grade: check if arrays match
          const correctAnswers = JSON.parse(question.correctAnswer || '[]');
          const userAnswers = Array.isArray(userAnswer) ? userAnswer : JSON.parse(userAnswer);
          if (JSON.stringify(correctAnswers.sort()) === JSON.stringify(userAnswers.sort())) {
            score += points;
          }
        }
        // Short answer and essay require manual grading - points not added automatically
      }
      
      const submitted = await storage.submitQuizAttempt(
        attemptId,
        JSON.stringify(parsedAnswers),
        score,
        maxScore
      );
      
      res.json(submitted);
    } catch (error) {
      console.error("Error submitting quiz:", error);
      res.status(500).json({ message: "Failed to submit quiz" });
    }
  });

  // Grading routes (admin only)
  app.get('/api/tasks/:id/submissions', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      const submissions = await storage.getTaskSubmissions(req.params.id);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.get('/api/submissions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const submission = await storage.getSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      // Check if user is admin or owns the submission
      const user = await storage.getUser(userId);
      const isAdminUser = user?.role === 'teacher' || user?.isHeadAdmin === true || user?.role === 'lmsAdmin';
      if (!isAdminUser && submission.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      res.json(submission);
    } catch (error) {
      console.error("Error fetching submission:", error);
      res.status(500).json({ message: "Failed to fetch submission" });
    }
  });

  app.post('/api/submissions/:id/grade', isAuthenticated, isLmsAdmin, async (req: any, res) => {
    try {
      const graderId = req.user.id;
      const { grade, feedback } = gradeSubmissionSchema.parse(req.body);
      
      const graded = await storage.gradeSubmission(
        req.params.id,
        graderId,
        grade,
        feedback
      );
      res.json(graded);
    } catch (error) {
      console.error("Error grading submission:", error);
      res.status(400).json({ message: "Failed to grade submission" });
    }
  });

  // Student gradebook route
  app.get('/api/my-submissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const submissions = await storage.getUserSubmissions(userId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching user submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Course progress routes
  app.get('/api/courses/:id/my-progress', isAuthenticated, async (req: any, res) => {
    try {
      // Get user ID from either OAuth or local auth
      const userId = req.user.id;
      const progress = await storage.getUserCourseProgress(req.params.id, userId);
      res.json(progress || null);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post('/api/courses/:id/progress', isAuthenticated, async (req: any, res) => {
    try {
      // Get user ID from either OAuth or local auth
      const userId = req.user.id;
      const validatedData = insertCourseProgressSchema.parse({
        ...req.body,
        courseId: req.params.id,
        userId,
      });
      const progress = await storage.upsertCourseProgress(validatedData);
      res.json(progress);
    } catch (error) {
      console.error("Error updating progress:", error);
      res.status(400).json({ message: "Failed to update progress" });
    }
  });

  // Enhanced course routes - with Zod validation
  app.patch('/api/courses/:id', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      const validatedData = updateCourseSchema.parse(req.body);
      const course = await storage.updateCourse(req.params.id, validatedData as any);
      res.json(course);
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(400).json({ message: "Failed to update course" });
    }
  });

  app.delete('/api/courses/:id', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      await storage.deleteCourse(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  // Published courses (for non-admins)
  app.get('/api/courses/published', async (req, res) => {
    try {
      const courses = await storage.getPublishedCourses();
      res.json(courses);
    } catch (error) {
      console.error("Error fetching published courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Course module routes - check course visibility
  app.get('/api/courses/:id/modules', async (req: any, res) => {
    try {
      // First verify the course exists and is accessible
      const course = await storage.getCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Check if user is admin or course is published
      const userId = req.user?.claims?.sub || req.user?.id;
      let isAdminUser = false;
      if (userId) {
        const user = await storage.getUser(userId);
        isAdminUser = user?.role === 'teacher' || user?.isHeadAdmin === true || user?.role === 'lmsAdmin';
      }
      
      if (!isAdminUser && course.visibility !== 'published') {
        return res.status(404).json({ message: "Course not found" });
      }
      
      const modules = await storage.getCourseModules(req.params.id);
      res.json(modules);
    } catch (error) {
      console.error("Error fetching modules:", error);
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  app.post('/api/courses/:id/modules', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      const validatedData = insertCourseModuleSchema.parse({
        ...req.body,
        courseId: req.params.id,
      });
      const module = await storage.createCourseModule(validatedData);
      res.status(201).json(module);
    } catch (error) {
      console.error("Error creating module:", error);
      res.status(400).json({ message: "Failed to create module" });
    }
  });

  app.patch('/api/modules/:id', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      const validatedData = updateCourseModuleSchema.parse(req.body);
      const module = await storage.updateCourseModule(req.params.id, validatedData);
      res.json(module);
    } catch (error) {
      console.error("Error updating module:", error);
      res.status(400).json({ message: "Failed to update module" });
    }
  });

  app.delete('/api/modules/:id', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      await storage.deleteCourseModule(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting module:", error);
      res.status(500).json({ message: "Failed to delete module" });
    }
  });

  app.post('/api/courses/:id/modules/reorder', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      const { moduleIds } = req.body;
      await storage.reorderCourseModules(req.params.id, moduleIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering modules:", error);
      res.status(400).json({ message: "Failed to reorder modules" });
    }
  });

  // Course enrollment routes
  app.get('/api/courses/:id/enrollments', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      const enrollments = await storage.getCourseEnrollments(req.params.id);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  app.get('/api/courses/:id/enrollment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const enrollment = await storage.getCourseEnrollment(req.params.id, userId);
      res.json(enrollment || null);
    } catch (error) {
      console.error("Error checking enrollment:", error);
      res.status(500).json({ message: "Failed to check enrollment" });
    }
  });

  app.post('/api/courses/:id/enroll', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const courseId = req.params.id;
      
      // Check if already enrolled
      const existing = await storage.getCourseEnrollment(courseId, userId);
      if (existing) {
        return res.status(400).json({ message: "Already enrolled in this course" });
      }
      
      // Check course visibility and enrollment type
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      if (course.visibility !== 'published') {
        // Only admins can enroll in unpublished courses
        const user = await storage.getUser(userId);
        if (user?.role !== 'lmsAdmin' && !user?.isHeadAdmin) {
          return res.status(403).json({ message: "Course not available for enrollment" });
        }
      }
      
      const enrollment = await storage.createCourseEnrollment({
        courseId,
        userId,
        status: 'active',
      });
      res.status(201).json(enrollment);
    } catch (error) {
      console.error("Error enrolling in course:", error);
      res.status(400).json({ message: "Failed to enroll in course" });
    }
  });

  app.delete('/api/courses/:id/unenroll', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const enrollment = await storage.getCourseEnrollment(req.params.id, userId);
      if (enrollment) {
        await storage.deleteCourseEnrollment(enrollment.id);
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error unenrolling from course:", error);
      res.status(500).json({ message: "Failed to unenroll from course" });
    }
  });

  app.get('/api/user/enrollments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const enrollments = await storage.getUserEnrollments(userId);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching user enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  // Enhanced lesson routes - check course visibility
  app.get('/api/lessons/:id', async (req: any, res) => {
    try {
      const lesson = await storage.getCourseLesson(req.params.id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      // Check if the course is accessible
      const course = await storage.getCourse(lesson.courseId);
      if (!course) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      // Check if user is admin or course is published
      const userId = req.user?.claims?.sub || req.user?.id;
      let isAdminUser = false;
      if (userId) {
        const user = await storage.getUser(userId);
        isAdminUser = user?.role === 'teacher' || user?.isHeadAdmin === true || user?.role === 'lmsAdmin';
      }
      
      if (!isAdminUser && course.visibility !== 'published') {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      res.json(lesson);
    } catch (error) {
      console.error("Error fetching lesson:", error);
      res.status(500).json({ message: "Failed to fetch lesson" });
    }
  });

  app.patch('/api/lessons/:id', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      const validatedData = updateCourseLessonSchema.parse(req.body);
      const lesson = await storage.updateCourseLesson(req.params.id, validatedData);
      res.json(lesson);
    } catch (error) {
      console.error("Error updating lesson:", error);
      res.status(400).json({ message: "Failed to update lesson" });
    }
  });

  app.delete('/api/lessons/:id', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      await storage.deleteCourseLesson(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lesson:", error);
      res.status(500).json({ message: "Failed to delete lesson" });
    }
  });

  app.post('/api/courses/:id/lessons/reorder', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      const { lessonIds } = req.body;
      await storage.reorderCourseLessons(req.params.id, lessonIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering lessons:", error);
      res.status(400).json({ message: "Failed to reorder lessons" });
    }
  });

  // Lesson progress routes - require enrollment
  app.get('/api/lessons/:id/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get the lesson and verify enrollment
      const lesson = await storage.getCourseLesson(req.params.id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      // Check if user is enrolled in the course
      const enrollment = await storage.getCourseEnrollment(lesson.courseId, userId);
      if (!enrollment) {
        return res.status(403).json({ message: "You must be enrolled in this course to view progress" });
      }
      
      const progress = await storage.getLessonProgress(req.params.id, userId);
      res.json(progress || null);
    } catch (error) {
      console.error("Error fetching lesson progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post('/api/lessons/:id/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get the lesson and verify enrollment
      const lesson = await storage.getCourseLesson(req.params.id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      // Check if user is enrolled in the course
      const enrollment = await storage.getCourseEnrollment(lesson.courseId, userId);
      if (!enrollment) {
        return res.status(403).json({ message: "You must be enrolled in this course to track progress" });
      }
      
      const progress = await storage.upsertLessonProgress({
        lessonId: req.params.id,
        userId,
        ...req.body,
      });
      res.json(progress);
    } catch (error) {
      console.error("Error updating lesson progress:", error);
      res.status(400).json({ message: "Failed to update progress" });
    }
  });

  app.post('/api/lessons/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get the lesson first
      const lesson = await storage.getCourseLesson(req.params.id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      // Check if user is enrolled in the course
      const enrollment = await storage.getCourseEnrollment(lesson.courseId, userId);
      if (!enrollment) {
        return res.status(403).json({ message: "You must be enrolled in this course to mark lessons complete" });
      }
      
      const progress = await storage.markLessonComplete(req.params.id, userId);
      
      // Update overall course progress
      const allLessons = await storage.getCourseLessons(lesson.courseId);
      const userProgress = await storage.getUserLessonProgress(userId, lesson.courseId);
      const completedCount = userProgress.filter(p => p.completed).length;
      const progressPercent = Math.round((completedCount / allLessons.length) * 100);
      
      await storage.upsertCourseProgress({
        courseId: lesson.courseId,
        userId,
        progress: progressPercent,
        status: progressPercent === 100 ? 'completed' : 'in-progress',
      });
      
      res.json(progress);
    } catch (error) {
      console.error("Error marking lesson complete:", error);
      res.status(400).json({ message: "Failed to mark lesson complete" });
    }
  });

  // Serve public images from object storage
  app.get('/:filename([a-zA-Z0-9_-]+-[0-9]+\\.(jpg|jpeg|png|gif|webp))', async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const publicFile = await objectStorageService.searchPublicObject(req.params.filename);
      
      if (!publicFile) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      await objectStorageService.downloadObject(publicFile, res, 3600, req.headers.range);
    } catch (error) {
      console.error("Error serving public image:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to serve image" });
      }
    }
  });

  // Serve public showcase attachments (pitch decks + demo videos) from object storage.
  // No auth — demo videos must be playable by any visitor.
  app.get('/:filename([a-zA-Z0-9_-]+-[0-9]+\\.(pdf|pptx|ppt|mp4|webm|mov|m4v))', async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const publicFile = await objectStorageService.searchPublicObject(req.params.filename);
      if (!publicFile) {
        return res.status(404).json({ message: "File not found" });
      }
      await objectStorageService.downloadObject(publicFile, res, 3600, req.headers.range);
    } catch (error) {
      console.error("Error serving public file:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to serve file" });
      }
    }
  });

  // ============================================
  // WhatsApp-style Chat Routes (must be before parameterized /api/chat/:sessionId routes)
  // ============================================

  // Get all conversations for current user
  app.get('/api/chat/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Get or create a conversation with another user
  app.post('/api/chat/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { recipientId } = req.body;
      if (!recipientId) {
        return res.status(400).json({ message: "Recipient ID is required" });
      }
      const conversation = await storage.getOrCreateConversation(userId, recipientId);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Get messages for a conversation
  app.get('/api/chat/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const messages = await storage.getConversationMessages(req.params.id);
      await storage.markConversationMessagesRead(req.params.id, userId);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Send a message in a conversation
  app.post('/api/chat/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { content, mentions } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ message: "Message content is required" });
      }
      
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const message = await storage.sendChatMessage(req.params.id, userId, content, mentions);
      
      const recipientId = conversation.participant1Id === userId 
        ? conversation.participant2Id 
        : conversation.participant1Id;
      
      const sender = await storage.getUser(userId);
      const senderName = sender?.firstName && sender?.lastName 
        ? `${sender.firstName} ${sender.lastName}` 
        : 'Someone';
      
      await storage.createNotification({
        userId: recipientId,
        type: 'message',
        title: 'New Message',
        content: `${senderName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        relatedId: conversation.id,
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Get unread chat count
  app.get('/api/chat/unread/count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const count = await storage.getUnreadChatCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread chat count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // ============================================
  // AI Chat Routes (GigaChat)
  // ============================================

  // Start a new event registration chat session
  app.post('/api/chat/event/:eventId/start', async (req: any, res) => {
    try {
      const { eventId } = req.params;
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (!event.registrationOpen) {
        return res.status(400).json({ message: "Registration is closed for this event" });
      }

      const userId = req.user?.claims?.sub || req.user?.id || null;

      if (userId && event.registrationRestrictedTo && event.registrationRestrictedTo.length > 0) {
        const dbUser = await storage.getUser(userId);
        if (dbUser && !event.registrationRestrictedTo.includes(dbUser.organizationType || "")) {
          return res.status(403).json({ message: "Registration is restricted based on organization type" });
        }
      }

      // Check if guest registration is allowed when user is not authenticated
      if (!userId && !event.allowGuestChatRegistration) {
        return res.status(401).json({ 
          message: "Authentication required for registration",
          requiresAuth: true,
        });
      }

      // Get form fields for this event
      const formFields = await storage.getEventFormFields(eventId);

      // Create chat session
      const session = await storage.createChatSession({
        userId,
        eventId,
        type: 'event_registration',
        status: 'active',
      });

      // Generate system prompt with full field info for AI
      const systemPrompt = getEventRegistrationPrompt(
        event.name,
        event.description || '',
        formFields.map(f => ({
          label: f.label,
          type: f.type,
          required: f.required,
          options: f.options,
        }))
      );

      // Store system message
      await storage.createChatMessage({
        sessionId: session.id,
        role: 'system',
        content: systemPrompt,
      });

      // Generate initial assistant greeting
      const messages: GigaChatMessage[] = [
        { role: 'system', content: systemPrompt },
      ];

      try {
        const response = await sendChatMessage(messages, { temperature: 0.8 });
        
        // Store assistant message
        await storage.createChatMessage({
          sessionId: session.id,
          role: 'assistant',
          content: response.content,
        });

        res.json({
          sessionId: session.id,
          message: response.content,
          eventName: event.name,
        });
      } catch (aiError) {
        console.error("GigaChat error:", aiError);
        // Return session without AI greeting if GigaChat fails
        const fallbackGreeting = `Добро пожаловать! Я помогу вам зарегистрироваться на мероприятие "${event.name}". Расскажите немного о себе, чтобы начать регистрацию.`;
        
        await storage.createChatMessage({
          sessionId: session.id,
          role: 'assistant',
          content: fallbackGreeting,
        });

        res.json({
          sessionId: session.id,
          message: fallbackGreeting,
          eventName: event.name,
          aiError: true,
        });
      }
    } catch (error) {
      console.error("Error starting chat session:", error);
      res.status(500).json({ message: "Failed to start chat session" });
    }
  });

  // Start onboarding chat session
  app.post('/api/chat/onboarding/start', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || null;

      // Fetch real platform data for grounding
      const [allEvents, allCourses, allVideos, allLivestreams] = await Promise.all([
        storage.getEvents(),
        storage.getCourses(),
        storage.getVideos(),
        storage.getLivestreams(),
      ]);

      // Filter to only published, upcoming events
      const now = new Date();
      const upcomingEvents = allEvents
        .filter(e => !e.isDraft && new Date(e.date) >= now)
        .slice(0, 5);

      const platformContext = {
        events: upcomingEvents.map(e => ({
          name: e.name,
          date: e.date,
          location: e.location || '',
          description: e.description || undefined,
        })),
        courses: allCourses.slice(0, 5).map(c => ({
          title: c.title,
          description: c.description || undefined,
        })),
        videos: allVideos.slice(0, 5).map(v => ({
          title: v.title,
        })),
        livestreams: allLivestreams.slice(0, 3).map(l => ({
          title: l.title,
          scheduledDate: l.scheduledDate || undefined,
        })),
      };

      const session = await storage.createChatSession({
        userId,
        type: 'onboarding',
        status: 'active',
      });

      const systemPrompt = getOnboardingPrompt(platformContext);

      await storage.createChatMessage({
        sessionId: session.id,
        role: 'system',
        content: systemPrompt,
      });

      const messages: GigaChatMessage[] = [
        { role: 'system', content: systemPrompt },
      ];

      try {
        const response = await sendChatMessage(messages, { temperature: 0.6 });
        
        await storage.createChatMessage({
          sessionId: session.id,
          role: 'assistant',
          content: response.content,
        });

        res.json({
          sessionId: session.id,
          message: response.content,
        });
      } catch (aiError) {
        console.error("GigaChat error:", aiError);
        const fallbackGreeting = 'Привет! Я виртуальный помощник Предпринимательского Клуба. Могу рассказать о наших мероприятиях, курсах и видео. Чем могу помочь?';
        
        await storage.createChatMessage({
          sessionId: session.id,
          role: 'assistant',
          content: fallbackGreeting,
        });

        res.json({
          sessionId: session.id,
          message: fallbackGreeting,
          aiError: true,
        });
      }
    } catch (error) {
      console.error("Error starting onboarding chat:", error);
      res.status(500).json({ message: "Failed to start chat session" });
    }
  });

  // Helper function to validate chat session ownership
  const validateChatSessionOwnership = (session: any, req: any): boolean => {
    const requestUserId = req.user?.claims?.sub || req.user?.id || null;
    // If session has a userId, the request must come from the same user
    if (session.userId) {
      return session.userId === requestUserId;
    }
    // For anonymous sessions, we allow access (could add IP/token validation later)
    return true;
  };

  // Send message to chat session
  app.post('/api/chat/:sessionId/message', async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const { message } = req.body;

      // Input validation
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      // Validate message length (max 2000 characters)
      if (message.trim().length === 0) {
        return res.status(400).json({ message: "Message cannot be empty" });
      }
      if (message.length > 2000) {
        return res.status(400).json({ message: "Message too long (max 2000 characters)" });
      }

      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      // Validate session ownership
      if (!validateChatSessionOwnership(session, req)) {
        return res.status(403).json({ message: "Access denied to this chat session" });
      }

      if (session.status !== 'active') {
        return res.status(400).json({ message: "Chat session is no longer active" });
      }

      // Store user message
      await storage.createChatMessage({
        sessionId,
        role: 'user',
        content: message,
      });

      // Get all messages for context
      const allMessages = await storage.getChatMessages(sessionId);
      const chatHistory: GigaChatMessage[] = allMessages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }));

      try {
        const response = await sendChatMessage(chatHistory, { temperature: 0.7 });
        
        // Store assistant response
        await storage.createChatMessage({
          sessionId,
          role: 'assistant',
          content: response.content,
        });

        res.json({
          message: response.content,
          usage: response.usage,
        });
      } catch (aiError) {
        console.error("GigaChat error:", aiError);
        const fallbackResponse = 'Извините, произошла временная ошибка. Пожалуйста, попробуйте снова или свяжитесь с нами напрямую.';
        
        await storage.createChatMessage({
          sessionId,
          role: 'assistant',
          content: fallbackResponse,
        });

        res.json({
          message: fallbackResponse,
          aiError: true,
        });
      }
    } catch (error) {
      console.error("Error sending chat message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Get chat session with messages
  app.get('/api/chat/:sessionId', async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getChatSessionWithMessages(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      // Validate session ownership
      if (!validateChatSessionOwnership(session, req)) {
        return res.status(403).json({ message: "Access denied to this chat session" });
      }

      // Filter out system messages from response
      const visibleMessages = session.messages.filter(m => m.role !== 'system');

      res.json({
        ...session,
        messages: visibleMessages,
      });
    } catch (error) {
      console.error("Error fetching chat session:", error);
      res.status(500).json({ message: "Failed to fetch chat session" });
    }
  });

  // Complete registration via chat
  app.post('/api/chat/:sessionId/complete-registration', async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getChatSessionWithMessages(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      // Validate session ownership
      if (!validateChatSessionOwnership(session, req)) {
        return res.status(403).json({ message: "Access denied to this chat session" });
      }

      if (session.type !== 'event_registration') {
        return res.status(400).json({ message: "Not a registration chat session" });
      }

      if (!session.eventId) {
        return res.status(400).json({ message: "Event not associated with session" });
      }

      const event = await storage.getEvent(session.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Get user ID from session or request
      const userId = session.userId || req.user?.claims?.sub || req.user?.id;

      // Check if already registered
      if (userId) {
        const existingReg = await storage.getUserEventRegistration(session.eventId, userId);
        if (existingReg) {
          return res.status(400).json({ message: "Already registered for this event" });
        }
      }

      // Get form fields and extract data from conversation
      const formFields = await storage.getEventFormFields(session.eventId);
      const allFieldLabels = formFields.map(f => f.label);
      const requiredFieldLabels = formFields.filter(f => f.required).map(f => f.label);

      // Build chat history for extraction
      const chatHistory: GigaChatMessage[] = session.messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }));

      let extractedData: Record<string, string> = {};
      try {
        extractedData = await extractRegistrationData(chatHistory, allFieldLabels);
      } catch (e) {
        console.error("Failed to extract registration data:", e);
      }

      // Validate BEFORE creating registration to avoid orphan records
      const missingRequired = requiredFieldLabels.filter(label => {
        const value = extractedData[label];
        return !value || value === 'null' || value.trim() === '';
      });

      if (missingRequired.length > 0) {
        return res.status(400).json({
          message: "Не все обязательные вопросы получили ответ",
          missingFields: missingRequired,
          hint: "Пожалуйста, продолжите беседу и ответьте на все обязательные вопросы перед завершением регистрации.",
        });
      }

      // Only create registration after validation passes
      const registration = await storage.createEventRegistration({
        eventId: session.eventId,
        userId: userId || null,
        guestName: !userId ? (extractedData['Имя'] || extractedData['ФИО'] || 'Гость') : null,
        guestEmail: !userId ? (extractedData['Email'] || extractedData['Почта'] || null) : null,
      });

      // Create form response if there are fields - always create to track chat source
      if (formFields.length > 0) {
        const formResponse = await storage.createEventFormResponse({
          eventId: session.eventId,
          registrationId: registration.id,
          userId: userId || null,
        });

        // Create answers from extracted data for ALL fields (not just non-empty)
        const answers = formFields.map(field => {
          const value = extractedData[field.label] || '';
          return {
            responseId: formResponse.id,
            fieldId: field.id,
            valueText: value || null,
          };
        });

        if (answers.length > 0) {
          await storage.createEventFormAnswers(answers);
        }
      }

      // Complete the chat session with extracted data
      await storage.completeChatSession(sessionId, JSON.stringify(extractedData));

      res.json({
        success: true,
        registrationId: registration.id,
        extractedData,
        message: "Регистрация успешно завершена!",
      });
    } catch (error) {
      console.error("Error completing registration:", error);
      res.status(500).json({ message: "Failed to complete registration" });
    }
  });

  // Cancel chat session
  app.post('/api/chat/:sessionId/cancel', async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getChatSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      // Validate session ownership
      if (!validateChatSessionOwnership(session, req)) {
        return res.status(403).json({ message: "Access denied to this chat session" });
      }

      await storage.updateChatSession(sessionId, { status: 'cancelled' });

      res.json({ success: true });
    } catch (error) {
      console.error("Error cancelling chat session:", error);
      res.status(500).json({ message: "Failed to cancel chat session" });
    }
  });

  // Admin: Get all chat sessions for an event
  app.get('/api/admin/events/:eventId/chat-sessions', isEventAdmin, async (req: any, res) => {
    try {
      const { eventId } = req.params;
      const sessions = await storage.getEventChatSessions(eventId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching event chat sessions:", error);
      res.status(500).json({ message: "Failed to fetch chat sessions" });
    }
  });

  // ============================================
  // Chat File Upload Routes
  // ============================================

  // Upload file during chat session (for file-type questions)
  app.post('/api/chat/:sessionId/upload', uploadChatFile.single('file'), async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const { fieldId } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      // Validate session ownership
      if (!validateChatSessionOwnership(session, req)) {
        return res.status(403).json({ message: "Access denied to this chat session" });
      }

      if (session.status !== 'active') {
        return res.status(400).json({ message: "Chat session is no longer active" });
      }

      if (session.type !== 'event_registration' || !session.eventId) {
        return res.status(400).json({ message: "File upload only allowed for event registration chats" });
      }

      // Verify the field exists and is a file type (if fieldId provided)
      if (fieldId) {
        const formFields = await storage.getEventFormFields(session.eventId);
        const fileField = formFields.find(f => f.id === fieldId);
        if (!fileField || fileField.type !== 'file') {
          return res.status(400).json({ message: "Invalid field for file upload" });
        }
      }

      // Upload to object storage (private)
      const objectStorageService = new ObjectStorageService();
      const privateDir = objectStorageService.getPrivateObjectDir();
      const ext = path.extname(req.file.originalname).toLowerCase();
      const uniqueFilename = `${privateDir}/chat-uploads/${session.eventId}/${sessionId}/${nanoid()}${ext}`;
      
      const { bucketName, objectName } = parseObjectPath(uniqueFilename);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      // Store file info in session's extracted data for later use
      const currentData = session.extractedData ? JSON.parse(session.extractedData) : {};
      if (!currentData._uploadedFiles) {
        currentData._uploadedFiles = [];
      }
      currentData._uploadedFiles.push({
        fieldId: fieldId || null,
        filePath: uniqueFilename,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
      });
      await storage.updateChatSession(sessionId, { extractedData: JSON.stringify(currentData) });

      // Add a message about the uploaded file
      await storage.createChatMessage({
        sessionId,
        role: 'user',
        content: `[Файл загружен: ${req.file.originalname}]`,
      });

      res.json({
        success: true,
        filePath: uniqueFilename,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
      });
    } catch (error) {
      console.error("Error uploading chat file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // ============================================
  // Head Admin: Guest Chat Registration Toggle
  // ============================================

  // Toggle guest chat registration for an event (Head Admin only)
  app.patch('/api/events/:id/guest-chat', isHeadAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { allowGuestChatRegistration } = req.body;

      if (typeof allowGuestChatRegistration !== 'boolean') {
        return res.status(400).json({ message: "allowGuestChatRegistration must be a boolean" });
      }

      const event = await storage.getEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const updatedEvent = await storage.updateEvent(id, { allowGuestChatRegistration });

      res.json({
        success: true,
        event: updatedEvent,
        message: allowGuestChatRegistration 
          ? "Guest registration via AI chat enabled" 
          : "Guest registration via AI chat disabled",
      });
    } catch (error) {
      console.error("Error toggling guest chat registration:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  // ============================================
  // AI Debate Challenges
  // ============================================

  // Get all challenges (admin/head-admin) or active challenges (member)
  app.get('/api/challenges', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const isAdminUser = user?.isHeadAdmin === true || user?.role === 'lmsAdmin';
      const challenges = isAdminUser 
        ? await storage.getChallenges()
        : await storage.getActiveChallenges();
      
      // Strip aiInstructions for non-admin users
      if (!isAdminUser) {
        const publicChallenges = challenges.map(({ aiInstructions: _stripped, ...rest }) => rest);
        return res.json(publicChallenges);
      }
      
      res.json(challenges);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      res.status(500).json({ message: "Failed to fetch challenges" });
    }
  });

  // Get single challenge
  app.get('/api/challenges/:id', isAuthenticated, async (req: any, res) => {
    try {
      const challenge = await storage.getChallenge(req.params.id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      // Gate aiInstructions: only visible to challenge creator and lms admins
      const userId = req.user?.id;
      const dbUser = userId ? await storage.getUser(userId) : null;
      const isAdminOrCreator = dbUser && (dbUser.role === 'lmsAdmin' || dbUser.isHeadAdmin || challenge.createdBy === userId);
      if (!isAdminOrCreator) {
        const { aiInstructions: _stripped, ...publicChallenge } = challenge;
        return res.json(publicChallenge);
      }
      res.json(challenge);
    } catch (error) {
      console.error("Error fetching challenge:", error);
      res.status(500).json({ message: "Failed to fetch challenge" });
    }
  });

  // Create challenge (admin only)
  app.post('/api/challenges', isAuthenticated, isLmsAdmin, async (req: any, res) => {
    try {
      console.log("Creating challenge with body:", JSON.stringify(req.body));
      const validatedData = createChallengeSchema.parse(req.body);
      const userId = req.user.id;
      
      if (!userId) {
        console.error("No user ID found for challenge creation");
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const challengeData = {
        ...validatedData,
        createdBy: userId,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
      };
      console.log("Challenge data to insert:", JSON.stringify(challengeData, null, 2));
      
      const challenge = await storage.createChallenge(challengeData);
      
      res.status(201).json(challenge);
    } catch (error: any) {
      console.error("Error creating challenge:", error);
      console.error("Error stack:", error.stack);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message || "Failed to create challenge" });
    }
  });

  // Update challenge (admin only)
  app.patch('/api/challenges/:id', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      const validatedData = updateChallengeSchema.parse(req.body);
      const updateData: any = { ...validatedData };
      if (validatedData.startDate !== undefined) {
        updateData.startDate = validatedData.startDate ? new Date(validatedData.startDate) : null;
      }
      if (validatedData.endDate !== undefined) {
        updateData.endDate = validatedData.endDate ? new Date(validatedData.endDate) : null;
      }
      const challenge = await storage.updateChallenge(req.params.id, updateData);
      res.json(challenge);
    } catch (error: any) {
      console.error("Error updating challenge:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update challenge" });
    }
  });

  // Delete challenge (admin only)
  app.delete('/api/challenges/:id', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      // Get challenge to clean up thumbnail from object storage
      const challenge = await storage.getChallenge(req.params.id);
      if (challenge?.thumbnailStorageKey) {
        try {
          const objectStorageService = new ObjectStorageService();
          const publicPaths = objectStorageService.getPublicObjectSearchPaths();
          if (publicPaths && publicPaths.length > 0) {
            const fullPath = `${publicPaths[0]}/${challenge.thumbnailStorageKey}`;
            const { bucketName, objectName } = parseObjectPath(fullPath);
            const bucket = objectStorageClient.bucket(bucketName);
            const file = bucket.file(objectName);
            await file.delete().catch(() => {});
          }
        } catch (e) {
          console.error("Error cleaning up thumbnail:", e);
        }
      }
      
      // Clean up attachments from object storage
      const attachments = await storage.getChallengeAttachments(req.params.id);
      for (const attachment of attachments) {
        try {
          const { bucketName, objectName } = parseObjectPath(attachment.storageKey);
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          await file.delete().catch(() => {});
        } catch (e) {
          console.error("Error cleaning up attachment:", e);
        }
      }
      
      await storage.deleteChallenge(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting challenge:", error);
      res.status(500).json({ message: "Failed to delete challenge" });
    }
  });

  // Upload challenge thumbnail (admin only)
  app.post('/api/challenges/:id/thumbnail', isAuthenticated, isLmsAdmin, uploadImage.single('thumbnail'), async (req: any, res) => {
    try {
      const challenge = await storage.getChallenge(req.params.id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No thumbnail file uploaded" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      
      if (!publicPaths || publicPaths.length === 0) {
        return res.status(500).json({ message: "Object storage not configured" });
      }
      
      // Delete old thumbnail if exists
      if (challenge.thumbnailStorageKey) {
        try {
          const fullPath = `${publicPaths[0]}/${challenge.thumbnailStorageKey}`;
          const { bucketName, objectName } = parseObjectPath(fullPath);
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          await file.delete().catch(() => {});
        } catch (e) {
          console.error("Error deleting old thumbnail:", e);
        }
      }
      
      const ext = path.extname(req.file.originalname);
      const filename = `challenges/thumbnails/${req.params.id}_${Date.now()}${ext}`;
      const fullPath = `${publicPaths[0]}/${filename}`;
      
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });
      
      const updatedChallenge = await storage.updateChallenge(req.params.id, {
        thumbnailStorageKey: filename,
      });
      
      res.json({ thumbnailUrl: `/${filename}`, challenge: updatedChallenge });
    } catch (error: any) {
      console.error("Error uploading challenge thumbnail:", error);
      res.status(500).json({ message: "Failed to upload thumbnail" });
    }
  });

  // Delete challenge thumbnail (admin only)
  app.delete('/api/challenges/:id/thumbnail', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      const challenge = await storage.getChallenge(req.params.id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      if (challenge.thumbnailStorageKey) {
        try {
          const objectStorageService = new ObjectStorageService();
          const publicPaths = objectStorageService.getPublicObjectSearchPaths();
          if (publicPaths && publicPaths.length > 0) {
            const fullPath = `${publicPaths[0]}/${challenge.thumbnailStorageKey}`;
            const { bucketName, objectName } = parseObjectPath(fullPath);
            const bucket = objectStorageClient.bucket(bucketName);
            const file = bucket.file(objectName);
            await file.delete().catch(() => {});
          }
        } catch (e) {
          console.error("Error deleting thumbnail file:", e);
        }
      }
      
      const updatedChallenge = await storage.updateChallenge(req.params.id, {
        thumbnailStorageKey: null,
      });
      
      res.json({ success: true, challenge: updatedChallenge });
    } catch (error) {
      console.error("Error deleting challenge thumbnail:", error);
      res.status(500).json({ message: "Failed to delete thumbnail" });
    }
  });

  // Generate AI thumbnail for challenge (admin only)
  app.post('/api/challenges/:id/thumbnail/generate', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      const challenge = await storage.getChallenge(req.params.id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      const { generateChallengeThumbnail } = await import('./ai-chat');
      const imageUrl = await generateChallengeThumbnail(
        challenge.title,
        challenge.topic,
        challenge.difficulty
      );
      
      if (!imageUrl) {
        return res.status(500).json({ message: "Failed to generate thumbnail" });
      }
      
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return res.status(500).json({ message: "Failed to download generated image" });
      }
      
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      
      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      if (!publicPaths || publicPaths.length === 0) {
        return res.status(500).json({ message: "Object storage not configured" });
      }
      
      if (challenge.thumbnailStorageKey) {
        try {
          const oldPath = `${publicPaths[0]}/${challenge.thumbnailStorageKey}`;
          const { bucketName, objectName } = parseObjectPath(oldPath);
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          await file.delete().catch(() => {});
        } catch (e) {
          console.error("Error deleting old thumbnail:", e);
        }
      }
      
      const filename = `challenges/thumbnails/${req.params.id}_ai_${Date.now()}.png`;
      const fullPath = `${publicPaths[0]}/${filename}`;
      
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      await file.save(imageBuffer, {
        metadata: {
          contentType: 'image/png',
        },
      });
      
      const updatedChallenge = await storage.updateChallenge(req.params.id, {
        thumbnailStorageKey: filename,
      });
      
      res.json({ thumbnailUrl: `/objects/${filename}`, challenge: updatedChallenge });
    } catch (error: any) {
      console.error("Error generating AI thumbnail:", error);
      res.status(500).json({ message: error.message || "Failed to generate thumbnail" });
    }
  });

  // Configure multer for challenge attachments (PDF, Word, Excel, Images)
  const challengeAttachmentFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, images, Word and Excel files are allowed'));
    }
  };

  const uploadChallengeAttachment = multer({
    storage: multer.memoryStorage(),
    fileFilter: challengeAttachmentFilter,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  });

  // Get challenge attachments
  app.get('/api/challenges/:id/attachments', isAuthenticated, async (req: any, res) => {
    try {
      const challenge = await storage.getChallenge(req.params.id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      const attachments = await storage.getChallengeAttachments(req.params.id);
      
      // For non-admins, filter to only show "both" visibility attachments
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const isAdminUser = user?.isHeadAdmin === true || user?.role === 'lmsAdmin';
      if (!isAdminUser) {
        const filteredAttachments = attachments.filter(a => a.visibility === 'both');
        return res.json(filteredAttachments);
      }
      
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching challenge attachments:", error);
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  // Upload challenge attachment (admin only)
  app.post('/api/challenges/:id/attachments', isAuthenticated, isLmsAdmin, uploadChallengeAttachment.single('file'), async (req: any, res) => {
    try {
      const challenge = await storage.getChallenge(req.params.id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const visibility = req.body.visibility || 'ai_only';
      if (!['ai_only', 'both'].includes(visibility)) {
        return res.status(400).json({ message: "Invalid visibility. Must be 'ai_only' or 'both'" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const privateDir = objectStorageService.getPrivateObjectDir();
      
      const ext = path.extname(req.file.originalname);
      const safeFilename = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storageKey = `${privateDir}/challenges/attachments/${req.params.id}/${nanoid()}_${safeFilename}`;
      
      const { bucketName, objectName } = parseObjectPath(storageKey);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });
      
      const attachment = await storage.createChallengeAttachment({
        challengeId: req.params.id,
        storageKey,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        visibility,
      });
      
      res.status(201).json(attachment);
    } catch (error: any) {
      console.error("Error uploading challenge attachment:", error);
      res.status(500).json({ message: error.message || "Failed to upload attachment" });
    }
  });

  // Update challenge attachment visibility (admin only)
  app.patch('/api/challenges/attachments/:attachmentId', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      const { visibility } = req.body;
      if (!visibility || !['ai_only', 'both'].includes(visibility)) {
        return res.status(400).json({ message: "Invalid visibility. Must be 'ai_only' or 'both'" });
      }
      
      const attachment = await storage.getChallengeAttachment(req.params.attachmentId);
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      
      const updatedAttachment = await storage.updateChallengeAttachment(req.params.attachmentId, { visibility });
      res.json(updatedAttachment);
    } catch (error) {
      console.error("Error updating attachment visibility:", error);
      res.status(500).json({ message: "Failed to update attachment" });
    }
  });

  // Delete challenge attachment (admin only)
  app.delete('/api/challenges/attachments/:attachmentId', isAuthenticated, isLmsAdmin, async (req, res) => {
    try {
      const attachment = await storage.getChallengeAttachment(req.params.attachmentId);
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      
      // Delete from object storage
      try {
        const { bucketName, objectName } = parseObjectPath(attachment.storageKey);
        const bucket = objectStorageClient.bucket(bucketName);
        const file = bucket.file(objectName);
        await file.delete().catch(() => {});
      } catch (e) {
        console.error("Error deleting attachment file:", e);
      }
      
      await storage.deleteChallengeAttachment(req.params.attachmentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting attachment:", error);
      res.status(500).json({ message: "Failed to delete attachment" });
    }
  });

  // Download challenge attachment
  app.get('/api/challenges/attachments/:attachmentId/download', isAuthenticated, async (req: any, res) => {
    try {
      const attachment = await storage.getChallengeAttachment(req.params.attachmentId);
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      
      // Check access - admins can access all, users can only access "both" visibility
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const isAdminUser = user?.role === 'lmsAdmin' || user?.isHeadAdmin === true;
      if (!isAdminUser && attachment.visibility !== 'both') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { bucketName, objectName } = parseObjectPath(attachment.storageKey);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({ message: "File not found in storage" });
      }
      
      res.set({
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `attachment; filename="${attachment.fileName}"`,
      });
      
      file.createReadStream().pipe(res);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      res.status(500).json({ message: "Failed to download attachment" });
    }
  });

  // Get user's challenge attempts
  app.get('/api/challenges/user/attempts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const attempts = await storage.getUserChallengeAttempts(userId);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching user attempts:", error);
      res.status(500).json({ message: "Failed to fetch attempts" });
    }
  });

  // Get specific attempt with messages
  app.get('/api/challenges/attempts/:attemptId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const attempt = await storage.getChallengeAttemptWithMessages(req.params.attemptId);
      
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }
      
      // Only allow users to view their own attempts (admins/head-admins can view all)
      const user = await storage.getUser(userId);
      const isAdminUser = user?.role === 'lmsAdmin' || user?.isHeadAdmin === true;
      if (attempt.userId !== userId && !isAdminUser) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Gate aiInstructions: strip from challenge for non-admin, non-creator users
      const isChallengeCre = attempt.challenge?.createdBy === userId;
      const safeAttempt = (isAdminUser || isChallengeCre)
        ? attempt
        : {
            ...attempt,
            challenge: attempt.challenge
              ? { ...attempt.challenge, aiInstructions: undefined }
              : attempt.challenge,
          };
      
      res.json(safeAttempt);
    } catch (error) {
      console.error("Error fetching attempt:", error);
      res.status(500).json({ message: "Failed to fetch attempt" });
    }
  });

  // Start a challenge (create attempt)
  app.post('/api/challenges/:id/start', isAuthenticated, async (req: any, res) => {
    try {
      const { id: challengeId } = req.params;
      const userId = req.user.id;
      const validatedData = startChallengeSchema.parse(req.body);
      
      // Check if challenge exists
      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      if (!challenge.isActive) {
        return res.status(400).json({ message: "Challenge is not active" });
      }
      
      // Check for existing active attempt
      const existingAttempt = await storage.getUserActiveAttempt(userId, challengeId);
      if (existingAttempt) {
        return res.status(400).json({ 
          message: "You already have an active attempt for this challenge",
          attemptId: existingAttempt.id
        });
      }
      
      // Create the attempt
      const attempt = await storage.createChallengeAttempt({
        challengeId,
        userId,
        userPosition: validatedData.position,
        currentRound: 1,
        status: 'active',
      });
      
      // Generate AI's opening argument using GigaChat
      const attachmentContext = await getAiOnlyAttachmentContext(challengeId);
      const systemPrompt = getDebateSystemPrompt(challenge.topic, validatedData.position, challenge.aiInstructions, attachmentContext);
      const openingPrompt = `The user has stated their position: "${validatedData.position}". 
Begin the debate by presenting a strong counter-argument. Keep your response focused and under 200 words.`;
      
      try {
        const aiResponse = await sendChatMessage([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: openingPrompt }
        ], { temperature: 0.8, maxTokens: 500 });
        
        // Save AI's opening message
        await storage.createChallengeMessage({
          attemptId: attempt.id,
          role: 'assistant',
          content: aiResponse.content,
          round: 1,
        });
        
        res.status(201).json({
          attempt,
          firstMessage: aiResponse.content,
        });
      } catch (aiError) {
        console.error("GigaChat error:", aiError);
        // Still return the attempt but with a fallback message
        const fallbackMessage = "Интересная позиция! Однако позвольте представить альтернативную точку зрения. Начнём дискуссию — жду вашего первого аргумента.";
        
        await storage.createChallengeMessage({
          attemptId: attempt.id,
          role: 'assistant',
          content: fallbackMessage,
          round: 1,
        });
        
        res.status(201).json({
          attempt,
          firstMessage: fallbackMessage,
        });
      }
    } catch (error: any) {
      console.error("Error starting challenge:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to start challenge" });
    }
  });

  // Send message in debate
  app.post('/api/challenges/attempts/:attemptId/message', isAuthenticated, async (req: any, res) => {
    try {
      const { attemptId } = req.params;
      const { message } = req.body;
      const userId = req.user.id;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }
      
      // Get attempt with messages
      const attempt = await storage.getChallengeAttemptWithMessages(attemptId);
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }
      
      if (attempt.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (attempt.status !== 'active') {
        return res.status(400).json({ message: "This debate has already ended" });
      }
      
      const challenge = await storage.getChallenge(attempt.challengeId);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      // Save user's message
      await storage.createChallengeMessage({
        attemptId,
        role: 'user',
        content: message,
        round: attempt.currentRound,
      });
      
      // Check if this completes the debate
      const maxRounds = challenge.maxRounds;
      const isLastRound = attempt.currentRound >= maxRounds;
      
      // Build conversation history for AI
      const debateAttachmentContext = await getAiOnlyAttachmentContext(attempt.challengeId);
      const conversationHistory: GigaChatMessage[] = [
        { role: 'system', content: getDebateSystemPrompt(challenge.topic, attempt.userPosition, challenge.aiInstructions, debateAttachmentContext) },
      ];
      
      // Add all previous messages
      for (const msg of attempt.messages) {
        conversationHistory.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
      
      // Add current message
      conversationHistory.push({ role: 'user', content: message });
      
      try {
        let aiResponse: string;
        
        if (isLastRound) {
          // Final round - AI gives closing argument
          conversationHistory.push({
            role: 'user',
            content: 'This is the final round. Please provide your closing argument summarizing your key points. Keep it under 150 words.'
          });
          
          const response = await sendChatMessage(conversationHistory, { temperature: 0.7, maxTokens: 400 });
          aiResponse = response.content;
          
          // Save AI's final message
          await storage.createChallengeMessage({
            attemptId,
            role: 'assistant',
            content: aiResponse,
            round: attempt.currentRound,
          });
          
          // Score the debate
          const scoreResult = await scoreDebate(attempt, challenge, message);
          
          // Encode breakdown + feedback as JSON string for storage
          const feedbackPayload = JSON.stringify({
            text: scoreResult.feedback,
            logic: scoreResult.logic,
            evidence: scoreResult.evidence,
            persuasiveness: scoreResult.persuasiveness,
            counter: scoreResult.counter,
            rounds: scoreResult.rounds || [],
          });
          
          // Complete the attempt
          const completedAttempt = await storage.completeChallengeAttempt(
            attemptId,
            scoreResult.score,
            feedbackPayload,
            scoreResult.customOutcome,
            scoreResult.outcomeScore
          );
          
          res.json({
            message: aiResponse,
            completed: true,
            score: scoreResult.score,
            feedback: scoreResult.feedback,
            attempt: completedAttempt,
          });
        } else {
          // Continue debate
          const response = await sendChatMessage(conversationHistory, { temperature: 0.8, maxTokens: 500 });
          aiResponse = response.content;
          
          // Save AI's message
          await storage.createChallengeMessage({
            attemptId,
            role: 'assistant',
            content: aiResponse,
            round: attempt.currentRound + 1,
          });
          
          // Increment round
          const updatedAttempt = await storage.updateChallengeAttempt(attemptId, {
            currentRound: attempt.currentRound + 1,
          });
          
          res.json({
            message: aiResponse,
            completed: false,
            currentRound: updatedAttempt.currentRound,
            maxRounds,
          });
        }
      } catch (aiError) {
        console.error("GigaChat error:", aiError);
        const fallbackMessage = "Понимаю вашу точку зрения. Пожалуйста, продолжите развивать ваши аргументы.";
        
        await storage.createChallengeMessage({
          attemptId,
          role: 'assistant',
          content: fallbackMessage,
          round: attempt.currentRound,
        });
        
        res.json({
          message: fallbackMessage,
          completed: false,
          currentRound: attempt.currentRound,
          maxRounds,
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Complete/abandon challenge attempt
  app.post('/api/challenges/attempts/:attemptId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { attemptId } = req.params;
      const { abandon } = req.body;
      const userId = req.user.id;
      
      const attempt = await storage.getChallengeAttemptWithMessages(attemptId);
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }
      
      if (attempt.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (attempt.status !== 'active') {
        return res.status(400).json({ message: "This debate has already ended" });
      }
      
      if (abandon) {
        // User is abandoning the debate
        const updatedAttempt = await storage.updateChallengeAttempt(attemptId, {
          status: 'abandoned',
        });
        res.json({ success: true, attempt: updatedAttempt });
      } else {
        // Score and complete the debate
        const challenge = await storage.getChallenge(attempt.challengeId);
        if (!challenge) {
          return res.status(404).json({ message: "Challenge not found" });
        }
        
        const scoreResult = await scoreDebate(attempt, challenge);
        const feedbackPayload2 = JSON.stringify({
          text: scoreResult.feedback,
          logic: scoreResult.logic,
          evidence: scoreResult.evidence,
          persuasiveness: scoreResult.persuasiveness,
          counter: scoreResult.counter,
          rounds: scoreResult.rounds || [],
        });
        const completedAttempt = await storage.completeChallengeAttempt(
          attemptId,
          scoreResult.score,
          feedbackPayload2,
          scoreResult.customOutcome,
          scoreResult.outcomeScore
        );
        
        res.json({
          success: true,
          attempt: completedAttempt,
          score: scoreResult.score,
          feedback: scoreResult.feedback,
        });
      }
    } catch (error) {
      console.error("Error completing attempt:", error);
      res.status(500).json({ message: "Failed to complete attempt" });
    }
  });

  // Get challenge leaderboard
  app.get('/api/challenges/:id/leaderboard', isAuthenticated, async (req, res) => {
    try {
      const sortBy = req.query.sortBy === 'customOutcome' ? 'customOutcome' : 'score';
      const leaderboard = await storage.getChallengeLeaderboard(req.params.id, 20, sortBy);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Get global leaderboard
  app.get('/api/challenges/leaderboard/global', isAuthenticated, async (req, res) => {
    try {
      const leaderboard = await storage.getGlobalLeaderboard(20);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching global leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Get seasonal leaderboard (FIS points)
  app.get('/api/leaderboard/seasonal', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const leaderboard = await storage.getSeasonalLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching seasonal leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch seasonal leaderboard" });
    }
  });

  // Get team championship standings
  app.get('/api/leaderboard/team-championship', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const teamChampionship = await storage.getTeamChampionship(limit);
      res.json(teamChampionship);
    } catch (error) {
      console.error("Error fetching team championship:", error);
      res.status(500).json({ message: "Failed to fetch team championship" });
    }
  });

  // Get challenge latest results (top 50 with positions and points)
  app.get('/api/challenges/:id/latest-results', isAuthenticated, async (req, res) => {
    try {
      const results = await storage.getChallengeLatestResults(req.params.id, 50);
      res.json(results);
    } catch (error) {
      console.error("Error fetching challenge results:", error);
      res.status(500).json({ message: "Failed to fetch challenge results" });
    }
  });

  // Calculate and award FIS points for a challenge (admin only)
  app.post('/api/challenges/:id/calculate-points', isAuthenticated, isLmsAdmin, async (req: any, res) => {
    try {
      const challengeId = req.params.id;
      const challenge = await storage.getChallenge(challengeId);
      
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      const result = await storage.calculateAndAwardFISPoints(challengeId);
      res.json(result);
    } catch (error) {
      console.error("Error calculating FIS points:", error);
      res.status(500).json({ message: "Failed to calculate FIS points" });
    }
  });

  // Get user's seasonal points for a specific challenge
  app.get('/api/challenges/:challengeId/user-seasonal-points', isAuthenticated, async (req: any, res) => {
    try {
      const { challengeId } = req.params;
      const userId = req.user.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const points = await storage.getUserSeasonalPointsForChallenge(userId, challengeId);
      res.json(points);
    } catch (error) {
      console.error("Error fetching user seasonal points:", error);
      res.status(500).json({ message: "Failed to fetch user seasonal points" });
    }
  });

  // Get global latest results (recent challenges with their results)
  app.get('/api/challenges/global-latest-results', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const results = await storage.getGlobalLatestResults(limit);
      res.json(results);
    } catch (error) {
      console.error("Error fetching global latest results:", error);
      res.status(500).json({ message: "Failed to fetch global latest results" });
    }
  });

  // ============================================
  // Phase 3: Announcement Routes
  // ============================================

  // Get announcements
  app.get('/api/announcements', isAuthenticated, async (req, res) => {
    try {
      const { type, courseId } = req.query;
      const announcements = await storage.getAnnouncements(
        type as string | undefined,
        courseId as string | undefined
      );
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  // Get single announcement
  app.get('/api/announcements/:id', isAuthenticated, async (req, res) => {
    try {
      const announcement = await storage.getAnnouncement(req.params.id);
      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      res.json(announcement);
    } catch (error) {
      console.error("Error fetching announcement:", error);
      res.status(500).json({ message: "Failed to fetch announcement" });
    }
  });

  // Create announcement (admin or teacher)
  app.post('/api/announcements', isAuthenticated, isTeacherOrAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log("Creating announcement - userId:", userId, "body:", JSON.stringify(req.body));
      const data = insertAnnouncementSchema.parse({ ...req.body, authorId: userId });
      console.log("Parsed announcement data:", JSON.stringify(data));
      const announcement = await storage.createAnnouncement(data);
      res.status(201).json(announcement);
    } catch (error: any) {
      console.error("Error creating announcement:", error?.message || error);
      if (error?.issues) {
        console.error("Zod validation errors:", JSON.stringify(error.issues));
      }
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  // Update announcement
  app.patch('/api/announcements/:id', isAuthenticated, isTeacherOrAdmin, async (req: any, res) => {
    try {
      const announcement = await storage.updateAnnouncement(req.params.id, req.body);
      res.json(announcement);
    } catch (error) {
      console.error("Error updating announcement:", error);
      res.status(500).json({ message: "Failed to update announcement" });
    }
  });

  // Delete announcement
  app.delete('/api/announcements/:id', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      await storage.deleteAnnouncement(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  // ============================================
  // Phase 3: Discussion Forum Routes
  // ============================================

  // Get course forum
  app.get('/api/courses/:courseId/forum', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const dbUser = await storage.getUser(userId);
      const isStaff = dbUser?.role === 'teacher' || dbUser?.role === 'lmsAdmin' || dbUser?.isHeadAdmin;
      
      // Check if user is enrolled or is staff
      if (!isStaff) {
        const isEnrolled = await storage.isUserEnrolled(req.params.courseId, userId);
        if (!isEnrolled) {
          return res.status(403).json({ message: "Must be enrolled in course to access forum" });
        }
      }
      
      let forum = await storage.getCourseForum(req.params.courseId);
      if (!forum) {
        // Auto-create forum for course
        forum = await storage.createForum({
          courseId: req.params.courseId,
          title: 'Course Discussion',
          description: 'Discuss course topics and ask questions',
        });
      }
      res.json(forum);
    } catch (error) {
      console.error("Error fetching forum:", error);
      res.status(500).json({ message: "Failed to fetch forum" });
    }
  });

  // Get forum threads
  app.get('/api/forums/:forumId/threads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const dbUser = await storage.getUser(userId);
      const isStaff = dbUser?.role === 'teacher' || dbUser?.role === 'lmsAdmin' || dbUser?.isHeadAdmin;
      
      // Get forum to find courseId for enrollment check
      const forum = await storage.getForum(req.params.forumId);
      if (!forum) {
        return res.status(404).json({ message: "Forum not found" });
      }
      
      if (!isStaff && forum.courseId) {
        const isEnrolled = await storage.isUserEnrolled(forum.courseId, userId);
        if (!isEnrolled) {
          return res.status(403).json({ message: "Must be enrolled in course to access forum" });
        }
      }
      
      const threads = await storage.getForumThreads(req.params.forumId);
      res.json(threads);
    } catch (error) {
      console.error("Error fetching threads:", error);
      res.status(500).json({ message: "Failed to fetch threads" });
    }
  });

  // Get single thread with replies
  app.get('/api/threads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const dbUser = await storage.getUser(userId);
      const isStaff = dbUser?.role === 'teacher' || dbUser?.role === 'lmsAdmin' || dbUser?.isHeadAdmin;
      
      const thread = await storage.getThread(req.params.id);
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }
      
      // Get forum to find courseId for enrollment check
      const forum = await storage.getForum(thread.forumId);
      if (!isStaff && forum?.courseId) {
        const isEnrolled = await storage.isUserEnrolled(forum.courseId, userId);
        if (!isEnrolled) {
          return res.status(403).json({ message: "Must be enrolled in course to view thread" });
        }
      }
      
      // Increment view count
      await storage.incrementThreadViews(req.params.id);
      const replies = await storage.getThreadReplies(req.params.id);
      res.json({ thread, replies });
    } catch (error) {
      console.error("Error fetching thread:", error);
      res.status(500).json({ message: "Failed to fetch thread" });
    }
  });

  // Create thread
  app.post('/api/forums/:forumId/threads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = insertDiscussionThreadSchema.parse({
        ...req.body,
        forumId: req.params.forumId,
        authorId: userId,
      });
      const thread = await storage.createThread(data);
      res.status(201).json(thread);
    } catch (error) {
      console.error("Error creating thread:", error);
      res.status(500).json({ message: "Failed to create thread" });
    }
  });

  // Update thread (author or admin)
  app.patch('/api/threads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const thread = await storage.getThread(req.params.id);
      const userId = req.user.id;
      const isAdminUser = req.user.role === 'lmsAdmin' || req.user.isHeadAdmin;
      
      if (!thread || (thread.authorId !== userId && !isAdminUser)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const updated = await storage.updateThread(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating thread:", error);
      res.status(500).json({ message: "Failed to update thread" });
    }
  });

  // Delete thread
  app.delete('/api/threads/:id', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      await storage.deleteThread(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting thread:", error);
      res.status(500).json({ message: "Failed to delete thread" });
    }
  });

  // Get thread replies
  app.get('/api/threads/:threadId/replies', isAuthenticated, async (req: any, res) => {
    try {
      const replies = await storage.getThreadReplies(req.params.threadId);
      res.json(replies);
    } catch (error) {
      console.error("Error fetching replies:", error);
      res.status(500).json({ message: "Failed to fetch replies" });
    }
  });

  // Create reply
  app.post('/api/threads/:threadId/replies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const thread = await storage.getThread(req.params.threadId);
      if (!thread || thread.isLocked) {
        return res.status(400).json({ message: "Thread is locked or not found" });
      }
      const data = insertDiscussionReplySchema.parse({
        ...req.body,
        threadId: req.params.threadId,
        authorId: userId,
      });
      const reply = await storage.createReply(data);
      res.status(201).json(reply);
    } catch (error) {
      console.error("Error creating reply:", error);
      res.status(500).json({ message: "Failed to create reply" });
    }
  });

  // Update reply
  app.patch('/api/replies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      // Note: Simplified authorization for now
      const updated = await storage.updateReply(req.params.id, req.body.content);
      res.json(updated);
    } catch (error) {
      console.error("Error updating reply:", error);
      res.status(500).json({ message: "Failed to update reply" });
    }
  });

  // Delete reply
  app.delete('/api/replies/:id', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      await storage.deleteReply(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting reply:", error);
      res.status(500).json({ message: "Failed to delete reply" });
    }
  });

  // ============================================
  // Phase 3: Private Message Routes
  // ============================================

  // Search users for messaging (non-admin endpoint)
  app.get('/api/users/search', isAuthenticated, async (req: any, res) => {
    try {
      const query = (req.query.q as string || '').toLowerCase();
      const allUsers = await storage.getAllUsers();
      const currentUserId = req.user.id;
      
      // Filter out current user and search by name, email or @tag
      const filteredUsers = allUsers
        .filter(u => u.id !== currentUserId)
        .filter(u => {
          if (!query) return true;
          const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
          const email = (u.email || '').toLowerCase();
          const tag = (u.tag || '').toLowerCase();
          // Support @tag search
          const searchQuery = query.startsWith('@') ? query.slice(1) : query;
          return fullName.includes(searchQuery) || email.includes(searchQuery) || tag.includes(searchQuery);
        })
        .slice(0, 50) // Limit results
        .map(u => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          tag: u.tag,
          company: u.company,
          position: u.position,
          category: u.category,
          city: u.city,
          profileImageUrl: u.profileImageUrl,
        }));
      
      res.json(filteredUsers);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Get all users for People directory (with pagination)
  app.get('/api/users/directory', isAuthenticated, async (req: any, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const allUsers = await storage.getAllUsers();
      const currentUserId = req.user.id;
      
      // Filter out current user
      const filteredUsers = allUsers
        .filter(u => u.id !== currentUserId)
        .map(u => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          tag: u.tag,
          company: u.company,
          position: u.position,
          category: u.category,
          city: u.city,
          interests: u.interests,
          aboutMe: u.aboutMe,
          profileImageUrl: u.profileImageUrl,
        }));
      
      // Paginate
      const startIndex = (page - 1) * limit;
      const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit);
      
      res.json({
        users: paginatedUsers,
        total: filteredUsers.length,
        page,
        totalPages: Math.ceil(filteredUsers.length / limit),
      });
    } catch (error) {
      console.error("Error fetching user directory:", error);
      res.status(500).json({ message: "Failed to fetch user directory" });
    }
  });

  // Get single user profile by ID (public info)
  app.get('/api/users/:id/profile', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return public profile info only
      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        tag: user.tag,
        company: user.company,
        position: user.position,
        category: user.category,
        city: user.city,
        interests: user.interests,
        aboutMe: user.aboutMe,
        profileImageUrl: user.profileImageUrl,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Get user messages
  app.get('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const folder = req.query.folder as 'inbox' | 'sent' || 'inbox';
      const messages = await storage.getUserMessages(userId, folder);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Get single message
  app.get('/api/messages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const message = await storage.getMessage(req.params.id);
      if (!message || (message.senderId !== userId && message.recipientId !== userId)) {
        return res.status(404).json({ message: "Message not found" });
      }
      // Mark as read if recipient
      if (message.recipientId === userId && !message.isRead) {
        await storage.markMessageRead(req.params.id);
      }
      res.json(message);
    } catch (error) {
      console.error("Error fetching message:", error);
      res.status(500).json({ message: "Failed to fetch message" });
    }
  });

  // Send message
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = insertPrivateMessageSchema.parse({
        ...req.body,
        senderId: userId,
      });
      const message = await storage.sendMessage(data);
      
      // Create notification for recipient
      await storage.createNotification({
        userId: data.recipientId,
        type: 'message',
        title: 'New Message',
        content: `You have a new message: ${data.subject}`,
        relatedId: message.id,
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Delete message
  app.delete('/api/messages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const message = await storage.getMessage(req.params.id);
      if (!message || (message.senderId !== userId && message.recipientId !== userId)) {
        return res.status(404).json({ message: "Message not found" });
      }
      await storage.deleteMessage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Get unread message count
  app.get('/api/messages/unread/count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // ============================================
  // Phase 3: Lesson Comment Routes
  // ============================================

  // Get lesson comments
  app.get('/api/lessons/:lessonId/comments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const dbUser = await storage.getUser(userId);
      const isStaff = dbUser?.role === 'teacher' || dbUser?.role === 'lmsAdmin' || dbUser?.isHeadAdmin;
      
      // Get lesson to find courseId, then verify enrollment
      const lesson = await storage.getCourseLesson(req.params.lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      if (!isStaff) {
        const isEnrolled = await storage.isUserEnrolled(lesson.courseId, userId);
        if (!isEnrolled) {
          return res.status(403).json({ message: "Must be enrolled in course to view comments" });
        }
      }
      
      const comments = await storage.getLessonComments(req.params.lessonId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Create lesson comment
  app.post('/api/lessons/:lessonId/comments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found in session" });
      }
      
      const dbUser = await storage.getUser(userId);
      if (!dbUser) {
        return res.status(401).json({ message: "User not found in database" });
      }
      
      const isStaff = dbUser.role === 'teacher' || dbUser.role === 'lmsAdmin' || dbUser.isHeadAdmin;
      
      // Get lesson to find courseId, then verify enrollment
      const lesson = await storage.getCourseLesson(req.params.lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      if (!isStaff) {
        const isEnrolled = await storage.isUserEnrolled(lesson.courseId, userId);
        if (!isEnrolled) {
          console.log(`Comment access denied: User ${userId} not enrolled in course ${lesson.courseId}`);
          return res.status(403).json({ message: "Must be enrolled in course to comment" });
        }
      }
      
      const data = insertLessonCommentSchema.parse({
        ...req.body,
        lessonId: req.params.lessonId,
        authorId: userId,
      });
      const comment = await storage.createLessonComment(data);
      res.status(201).json(comment);
    } catch (error: any) {
      console.error("Error creating comment:", error?.message || error);
      if (error?.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid comment data", details: error.errors });
      }
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Update lesson comment
  app.patch('/api/comments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const updated = await storage.updateLessonComment(req.params.id, req.body.content);
      res.json(updated);
    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ message: "Failed to update comment" });
    }
  });

  // Delete lesson comment
  app.delete('/api/comments/:id', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      await storage.deleteLessonComment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // ============================================
  // Phase 3: Notification Routes
  // ============================================

  // Get user notifications
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const unreadOnly = req.query.unreadOnly === 'true';
      const notifications = await storage.getUserNotifications(userId, unreadOnly);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      // Storage method scopes by userId to prevent cross-user tampering
      const updated = await storage.markNotificationRead(req.params.id, userId);
      if (!updated) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ message: "Failed to mark notification read" });
    }
  });

  // Mark all notifications as read
  app.post('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ message: "Failed to mark all notifications read" });
    }
  });

  // Delete notification
  app.delete('/api/notifications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      // Storage method scopes by userId to prevent cross-user tampering
      const deleted = await storage.deleteNotification(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Get unread notification count
  app.get('/api/notifications/unread/count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // ============================================
  // Phase 4: Grade Category Routes
  // ============================================

  // Get course grade categories
  app.get('/api/courses/:courseId/grade-categories', isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getCourseGradeCategories(req.params.courseId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching grade categories:", error);
      res.status(500).json({ message: "Failed to fetch grade categories" });
    }
  });

  // Create grade category
  app.post('/api/courses/:courseId/grade-categories', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const data = insertGradeCategorySchema.parse({
        ...req.body,
        courseId: req.params.courseId,
      });
      const category = await storage.createGradeCategory(data);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating grade category:", error);
      res.status(500).json({ message: "Failed to create grade category" });
    }
  });

  // Update grade category
  app.patch('/api/grade-categories/:id', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const category = await storage.updateGradeCategory(req.params.id, req.body);
      res.json(category);
    } catch (error) {
      console.error("Error updating grade category:", error);
      res.status(500).json({ message: "Failed to update grade category" });
    }
  });

  // Delete grade category
  app.delete('/api/grade-categories/:id', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      await storage.deleteGradeCategory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting grade category:", error);
      res.status(500).json({ message: "Failed to delete grade category" });
    }
  });

  // ============================================
  // Phase 4: Rubric Routes
  // ============================================

  // Get course rubrics
  app.get('/api/courses/:courseId/rubrics', isAuthenticated, async (req, res) => {
    try {
      const rubrics = await storage.getCourseRubrics(req.params.courseId);
      res.json(rubrics);
    } catch (error) {
      console.error("Error fetching rubrics:", error);
      res.status(500).json({ message: "Failed to fetch rubrics" });
    }
  });

  // Get rubric with criteria
  app.get('/api/rubrics/:id', isAuthenticated, async (req, res) => {
    try {
      const rubric = await storage.getRubric(req.params.id);
      if (!rubric) {
        return res.status(404).json({ message: "Rubric not found" });
      }
      res.json(rubric);
    } catch (error) {
      console.error("Error fetching rubric:", error);
      res.status(500).json({ message: "Failed to fetch rubric" });
    }
  });

  // Create rubric with criteria and levels
  app.post('/api/courses/:courseId/rubrics', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const { criteria, ...rubricData } = req.body;
      const rubric = await storage.createRubric({
        ...rubricData,
        courseId: req.params.courseId,
      });

      // Create criteria and levels
      if (criteria && Array.isArray(criteria)) {
        for (let i = 0; i < criteria.length; i++) {
          const { levels, ...criteriaData } = criteria[i];
          const newCriteria = await storage.createRubricCriteria({
            ...criteriaData,
            rubricId: rubric.id,
            orderIndex: i,
          });

          if (levels && Array.isArray(levels)) {
            for (let j = 0; j < levels.length; j++) {
              await storage.createRubricLevel({
                ...levels[j],
                criteriaId: newCriteria.id,
                orderIndex: j,
              });
            }
          }
        }
      }

      const fullRubric = await storage.getRubric(rubric.id);
      res.status(201).json(fullRubric);
    } catch (error) {
      console.error("Error creating rubric:", error);
      res.status(500).json({ message: "Failed to create rubric" });
    }
  });

  // Delete rubric
  app.delete('/api/rubrics/:id', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      await storage.deleteRubric(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting rubric:", error);
      res.status(500).json({ message: "Failed to delete rubric" });
    }
  });

  // ============================================
  // Phase 4: Gradebook Routes
  // ============================================

  // Get course gradebook (all students)
  app.get('/api/courses/:courseId/gradebook', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const gradebook = await storage.getCourseGradebook(req.params.courseId);
      res.json(gradebook);
    } catch (error) {
      console.error("Error fetching gradebook:", error);
      res.status(500).json({ message: "Failed to fetch gradebook" });
    }
  });

  // Get student grades
  app.get('/api/courses/:courseId/grades/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const isAdminUser = req.user.role === 'teacher' || req.user.role === 'lmsAdmin' || req.user.isHeadAdmin;
      
      // Students can only view their own grades
      if (req.params.userId !== currentUserId && !isAdminUser) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const grades = await storage.getStudentGrades(req.params.courseId, req.params.userId);
      res.json(grades);
    } catch (error) {
      console.error("Error fetching student grades:", error);
      res.status(500).json({ message: "Failed to fetch student grades" });
    }
  });

  // Get current user's grades for a course
  app.get('/api/courses/:courseId/my-grades', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const grades = await storage.getStudentGrades(req.params.courseId, userId);
      res.json(grades);
    } catch (error) {
      console.error("Error fetching my grades:", error);
      res.status(500).json({ message: "Failed to fetch grades" });
    }
  });

  // Update or create gradebook entry
  app.post('/api/courses/:courseId/grades', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const data = insertGradebookEntrySchema.parse({
        ...req.body,
        courseId: req.params.courseId,
      });
      const entry = await storage.upsertGradebookEntry(data);
      res.json(entry);
    } catch (error) {
      console.error("Error updating grade:", error);
      res.status(500).json({ message: "Failed to update grade" });
    }
  });

  // Export gradebook to CSV format
  app.get('/api/courses/:courseId/gradebook/export', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    try {
      const exportData = await storage.exportGradebook(req.params.courseId);
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting gradebook:", error);
      res.status(500).json({ message: "Failed to export gradebook" });
    }
  });

  // ============================================
  // User Role Management (Head Admin Only)
  // ============================================

  // Update user role
  app.patch('/api/admin/users/:id/role', isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      const { role } = req.body;
      if (!['member', 'teacher', 'expert', 'lmsAdmin', 'eventAdmin', 'innoLabsAdmin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const user = await storage.updateUserRole(req.params.id, role);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Toggle additional roles (partner, resident, founder, speaker)
  app.patch('/api/admin/users/:id/additional-roles', isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      const additionalRolesSchema = z.object({
        isPartner: z.boolean().optional(),
        isResident: z.boolean().optional(),
        isFounder: z.boolean().optional(),
        isSpeaker: z.boolean().optional(),
      }).strict();
      const parsed = additionalRolesSchema.parse(req.body);
      const updates = Object.fromEntries(
        Object.entries(parsed).filter(([_, v]) => v !== undefined)
      );
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid role updates provided" });
      }
      const user = await storage.updateUserAdditionalRoles(req.params.id, updates as any);
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating additional roles:", error);
      res.status(500).json({ message: "Failed to update additional roles" });
    }
  });

  // ============================================
  // Account Freeze/Unfreeze Routes
  // ============================================
  // eventAdmin + headAdmin can freeze accounts (e.g., corrupted university headAdmins)
  app.post('/api/admin/users/:id/freeze', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      if (!dbUser) return res.status(401).json({ message: "Unauthorized" });
      if (dbUser.role !== 'eventAdmin' && !dbUser.isHeadAdmin) {
        return res.status(403).json({ message: "Forbidden: Only Event Admin or Head Admin can freeze accounts" });
      }
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      if (targetUser.isHeadAdmin && !dbUser.isHeadAdmin) {
        return res.status(403).json({ message: "Only Head Admin can freeze another Head Admin" });
      }
      if (targetUser.id === dbUser.id) {
        return res.status(400).json({ message: "Cannot freeze your own account" });
      }
      const { reason } = req.body || {};
      const updatedUser = await storage.freezeUser(req.params.id, dbUser.id, reason || null);
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error freezing user:", error);
      res.status(500).json({ message: "Failed to freeze user" });
    }
  });

  app.post('/api/admin/users/:id/unfreeze', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      if (!dbUser) return res.status(401).json({ message: "Unauthorized" });
      if (dbUser.role !== 'eventAdmin' && !dbUser.isHeadAdmin) {
        return res.status(403).json({ message: "Forbidden: Only Event Admin or Head Admin can unfreeze accounts" });
      }
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      const updatedUser = await storage.unfreezeUser(req.params.id);
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error unfreezing user:", error);
      res.status(500).json({ message: "Failed to unfreeze user" });
    }
  });

  // ============================================
  // Career Portal Routes
  // ============================================

  // Public: Get all open job openings
  app.get('/api/careers/openings', async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      let includeAll = false;
      if (userId) {
        const user = await storage.getUser(userId);
        if (user && user.isHeadAdmin) {
          includeAll = true;
        }
      }
      const openings = await storage.getJobOpenings(includeAll);
      res.json(openings);
    } catch (error) {
      console.error("Error fetching job openings:", error);
      res.status(500).json({ message: "Failed to fetch job openings" });
    }
  });

  // User: Get my submitted job openings
  app.get('/api/careers/openings/mine', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const openings = await storage.getUserJobOpenings(userId);
      res.json(openings);
    } catch (error) {
      console.error("Error fetching user job openings:", error);
      res.status(500).json({ message: "Failed to fetch your submissions" });
    }
  });

  // Admin: Get pending review job openings
  app.get('/api/careers/openings/pending', isAuthenticated, isEventAdmin, async (req: any, res) => {
    try {
      const openings = await storage.getPendingJobOpenings();
      res.json(openings);
    } catch (error) {
      console.error("Error fetching pending job openings:", error);
      res.status(500).json({ message: "Failed to fetch pending submissions" });
    }
  });

  // Public: Get single job opening
  app.get('/api/careers/openings/:id', async (req, res) => {
    try {
      const opening = await storage.getJobOpening(req.params.id);
      if (!opening) {
        return res.status(404).json({ message: "Job opening not found" });
      }
      if (opening.status !== 'open') {
        return res.status(404).json({ message: "Job opening not available" });
      }
      res.json(opening);
    } catch (error) {
      console.error("Error fetching job opening:", error);
      res.status(500).json({ message: "Failed to fetch job opening" });
    }
  });

  app.post('/api/careers/openings/:id/view', async (req, res) => {
    try {
      await storage.incrementJobViewCount(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error incrementing view count:", error);
      res.status(500).json({ message: "Failed to track view" });
    }
  });

  app.post('/api/careers/upload-resume', uploadResume.single('resume'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No PDF file uploaded" });
      }
      const objectStorageService = new ObjectStorageService();
      const privatePath = process.env.PRIVATE_OBJECT_DIR;
      if (!privatePath) {
        return res.status(500).json({ message: "Object storage not configured" });
      }
      const filename = `resumes/${nanoid()}-${Date.now()}.pdf`;
      const fullPath = `${privatePath}/${filename}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      await file.save(req.file.buffer, {
        metadata: { contentType: 'application/pdf' },
      });
      res.json({ url: fullPath, originalName: req.file.originalname });
    } catch (error: any) {
      console.error("Error uploading resume:", error);
      res.status(500).json({ message: "Failed to upload resume" });
    }
  });

  // Public: Apply to a job opening (auto-creates candidate account)
  app.post('/api/careers/apply', async (req: any, res) => {
    try {
      const validatedData = applyJobSchema.parse(req.body);
      const opening = await storage.getJobOpening(validatedData.jobId);
      if (!opening || opening.status !== 'open') {
        return res.status(400).json({ message: "This position is no longer accepting applications" });
      }

      const { password, ...applicationFields } = validatedData;
      const applicationData: any = { ...applicationFields };
      let candidateUser: any = null;

      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser && existingUser.role === 'candidate') {
        applicationData.candidateId = existingUser.id;
        candidateUser = existingUser;
      } else if (!existingUser && password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const nameParts = validatedData.applicantName.split(' ');
        const firstName = nameParts[0] || validatedData.applicantName;
        const lastName = nameParts.slice(1).join(' ') || '';
        candidateUser = await storage.upsertUser({
          email: validatedData.email,
          password: hashedPassword,
          firstName,
          lastName,
          role: "candidate",
        });
        applicationData.candidateId = candidateUser.id;
      } else if (existingUser) {
        applicationData.candidateId = existingUser.id;
      }

      const application = await storage.createJobApplication(applicationData);

      if (candidateUser && !existingUser) {
        await storage.linkApplicationsToCandidate(validatedData.email, candidateUser.id);
        req.login(candidateUser, (err: any) => {
          if (err) console.error("Auto-login after application failed:", err);
        });
      }

      res.status(201).json({ 
        ...application, 
        candidateCreated: !existingUser && !!password,
        candidateExists: !!existingUser && existingUser.role === 'candidate',
      });
    } catch (error: any) {
      console.error("Error submitting application:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  // Admin: Create a new job opening
  app.post('/api/careers/openings', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const validatedData = createJobOpeningSchema.parse(req.body);

      if (validatedData.isSpecialBranding && validatedData.corporateCompanyId) {
        const plan = await storage.getCompanyPlan(validatedData.corporateCompanyId);
        const level = plan?.corporationLevel || 1;
        const limits = getCorporationLevelLimits(level);
        const usage = await storage.getCompanyUsage(validatedData.corporateCompanyId);
        const currentSpecialBranding = usage?.specialBrandingVacanciesActive ?? 0;
        if (limits.specialBrandingVacancies !== -1 && currentSpecialBranding >= limits.specialBrandingVacancies) {
          return res.status(403).json({
            message: `Special branding vacancy limit reached for Level ${level}. Max: ${limits.specialBrandingVacancies}`,
          });
        }
      }

      if (validatedData.isHighlighted && validatedData.corporateCompanyId) {
        const plan = await storage.getCompanyPlan(validatedData.corporateCompanyId);
        const level = plan?.corporationLevel || 1;
        const limits = getCorporationLevelLimits(level);
        if (!limits.canHighlightVacancies) {
          return res.status(403).json({
            message: `Vacancy highlighting not available for Level ${level}`,
          });
        }
      }

      const opening = await storage.createJobOpening(validatedData);

      if (opening.isSpecialBranding && opening.corporateCompanyId) {
        await storage.incrementCompanyUsage(opening.corporateCompanyId, 'specialBrandingVacanciesActive');
      }
      if (opening.isHighlighted && opening.corporateCompanyId) {
        await storage.incrementCompanyUsage(opening.corporateCompanyId, 'highlightedVacanciesActive');
      }

      res.status(201).json(opening);
    } catch (error: any) {
      console.error("Error creating job opening:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create job opening" });
    }
  });

  // Admin: Approve or reject a job opening
  app.patch('/api/careers/openings/:id/review', isAuthenticated, isEventAdmin, async (req: any, res) => {
    try {
      const { status } = req.body;
      if (!status || !["open", "draft", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'open', 'draft', or 'rejected'" });
      }
      const opening = await storage.updateJobOpening(req.params.id, { status });
      res.json(opening);
    } catch (error) {
      console.error("Error reviewing job opening:", error);
      res.status(500).json({ message: "Failed to update job opening status" });
    }
  });

  // Admin: Update a job opening
  app.patch('/api/careers/openings/:id', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const validatedData = createJobOpeningSchema.partial().parse(req.body);
      const opening = await storage.updateJobOpening(req.params.id, validatedData);
      res.json(opening);
    } catch (error: any) {
      console.error("Error updating job opening:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update job opening" });
    }
  });

  // Admin: Delete a job opening
  app.delete('/api/careers/openings/:id', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      await storage.deleteJobOpening(req.params.id);
      res.json({ message: "Job opening deleted" });
    } catch (error) {
      console.error("Error deleting job opening:", error);
      res.status(500).json({ message: "Failed to delete job opening" });
    }
  });

  // User: Submit a job opening for review
  app.post('/api/careers/openings/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = createJobOpeningSchema.parse(req.body);
      const opening = await storage.createJobOpening({
        ...validatedData,
        status: "pending_review",
        submittedBy: userId,
      });
      res.status(201).json(opening);
    } catch (error: any) {
      console.error("Error submitting job opening:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to submit job opening" });
    }
  });

  app.post('/api/careers/voice-to-vacancy', isAuthenticated, isEventAdmin, uploadAudio.single('audio'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file uploaded" });
      }

      const OpenAI = (await import('openai')).default;
      const { toFile } = await import('openai/uploads');
      const openaiClient = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const originalName = req.file.originalname || 'recording.webm';
      const audioFile = await toFile(req.file.buffer, originalName, { type: req.file.mimetype });

      console.log('Transcribing audio with OpenAI Whisper...');
      const transcription = await openaiClient.audio.transcriptions.create({
        model: 'gpt-4o-mini-transcribe',
        file: audioFile,
        response_format: 'json',
      });

      const transcribedText = (transcription as any).text;
      console.log('Transcription result:', transcribedText);

      if (!transcribedText || transcribedText.trim().length === 0) {
        return res.status(400).json({ message: "Could not transcribe audio. Please try again with clearer speech." });
      }

      const systemPrompt = `Ты — профессиональный HR-эксперт и копирайтер, специализирующийся на создании привлекательных вакансий. Пользователь опишет одну или несколько вакансий голосом (будет предоставлен транскрибированный текст). Твоя задача — проанализировать описание и создать профессиональные, детализированные карточки вакансий.

КРИТИЧЕСКИ ВАЖНО:
- Определи язык входного текста и создавай вакансии СТРОГО на том же языке
- Если текст на русском — ВСЕ поля (title, description, requirements, department, location и т.д.) должны быть на русском
- Если текст на английском — все поля на английском
- НИКОГДА не переводи на другой язык

Верни ТОЛЬКО валидный JSON-массив объектов. Если описана одна вакансия — массив с одним объектом. Если несколько — несколько объектов.

Каждый объект должен содержать следующие поля (используй null для неизвестных):
{
  "title": "Название должности (профессиональное, как на hh.ru/LinkedIn)",
  "department": "Название отдела/подразделения",
  "location": "Город/Локация",
  "employmentType": "full-time" или "part-time" или "internship",
  "description": "Полное профессиональное описание вакансии в HTML-формате с тегами <p>, <ul>, <li>, <strong>. Структура: 1) О компании/проекте (если упомянуто), 2) Описание роли и команды, 3) Ключевые обязанности (список), 4) Что мы предлагаем (условия, бонусы, рост). Каждый раздел должен быть развёрнутым и профессиональным — даже если пользователь упомянул кратко, расширь до полноценного описания уровня топовых работодателей.",
  "requirements": "Детальные требования к кандидату в HTML-формате с <p>, <ul>, <li>, <strong>. Структура: 1) Обязательные требования (hard skills, опыт, образование), 2) Желательные навыки (будет плюсом), 3) Личные качества. Требования должны быть конкретными и реалистичными.",
  "salaryMin": число или null,
  "salaryMax": число или null,
  "salaryCurrency": "RUB" или "USD" или "EUR",
  "experienceLevel": "none" или "1-3" или "3-6" или "6+" или null,
  "companyName": "Название компании если упомянуто" или null,
  "field": "Отрасль/сфера деятельности" или null,
  "schedule": "График работы (5/2, сменный, гибкий и т.д.)" или null,
  "workHours": "Рабочие часы (9:00-18:00 и т.д.)" или null
}

Правила создания профессиональных вакансий:
- Анализируй контекст: если пользователь говорит "нужен разработчик на Python", создай полноценную вакансию с описанием стека, задач, команды и условий
- Описание должно быть на уровне крупных компаний (Яндекс, Сбер, Тинькофф) — структурированное, привлекательное, с конкретикой
- Требования должны быть реалистичными и соответствовать уровню позиции
- Используй профессиональную терминологию соответствующей отрасли
- Если упоминается зарплата, корректно парси числа (например "от 100 до 200 тысяч" = salaryMin: 100000, salaryMax: 200000)
- Валюта по умолчанию — RUB (если не указано иное)
- Тип занятости по умолчанию — "full-time" (если не указано иное)
- Каждая вакансия должна содержать минимум 3-4 абзаца описания и 8-12 пунктов требований
- HTML должен быть чистым и хорошо структурированным с использованием <h4> для подзаголовков разделов
- Отвечай ТОЛЬКО JSON-массивом, без дополнительного текста`;

      let aiResponseContent: string;
      try {
        const gigaChatResponse = await sendChatMessage([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Проанализируй следующее голосовое описание вакансий и создай профессиональные карточки вакансий на том же языке, что и входной текст:\n\n"${transcribedText}"` },
        ], {
          temperature: 0.3,
          maxTokens: 4096,
        });
        aiResponseContent = gigaChatResponse.content;
        console.log('Vacancy generation completed via GigaChat');
      } catch (gigaChatError: any) {
        console.warn('GigaChat unavailable for vacancy generation, falling back to OpenAI:', gigaChatError?.message);
        const openaiCompletion = await openaiClient.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Проанализируй следующее голосовое описание вакансий и создай профессиональные карточки вакансий на том же языке, что и входной текст:\n\n"${transcribedText}"` },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        });
        aiResponseContent = openaiCompletion.choices[0]?.message?.content || '';
        console.log('Vacancy generation completed via OpenAI fallback');
      }

      const response = { content: aiResponseContent };

      let vacanciesData: any[];
      try {
        const arrayMatch = response.content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          vacanciesData = JSON.parse(arrayMatch[0]);
        } else {
          const objMatch = response.content.match(/\{[\s\S]*\}/);
          if (objMatch) {
            vacanciesData = [JSON.parse(objMatch[0])];
          } else {
            throw new Error('No JSON found in response');
          }
        }
        if (!Array.isArray(vacanciesData)) {
          vacanciesData = [vacanciesData];
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', response.content);
        return res.status(500).json({ message: "Failed to parse AI response into structured vacancy data" });
      }

      const createdVacancies = [];
      for (const v of vacanciesData) {
        const openingData: any = {
          title: v.title || 'Untitled Vacancy',
          department: v.department || null,
          location: v.location || null,
          employmentType: v.employmentType || 'full-time',
          description: v.description || '',
          requirements: v.requirements || null,
          salaryMin: v.salaryMin ? Number(v.salaryMin) : null,
          salaryMax: v.salaryMax ? Number(v.salaryMax) : null,
          salaryCurrency: v.salaryCurrency || 'RUB',
          experienceLevel: v.experienceLevel || null,
          companyName: v.companyName || null,
          field: v.field || null,
          schedule: v.schedule || null,
          workHours: v.workHours || null,
          status: 'draft',
          createdBy: req.user.id,
        };
        const created = await storage.createJobOpening(openingData);
        createdVacancies.push(created);
      }

      console.log(`Created ${createdVacancies.length} draft vacancies from voice`);
      res.json({ vacancies: createdVacancies, count: createdVacancies.length, transcription: transcribedText });
    } catch (error: any) {
      console.error("Voice-to-vacancy error:", error);
      res.status(500).json({ message: error.message || "Failed to process voice recording" });
    }
  });

  // Admin: Get all applications (optionally filtered by jobId)
  app.get('/api/careers/applications', isAuthenticated, isEventAdmin, async (req: any, res) => {
    try {
      const jobId = req.query.jobId as string | undefined;
      const applications = await storage.getJobApplications(jobId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.get('/api/careers/resume/:applicationId', isAuthenticated, isEventAdmin, async (req: any, res) => {
    try {
      const application = await storage.getJobApplication(req.params.applicationId);
      if (!application || !application.resumeUrl) {
        return res.status(404).json({ message: "Resume not found" });
      }
      const { bucketName, objectName } = parseObjectPath(application.resumeUrl);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({ message: "Resume file not found" });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="resume-${application.applicantName.replace(/\s+/g, '_')}.pdf"`);
      const stream = file.createReadStream();
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading resume:", error);
      res.status(500).json({ message: "Failed to download resume" });
    }
  });

  // Admin: Get single application
  app.get('/api/careers/applications/:id', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const application = await storage.getJobApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(application);
    } catch (error) {
      console.error("Error fetching application:", error);
      res.status(500).json({ message: "Failed to fetch application" });
    }
  });

  // Admin: Update application status
  app.patch('/api/careers/applications/:id/status', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const validatedData = updateApplicationStatusSchema.parse(req.body);
      const application = await storage.updateJobApplicationStatus(req.params.id, validatedData.status);
      res.json(application);
    } catch (error: any) {
      console.error("Error updating application status:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update application status" });
    }
  });

  // Admin: Get messages for an application
  app.get('/api/careers/applications/:id/messages', isAuthenticated, isEventAdmin, async (req, res) => {
    try {
      const messages = await storage.getApplicationMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Admin: Send a message for an application
  app.post('/api/careers/applications/:id/messages', isAuthenticated, isEventAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const validatedData = sendApplicationMessageSchema.parse({
        ...req.body,
        applicationId: req.params.id,
        senderType: 'admin',
        senderId: userId,
      });
      const message = await storage.createApplicationMessage(validatedData);
      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error sending message:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ============ CANDIDATE PORTAL ROUTES ============

  app.post('/api/candidates/register', async (req, res) => {
    try {
      const validatedData = candidateRegisterSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      const user = await storage.upsertUser({
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: "candidate",
      });
      await storage.linkApplicationsToCandidate(validatedData.email, user.id);
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Registration successful but login failed" });
        }
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error: any) {
      console.error("Error during candidate registration:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post('/api/candidates/login', (req, res, next) => {
    try {
      const validatedData = candidateLoginSchema.parse(req.body);
      passport.authenticate('local', (err: any, user: any, info: any) => {
        if (err) return next(err);
        if (!user) {
          return res.status(401).json({ message: info?.message || "Invalid credentials" });
        }
        req.login(user, (err) => {
          if (err) return next(err);
          import("./signals/platform-activity").then(m => m.recordFounderLogin(user.id)).catch(() => {});
          const { password, ...userWithoutPassword } = user;
          res.json(userWithoutPassword);
        });
      })(req, res, next);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get('/api/candidates/me', async (req: any, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = req.user.id || req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== 'candidate') return res.status(403).json({ message: "Forbidden" });
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.post('/api/candidates/logout', (req: any, res) => {
    req.logout((err: any) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/candidates/applications', async (req: any, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = req.user.id || req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (!user || user.role !== 'candidate') return res.status(403).json({ message: "Forbidden" });
    try {
      const applications = await storage.getJobApplicationsByCandidate(userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching candidate applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.get('/api/candidates/applications/:id', async (req: any, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = req.user.id || req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (!user || user.role !== 'candidate') return res.status(403).json({ message: "Forbidden" });
    try {
      const application = await storage.getJobApplicationForCandidate(req.params.id, userId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(application);
    } catch (error) {
      console.error("Error fetching candidate application:", error);
      res.status(500).json({ message: "Failed to fetch application" });
    }
  });

  app.get('/api/candidates/applications/:id/messages', async (req: any, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = req.user.id || req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (!user || user.role !== 'candidate') return res.status(403).json({ message: "Forbidden" });
    try {
      const application = await storage.getJobApplicationForCandidate(req.params.id, userId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      const messages = await storage.getApplicationMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/candidates/applications/:id/messages', async (req: any, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = req.user.id || req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (!user || user.role !== 'candidate') return res.status(403).json({ message: "Forbidden" });
    try {
      const application = await storage.getJobApplicationForCandidate(req.params.id, userId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      const validatedData = sendApplicationMessageSchema.parse({
        ...req.body,
        applicationId: req.params.id,
        senderType: 'candidate',
        senderId: userId,
      });
      const message = await storage.createApplicationMessage(validatedData);
      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error sending message:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get('/api/public/stats', async (_req, res) => {
    try {
      const [users, events, courses] = await Promise.all([
        storage.getAllUsers(),
        storage.getEvents(),
        storage.getCourses(),
      ]);
      const publishedEvents = events.filter((e: any) => !e.isDraft);
      res.json({
        members: users.length,
        events: publishedEvents.length,
        courses: courses.length,
      });
    } catch (error) {
      console.error("Error fetching public stats:", error);
      res.json({ members: 0, events: 0, courses: 0 });
    }
  });

  // ============================================
  // Startup & Innovation Platform Routes
  // ============================================

  // Helper: check if user is a company member
  async function checkCompanyAccess(userId: string, companyId: string) {
    const userCompanies = await storage.getUserCompanies(userId);
    return userCompanies.some(uc => uc.companyId === companyId);
  }

  // --- Company Routes ---
  app.get('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      const isPlatformAdmin = dbUser?.isHeadAdmin || dbUser?.role === 'innoLabsAdmin';
      const companies = await storage.getCompanies();
      const filtered = isPlatformAdmin ? companies : companies.filter((c: any) => c.status === 'active' || c.createdBy === userId);
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.get('/api/companies/public', async (req: any, res) => {
    try {
      const allCompanies = await storage.getCompanies();
      res.json(allCompanies.filter((c: any) => c.status === 'active'));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.get('/api/companies/pending', isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      const allCompanies = await storage.getCompanies();
      const pending = allCompanies.filter((c: any) => c.status === 'pending_review');
      const enriched = await Promise.all(pending.map(async (c: any) => {
        const creator = c.createdBy ? await storage.getUser(c.createdBy) : null;
        return { ...c, creator: creator ? { id: creator.id, firstName: creator.firstName, lastName: creator.lastName, email: creator.email } : null };
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending companies" });
    }
  });

  app.get('/api/companies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const company = await storage.getCompany(req.params.id);
      if (!company) return res.status(404).json({ message: "Company not found" });
      res.json(company);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.post('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      const data = createCompanySchema.parse(req.body);
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      const isPlatformAdmin = dbUser?.isHeadAdmin || dbUser?.role === 'innoLabsAdmin';
      const status = isPlatformAdmin ? 'active' : 'pending_review';
      const company = await storage.createCompany({ ...data, createdBy: userId, status });
      if (status === 'active') {
        await storage.addCompanyUser({ userId, companyId: company.id, role: 'headAdmin' });
      }
      res.status(201).json(company);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create company" });
    }
  });

  app.patch('/api/companies/:id/review', isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      const { status } = req.body;
      if (!['active', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Status must be 'active' or 'rejected'" });
      }
      const company = await storage.updateCompany(req.params.id, { status });
      if (status === 'active' && company.createdBy) {
        const existingUsers = await storage.getCompanyUsers(req.params.id);
        const alreadyMember = existingUsers.some((u: any) => u.userId === company.createdBy);
        if (!alreadyMember) {
          await storage.addCompanyUser({ userId: company.createdBy, companyId: company.id, role: 'headAdmin' });
        }
      }
      res.json(company);
    } catch (error) {
      res.status(500).json({ message: "Failed to review company" });
    }
  });

  app.patch('/api/companies/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      const hasAccess = dbUser?.isHeadAdmin || dbUser?.role === 'innoLabsAdmin' || await checkCompanyAccess(userId, req.params.id);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      const company = await storage.updateCompany(req.params.id, req.body);
      res.json(company);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update company" });
    }
  });

  app.delete('/api/companies/:id', isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      await storage.deleteCompany(req.params.id);
      res.json({ message: "Company deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete company" });
    }
  });

  app.get('/api/companies/:id/users', isAuthenticated, async (req: any, res) => {
    try {
      const users = await storage.getCompanyUsers(req.params.id);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch company users" });
    }
  });

  app.post('/api/companies/:id/users', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const schema = z.object({ userId: z.string(), role: z.string() });
      const data = schema.parse(req.body);
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      
      // Tier-based: only companyAdmin (tier 5+) or platform admin can add users
      let hasAccess = dbUser?.isHeadAdmin || dbUser?.role === 'innoLabsAdmin';
      if (!hasAccess) {
        const companyUsers = await storage.getCompanyUsers(req.params.id);
        const callerCU = companyUsers.find((cu: any) => cu.userId === userId);
        if (callerCU && isCompanyAdmin(callerCU.role || "member")) {
          hasAccess = true;
          // Can only assign roles below own tier
          const callerTier = getCompanyRoleTier(callerCU.role || "member");
          const targetTier = getCompanyRoleTier(data.role);
          if (targetTier >= callerTier) {
            return res.status(403).json({ message: "Cannot assign a role equal to or higher than your own" });
          }
        }
      }
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      const companyUser = await storage.addCompanyUser({ ...data, companyId: req.params.id });
      res.status(201).json(companyUser);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(400).json({ message: error.message || "Failed to add user" });
    }
  });

  app.delete('/api/companies/:companyId/users/:id', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      
      // Tier-based: only companyAdmin (tier 5+) or platform admin can remove users
      let hasAccess = dbUser?.isHeadAdmin || dbUser?.role === 'innoLabsAdmin';
      if (!hasAccess) {
        const companyUsers = await storage.getCompanyUsers(req.params.companyId);
        const callerCU = companyUsers.find((cu: any) => cu.userId === userId);
        if (callerCU && isCompanyAdmin(callerCU.role || "member")) {
          hasAccess = true;
        }
      }
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      await storage.removeCompanyUser(req.params.id);
      res.json({ message: "User removed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove user" });
    }
  });

  app.get('/api/my-companies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const companies = await storage.getUserCompanies(userId);
      const allCompanies = await storage.getCompanies();
      const createdByMe = allCompanies.filter((c: any) => c.createdBy === userId && !companies.some((mc: any) => mc.id === c.id));
      res.json([...companies, ...createdByMe]);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch your companies" });
    }
  });

  // --- Startup Routes ---
  app.get('/api/startups', isAuthenticated, async (req: any, res) => {
    try {
      const { vertical, stage } = req.query;
      const { deriveStartupActivityStatus } = await import("@shared/schema");
      const startups = await storage.getStartups({ vertical: vertical as string, stage: stage as string });
      const now = new Date();
      res.json(startups.map(s => ({ ...s, activityStatus: deriveStartupActivityStatus(s.lastActivityAt, now) })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch startups" });
    }
  });

  app.get('/api/startups/:id', isAuthenticated, async (req: any, res) => {
    try {
      const startup = await storage.getStartup(req.params.id);
      if (!startup) return res.status(404).json({ message: "Startup not found" });
      const { deriveStartupActivityStatus } = await import("@shared/schema");
      res.json({ ...startup, activityStatus: deriveStartupActivityStatus(startup.lastActivityAt) });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch startup" });
    }
  });

  app.post('/api/startups', isAuthenticated, async (req: any, res) => {
    try {
      const data = createStartupSchema.parse(req.body);
      const userId = req.user?.claims?.sub || req.user?.id;
      const startup = await storage.createStartup({ ...data, createdBy: userId });
      await storage.addStartupMember({ startupId: startup.id, userId, role: 'founder' });
      res.status(201).json(startup);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create startup" });
    }
  });

  app.patch('/api/startups/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      const userStartups = await storage.getUserStartups(userId);
      const isMember = userStartups.some(us => us.startupId === req.params.id && (us.role === 'founder' || us.role === 'cofounder'));
      if (!isMember && !dbUser?.isHeadAdmin && dbUser?.role !== 'innoLabsAdmin') {
        return res.status(403).json({ message: "Only founders can edit this startup" });
      }
      const startup = await storage.updateStartup(req.params.id, req.body);
      res.json(startup);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update startup" });
    }
  });

  app.post('/api/startups/:id/logo', isAuthenticated, uploadImage.single('logo'), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const userStartups = await storage.getUserStartups(userId);
      const isFounder = userStartups.some(us => us.startupId === req.params.id && (us.role === 'founder' || us.role === 'cofounder'));
      const dbUser = await storage.getUser(userId);
      if (!isFounder && !dbUser?.isHeadAdmin && dbUser?.role !== 'innoLabsAdmin') {
        return res.status(403).json({ message: "Only founders can upload startup logo" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }
      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      if (!publicPaths || publicPaths.length === 0) {
        return res.status(500).json({ message: "Object storage not configured" });
      }
      const ext = path.extname(req.file.originalname);
      const filename = `startup-logo-${req.params.id}-${Date.now()}${ext}`;
      const publicPath = publicPaths[0];
      const fullPath = `${publicPath}/${filename}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      await file.save(req.file.buffer, { metadata: { contentType: req.file.mimetype } });
      const logoUrl = `/${filename}`;
      await storage.updateStartup(req.params.id, { logo: logoUrl });
      res.json({ url: logoUrl });
    } catch (error: any) {
      console.error("Error uploading startup logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  // University logo upload
  app.post('/api/universities/:id/logo', isAuthenticated, uploadImage.single('logo'), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      const isPlatformAdmin = dbUser?.isHeadAdmin;
      if (!isPlatformAdmin) {
        const membership = await storage.getUserUniversityMembership(userId, req.params.id);
        if (!membership || !['headAdmin', 'admin'].includes(membership.role || '')) {
          return res.status(403).json({ message: "Admin access required" });
        }
      }
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }
      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      if (!publicPaths || publicPaths.length === 0) {
        return res.status(500).json({ message: "Object storage not configured" });
      }
      const ext = path.extname(req.file.originalname);
      const filename = `university-logo-${req.params.id}-${Date.now()}${ext}`;
      const publicPath = publicPaths[0];
      const fullPath = `${publicPath}/${filename}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      await file.save(req.file.buffer, { metadata: { contentType: req.file.mimetype } });
      const logoUrl = `/${filename}`;
      await storage.updateUniversity(req.params.id, { logoUrl });
      res.json({ url: logoUrl });
    } catch (error: any) {
      console.error("Error uploading university logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  // Club logo upload
  app.post('/api/clubs/:id/logo', isAuthenticated, uploadImage.single('logo'), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      const isPlatformAdmin = dbUser?.isHeadAdmin;
      if (!isPlatformAdmin) {
        const membership = await storage.getUserClubMembership(userId, req.params.id);
        if (!membership || !['headAdmin', 'admin'].includes(membership.role || '')) {
          return res.status(403).json({ message: "Admin access required" });
        }
      }
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }
      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      if (!publicPaths || publicPaths.length === 0) {
        return res.status(500).json({ message: "Object storage not configured" });
      }
      const ext = path.extname(req.file.originalname);
      const filename = `club-logo-${req.params.id}-${Date.now()}${ext}`;
      const publicPath = publicPaths[0];
      const fullPath = `${publicPath}/${filename}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      await file.save(req.file.buffer, { metadata: { contentType: req.file.mimetype } });
      const logoUrl = `/${filename}`;
      await storage.updateClub(req.params.id, { logoUrl });
      res.json({ url: logoUrl });
    } catch (error: any) {
      console.error("Error uploading club logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  // Program logo upload
  app.post('/api/programs/:id/logo', isAuthenticated, uploadImage.single('logo'), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      const program = await storage.getProgram(req.params.id);
      if (!program) return res.status(404).json({ message: "Program not found" });
      const hasAccess = dbUser?.isHeadAdmin || dbUser?.role === 'innoLabsAdmin' || (program.companyId && await checkCompanyAccess(userId, program.companyId));
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }
      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      if (!publicPaths || publicPaths.length === 0) {
        return res.status(500).json({ message: "Object storage not configured" });
      }
      const ext = path.extname(req.file.originalname);
      const filename = `program-logo-${req.params.id}-${Date.now()}${ext}`;
      const publicPath = publicPaths[0];
      const fullPath = `${publicPath}/${filename}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      await file.save(req.file.buffer, { metadata: { contentType: req.file.mimetype } });
      const logoUrl = `/${filename}`;
      await storage.updateProgram(req.params.id, { logoUrl });
      res.json({ url: logoUrl });
    } catch (error: any) {
      console.error("Error uploading program logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  // Company logo upload
  app.post('/api/companies/:id/logo', isAuthenticated, uploadImage.single('logo'), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      const hasAccess = dbUser?.isHeadAdmin || dbUser?.role === 'innoLabsAdmin' || await checkCompanyAccess(userId, req.params.id);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }
      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      if (!publicPaths || publicPaths.length === 0) {
        return res.status(500).json({ message: "Object storage not configured" });
      }
      const ext = path.extname(req.file.originalname);
      const filename = `company-logo-${req.params.id}-${Date.now()}${ext}`;
      const publicPath = publicPaths[0];
      const fullPath = `${publicPath}/${filename}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      await file.save(req.file.buffer, { metadata: { contentType: req.file.mimetype } });
      const logoUrl = `/${filename}`;
      await storage.updateCompany(req.params.id, { logo: logoUrl });
      res.json({ url: logoUrl });
    } catch (error: any) {
      console.error("Error uploading company logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  app.delete('/api/startups/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      console.log(`[DELETE STARTUP] User ${userId} requesting delete of startup ${req.params.id}`);
      const dbUser = await storage.getUser(userId);
      const startup = await storage.getStartup(req.params.id);
      if (!startup) {
        console.log(`[DELETE STARTUP] Startup ${req.params.id} not found in DB, treating as already deleted`);
        return res.json({ message: "Startup deleted" });
      }
      console.log(`[DELETE STARTUP] Found startup: ${startup.name}`);
      const isAdmin = dbUser?.isHeadAdmin || dbUser?.role === 'innoLabsAdmin';
      const userStartups = await storage.getUserStartups(userId);
      const isFounder = userStartups.some(us => us.startupId === req.params.id && us.role === 'founder');
      console.log(`[DELETE STARTUP] isFounder: ${isFounder}, isAdmin: ${isAdmin}, userRole: ${dbUser?.role}`);
      if (!isFounder && !isAdmin) {
        return res.status(403).json({ message: "Only founders or admins can delete this startup" });
      }
      await storage.deleteStartup(req.params.id);
      console.log(`[DELETE STARTUP] Successfully deleted startup ${req.params.id}`);
      res.json({ message: "Startup deleted" });
    } catch (error: any) {
      console.error("[DELETE STARTUP] Failed:", error?.message || error);
      res.status(500).json({ message: error?.message || "Failed to delete startup" });
    }
  });

  app.get('/api/startups/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const members = await storage.getStartupMembers(req.params.id);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch startup members" });
    }
  });

  app.post('/api/startups/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const data = insertStartupMemberSchema.parse(req.body);
      const userId = req.user?.claims?.sub || req.user?.id;
      const userStartups = await storage.getUserStartups(userId);
      const isFounder = userStartups.some(us => us.startupId === req.params.id && (us.role === 'founder' || us.role === 'cofounder'));
      const dbUser = await storage.getUser(userId);
      if (!isFounder && !dbUser?.isHeadAdmin && dbUser?.role !== 'innoLabsAdmin') {
        return res.status(403).json({ message: "Only founders can invite members" });
      }
      const member = await storage.addStartupMember({ ...data, startupId: req.params.id });
      res.status(201).json(member);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(400).json({ message: error.message || "Failed to add member" });
    }
  });

  app.delete('/api/startups/:startupId/members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      const userStartups = await storage.getUserStartups(userId);
      const isFounder = userStartups.some(us => us.startupId === req.params.startupId && (us.role === 'founder' || us.role === 'cofounder'));
      if (!isFounder && !dbUser?.isHeadAdmin && dbUser?.role !== 'innoLabsAdmin') {
        return res.status(403).json({ message: "Only founders can manage members" });
      }
      await storage.removeStartupMember(req.params.id);
      res.json({ message: "Member removed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  // ── Group 2: Founder & team social trackers ────────────────────────────
  app.get('/api/startups/:id/team-members', async (req, res) => {
    try {
      const list = await storage.getTeamMembers(req.params.id);
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch team members" });
    }
  });

  const canEditTeamRoster = async (userId: string, startupId: string): Promise<boolean> => {
    const dbUser = await storage.getUser(userId);
    if (dbUser?.isHeadAdmin || dbUser?.role === 'innoLabsAdmin') return true;
    const userStartups = await storage.getUserStartups(userId);
    return userStartups.some((us) => us.startupId === startupId && (us.role === 'founder' || us.role === 'cofounder'));
  };

  app.post('/api/startups/:id/team-members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!(await canEditTeamRoster(userId, req.params.id))) {
        return res.status(403).json({ message: "Only founders/admins can edit the team roster" });
      }
      const data = createTeamMemberSchema.parse(req.body);
      const created = await storage.createTeamMember({
        startupId: req.params.id,
        fullName: data.fullName,
        role: data.role || null,
        isFounder: data.isFounder ?? false,
        linkedinUrl: data.linkedinUrl || null,
        twitterHandle: data.twitterHandle || null,
        vkUrl: data.vkUrl || null,
        habrCareerUrl: data.habrCareerUrl || null,
        youtubeChannelId: data.youtubeChannelId || null,
      });
      res.status(201).json(created);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(400).json({ message: error.message || "Failed to add team member" });
    }
  });

  app.patch('/api/startups/:id/team-members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!(await canEditTeamRoster(userId, req.params.id))) {
        return res.status(403).json({ message: "Only founders/admins can edit the team roster" });
      }
      const existing = await storage.getTeamMember(req.params.memberId);
      if (!existing || existing.startupId !== req.params.id) {
        return res.status(404).json({ message: "Team member not found for this startup" });
      }
      const data = createTeamMemberSchema.partial().parse(req.body);
      const updated = await storage.updateTeamMember(req.params.memberId, {
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(data.role !== undefined ? { role: data.role || null } : {}),
        ...(data.isFounder !== undefined ? { isFounder: data.isFounder } : {}),
        ...(data.linkedinUrl !== undefined ? { linkedinUrl: data.linkedinUrl || null } : {}),
        ...(data.twitterHandle !== undefined ? { twitterHandle: data.twitterHandle || null } : {}),
        ...(data.vkUrl !== undefined ? { vkUrl: data.vkUrl || null } : {}),
        ...(data.habrCareerUrl !== undefined ? { habrCareerUrl: data.habrCareerUrl || null } : {}),
        ...(data.youtubeChannelId !== undefined ? { youtubeChannelId: data.youtubeChannelId || null } : {}),
      });
      res.json(updated);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(400).json({ message: error.message || "Failed to update team member" });
    }
  });

  app.delete('/api/startups/:id/team-members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!(await canEditTeamRoster(userId, req.params.id))) {
        return res.status(403).json({ message: "Only founders/admins can edit the team roster" });
      }
      const existing = await storage.getTeamMember(req.params.memberId);
      if (!existing || existing.startupId !== req.params.id) {
        return res.status(404).json({ message: "Team member not found for this startup" });
      }
      await storage.deleteTeamMember(req.params.memberId);
      res.json({ message: "Removed" });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to remove team member" });
    }
  });

  app.get('/api/startups/:id/founder-pulse', async (req, res) => {
    try {
      const { getFounderPulse } = await import('./signals/founder-pulse');
      const pulse = await getFounderPulse(req.params.id);
      res.json(pulse);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to compute founder pulse" });
    }
  });

  app.get('/api/my-startups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const memberStartups = await storage.getUserStartups(userId);
      const startups = memberStartups
        .filter(ms => ms.startup)
        .map(ms => ms.startup);
      res.json(startups);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch your startups" });
    }
  });

  app.get('/api/startups/:id/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const metrics = await storage.getStartupMetrics(req.params.id);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.post('/api/startups/:id/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const data = insertStartupMetricSchema.parse(req.body);
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      const userStartups = await storage.getUserStartups(userId);
      const isFounder = userStartups.some(us => us.startupId === req.params.id && (us.role === 'founder' || us.role === 'cofounder'));
      if (!isFounder && !dbUser?.isHeadAdmin && dbUser?.role !== 'innoLabsAdmin') {
        return res.status(403).json({ message: "Only founders can add metrics" });
      }
      const metric = await storage.createStartupMetric({ ...data, startupId: req.params.id });
      // Group 8: run inconsistency detector after each founder metric submission.
      // Fire-and-forget so the request stays fast.
      import("./signals/alerts/inconsistency").then(({ flagInconsistenciesForStartup }) => {
        flagInconsistenciesForStartup(req.params.id).catch((err) =>
          console.warn(`[alerts:inconsistency:${req.params.id}]`, err),
        );
      }).catch(() => {});
      res.status(201).json(metric);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(400).json({ message: error.message || "Failed to create metric" });
    }
  });

  // --- Brief Routes ---
  app.get('/api/briefs', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId } = req.query;
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      const isCompanyMember = companyId ? await checkCompanyAccess(userId, companyId as string) : false;
      const publicOnly = !dbUser?.isHeadAdmin && dbUser?.role !== 'innoLabsAdmin' && !isCompanyMember;
      const briefs = await storage.getBriefs(companyId as string, publicOnly);
      res.json(briefs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch briefs" });
    }
  });

  app.get('/api/briefs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const brief = await storage.getBrief(req.params.id);
      if (!brief) return res.status(404).json({ message: "Brief not found" });
      res.json(brief);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch brief" });
    }
  });

  app.post('/api/briefs', isAuthenticated, async (req: any, res) => {
    try {
      const data = createBriefSchema.parse(req.body);
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      const hasAccess = dbUser?.isHeadAdmin || dbUser?.role === 'innoLabsAdmin' || await checkCompanyAccess(userId, data.companyId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      const brief = await storage.createBrief({ ...data, createdBy: userId });
      res.status(201).json(brief);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create brief" });
    }
  });

  app.patch('/api/briefs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const brief = await storage.getBrief(req.params.id);
      if (!brief) return res.status(404).json({ message: "Brief not found" });
      const dbUser = await storage.getUser(userId);
      const hasAccess = dbUser?.isHeadAdmin || dbUser?.role === 'innoLabsAdmin' || await checkCompanyAccess(userId, brief.companyId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      const updated = await storage.updateBrief(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update brief" });
    }
  });

  app.delete('/api/briefs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const brief = await storage.getBrief(req.params.id);
      if (!brief) return res.status(404).json({ message: "Brief not found" });
      const dbUser = await storage.getUser(userId);
      const hasAccess = dbUser?.isHeadAdmin || dbUser?.role === 'innoLabsAdmin' || await checkCompanyAccess(userId, brief.companyId);
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      await storage.deleteBrief(req.params.id);
      res.json({ message: "Brief deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete brief" });
    }
  });

  // Brief Applications
  app.get('/api/briefs/:id/applications', isAuthenticated, async (req: any, res) => {
    try {
      const applications = await storage.getBriefApplications(req.params.id);
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.post('/api/briefs/:id/apply', isAuthenticated, async (req: any, res) => {
    try {
      const data = applyToBriefSchema.parse({ ...req.body, briefId: req.params.id });
      const application = await storage.createBriefApplication(data);
      res.status(201).json(application);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to submit application" });
    }
  });

  app.patch('/api/brief-applications/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.body;
      const updated = await storage.updateBriefApplicationStatus(req.params.id, status);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update status" });
    }
  });

  app.get('/api/startups/:id/brief-applications', isAuthenticated, async (req: any, res) => {
    try {
      const applications = await storage.getStartupBriefApplications(req.params.id);
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // --- Program Routes ---
  app.get('/api/programs', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId } = req.query;
      const programs = await storage.getPrograms(companyId as string);
      res.json(programs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch programs" });
    }
  });

  app.get('/api/programs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const program = await storage.getProgram(req.params.id);
      if (!program) return res.status(404).json({ message: "Program not found" });
      res.json(program);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch program" });
    }
  });

  app.post('/api/programs', isAuthenticated, async (req: any, res) => {
    try {
      const data = createProgramSchema.parse(req.body);
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      if (data.companyId) {
        const hasAccess = dbUser?.isHeadAdmin || dbUser?.role === 'innoLabsAdmin' || await checkCompanyAccess(userId, data.companyId);
        if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      } else if (!dbUser?.isHeadAdmin && dbUser?.role !== 'innoLabsAdmin') {
        return res.status(403).json({ message: "Only admins can create programs" });
      }
      const program = await storage.createProgram({ ...data, createdBy: userId, startDate: data.startDate ? new Date(data.startDate) : undefined, endDate: data.endDate ? new Date(data.endDate) : undefined });
      res.status(201).json(program);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create program" });
    }
  });

  app.patch('/api/programs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const program = await storage.getProgram(req.params.id);
      if (!program) return res.status(404).json({ message: "Program not found" });
      const dbUser = await storage.getUser(userId);
      const hasAccess = dbUser?.isHeadAdmin || dbUser?.role === 'innoLabsAdmin' || (program.companyId && await checkCompanyAccess(userId, program.companyId));
      if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      const updated = await storage.updateProgram(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update program" });
    }
  });

  app.delete('/api/programs/:id', isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      await storage.deleteProgram(req.params.id);
      res.json({ message: "Program deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete program" });
    }
  });

  app.get('/api/programs/:id/participants', isAuthenticated, async (req: any, res) => {
    try {
      const participants = await storage.getProgramParticipants(req.params.id);
      res.json(participants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch participants" });
    }
  });

  app.post('/api/programs/:id/participants', isAuthenticated, async (req: any, res) => {
    try {
      const data = insertProgramParticipantSchema.parse(req.body);
      const participant = await storage.addProgramParticipant({ ...data, programId: req.params.id });
      res.status(201).json(participant);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(400).json({ message: error.message || "Failed to add participant" });
    }
  });

  app.delete('/api/programs/:programId/participants/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      
      // Get program to check access
      const program = await storage.getProgram(req.params.programId);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      
      // Check if user is program creator, company member, or head admin
      const userCompanies = program.companyId ? await storage.getUserCompanies(userId) : [];
      const isCompanyMember = userCompanies.some(uc => uc.companyId === program.companyId);
      const isProgramCreator = program.createdBy === userId;
      
      if (!isProgramCreator && !isCompanyMember && !dbUser?.isHeadAdmin && dbUser?.role !== 'innoLabsAdmin') {
        return res.status(403).json({ message: "Only program admins can manage participants" });
      }
      
      await storage.removeProgramParticipant(req.params.id);
      res.json({ message: "Participant removed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove participant" });
    }
  });

  // --- Evaluation Routes ---
  app.get('/api/evaluations/:entityType/:entityId', isAuthenticated, async (req: any, res) => {
    try {
      const evaluations = await storage.getEvaluations(req.params.entityType, req.params.entityId);
      res.json(evaluations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch evaluations" });
    }
  });

  app.get('/api/evaluations/:entityType/:entityId/summary', isAuthenticated, async (req: any, res) => {
    try {
      const summary = await storage.getEntityEvaluationSummary(req.params.entityType, req.params.entityId);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch evaluation summary" });
    }
  });

  app.post('/api/evaluations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      if (!dbUser) return res.status(401).json({ message: "User not found" });
      const isExpert = dbUser.role === 'expert' || dbUser.role === 'innoLabsAdmin' || dbUser.isHeadAdmin;
      if (!isExpert) {
        return res.status(403).json({ message: "Only experts, admins, and head admins can submit evaluations" });
      }
      const data = createEvaluationSchema.parse(req.body);
      const totalScore = (data.teamScore || 0) + (data.productScore || 0) + (data.marketScore || 0) + (data.tractionScore || 0) + (data.strategicFitScore || 0) + (data.riskScore || 0);
      const evaluation = await storage.createEvaluation({ ...data, evaluatorId: userId, totalScore });
      res.status(201).json(evaluation);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create evaluation" });
    }
  });

  app.delete('/api/evaluations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      
      // Get evaluation to check ownership
      const evaluation = await storage.getEvaluation(req.params.id);
      if (!evaluation) {
        return res.status(404).json({ message: "Evaluation not found" });
      }
      
      // Check if user is the evaluator, company member, or head admin
      const isEvaluator = evaluation.evaluatorId === userId;
      const isCompanyMember = evaluation.companyId ? (await storage.getUserCompanies(userId)).some(uc => uc.companyId === evaluation.companyId) : false;
      
      if (!isEvaluator && !isCompanyMember && !dbUser?.isHeadAdmin && dbUser?.role !== 'innoLabsAdmin') {
        return res.status(403).json({ message: "Only the evaluator or admin can delete this evaluation" });
      }
      
      await storage.deleteEvaluation(req.params.id);
      res.json({ message: "Evaluation deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete evaluation" });
    }
  });

  // --- Pipeline CRM Routes ---
  app.get('/api/companies/:id/pipeline', isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.query;
      const pipeline = await storage.getCompanyPipeline(req.params.id, status as string);
      res.json(pipeline);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pipeline" });
    }
  });

  app.post('/api/pipeline', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const relation = await storage.upsertStartupCompanyRelation({ ...req.body, ownerUserId: userId });
      res.status(201).json(relation);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update pipeline" });
    }
  });

  app.patch('/api/pipeline/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.body;
      const updated = await storage.updateStartupCompanyRelationStatus(req.params.id, status);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update status" });
    }
  });

  // --- Company Notes Routes ---
  app.get('/api/companies/:id/notes', isAuthenticated, async (req: any, res) => {
    try {
      const { startupId } = req.query;
      const notes = await storage.getCompanyNotes(req.params.id, startupId as string);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.post('/api/company-notes', isAuthenticated, async (req: any, res) => {
    try {
      const data = createCompanyNoteSchema.parse(req.body);
      const userId = req.user?.claims?.sub || req.user?.id;
      const note = await storage.createCompanyNote({ ...data, authorId: userId });
      res.status(201).json(note);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create note" });
    }
  });

  app.delete('/api/company-notes/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteCompanyNote(req.params.id);
      res.json({ message: "Note deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  // --- Corporate Reporting Routes ---
  app.get('/api/companies/:id/report', isAuthenticated, async (req: any, res) => {
    try {
      const report = await storage.getCompanyReport(req.params.id);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  // --- Employer Branding / Talent Page ---
  app.get('/api/companies/:id/public', async (req: any, res) => {
    try {
      const company = await storage.getCompany(req.params.id);
      if (!company) return res.status(404).json({ message: "Company not found" });
      const [programs, openings] = await Promise.all([
        storage.getPrograms(req.params.id),
        storage.getJobOpenings(false),
      ]);
      res.json({ company, programs, openings });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch company profile" });
    }
  });

  // ============================================
  // MULTI-INSTITUTION & COMMUNITY ROUTES
  // ============================================
  
  // Universities
  app.get('/api/universities', async (req: any, res) => {
    try {
      const result = await storage.getUniversities();
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = userId ? await storage.getUser(userId) : null;
      const isPlatformAdmin = dbUser?.isHeadAdmin;
      const filtered = isPlatformAdmin ? result : result.filter((u: any) => u.status === 'active' || u.createdBy === userId);
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch universities" });
    }
  });

  app.get('/api/universities/by-slug/:slug', async (req: any, res) => {
    try {
      const uni = await storage.getUniversityBySlug(req.params.slug);
      if (!uni) return res.status(404).json({ message: "University not found" });
      res.json(uni);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch university" });
    }
  });

  app.get('/api/universities/pending', isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      const allUnis = await storage.getUniversities();
      const pending = allUnis.filter((u: any) => u.status === 'pending_review');
      const enriched = await Promise.all(pending.map(async (u: any) => {
        const creator = u.createdBy ? await storage.getUser(u.createdBy) : null;
        return { ...u, creator: creator ? { id: creator.id, firstName: creator.firstName, lastName: creator.lastName, email: creator.email } : null };
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending universities" });
    }
  });

  app.get('/api/universities/:id', async (req: any, res) => {
    try {
      const uni = await storage.getUniversity(req.params.id);
      if (!uni) return res.status(404).json({ message: "University not found" });
      res.json(uni);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch university" });
    }
  });

  app.post('/api/universities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      const isPlatformAdmin = dbUser?.isHeadAdmin;
      const entityStatus = isPlatformAdmin ? 'active' : 'pending_review';
      const uni = await storage.createUniversity({ ...req.body, createdBy: userId, status: entityStatus });
      if (entityStatus === 'active') {
        await storage.addUserUniversityMembership({
          userId,
          universityId: uni.id,
          role: "headAdmin",
          status: "approved",
          permissions: { canCreateEvents: true, canCreateVacancies: true, canManageMembers: true },
        });
      }
      res.status(201).json(uni);
    } catch (error) {
      res.status(500).json({ message: "Failed to create university" });
    }
  });

  app.patch('/api/universities/:id/review', isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      const { status } = req.body;
      if (!['active', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Status must be 'active' or 'rejected'" });
      }
      const uni = await storage.updateUniversity(req.params.id, { status });
      if (status === 'active' && uni.createdBy) {
        const members = await storage.getUniversityMembers(req.params.id);
        const alreadyMember = members.some((m: any) => m.userId === uni.createdBy);
        if (!alreadyMember) {
          await storage.addUserUniversityMembership({
            userId: uni.createdBy,
            universityId: uni.id,
            role: "headAdmin",
            status: "approved",
            permissions: { canCreateEvents: true, canCreateVacancies: true, canManageMembers: true },
          });
        }
      }
      res.json(uni);
    } catch (error) {
      res.status(500).json({ message: "Failed to review university" });
    }
  });

  app.delete('/api/universities/:id', async (req: any, res) => {
    if (!req.isAuthenticated() || !req.user?.isHeadAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      await storage.deleteUniversity(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete university" });
    }
  });

  app.get('/api/universities/:id/members', async (req: any, res) => {
    try {
      const members = await storage.getUniversityMembers(req.params.id);
      const enriched = await Promise.all(members.map(async (m) => {
        const user = await storage.getUser(m.userId);
        return {
          ...m,
          user: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            profileImageUrl: user.profileImageUrl,
          } : null,
        };
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch university members" });
    }
  });

  app.get('/api/universities/:id/startups', async (req: any, res) => {
    try {
      const affiliations = await storage.getStartupAffiliationsByUniversity(req.params.id);
      const startupIds = affiliations.map(a => a.startupId);
      const startups = [];
      for (const sid of startupIds) {
        const s = await storage.getStartup(sid);
        if (s) startups.push(s);
      }
      res.json(startups);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch university startups" });
    }
  });

  app.get('/api/universities/:id/events', async (req: any, res) => {
    try {
      const uniEvents = await storage.getEventsByUniversity(req.params.id);
      res.json(uniEvents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch university events" });
    }
  });

  // Clubs
  app.get('/api/clubs', async (req: any, res) => {
    try {
      const result = await storage.getClubs(req.query.universityId as string | undefined);
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = userId ? await storage.getUser(userId) : null;
      const isPlatformAdmin = dbUser?.isHeadAdmin;
      const filtered = isPlatformAdmin ? result : result.filter((c: any) => c.status === 'active' || c.createdBy === userId);
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clubs" });
    }
  });

  app.get('/api/clubs/by-slug/:slug', async (req: any, res) => {
    try {
      const club = await storage.getClubBySlug(req.params.slug);
      if (!club) return res.status(404).json({ message: "Club not found" });
      res.json(club);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch club" });
    }
  });

  app.get('/api/clubs/pending', isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      const allClubs = await storage.getClubs();
      const pending = allClubs.filter((c: any) => c.status === 'pending_review');
      const enriched = await Promise.all(pending.map(async (c: any) => {
        const creator = c.createdBy ? await storage.getUser(c.createdBy) : null;
        return { ...c, creator: creator ? { id: creator.id, firstName: creator.firstName, lastName: creator.lastName, email: creator.email } : null };
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending clubs" });
    }
  });

  app.get('/api/clubs/:id', async (req: any, res) => {
    try {
      const club = await storage.getClub(req.params.id);
      if (!club) return res.status(404).json({ message: "Club not found" });
      res.json(club);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch club" });
    }
  });

  app.post('/api/clubs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      const isPlatformAdmin = dbUser?.isHeadAdmin;
      const entityStatus = isPlatformAdmin ? 'active' : 'pending_review';

      let slug = req.body.slug;
      if (slug) {
        slug = slug.replace(/^https?:\/\/[^/]+\/?/i, '').replace(/[^a-z0-9а-яё-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
      }
      if (!slug && req.body.name) {
        slug = req.body.name.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '');
      }
      if (!slug) {
        slug = `club-${Date.now()}`;
      }

      const existingClub = await storage.getClubBySlug(slug);
      if (existingClub) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }

      const clubData = { ...req.body, slug, createdBy: userId, status: entityStatus };
      if (clubData.universityId === '' || clubData.universityId === '__none__') {
        clubData.universityId = null;
      }
      const club = await storage.createClub(clubData);

      await storage.addUserClubMembership({
        userId,
        clubId: club.id,
        role: "headAdmin",
        status: entityStatus === 'active' ? "approved" : "pending",
        permissions: { canCreateEvents: true, canCreateVacancies: true, canManageMembers: true },
      });

      res.status(201).json(club);
    } catch (error: any) {
      console.error("Failed to create club:", error?.message || error);
      if (error?.message?.includes('unique') || error?.message?.includes('duplicate')) {
        return res.status(409).json({ message: "A club with this slug already exists. Please choose a different one." });
      }
      res.status(500).json({ message: error?.message || "Failed to create club" });
    }
  });

  app.patch('/api/clubs/:id/review', isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      const { status } = req.body;
      if (!['active', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Status must be 'active' or 'rejected'" });
      }
      const club = await storage.updateClub(req.params.id, { status });
      if (status === 'active' && club.createdBy) {
        const members = await storage.getClubMembers(req.params.id);
        const creatorMembership = members.find((m: any) => m.userId === club.createdBy);
        if (!creatorMembership) {
          await storage.addUserClubMembership({
            userId: club.createdBy,
            clubId: club.id,
            role: "headAdmin",
            status: "approved",
            permissions: { canCreateEvents: true, canCreateVacancies: true, canManageMembers: true },
          });
        }
        const creator = await storage.getUser(club.createdBy);
        if (creator && !creator.mainOrgType) {
          await storage.updateUserProfile(club.createdBy, { mainOrgType: 'club', mainOrgId: club.id });
        }
      }
      res.json(club);
    } catch (error) {
      res.status(500).json({ message: "Failed to review club" });
    }
  });

  app.patch('/api/clubs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isPlatformAdmin = req.user?.isHeadAdmin;
      if (!isPlatformAdmin) {
        const membership = await storage.getUserClubMembership(userId, req.params.id);
        if (!membership || !['headAdmin', 'admin'].includes(membership.role || '')) {
          return res.status(403).json({ message: "Admin access required" });
        }
      }
      const updateData = { ...req.body };
      if (updateData.universityId === '' || updateData.universityId === '__none__') {
        updateData.universityId = null;
      }
      if (updateData.slug) {
        updateData.slug = updateData.slug.replace(/^https?:\/\/[^/]+\/?/i, '').replace(/[^a-z0-9а-яё-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
        if (!updateData.slug) updateData.slug = `club-${Date.now()}`;
      }
      const club = await storage.updateClub(req.params.id, updateData);
      res.json(club);
    } catch (error) {
      res.status(500).json({ message: "Failed to update club" });
    }
  });

  app.delete('/api/clubs/:id', async (req: any, res) => {
    if (!req.isAuthenticated() || !req.user?.isHeadAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      await storage.deleteClub(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete club" });
    }
  });

  app.get('/api/clubs/:id/members', async (req: any, res) => {
    try {
      const members = await storage.getClubMembers(req.params.id);
      const enriched = await Promise.all(members.map(async (m) => {
        const user = await storage.getUser(m.userId);
        return {
          ...m,
          user: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            profileImageUrl: user.profileImageUrl,
          } : null,
        };
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch club members" });
    }
  });

  app.get('/api/clubs/:id/startups', async (req: any, res) => {
    try {
      const affiliations = await storage.getStartupAffiliationsByClub(req.params.id);
      const startupIds = affiliations.map(a => a.startupId);
      const startups = [];
      for (const sid of startupIds) {
        const s = await storage.getStartup(sid);
        if (s) startups.push(s);
      }
      res.json(startups);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch club startups" });
    }
  });

  app.get('/api/clubs/:id/events', async (req: any, res) => {
    try {
      const clubEvents = await storage.getEventsByClub(req.params.id);
      res.json(clubEvents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch club events" });
    }
  });

  // User Memberships
  app.get('/api/users/:userId/university-memberships', async (req: any, res) => {
    try {
      const memberships = await storage.getUserUniversityMemberships(req.params.userId);
      res.json(memberships);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch university memberships" });
    }
  });

  app.post('/api/university-memberships', async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Auth required" });
    try {
      const membership = await storage.addUserUniversityMembership(req.body);
      res.status(201).json(membership);
    } catch (error) {
      res.status(500).json({ message: "Failed to add university membership" });
    }
  });

  app.delete('/api/university-memberships/:id', async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Auth required" });
    try {
      await storage.removeUserUniversityMembership(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove university membership" });
    }
  });

  app.get('/api/users/:userId/club-memberships', async (req: any, res) => {
    try {
      const memberships = await storage.getUserClubMemberships(req.params.userId);
      res.json(memberships);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch club memberships" });
    }
  });

  app.post('/api/club-memberships', async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Auth required" });
    try {
      const membership = await storage.addUserClubMembership(req.body);
      res.status(201).json(membership);
    } catch (error) {
      res.status(500).json({ message: "Failed to add club membership" });
    }
  });

  app.delete('/api/club-memberships/:id', async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Auth required" });
    try {
      await storage.removeUserClubMembership(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove club membership" });
    }
  });

  // Apply to join a university
  app.post('/api/universities/:id/apply', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const universityId = req.params.id;
      const existing = await storage.getUserUniversityMembership(userId, universityId);
      if (existing) return res.status(400).json({ message: "Already a member or application pending" });
      const membership = await storage.addUserUniversityMembership({
        userId,
        universityId,
        role: req.body.role || "student",
        status: "pending",
        permissions: {},
      });
      res.status(201).json(membership);
    } catch (error) {
      res.status(500).json({ message: "Failed to apply to university" });
    }
  });

  // Apply to join a club
  app.post('/api/clubs/:id/apply', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const clubId = req.params.id;
      const existing = await storage.getUserClubMembership(userId, clubId);
      if (existing) return res.status(400).json({ message: "Already a member or application pending" });
      const membership = await storage.addUserClubMembership({
        userId,
        clubId,
        role: req.body.role || "member",
        status: "pending",
        permissions: {},
      });
      res.status(201).json(membership);
    } catch (error) {
      res.status(500).json({ message: "Failed to apply to club" });
    }
  });

  // Get current user's membership for a specific university
  app.get('/api/universities/:id/my-membership', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const membership = await storage.getUserUniversityMembership(userId, req.params.id);
      res.json(membership || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch membership" });
    }
  });

  // Get current user's membership for a specific club
  app.get('/api/clubs/:id/my-membership', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const membership = await storage.getUserClubMembership(userId, req.params.id);
      res.json(membership || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch membership" });
    }
  });

  // Approve/reject/update university membership
  // Tier-based: caller must have admin tier (5+) in university to manage members
  // Club headAdmin of a club belonging to this university gets equivalent admin tier
  app.patch('/api/university-memberships/:id', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { status, role, permissions, universityId } = req.body;
      const members = await storage.getUniversityMembers(universityId);
      const callerMembership = members.find((m: any) => m.userId === userId);
      
      let callerTier = 0;
      let callerPerms: any = {};
      
      if (callerMembership) {
        callerTier = getUniRoleTier(callerMembership.role || "member");
        callerPerms = (callerMembership.permissions as any) || {};
      }
      
      // Check if caller is a club headAdmin of a club belonging to this university
      // Club headAdmin = university admin (tier 5) for cross-entity equivalence
      if (callerTier < UNI_ROLE_TIERS.admin) {
        const userClubMemberships = await storage.getUserClubMemberships(userId);
        for (const cm of userClubMemberships) {
          if (cm.role === "headAdmin") {
            const club = await storage.getClub(cm.clubId);
            if (club && club.universityId === universityId) {
              callerTier = Math.max(callerTier, CLUB_HEAD_ADMIN_EQUIVALENT_UNI_TIER);
              break;
            }
          }
        }
      }
      
      // Platform headAdmin always has full access
      const dbUser = await storage.getUser(userId);
      if (dbUser?.isHeadAdmin) callerTier = UNI_ROLE_TIERS.headAdmin;
      
      const isCallerHeadAdmin = callerTier >= UNI_ROLE_TIERS.headAdmin;
      const canManage = isCallerHeadAdmin || (callerTier >= UNI_ROLE_TIERS.admin && callerPerms.canManageMembers);
      if (!canManage) return res.status(403).json({ message: "Insufficient permissions" });
      
      // Can only assign roles at or below your tier
      if (role) {
        const targetTier = getUniRoleTier(role);
        if (targetTier >= callerTier) {
          return res.status(403).json({ message: "Cannot assign a role equal to or higher than your own" });
        }
      }
      if (role === "headAdmin" && !isCallerHeadAdmin) return res.status(403).json({ message: "Only head admin can assign head admin role" });
      
      const updates: any = {};
      if (status) updates.status = status;
      if (role) updates.role = role;
      if (permissions !== undefined) updates.permissions = permissions;
      const updated = await storage.updateUserUniversityMembership(req.params.id, updates);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update membership" });
    }
  });

  // Approve/reject/update club membership
  // Tier-based: caller must have admin tier (2+) in club to manage members
  // University admin of the parent university also gets admin access to the club
  app.patch('/api/club-memberships/:id', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { status, role, permissions, clubId } = req.body;
      const members = await storage.getClubMembers(clubId);
      const callerMembership = members.find((m: any) => m.userId === userId);
      
      let callerTier = 0;
      let callerPerms: any = {};
      
      if (callerMembership) {
        callerTier = getClubRoleTier(callerMembership.role || "member");
        callerPerms = (callerMembership.permissions as any) || {};
      }
      
      // Check if caller is a university admin of the parent university
      // University admin (tier 5+) gets club admin (tier 2) access
      const club = await storage.getClub(clubId);
      if (club?.universityId && callerTier < CLUB_ROLE_TIERS.admin) {
        const uniMembers = await storage.getUniversityMembers(club.universityId);
        const uniMembership = uniMembers.find((m: any) => m.userId === userId);
        if (uniMembership && isUniAdmin(uniMembership.role || "member")) {
          callerTier = Math.max(callerTier, CLUB_ROLE_TIERS.admin);
        }
      }
      
      // Platform headAdmin always has full access
      const dbUser = await storage.getUser(userId);
      if (dbUser?.isHeadAdmin) callerTier = CLUB_ROLE_TIERS.headAdmin;
      
      const isCallerHeadAdmin = callerTier >= CLUB_ROLE_TIERS.headAdmin;
      const canManage = isCallerHeadAdmin || (callerTier >= CLUB_ROLE_TIERS.admin && callerPerms.canManageMembers);
      if (!canManage) return res.status(403).json({ message: "Insufficient permissions" });
      
      // Can only assign roles at or below your tier
      if (role) {
        const targetTier = getClubRoleTier(role);
        if (targetTier >= callerTier) {
          return res.status(403).json({ message: "Cannot assign a role equal to or higher than your own" });
        }
      }
      if (role === "headAdmin" && !isCallerHeadAdmin) return res.status(403).json({ message: "Only head admin can assign head admin role" });
      
      const updates: any = {};
      if (status) updates.status = status;
      if (role) updates.role = role;
      if (permissions !== undefined) updates.permissions = permissions;
      const updated = await storage.updateUserClubMembership(req.params.id, updates);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update membership" });
    }
  });

  // Update club tier (headAdmin only or platform admin)
  app.patch('/api/clubs/:id/tier', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isPlatformAdmin = req.user?.isHeadAdmin;
      if (!isPlatformAdmin) {
        const membership = await storage.getUserClubMembership(userId, req.params.id);
        if (!membership || membership.role !== "headAdmin") {
          return res.status(403).json({ message: "Head admin access required" });
        }
      }
      const club = await storage.updateClub(req.params.id, { tier: req.body.tier });
      res.json(club);
    } catch (error) {
      res.status(500).json({ message: "Failed to update club tier" });
    }
  });

  // Update university/club edit permissions for admins
  app.patch('/api/universities/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isPlatformAdmin = req.user?.isHeadAdmin;
      if (!isPlatformAdmin) {
        const membership = await storage.getUserUniversityMembership(userId, req.params.id);
        if (!membership || !['headAdmin', 'admin'].includes(membership.role || '')) {
          return res.status(403).json({ message: "Admin access required" });
        }
      }
      const uni = await storage.updateUniversity(req.params.id, req.body);
      res.json(uni);
    } catch (error) {
      res.status(500).json({ message: "Failed to update university" });
    }
  });

  // Startup Affiliations
  app.get('/api/startups/:startupId/affiliations', async (req: any, res) => {
    try {
      const affiliations = await storage.getStartupAffiliations(req.params.startupId);
      res.json(affiliations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch startup affiliations" });
    }
  });

  app.post('/api/startup-affiliations', async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Auth required" });
    try {
      const affiliation = await storage.addStartupAffiliation(req.body);
      res.status(201).json(affiliation);
    } catch (error) {
      res.status(500).json({ message: "Failed to add startup affiliation" });
    }
  });

  app.delete('/api/startup-affiliations/:id', async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Auth required" });
    try {
      await storage.removeStartupAffiliation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove startup affiliation" });
    }
  });

  // ============================================
  // STARTUP READINESS ROUTES
  // ============================================

  app.get('/api/startups/:startupId/readiness', async (req: any, res) => {
    try {
      const readiness = await storage.getStartupReadiness(req.params.startupId);
      res.json(readiness || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch startup readiness" });
    }
  });

  app.put('/api/startups/:startupId/readiness', async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Auth required" });
    try {
      const readiness = await storage.upsertStartupReadiness(req.params.startupId, req.body);
      res.json(readiness);
    } catch (error) {
      res.status(500).json({ message: "Failed to update startup readiness" });
    }
  });

  // ============================================
  // REVIEWER ASSIGNMENT ROUTES
  // ============================================

  app.get('/api/reviewer-assignments', async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Auth required" });
    try {
      const companyId = req.query.companyId as string;
      if (!companyId) return res.status(400).json({ message: "companyId required" });
      const assignments = await storage.getReviewerAssignments(companyId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviewer assignments" });
    }
  });

  app.get('/api/my-reviews', async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Auth required" });
    try {
      const assignments = await storage.getMyReviewAssignments(req.user.id);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch your review assignments" });
    }
  });

  app.post('/api/reviewer-assignments', async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Auth required" });
    try {
      const data = { ...req.body, assignedBy: req.user.id };
      const assignment = await storage.createReviewerAssignment(data);
      await storage.createActivityLog({
        actorId: req.user.id,
        actorType: 'user',
        companyId: req.body.companyId || null,
        actionType: 'assignedReviewer',
        entityType: req.body.entityType,
        entityId: req.body.entityId,
        entityName: null,
        metadata: { reviewerId: req.body.reviewerId },
      });
      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create reviewer assignment" });
    }
  });

  app.patch('/api/reviewer-assignments/:id/status', async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Auth required" });
    try {
      const assignment = await storage.updateReviewerAssignmentStatus(req.params.id, req.body.status);
      if (req.body.status === 'done') {
        await storage.createActivityLog({
          actorId: req.user.id,
          actorType: 'user',
          companyId: null,
          actionType: 'completedReview',
          entityType: assignment.entityType,
          entityId: assignment.entityId,
          entityName: null,
          metadata: { assignmentId: assignment.id },
        });
      }
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update assignment status" });
    }
  });

  app.delete('/api/reviewer-assignments/:id', async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Auth required" });
    try {
      await storage.deleteReviewerAssignment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  });

  app.get('/api/review-progress/:entityType/:entityId', async (req: any, res) => {
    try {
      const progress = await storage.getEntityReviewProgress(req.params.entityType, req.params.entityId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch review progress" });
    }
  });

  // ============================================
  // ACTIVITY LOG ROUTES
  // ============================================

  app.get('/api/activity-logs', async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Auth required" });
    try {
      const companyId = req.query.companyId as string;
      const entityId = req.query.entityId as string;
      const entityType = req.query.entityType as string;
      const limit = parseInt(req.query.limit as string) || 50;
      if (!companyId && !entityId) return res.status(400).json({ message: "companyId or entityId required" });
      if (companyId) {
        const logs = await storage.getActivityLogs(companyId, limit);
        res.json(logs);
      } else {
        const logs = await storage.getActivityLogsByEntity(entityId, entityType, limit);
        res.json(logs);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // ============================================
  // COMPANY PLAN & USAGE ROUTES
  // ============================================

  app.get('/api/companies/:companyId/plan', async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Auth required" });
    try {
      const planWithUsage = await storage.getCompanyPlanWithUsage(req.params.companyId);
      res.json(planWithUsage || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch company plan" });
    }
  });

  app.put('/api/companies/:companyId/plan', async (req: any, res) => {
    if (!req.isAuthenticated() || !req.user?.isHeadAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const { corporationLevel, ...rest } = req.body;
      const tier = corporationLevel ? `level${corporationLevel}` : rest.tier;
      const plan = await storage.upsertCompanyPlan(req.params.companyId, {
        ...rest,
        companyId: req.params.companyId,
        tier,
        corporationLevel: corporationLevel || 1,
      });
      res.json(plan);
    } catch (error) {
      res.status(500).json({ message: "Failed to update company plan" });
    }
  });

  app.get('/api/companies/:companyId/usage', async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Auth required" });
    try {
      const usage = await storage.getCompanyUsage(req.params.companyId);
      res.json(usage || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch company usage" });
    }
  });

  app.get('/api/companies/:companyId/level-limits', async (req: any, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Auth required" });
    try {
      const plan = await storage.getCompanyPlan(req.params.companyId);
      const level = plan?.corporationLevel || 1;
      const limits = getCorporationLevelLimits(level);
      const usage = await storage.getCompanyUsage(req.params.companyId);
      res.json({
        level,
        limits,
        usage: usage || null,
        canHighlightEvent: limits.canHighlightAllEvents || (usage?.highlightedEventsThisMonth ?? 0) < limits.highlightedEventsPerMonth,
        canRecommendEvent: limits.recommendedEventsPerMonth === -1 || (usage?.recommendedEventsThisMonth ?? 0) < limits.recommendedEventsPerMonth,
        canSpecialBrandEvent: limits.specialBrandingEvents === -1 || (usage?.specialBrandingEventsActive ?? 0) < limits.specialBrandingEvents,
        canHighlightVacancy: limits.canHighlightVacancies,
        canSpecialBrandVacancy: limits.specialBrandingVacancies === -1 || (usage?.specialBrandingVacanciesActive ?? 0) < limits.specialBrandingVacancies,
        canCreateProgram: limits.maxActivePrograms === -1 || (usage?.activePrograms ?? 0) < limits.maxActivePrograms,
        canCreateBusinessTask: limits.maxBusinessTasks === -1 || (usage?.activeBusinessTasks ?? 0) < limits.maxBusinessTasks,
        canAcceptApplications: limits.maxPendingApplications === -1 || (usage?.pendingApplications ?? 0) < limits.maxPendingApplications,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch level limits" });
    }
  });

  // ========== AI VENTURE TOOLING ==========
  app.post('/api/ai/startup-memo/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { generateInvestmentMemo } = await import("./ai-venture");
      const startup = await storage.getStartup(req.params.id);
      if (!startup) return res.status(404).json({ message: "Startup not found" });
      const [metrics, readiness, evals] = await Promise.all([
        storage.getStartupMetrics(req.params.id),
        storage.getStartupReadiness(req.params.id).catch(() => null),
        storage.getEvaluations("startup", req.params.id),
      ]);
      const language = (req.body?.language === "ru" ? "ru" : "en") as "en" | "ru";
      const memo = await generateInvestmentMemo({ startup, metrics, readiness, evaluations: evals, language });
      res.json(memo);
    } catch (error: any) {
      console.error("AI memo error:", error);
      res.status(500).json({ message: error.message || "Failed to generate memo" });
    }
  });

  app.post('/api/ai/thesis-match', isAuthenticated, async (req: any, res) => {
    try {
      const { matchStartupsToThesis } = await import("./ai-venture");
      const thesis = String(req.body?.thesis || "").trim();
      if (thesis.length < 10) return res.status(400).json({ message: "Thesis must be at least 10 characters" });
      const language = (req.body?.language === "ru" ? "ru" : "en") as "en" | "ru";
      const topK = Math.max(1, Math.min(20, Number(req.body?.topK) || 8));
      const allStartups = await storage.getStartups();
      const matches = await matchStartupsToThesis({ thesis, startups: allStartups as any, language, topK });
      const idToStartup = new Map(allStartups.map((s: any) => [s.id, s]));
      const enriched = matches.map((m) => ({ ...m, startup: idToStartup.get(m.startupId) || null }));
      res.json({ matches: enriched });
    } catch (error: any) {
      console.error("AI thesis match error:", error);
      res.status(500).json({ message: error.message || "Failed to match" });
    }
  });

  app.post('/api/ai/draft-brief', isAuthenticated, async (req: any, res) => {
    try {
      const { draftBriefFromThesis } = await import("./ai-venture");
      const oneLiner = String(req.body?.oneLiner || "").trim();
      if (oneLiner.length < 6) return res.status(400).json({ message: "One-liner is too short" });
      const language = (req.body?.language === "ru" ? "ru" : "en") as "en" | "ru";
      const draft = await draftBriefFromThesis({
        oneLiner,
        companyName: req.body?.companyName,
        industry: req.body?.industry,
        language,
      });
      res.json(draft);
    } catch (error: any) {
      console.error("AI draft brief error:", error);
      res.status(500).json({ message: error.message || "Failed to draft brief" });
    }
  });

  // ========== INVESTORS CRUD ==========
  app.get('/api/investors', isAuthenticated, async (_req, res) => {
    try {
      const list = await storage.getInvestorsWithCreatorImage();
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/investors/:id', isAuthenticated, async (req, res) => {
    try {
      const inv = await storage.getInvestor(req.params.id);
      if (!inv) return res.status(404).json({ message: "Investor not found" });
      const [members, creatorImage] = await Promise.all([
        storage.getInvestorMembers(req.params.id),
        storage.getInvestorCreatorImage(req.params.id),
      ]);
      res.json({ ...inv, members, creatorImage });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/investors', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const data = createInvestorSchema.parse(req.body);
      const userId = req.user?.claims?.sub || req.user?.id;
      const created = await storage.createInvestor({ ...data, createdBy: userId });
      await storage.addInvestorMember({ investorId: created.id, userId, role: "headAdmin" });
      res.status(201).json(created);
    } catch (e: any) {
      if (e.name === 'ZodError') return res.status(400).json({ message: e.errors[0].message });
      res.status(400).json({ message: e.message });
    }
  });

  app.patch('/api/investors/:id', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      const myMemberships = await storage.getUserInvestors(userId);
      const isMember = myMemberships.some(m => m.investorId === req.params.id && (m.role === "headAdmin" || m.role === "managingPartner"));
      if (!dbUser?.isHeadAdmin && !isMember) return res.status(403).json({ message: "Forbidden" });
      const updated = await storage.updateInvestor(req.params.id, req.body);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete('/api/investors/:id', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      const myMemberships = await storage.getUserInvestors(userId);
      const isOwner = myMemberships.some(m => m.investorId === req.params.id && m.role === "headAdmin");
      if (!dbUser?.isHeadAdmin && !isOwner) return res.status(403).json({ message: "Forbidden" });
      await storage.deleteInvestor(req.params.id);
      res.json({ message: "Deleted" });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  async function canManageInvestor(req: any, investorId: string): Promise<boolean> {
    const userId = req.user?.claims?.sub || req.user?.id;
    if (!userId) return false;
    const dbUser = await storage.getUser(userId);
    if (dbUser?.isHeadAdmin || dbUser?.role === 'innoLabsAdmin') return true;
    const members = await storage.getInvestorMembers(investorId);
    const me = members.find(m => m.userId === userId);
    return !!me && (me.role === 'headAdmin' || me.role === 'managingPartner');
  }

  app.post('/api/investors/:id/members', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      if (!(await canManageInvestor(req, req.params.id))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const data = insertInvestorMemberSchema.parse({ ...req.body, investorId: req.params.id });
      const created = await storage.addInvestorMember(data);
      res.status(201).json(created);
    } catch (e: any) {
      if (e.name === 'ZodError') return res.status(400).json({ message: e.errors[0].message });
      res.status(400).json({ message: e.message });
    }
  });

  app.delete('/api/investors/:id/members/:memberId', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      if (!(await canManageInvestor(req, req.params.id))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const members = await storage.getInvestorMembers(req.params.id);
      if (!members.some(m => m.id === req.params.memberId)) {
        return res.status(404).json({ message: "Member not found in this investor" });
      }
      await storage.removeInvestorMember(req.params.memberId);
      res.json({ message: "Removed" });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ========== INVESTOR INVITATIONS (email-based) ==========
  app.get('/api/investors/:id/invitations', isAuthenticated, async (req: any, res) => {
    try {
      if (!(await canManageInvestor(req, req.params.id))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const list = await storage.getInvestorInvitations(req.params.id);
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/investors/:id/invitations', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      if (!(await canManageInvestor(req, req.params.id))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const data = createInvestorInvitationSchema.parse(req.body);
      const email = data.email.trim().toLowerCase();
      if (await storage.hasPendingInvestorInvitation(req.params.id, email)) {
        return res.status(409).json({ message: "An invitation for this email is already pending" });
      }
      const userId = req.user?.claims?.sub || req.user?.id;
      const investor = await storage.getInvestor(req.params.id);
      if (!investor) return res.status(404).json({ message: "Investor not found" });
      const token = nanoid(48);
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const invitation = await storage.createInvestorInvitation({
        investorId: req.params.id,
        email,
        role: data.role,
        token,
        invitedBy: userId,
        expiresAt,
      });
      const host = req.get("host");
      const proto = req.protocol;
      const acceptUrl = `${proto}://${host}/invitations/investor/${token}`;
      try {
        const inviter = await storage.getUser(userId);
        const inviterName = [inviter?.firstName, inviter?.lastName].filter(Boolean).join(" ") || inviter?.email || "Ventorix";
        await sendEmail({
          to: [email],
          subject: `${inviterName} invited you to join ${investor.name} on Ventorix`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0a0a0a">
              <h2 style="margin:0 0 12px">You've been invited to ${investor.name}</h2>
              <p style="color:#555;margin:0 0 16px">${inviterName} invited you to join <b>${investor.name}</b> as <b>${data.role}</b>.</p>
              <p style="margin:0 0 24px"><a href="${acceptUrl}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Accept invitation</a></p>
              <p style="color:#888;font-size:13px;margin:0">This invitation expires on ${expiresAt.toUTCString()}. If you don't have an account yet, you'll be asked to sign in first.</p>
            </div>
          `,
          fromOverride: TRANSACTIONAL_FROM,
        });
      } catch (emailErr) {
        console.error("[Investor invite] email send failed", emailErr);
      }
      res.status(201).json({ ...invitation, acceptUrl });
    } catch (e: any) {
      if (e.name === 'ZodError') return res.status(400).json({ message: e.errors[0].message });
      res.status(400).json({ message: e.message });
    }
  });

  app.delete('/api/investors/:id/invitations/:invId', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      if (!(await canManageInvestor(req, req.params.id))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const list = await storage.getInvestorInvitations(req.params.id);
      const target = list.find(i => i.id === req.params.invId);
      if (!target) {
        return res.status(404).json({ message: "Invitation not found in this investor" });
      }
      await storage.updateInvestorInvitation(req.params.invId, { status: "cancelled" });
      res.json({ message: "Cancelled" });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get('/api/invitations/investor/:token', async (req, res) => {
    try {
      const inv = await storage.getInvestorInvitationByToken(req.params.token);
      if (!inv) return res.status(404).json({ message: "Invitation not found" });
      res.json({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        expiresAt: inv.expiresAt,
        investor: { id: inv.investor.id, name: inv.investor.name, kind: inv.investor.kind, logo: inv.investor.logo },
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/invitations/investor/:token/accept', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const inv = await storage.getInvestorInvitationByToken(req.params.token);
      if (!inv) return res.status(404).json({ message: "Invitation not found" });
      if (inv.status !== "pending") {
        return res.status(409).json({ message: `Invitation is ${inv.status}` });
      }
      if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
        await storage.updateInvestorInvitation(inv.id, { status: "expired" });
        return res.status(409).json({ message: "Invitation has expired" });
      }
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      if (dbUser?.email && dbUser.email.toLowerCase() !== inv.email.toLowerCase()) {
        return res.status(403).json({ message: `This invitation was sent to ${inv.email}. Please sign in with that email.` });
      }
      const existingMembers = await storage.getInvestorMembers(inv.investorId);
      if (!existingMembers.some(m => m.userId === userId)) {
        await storage.addInvestorMember({ investorId: inv.investorId, userId, role: inv.role });
      }
      await storage.updateInvestorInvitation(inv.id, {
        status: "accepted",
        acceptedUserId: userId,
        acceptedAt: new Date(),
      });
      res.json({ ok: true, investorId: inv.investorId });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ========== PORTFOLIO DASHBOARD ==========
  app.get('/api/companies/:id/portfolio-dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      const isAdmin = dbUser?.isHeadAdmin || dbUser?.role === 'innoLabsAdmin';
      if (!isAdmin) {
        const companyUsers = await storage.getCompanyUsers(req.params.id);
        if (!companyUsers.some(cu => cu.userId === userId)) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      const data = await storage.getCompanyPortfolioDashboard(req.params.id);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ========== METRICS PATCH/DELETE ==========
  async function authorizeStartupMetric(req: any, res: any): Promise<boolean> {
    const userId = req.user?.claims?.sub || req.user?.id;
    const dbUser = await storage.getUser(userId);
    const userStartups = await storage.getUserStartups(userId);
    const isFounder = userStartups.some(us => us.startupId === req.params.id && (us.role === 'founder' || us.role === 'cofounder'));
    if (!isFounder && !dbUser?.isHeadAdmin && dbUser?.role !== 'innoLabsAdmin') {
      res.status(403).json({ message: "Only founders can modify metrics" });
      return false;
    }
    const metrics = await storage.getStartupMetrics(req.params.id);
    if (!metrics.some(m => m.id === req.params.metricId)) {
      res.status(404).json({ message: "Metric not found for this startup" });
      return false;
    }
    return true;
  }

  app.patch('/api/startups/:id/metrics/:metricId', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      if (!(await authorizeStartupMetric(req, res))) return;
      const updated = await storage.updateStartupMetric(req.params.metricId, req.body);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete('/api/startups/:id/metrics/:metricId', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      if (!(await authorizeStartupMetric(req, res))) return;
      await storage.deleteStartupMetric(req.params.metricId);
      res.json({ message: "Deleted" });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ============================================
  // Signals foundation (Task #19)
  // ============================================
  const { bootstrapSignals, runJobByName } = await import("./signals");

  app.get('/api/admin/signals/sources', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const sources = await storage.getAllSignalSources();
      res.json(sources);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/admin/signals/sources/:sourceKey/pause', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const isPaused = req.body?.isPaused === true;
      const updated = await storage.setSignalSourcePaused(req.params.sourceKey, isPaused);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post('/api/admin/signals/sources/:sourceKey/run', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { getIngestor } = await import("./signals");
      const ingestor = getIngestor(req.params.sourceKey);
      if (!ingestor) return res.status(404).json({ message: "Source not registered in code" });
      const result = await ingestor.run();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/admin/signals/sources/:sourceKey/run-for-startup/:startupId', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { getIngestor } = await import("./signals");
      const ingestor = getIngestor(req.params.sourceKey);
      if (!ingestor) return res.status(404).json({ message: "Source not registered in code" });
      const startup = await storage.getStartup(req.params.startupId);
      if (!startup) return res.status(404).json({ message: "Startup not found" });
      const result = await ingestor.run({ startup });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/admin/signals/sources/:sourceKey/runs', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const runs = await storage.getRecentIngestionRuns(req.params.sourceKey, 20);
      res.json(runs);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/admin/signals/cron-jobs', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const jobs = await storage.getAllCronJobs();
      res.json(jobs);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/admin/signals/cron-jobs/:jobName/pause', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const isPaused = req.body?.isPaused === true;
      const updated = await storage.setCronJobPaused(req.params.jobName, isPaused);
      const { startScheduler } = await import("./signals/scheduler");
      await startScheduler();
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get('/api/startups/:id/signal-events', isAuthenticated, async (req, res) => {
    try {
      const events = await storage.getSignalEventsForStartup(req.params.id, 100);
      res.json(events);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== Unified timeline & auto milestones (Task #26 — Group 7) =====
  const parseList = (v: unknown): string[] | undefined => {
    if (typeof v !== "string" || !v.trim()) return undefined;
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  };
  const parseDate = (v: unknown): Date | undefined => {
    if (typeof v !== "string" || !v) return undefined;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };

  app.get('/api/startups/:id/timeline', isAuthenticated, async (req, res) => {
    try {
      let cursor: { occurredAt: Date; id: string } | null = null;
      if (typeof req.query.cursor === "string" && req.query.cursor) {
        try {
          const decoded = JSON.parse(Buffer.from(req.query.cursor, "base64").toString("utf8"));
          if (decoded?.occurredAt && decoded?.id) {
            cursor = { occurredAt: new Date(decoded.occurredAt), id: String(decoded.id) };
          }
        } catch { /* ignore bad cursors */ }
      }
      const result = await storage.getStartupTimeline(req.params.id, {
        cursor,
        limit: req.query.limit ? Math.max(1, Math.min(100, parseInt(String(req.query.limit), 10) || 25)) : 25,
        categories: parseList(req.query.category),
        sources: parseList(req.query.source),
        severities: parseList(req.query.severity),
        after: parseDate(req.query.after),
        before: parseDate(req.query.before),
      });
      const nextCursor = result.nextCursor
        ? Buffer.from(JSON.stringify(result.nextCursor)).toString("base64")
        : null;
      res.json({ events: result.events, nextCursor });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/startups/:id/milestones', isAuthenticated, async (req, res) => {
    try {
      const since = parseDate(req.query.since);
      const ms = await storage.getMilestonesForStartup(req.params.id, since ? { since } : undefined);
      res.json(ms);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/startups/:id/diff', isAuthenticated, async (req, res) => {
    try {
      const days = Math.max(1, Math.min(180, parseInt(String(req.query.days ?? "30"), 10) || 30));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const [events, newMilestones] = await Promise.all([
        storage.getStartupSignalEventsInWindow(req.params.id, since),
        storage.getMilestonesForStartup(req.params.id, { since }),
      ]);
      const sevWeight: Record<string, number> = { critical: 4, warning: 3, positive: 2, info: 1 };
      const topEvents = [...events]
        .sort((a, b) => {
          const w = (sevWeight[b.severity] ?? 0) - (sevWeight[a.severity] ?? 0);
          if (w !== 0) return w;
          return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
        })
        .slice(0, 10);
      const counts: Record<string, number> = {};
      for (const ev of events) counts[ev.severity] = (counts[ev.severity] ?? 0) + 1;

      // AI executive summary — opt-in via ?summary=1 (default on) so that the
      // modal can also fetch the raw payload cheaply when summary isn't needed.
      // Only call OpenAI when there is signal worth summarising.
      let execSummary: string | null = null;
      const wantSummary = String(req.query.summary ?? "1") !== "0";
      const hasSignal = events.length > 0 || newMilestones.length > 0;
      if (wantSummary && hasSignal && process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
        try {
          const startup = await storage.getStartup(req.params.id);
          const { summarizeDiff } = await import("./ai-venture");
          execSummary = await summarizeDiff({
            startupName: startup?.name ?? "Startup",
            days,
            countsBySeverity: counts,
            topEvents: topEvents.map((e) => ({
              severity: e.severity,
              eventType: e.eventType,
              title: e.title,
              summary: e.summary,
              occurredAt: e.occurredAt ? new Date(e.occurredAt).toISOString() : null,
            })),
            newMilestones: newMilestones.map((m) => ({
              kind: m.kind,
              title: m.title,
              occurredAt: m.occurredAt ? new Date(m.occurredAt).toISOString() : null,
            })),
            language: String(req.query.lang || "en") === "ru" ? "ru" : "en",
          });
        } catch (err) {
          console.warn("[diff:summary]", err);
        }
      }

      res.json({
        since: since.toISOString(),
        days,
        newMilestones,
        topEvents,
        eventsTotal: events.length,
        countsBySeverity: counts,
        execSummary,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/admin/milestones/extract', isAuthenticated, isHeadAdmin, async (req, res) => {
    try {
      const { extractMilestonesForStartup, extractMilestonesForAllStartups } = await import("./signals/milestone-extractor");
      const startupId = typeof req.body?.startupId === "string" ? req.body.startupId : null;
      if (startupId) {
        const created = await extractMilestonesForStartup(startupId);
        res.json({ ok: true, startupId, milestones: created });
      } else {
        const result = await extractMilestonesForAllStartups();
        res.json({ ok: true, ...result });
      }
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Group 7.2 — Milestone review queue. LLM-extracted milestones whose
  // confidence falls below MILESTONE_AUTO_APPROVE_CONFIDENCE land in
  // pending_review and only appear on the public timeline once an admin
  // approves them here.
  app.get('/api/admin/milestones/review', isAuthenticated, isHeadAdmin, async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : "pending_review";
      const limit = req.query.limit ? Math.max(1, Math.min(500, Number(req.query.limit))) : 100;
      const rows = await storage.listMilestonesForReview({ status, limit });
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/admin/milestones/:id/review', isAuthenticated, isHeadAdmin, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id || null;
      const status = req.body?.status;
      if (!["approved", "rejected", "pending_review"].includes(status)) {
        return res.status(400).json({ message: "status must be approved|rejected|pending_review" });
      }
      const updated = await storage.setMilestoneReviewStatus(req.params.id, status, userId);
      if (!updated) return res.status(404).json({ message: "Milestone not found" });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete('/api/admin/milestones/:id', isAuthenticated, isHeadAdmin, async (req, res) => {
    try {
      await storage.deleteMilestone(req.params.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== Group 4: Financial verification & Verified MRR =====
  const uploadStatement = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok = file.mimetype === "application/pdf" || file.mimetype.startsWith("image/");
      cb(ok ? (null as any) : new Error("Only PDF or image files are allowed"), ok);
    },
  });

  async function canEditStartupFinancials(req: any, startupId: string): Promise<boolean> {
    const userId = req.user?.claims?.sub || req.user?.id;
    if (!userId) return false;
    const user = await storage.getUser(userId);
    if (!user) return false;
    if (user.role === 'headAdmin' || user.role === 'innoLabsAdmin') return true;
    const startup = await storage.getStartup(startupId);
    if (startup?.createdBy && startup.createdBy === userId) return true;
    const members = await storage.getStartupMembers?.(startupId);
    return Array.isArray(members) && members.some((m: any) => m.userId === userId);
  }

  app.get('/api/startups/:id/financials', isAuthenticated, async (req, res) => {
    try {
      const { getFinancialHistory } = await import("./signals/sources/group4");
      const history = await getFinancialHistory(req.params.id);
      res.json(history);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/startups/:id/financials/analytics', isAuthenticated, async (req, res) => {
    try {
      const { getFinancialAnalytics } = await import("./signals/sources/group4");
      res.json(await getFinancialAnalytics(req.params.id));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/startups/:id/verified-mrr', isAuthenticated, async (req, res) => {
    try {
      const { getVerifiedMrrForStartup } = await import("./signals/sources/group4");
      const v = await getVerifiedMrrForStartup(req.params.id);
      res.json(v);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/startups/verified-mrr/batch', isAuthenticated, async (req, res) => {
    try {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((x: any) => typeof x === 'string').slice(0, 200) : [];
      const { getVerifiedMrrMap } = await import("./signals/sources/group4");
      const map = await getVerifiedMrrMap(ids);
      res.json(map);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/startups/:id/financial-integrations', isAuthenticated, async (req, res) => {
    try {
      const { GROUP4_FINANCIAL_KINDS } = await import("./signals/sources/group4");
      const { listOAuthSupport } = await import("./signals/sources/group4/oauth");
      const { decryptConfig } = await import("./signals/crypto");
      const creds = await storage.getIntegrationCredentialsForStartup(req.params.id);
      const byKind = new Map(creds.map((c) => [c.kind, c]));
      const oauth = listOAuthSupport();
      res.json(GROUP4_FINANCIAL_KINDS.map((kind) => {
        const c = byKind.get(kind);
        let provider: string | null = null;
        let viaOAuth = false;
        if (c?.encryptedConfig) {
          const cfg: any = decryptConfig(c.encryptedConfig) ?? {};
          provider = typeof cfg.provider === "string" ? cfg.provider : null;
          viaOAuth = !!(cfg.refreshToken || cfg.stripeUserId || cfg.obtainedAt);
        }
        const oauthEntries = oauth
          .filter((o) => o.kind === kind)
          .map((o) => ({
            key: o.provider ? `${o.kind}:${o.provider}` : o.kind,
            provider: o.provider ?? null,
            configured: o.configured,
          }));
        return {
          kind,
          status: c?.status ?? 'inactive',
          hasCredentials: !!c && c.status === 'active',
          updatedAt: c?.updatedAt ?? null,
          provider,
          viaOAuth,
          oauth: oauthEntries,
        };
      }));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/startups/:id/financial-integrations', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      if (!(await canEditStartupFinancials(req, req.params.id))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { GROUP4_FINANCIAL_KINDS } = await import("./signals/sources/group4");
      const { validateFinancialCredential } = await import("./signals/sources/group4/validators");
      const { encryptConfig, isEncryptionConfigured } = await import("./signals/crypto");
      if (!isEncryptionConfigured()) {
        return res.status(503).json({
          message:
            "Server has no encryption key configured (set INTEGRATION_ENCRYPTION_KEY or SESSION_SECRET); refusing to store credentials in plaintext.",
        });
      }
      const kind = String(req.body?.kind || "");
      const config = req.body?.config;
      const skipTest = req.body?.skipTest === true;
      if (!(GROUP4_FINANCIAL_KINDS as readonly string[]).includes(kind)) {
        return res.status(400).json({ message: "Unknown financial integration kind" });
      }
      if (kind === "bank-ocr") {
        return res.status(400).json({ message: "bank-ocr is provisioned automatically on statement upload" });
      }
      if (!config || typeof config !== "object") {
        return res.status(400).json({ message: "config required" });
      }
      const validation = await validateFinancialCredential(kind, config);
      if (!validation.ok) {
        if (!skipTest) {
          return res.status(400).json({ message: validation.message, code: "VALIDATION_FAILED" });
        }
      }
      const toStore = validation.ok ? validation.normalized : (config as Record<string, any>);
      const cred = await storage.upsertIntegrationCredential({
        startupId: req.params.id,
        kind,
        status: "active",
        encryptedConfig: encryptConfig(toStore) as any,
      });
      res.json({ ok: true, id: cred.id, validated: validation.ok });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete('/api/startups/:id/financial-integrations/:kind', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      if (!(await canEditStartupFinancials(req, req.params.id))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteIntegrationCredential(req.params.id, req.params.kind);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post(
    '/api/startups/:id/financials/upload-statement',
    isAuthenticated,
    isNotFrozen,
    uploadStatement.single('statement'),
    async (req: any, res) => {
      try {
        if (!(await canEditStartupFinancials(req, req.params.id))) {
          return res.status(403).json({ message: "Forbidden" });
        }
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });
        const { parseStatementSmart } = await import("./signals/sources/group4/bank-ocr");
        const { upsertFinancialSnapshot } = await import("./signals/sources/group4/shared");
        const parsed = await parseStatementSmart(req.file.buffer, req.file.mimetype);
        await upsertFinancialSnapshot("fin-bank-ocr", {
          startupId: req.params.id,
          mrrMinor: parsed.mrrMinor,
          revenueMinor: parsed.revenueMinor,
          currency: parsed.currency,
          activeCustomers: parsed.activeCustomers,
          payload: {
            fileName: req.file.originalname,
            txCount: parsed.txCount,
            bank: parsed.bank,
            accountNumber: parsed.accountNumber,
            periodStart: parsed.periodStart,
            periodEnd: parsed.periodEnd,
            totalsInMinor: parsed.totalsInMinor,
            totalsOutMinor: parsed.totalsOutMinor,
            transactions: parsed.transactions,
          },
        });
        const { encryptConfig: encryptOcrConfig } = await import("./signals/crypto");
        await storage.upsertIntegrationCredential({
          startupId: req.params.id,
          kind: "bank-ocr",
          status: "active",
          encryptedConfig: encryptOcrConfig({ lastUploadAt: new Date().toISOString(), fileName: req.file.originalname }) as any,
        });
        // Look up the just-written snapshot id so the client can request CSV export.
        let uploadId: string | null = null;
        try {
          const { db } = await import("./db");
          const { startupFinancials } = await import("@shared/schema");
          const { and, eq, desc } = await import("drizzle-orm");
          const [row] = await db.select().from(startupFinancials)
            .where(and(
              eq(startupFinancials.startupId, req.params.id),
              eq(startupFinancials.sourceKey, "fin-bank-ocr"),
            ))
            .orderBy(desc(startupFinancials.snapshotDate))
            .limit(1);
          uploadId = row?.id ?? null;
        } catch {
          // ignore — uploadId is best-effort
        }
        res.json({
          ok: true,
          uploadId,
          bank: parsed.bank,
          mrrMinor: parsed.mrrMinor,
          revenueMinor: parsed.revenueMinor,
          currency: parsed.currency,
          txCount: parsed.txCount,
        });
      } catch (e: any) {
        res.status(500).json({ message: e.message });
      }
    },
  );

  // Public-to-authenticated read of source list/status (no error details, no credentials)
  app.get('/api/signals/sources', isAuthenticated, async (_req, res) => {
    try {
      const sources = await storage.getAllSignalSources();
      res.json(sources.map((s) => ({
        id: s.id,
        sourceKey: s.sourceKey,
        displayName: s.displayName,
        category: s.category,
        description: s.description,
        status: s.status,
        isPaused: s.isPaused,
        lastRunAt: s.lastRunAt,
      })));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ================== Group 8 — Alerts & Notifications ====================

  // Alert rules listing.
  // - default (no query): returns the caller's user-owned rules
  // - ?companyId=...: returns that company's rules; requires companyAdmin tier
  // - head admin: may pass ?all=1 to see everything
  app.get('/api/alert-rules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const isHead = req.user?.role === "headAdmin" || (req.user as any)?.isHeadAdmin;
      const { companyId, all } = req.query as { companyId?: string; all?: string };
      if (companyId) {
        if (!isHead && !(await isCompanyAdminForRule(userId, companyId))) {
          return res.status(403).json({ message: "Forbidden" });
        }
        return res.json(await storage.listAlertRules({ ownerType: "company", ownerId: companyId }));
      }
      if (all && isHead) {
        return res.json(await storage.listAlertRules({}));
      }
      res.json(await storage.listAlertRules({ ownerType: "user", ownerId: userId }));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Helper: returns true if user is companyAdmin tier or above for a given company.
  async function isCompanyAdminForRule(userId: string, companyId: string): Promise<boolean> {
    try {
      const cus = await storage.getCompanyUsers(companyId);
      const me = cus.find((cu: any) => cu.userId === userId);
      if (!me) return false;
      const adminRoles = ["companyAdmin", "headAdminProgram", "innovationLead", "headAdmin"];
      return adminRoles.includes((me as any).role);
    } catch {
      return false;
    }
  }

  // Group 8.3 — Natural-language → alert rule DSL helper. Returns the
  // suggested condition DSL plus a one-sentence explanation; the client
  // shows them in a preview pane and the user can accept/edit before
  // POSTing to /api/alert-rules.
  app.post('/api/alert-rules/from-nl', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
      const language = req.body?.language === "ru" ? "ru" : "en";
      if (prompt.length < 4) return res.status(400).json({ message: "prompt is required" });
      const { nlAlertRuleToDsl } = await import("./ai-venture");
      const result = await nlAlertRuleToDsl(prompt, language);
      if (!result) {
        return res.status(503).json({
          message: "Natural-language rule translation is not available. Configure AI_INTEGRATIONS_OPENAI_API_KEY or rephrase the prompt.",
        });
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/alert-rules', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const isHead = req.user?.role === "headAdmin" || (req.user as any)?.isHeadAdmin;
      const { ownerType = "user", ownerId: requestedOwnerId, name, description, isActive = true, conditionDsl, deliveryChannels = ["inApp"] } = req.body ?? {};
      if (!name || !conditionDsl) return res.status(400).json({ message: "name and conditionDsl required" });
      if (!["user", "company"].includes(ownerType)) return res.status(400).json({ message: "invalid ownerType" });

      // Authorization: user-owned rules must be self-owned (ignore client owner_id);
      // company-owned rules require companyAdmin tier on that company (or head admin).
      let resolvedOwnerId = userId;
      if (ownerType === "company") {
        if (!requestedOwnerId) return res.status(400).json({ message: "ownerId required for company rules" });
        if (!isHead && !(await isCompanyAdminForRule(userId, requestedOwnerId))) {
          return res.status(403).json({ message: "Forbidden: not a company admin" });
        }
        resolvedOwnerId = requestedOwnerId;
      }

      const rule = await storage.createAlertRule({
        ownerType,
        ownerId: resolvedOwnerId,
        name,
        description,
        isActive,
        conditionDsl,
        deliveryChannels,
        createdBy: userId,
      } as any);
      res.json(rule);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  async function canMutateRule(userId: string, isHead: boolean, rule: any): Promise<boolean> {
    if (isHead) return true;
    if (rule.ownerType === "user") return rule.ownerId === userId;
    if (rule.ownerType === "company") return await isCompanyAdminForRule(userId, rule.ownerId);
    return false;
  }

  app.patch('/api/alert-rules/:id', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const isHead = req.user?.role === "headAdmin" || (req.user as any)?.isHeadAdmin;
      const existing = await storage.getAlertRule(req.params.id);
      if (!existing) return res.status(404).json({ message: "Not found" });
      if (!(await canMutateRule(userId, isHead, existing))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      // Never allow re-assigning ownership via PATCH.
      const { ownerType: _ot, ownerId: _oi, createdBy: _cb, ...safeBody } = req.body ?? {};
      const updated = await storage.updateAlertRule(req.params.id, safeBody);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Group 8.3 — Natural-language → full draft alert rule (returns name +
  // description + conditionDsl + default channels). Lighter than /from-nl
  // because it returns a ready-to-save draft instead of just a DSL.
  app.post('/api/alert-rules/from-natural-language', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const { z } = await import("zod");
      const schema = z.object({ text: z.string().trim().min(4).max(2000) });
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid body" });
      }
      const language = (req.user as any)?.language === "ru" ? "ru" : "en";
      const { nlAlertRuleToDsl } = await import("./ai-venture");
      const result = await nlAlertRuleToDsl(parsed.data.text, language);
      if (!result) {
        return res.status(503).json({
          message: "Natural-language rule translation is not available. Configure AI_INTEGRATIONS_OPENAI_API_KEY or rephrase the prompt.",
        });
      }
      res.json({
        name: parsed.data.text.slice(0, 80),
        description: result.explanation,
        conditionDsl: result.dsl,
        deliveryChannels: ["inApp"],
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Group 8.3 — Starter template library. Hardcoded; safe to expose to any
  // authenticated user.
  app.get('/api/alert-rules/templates', isAuthenticated, async (_req: any, res) => {
    const templates = [
      {
        id: "funding_round_in_vertical",
        name: "Funding round in your vertical",
        description: "Fires when any startup in a chosen vertical raises a round.",
        conditionDsl: { all: [
          { field: "event.type", op: "eq", value: "round_raised" },
          { field: "startup.vertical", op: "eq", value: "fintech" },
        ] },
      },
      {
        id: "mrr_drop",
        name: "MRR drop",
        description: "Fires on negative MRR change events.",
        conditionDsl: { all: [
          { field: "event.type", op: "eq", value: "mrr_change" },
          { field: "event.payload.deltaPct", op: "lt", value: -10 },
        ] },
      },
      {
        id: "churn_spike",
        name: "Churn spike",
        description: "Fires when monthly churn jumps above 8%.",
        conditionDsl: { all: [
          { field: "event.type", op: "eq", value: "churn_change" },
          { field: "event.payload.churnPct", op: "gt", value: 8 },
        ] },
      },
      {
        id: "github_silence",
        name: "GitHub silence",
        description: "Fires when GitHub activity has stalled for 30+ days.",
        conditionDsl: { all: [
          { field: "event.type", op: "eq", value: "github_silence" },
          { field: "event.payload.silentDays", op: "gte", value: 30 },
        ] },
      },
      {
        id: "founder_pulse_silent",
        name: "Founder pulse silent",
        description: "Fires when the founder pulse indicator turns silent.",
        conditionDsl: { all: [
          { field: "event.type", op: "eq", value: "founder_pulse_silent" },
        ] },
      },
      {
        id: "negative_news",
        name: "Negative news mention",
        description: "Fires on critical-severity media mentions.",
        conditionDsl: { all: [
          { field: "event.type", op: "eq", value: "media_mention" },
          { field: "event.severity", op: "eq", value: "critical" },
        ] },
      },
      {
        id: "egrul_founder_change",
        name: "ЕГРЮЛ founder change",
        description: "Fires when ЕГРЮЛ shows a change in учредители.",
        conditionDsl: { all: [
          { field: "event.type", op: "eq", value: "egrul_founder_change" },
        ] },
      },
      {
        id: "court_case_opened",
        name: "Court case opened",
        description: "Fires on a new arbitration case filing.",
        conditionDsl: { all: [
          { field: "event.type", op: "eq", value: "lawsuit_filed" },
        ] },
      },
      {
        id: "vacancy_spree",
        name: "Vacancy spree",
        description: "Fires when 5+ new HH.ru vacancies open in a week.",
        conditionDsl: { all: [
          { field: "event.type", op: "eq", value: "hh_vacancies_burst" },
          { field: "event.payload.openedThisWeek", op: "gte", value: 5 },
        ] },
      },
      {
        id: "slack_workspace_death",
        name: "Slack workspace death",
        description: "Fires when the Slack workspace shows no activity for 14+ days.",
        conditionDsl: { all: [
          { field: "event.type", op: "eq", value: "slack_workspace_silent" },
          { field: "event.payload.silentDays", op: "gte", value: 14 },
        ] },
      },
    ];
    res.json(templates);
  });

  // Group 8.3 — per-rule snooze (in-memory). Owner/admin only.
  app.post('/api/alert-rules/:id/mute', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const isHead = req.user?.role === "headAdmin" || (req.user as any)?.isHeadAdmin;
      const existing = await storage.getAlertRule(req.params.id);
      if (!existing) return res.status(404).json({ message: "Not found" });
      if (!(await canMutateRule(userId, isHead, existing))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { z } = await import("zod");
      const schema = z.object({ until: z.string().datetime() });
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: "until must be ISO8601 datetime" });
      const until = new Date(parsed.data.until);
      if (until.getTime() <= Date.now()) {
        return res.status(400).json({ message: "until must be in the future" });
      }
      const { muteRule } = await import("./signals/alerts/snoozes");
      muteRule(existing.id, until);
      res.json({ ok: true, ruleId: existing.id, mutedUntil: until.toISOString() });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete('/api/alert-rules/:id/mute', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const isHead = req.user?.role === "headAdmin" || (req.user as any)?.isHeadAdmin;
      const existing = await storage.getAlertRule(req.params.id);
      if (!existing) return res.status(404).json({ message: "Not found" });
      if (!(await canMutateRule(userId, isHead, existing))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { unmuteRule } = await import("./signals/alerts/snoozes");
      unmuteRule(existing.id);
      res.json({ ok: true, ruleId: existing.id });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete('/api/alert-rules/:id', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const isHead = req.user?.role === "headAdmin" || (req.user as any)?.isHeadAdmin;
      const existing = await storage.getAlertRule(req.params.id);
      if (!existing) return res.status(404).json({ message: "Not found" });
      if (!(await canMutateRule(userId, isHead, existing))) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteAlertRule(req.params.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Watchlists
  app.get('/api/watchlists', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const wls = await storage.listUserWatchlists(userId);
      res.json(wls);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/watchlists', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const { name, description, cadence } = req.body ?? {};
      if (!name) return res.status(400).json({ message: "name required" });
      const allowedCadences = new Set(["daily", "weekly", "on_event"]);
      const safeCadence = typeof cadence === "string" && allowedCadences.has(cadence) ? cadence : "weekly";
      const created = await storage.createWatchlist({ userId, name, description, cadence: safeCadence } as any);
      res.json(created);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch('/api/watchlists/:id', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const wl = await storage.getWatchlist(req.params.id);
      if (!wl) return res.status(404).json({ message: "Not found" });
      if (wl.userId !== userId) return res.status(403).json({ message: "Forbidden" });
      const allowedCadences = new Set(["daily", "weekly", "on_event"]);
      const updates: Record<string, unknown> = {};
      if (typeof req.body?.name === "string" && req.body.name.trim()) updates.name = req.body.name.trim();
      if (typeof req.body?.description === "string") updates.description = req.body.description;
      if (typeof req.body?.cadence === "string") {
        if (!allowedCadences.has(req.body.cadence)) {
          return res.status(400).json({ message: "Invalid cadence" });
        }
        updates.cadence = req.body.cadence;
      }
      if (Object.keys(updates).length === 0) return res.json(wl);
      const updated = await storage.updateWatchlist(req.params.id, updates as any);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete('/api/watchlists/:id', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const wl = await storage.getWatchlist(req.params.id);
      if (!wl) return res.status(404).json({ message: "Not found" });
      if (wl.userId !== userId) return res.status(403).json({ message: "Forbidden" });
      await storage.deleteWatchlist(req.params.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get('/api/watchlists/:id/startups', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const wl = await storage.getWatchlist(req.params.id);
      if (!wl) return res.status(404).json({ message: "Not found" });
      if (wl.userId !== userId && req.user?.role !== "headAdmin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const items = await storage.getWatchlistStartups(req.params.id);
      res.json(items);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post('/api/watchlists/:id/startups', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const wl = await storage.getWatchlist(req.params.id);
      if (!wl) return res.status(404).json({ message: "Not found" });
      if (wl.userId !== userId) return res.status(403).json({ message: "Forbidden" });
      const { startupId } = req.body ?? {};
      if (!startupId) return res.status(400).json({ message: "startupId required" });
      const link = await storage.addWatchlistStartup({ watchlistId: req.params.id, startupId });
      res.json(link);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete('/api/watchlists/:id/startups/:startupId', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const wl = await storage.getWatchlist(req.params.id);
      if (!wl) return res.status(404).json({ message: "Not found" });
      if (wl.userId !== userId) return res.status(403).json({ message: "Forbidden" });
      await storage.removeWatchlistStartup(req.params.id, req.params.startupId);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Manual review flags — surfaced on /my-reviews
  app.get('/api/manual-review-flags', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const status = (req.query.status as string) || "open";
      const mine = await storage.listManualReviewFlags({ reviewerId: userId, status });
      // Also surface entity-level flags assigned to this reviewer via reviewer_assignments
      const assignments = await storage.getMyReviewAssignments(userId);
      const extra: any[] = [];
      for (const a of assignments) {
        const rows = await storage.listManualReviewFlags({ entityType: a.entityType, entityId: a.entityId, status });
        for (const r of rows) {
          if (r.reviewerId !== userId) extra.push(r);
        }
      }
      const seen = new Set<string>();
      const merged = [...mine, ...extra].filter((f) => {
        if (seen.has(f.id)) return false;
        seen.add(f.id);
        return true;
      });
      res.json(merged);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch('/api/manual-review-flags/:id', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const dbUser = await storage.getUser(userId);
      const isHead = dbUser?.isHeadAdmin || dbUser?.role === "innoLabsAdmin";
      const { status } = req.body ?? {};
      if (!status) return res.status(400).json({ message: "status required" });
      const existing = await storage.getManualReviewFlag(req.params.id);
      if (!existing) return res.status(404).json({ message: "Not found" });

      let allowed = isHead || existing.reviewerId === userId;
      if (!allowed) {
        // Allow if caller is an assigned reviewer for the entity.
        const assignments = await storage.getMyReviewAssignments(userId);
        allowed = assignments.some(
          (a: any) => a.entityType === existing.entityType && a.entityId === existing.entityId,
        );
      }
      if (!allowed) return res.status(403).json({ message: "Forbidden" });

      const updated = await storage.updateManualReviewFlagStatus(req.params.id, status);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Group 8.2 — Founder/owner-submitted counter-evidence on a manual review
  // flag. Persisted into details.counterEvidence; flag is moved to
  // "acknowledged" so reviewers know the founder responded.
  app.post('/api/manual-review-flags/:id/counter-evidence', isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const { z } = await import("zod");
      const schema = z.object({
        note: z.string().trim().min(1).max(4000),
        attachmentUrl: z.string().url().max(2048).optional(),
      });
      const parsed = schema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid body" });
      }
      const flag = await storage.getManualReviewFlag(req.params.id);
      if (!flag) return res.status(404).json({ message: "Not found" });
      if (flag.entityType !== "startup") {
        return res.status(400).json({ message: "Counter-evidence only supported on startup flags" });
      }
      const userStartups = await storage.getUserStartups(userId);
      const isOwner = userStartups.some(
        (us: any) => us.startupId === flag.entityId && (us.role === "founder" || us.role === "cofounder" || us.role === "owner"),
      );
      if (!isOwner) {
        return res.status(403).json({ message: "Only the startup's founder/owner can submit counter-evidence" });
      }

      const submittedAt = new Date().toISOString();
      const prev = (flag.details && typeof flag.details === "object") ? (flag.details as Record<string, any>) : {};
      const merged = {
        ...prev,
        counterEvidence: {
          note: parsed.data.note,
          attachmentUrl: parsed.data.attachmentUrl ?? null,
          submittedAt,
          submittedBy: userId,
        },
      };
      const { db } = await import("./db");
      const { manualReviewFlags } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(manualReviewFlags)
        .set({ details: merged as any, status: "acknowledged" })
        .where(eq(manualReviewFlags.id, flag.id));
      const updated = await storage.getManualReviewFlag(flag.id);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Bulk founder-pulse states for surfacing dots on startup cards / lists.
  app.get('/api/founder-pulse/states', isAuthenticated, async (_req: any, res) => {
    try {
      const rows = await storage.listFounderPulseStates();
      const map: Record<string, { status: string; lastSignalAt: string | null }> = {};
      for (const r of rows) {
        map[r.startupId] = {
          status: r.status,
          lastSignalAt: r.lastSignalAt ? new Date(r.lastSignalAt as any).toISOString() : null,
        };
      }
      res.json(map);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===========================================================================

  // HTTP cron trigger guarded by shared secret. Used by external schedulers
  // (e.g. GitHub Actions) for heavy/scheduled runs that should not happen in-process.
  app.post('/api/cron/:jobName', async (req, res) => {
    const secret = process.env.CRON_SHARED_SECRET;
    if (!secret) return res.status(503).json({ message: "CRON_SHARED_SECRET not configured" });
    if (req.header('x-cron-secret') !== secret) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      await runJobByName(req.params.jobName);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Founder OAuth integrations (Group 3): /api/startups/:id/integrations + inbound mail webhook.
  const { registerGroup3Routes } = await import("./routes-group3");
  registerGroup3Routes(app);

  const { registerNetworkingRoutes } = await import("./networking");
  registerNetworkingRoutes(app);

  const { registerStartupAiRoutes } = await import("./routes-startup-ai");
  registerStartupAiRoutes(app);

  const { registerFinancialOAuthRoutes } = await import("./signals/sources/group4/oauth");
  registerFinancialOAuthRoutes(app, canEditStartupFinancials);

  // Group 4 — subscription webhooks (Stripe / LemonSqueezy / Paddle), cohort
  // retention summary, and statement CSV export.
  const { registerGroup4Routes } = await import("./routes-group4");
  registerGroup4Routes(app, isAuthenticated, canEditStartupFinancials);

  // Group 3 founder OAuth (GitHub OAuth App, Google Calendar, Gmail, Yandex Metrika, HH.ru)
  const { registerGroup3OAuthRoutes } = await import("./signals/oauth-group3");
  registerGroup3OAuthRoutes(app);

  // ============================================
  // Group 6 — Vitality Score (Task #25)
  // ============================================
  const { computeVitality, percentile, normalizeWeights } = await import("./signals/scoring");
  const { getBenchmarkCache, refreshVitalityBenchmarkCache } = await import("./signals/scheduler");
  const {
    DEFAULT_VITALITY_WEIGHTS,
    VITALITY_CATEGORIES,
    insertScoreWeightPresetSchema,
  } = await import("@shared/schema");
  type VitalityCat = typeof VITALITY_CATEGORIES[number];
  type Subscores = Record<VitalityCat, number>;

  function subscoresOf(row: { subscores: unknown } | null | undefined): Subscores {
    const out: Subscores = {
      tech_activity: 0, team_health: 0, market_presence: 0, financial_health: 0, legal_hygiene: 0,
    };
    if (row && row.subscores && typeof row.subscores === "object") {
      const src = row.subscores as Record<string, unknown>;
      for (const cat of VITALITY_CATEGORIES) {
        const v = src[cat];
        if (typeof v === "number" && Number.isFinite(v)) out[cat] = v;
      }
    }
    return out;
  }

  async function resolveWeightsFromPreset(presetId: string | null | undefined) {
    if (!presetId) return { ...DEFAULT_VITALITY_WEIGHTS };
    const p = await storage.getScoreWeightPreset(presetId);
    if (!p) return { ...DEFAULT_VITALITY_WEIGHTS };
    return normalizeWeights(p.weights as Partial<typeof DEFAULT_VITALITY_WEIGHTS>);
  }

  // Authorization helper for preset CRUD. Global presets (companyId === null)
  // are admin/headAdmin only. Company presets require the user to be a member
  // of that company OR a platform admin. Returns null if allowed, else an
  // error string.
  async function authorizePresetMutation(req: any, companyId: string | null | undefined): Promise<string | null> {
    const user = req.user;
    const isPlatformAdmin = user?.role === "headAdmin" || user?.isHeadAdmin === true || user?.role === "innoLabsAdmin";
    if (!companyId) {
      return isPlatformAdmin ? null : "Only platform admins can manage global weight presets";
    }
    if (isPlatformAdmin) return null;
    const userId = user?.claims?.sub || user?.id;
    if (!userId) return "Unauthorized";
    const members = await storage.getCompanyUsers(companyId).catch(() => []);
    const isCompanyAdmin = members.some((m) => m.userId === userId && (m.role === "admin" || m.role === "owner"));
    if (!isCompanyAdmin) return "You do not have access to this company's presets";
    return null;
  }

  // Read-side authorization: a user may use a preset if it is global
  // (companyId === null), or if they are a member (any role) of the company
  // that owns it, or if they are a platform admin.
  async function authorizePresetRead(req: any, presetId: string | null | undefined): Promise<{ allowed: boolean; companyId: string | null }> {
    if (!presetId) return { allowed: true, companyId: null };
    const preset = await storage.getScoreWeightPreset(presetId);
    if (!preset) return { allowed: false, companyId: null };
    if (!preset.companyId) return { allowed: true, companyId: null };
    const user = req.user;
    const isPlatformAdmin = user?.role === "headAdmin" || user?.isHeadAdmin === true || user?.role === "innoLabsAdmin";
    if (isPlatformAdmin) return { allowed: true, companyId: preset.companyId };
    const userId = user?.claims?.sub || user?.id;
    if (!userId) return { allowed: false, companyId: preset.companyId };
    const members = await storage.getCompanyUsers(preset.companyId).catch(() => []);
    const isMember = members.some((m) => m.userId === userId);
    return { allowed: isMember, companyId: preset.companyId };
  }

  async function computeStartupVitality(startupId: string, presetId?: string | null) {
    const [events, sources, current, history, startup] = await Promise.all([
      storage.getSignalEventsForStartup(startupId, 5000),
      storage.getAllSignalSources(),
      storage.getLatestVitalityScore(startupId),
      storage.getVitalityScoreHistory(startupId, 400, 365),
      storage.getStartup(startupId),
    ]);
    const weights = await resolveWeightsFromPreset(presetId ?? null);
    const live = computeVitality(events, sources, weights);
    const liveCurrent = current
      ? { ...current, score: live.composite, subscores: live.subscores }
      : {
          id: "live",
          startupId,
          score: live.composite,
          subscores: live.subscores,
          isLatest: true,
          computedAt: new Date(),
        };
    return { current: liveCurrent, history, weightsUsed: live.weightsUsed, breakdown: live.breakdown, totalEvents: live.totalEvents, vertical: startup?.vertical ?? null };
  }

  // Benchmarks are read from a nightly-refreshed in-memory cache (populated
  // by `recomputeVitality` and on-demand if stale > 26h). This keeps the
  // request path O(1) and matches the "computed nightly" requirement.
  const BENCHMARK_TTL_MS = 26 * 60 * 60 * 1000;
  async function getCachedBenchmarks(vertical: string) {
    const { snapshots, refreshedAt } = getBenchmarkCache();
    if (Date.now() - refreshedAt > BENCHMARK_TTL_MS || snapshots.size === 0) {
      await refreshVitalityBenchmarkCache();
    }
    return getBenchmarkCache().snapshots.get(vertical);
  }

  async function computeBenchmarks(startupId: string, vertical: string | null, liveSubscores: Subscores, liveComposite: number) {
    if (!vertical) return null;
    const snap = await getCachedBenchmarks(vertical);
    const peerComposites = (snap?.composites ?? []).filter((_v, i, arr) => arr.length > 0 && true);
    const subPercentiles: Record<VitalityCat, number | null> = {
      tech_activity: null, team_health: null, market_presence: null, financial_health: null, legal_hygiene: null,
    };
    for (const cat of VITALITY_CATEGORIES) {
      subPercentiles[cat] = percentile(liveSubscores[cat], snap?.subscores[cat] ?? []);
    }
    return {
      vertical,
      peerCount: peerComposites.length,
      percentile: percentile(liveComposite, peerComposites),
      subscorePercentiles: subPercentiles,
      computedAt: new Date(getBenchmarkCache().refreshedAt).toISOString(),
    };
  }

  app.get('/api/startups/:id/vitality', isAuthenticated, async (req: any, res) => {
    try {
      const presetId = (req.query.presetId as string | undefined) ?? null;
      const presetAuth = await authorizePresetRead(req, presetId);
      if (!presetAuth.allowed) return res.status(403).json({ message: "You do not have access to that weight preset" });
      const result = await computeStartupVitality(req.params.id, presetId);
      const benchmarks = await computeBenchmarks(req.params.id, result.vertical, result.current.subscores as Subscores, result.current.score);
      res.json({ ...result, benchmarks });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to compute vitality";
      res.status(500).json({ message: msg });
    }
  });

  app.get('/api/startups/:id/vitality/benchmarks', isAuthenticated, async (req: any, res) => {
    try {
      const presetId = (req.query.presetId as string | undefined) ?? null;
      const presetAuth = await authorizePresetRead(req, presetId);
      if (!presetAuth.allowed) return res.status(403).json({ message: "You do not have access to that weight preset" });
      const result = await computeStartupVitality(req.params.id, presetId);
      const benchmarks = await computeBenchmarks(req.params.id, result.vertical, result.current.subscores as Subscores, result.current.score);
      res.json(benchmarks ?? { vertical: null, peerCount: 0, percentile: null, subscorePercentiles: {} });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      res.status(500).json({ message: msg });
    }
  });

  app.post('/api/startups/:id/vitality/recompute', isAuthenticated, async (req, res) => {
    try {
      const events = await storage.getSignalEventsForStartup(req.params.id, 5000);
      const sources = await storage.getAllSignalSources();
      const result = computeVitality(events, sources, DEFAULT_VITALITY_WEIGHTS);
      const inserted = await storage.insertVitalityScore({
        startupId: req.params.id,
        score: result.composite,
        subscores: result.subscores,
        computedAt: new Date(),
        isLatest: true,
      });
      res.json({ score: inserted, breakdown: result.breakdown });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      res.status(500).json({ message: msg });
    }
  });

  app.get('/api/vitality/benchmarks', isAuthenticated, async (req, res) => {
    try {
      const vertical = req.query.vertical as string | undefined;
      const filter = vertical ? { vertical } : undefined;
      const startups = await storage.getStartups(filter);
      const scores = await storage.getLatestVitalityScoresForStartups(startups.map((s) => s.id));
      const composites = scores.map((s) => s.score).sort((a, b) => a - b);
      const avg = composites.length > 0 ? Math.round(composites.reduce((a, b) => a + b, 0) / composites.length) : null;
      const median = composites.length > 0 ? composites[Math.floor(composites.length / 2)] : null;
      const subscoreAverages: Record<VitalityCat, number | null> = {
        tech_activity: null, team_health: null, market_presence: null, financial_health: null, legal_hygiene: null,
      };
      for (const cat of VITALITY_CATEGORIES) {
        const vals = scores
          .map((s) => subscoresOf(s)[cat])
          .filter((v) => Number.isFinite(v));
        subscoreAverages[cat] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
      }
      res.json({
        vertical: vertical ?? null,
        startupCount: startups.length,
        scoredCount: scores.length,
        averageScore: avg,
        medianScore: median,
        subscoreAverages,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      res.status(500).json({ message: msg });
    }
  });

  app.get('/api/score-weight-presets', isAuthenticated, async (req: any, res) => {
    try {
      const requestedCompanyId = (req.query.companyId as string | undefined) ?? null;
      if (requestedCompanyId) {
        const user = req.user;
        const isPlatformAdmin = user?.role === "headAdmin" || user?.isHeadAdmin === true || user?.role === "innoLabsAdmin";
        const userId = user?.claims?.sub || user?.id;
        if (!isPlatformAdmin) {
          const members = await storage.getCompanyUsers(requestedCompanyId).catch(() => []);
          const isMember = members.some((m) => m.userId === userId);
          if (!isMember) return res.status(403).json({ message: "You do not have access to this company's presets" });
        }
      }
      const presets = await storage.getScoreWeightPresets(requestedCompanyId);
      res.json(presets);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      res.status(500).json({ message: msg });
    }
  });

  app.post('/api/score-weight-presets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const data = insertScoreWeightPresetSchema.parse({ ...req.body, createdBy: userId });
      const denyReason = await authorizePresetMutation(req, data.companyId ?? null);
      if (denyReason) return res.status(403).json({ message: denyReason });
      const created = await storage.createScoreWeightPreset(data);
      res.status(201).json(created);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid data";
      res.status(400).json({ message: msg });
    }
  });

  app.patch('/api/score-weight-presets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const existing = await storage.getScoreWeightPreset(req.params.id);
      if (!existing) return res.status(404).json({ message: "Preset not found" });
      const denyReason = await authorizePresetMutation(req, existing.companyId);
      if (denyReason) return res.status(403).json({ message: denyReason });
      // Prevent escalating a company preset to a global one without admin rights.
      if ("companyId" in req.body && req.body.companyId !== existing.companyId) {
        const denyTarget = await authorizePresetMutation(req, req.body.companyId ?? null);
        if (denyTarget) return res.status(403).json({ message: denyTarget });
      }
      const updated = await storage.updateScoreWeightPreset(req.params.id, req.body);
      res.json(updated);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid data";
      res.status(400).json({ message: msg });
    }
  });

  app.delete('/api/score-weight-presets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const existing = await storage.getScoreWeightPreset(req.params.id);
      if (!existing) return res.status(404).json({ message: "Preset not found" });
      const denyReason = await authorizePresetMutation(req, existing.companyId);
      if (denyReason) return res.status(403).json({ message: denyReason });
      if (existing.isDefault) return res.status(400).json({ message: "Cannot delete the default preset" });
      await storage.deleteScoreWeightPreset(req.params.id);
      res.json({ ok: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      res.status(400).json({ message: msg });
    }
  });

  app.get('/api/admin/cohort-analytics', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const [startups, events] = await Promise.all([
        storage.getStartups(),
        storage.getAllSignalEvents(),
      ]);
      const scores = await storage.getLatestVitalityScoresForStartups(startups.map((s) => s.id));
      const scoreMap = new Map(scores.map((s) => [s.startupId, s] as const));
      const eventsByStartup = new Map<string, Date[]>();
      for (const ev of events) {
        if (!ev.startupId || !ev.occurredAt) continue;
        const arr = eventsByStartup.get(ev.startupId) ?? [];
        const d = ev.occurredAt instanceof Date ? ev.occurredAt : new Date(ev.occurredAt as unknown as string);
        arr.push(d);
        eventsByStartup.set(ev.startupId, arr);
      }
      const now = Date.now();
      const DAY = 24 * 60 * 60 * 1000;
      type Bucket = {
        startups: number; scoreSum: number; scoreCount: number;
        active30: number; active90: number; active180: number;
      };
      const cohortBuckets = new Map<string, Bucket>();

      for (const s of startups) {
        const created = s.createdAt ? new Date(s.createdAt) : new Date();
        const cohortKey = `${created.getFullYear()}-Q${Math.floor(created.getMonth() / 3) + 1}`;
        const b: Bucket = cohortBuckets.get(cohortKey) ?? {
          startups: 0, scoreSum: 0, scoreCount: 0,
          active30: 0, active90: 0, active180: 0,
        };
        b.startups += 1;
        const sc = scoreMap.get(s.id);
        if (sc) {
          b.scoreSum += sc.score;
          b.scoreCount += 1;
        }
        const ev = eventsByStartup.get(s.id) ?? [];
        const lastEventMs = ev.reduce((latest, d) => Math.max(latest, d.getTime()), 0);
        const daysSince = lastEventMs > 0 ? (now - lastEventMs) / DAY : Infinity;
        if (daysSince <= 30) b.active30 += 1;
        if (daysSince <= 90) b.active90 += 1;
        if (daysSince <= 180) b.active180 += 1;
        cohortBuckets.set(cohortKey, b);
      }

      const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);
      const cohorts = Array.from(cohortBuckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cohort, b]) => ({
          cohort,
          startups: b.startups,
          averageScore: b.scoreCount > 0 ? Math.round(b.scoreSum / b.scoreCount) : null,
          activeLast30Days: { count: b.active30, percent: pct(b.active30, b.startups) },
          activeLast90Days: { count: b.active90, percent: pct(b.active90, b.startups) },
          activeLast180Days: { count: b.active180, percent: pct(b.active180, b.startups) },
        }));

      // Group 6.6 — Kaplan–Meier survival across the whole portfolio.
      // "Death" event = the startup's last signal is older than `silenceDays`
      // (default 90d). Subjects who are still active are right-censored.
      const { kaplanMeier } = await import("./signals/scoring");
      const SILENCE_MS = 90 * DAY;
      const subjects = startups.map((s) => {
        const created = s.createdAt ? new Date(s.createdAt) : new Date();
        const ev = eventsByStartup.get(s.id) ?? [];
        const lastEventMs = ev.reduce((latest, d) => Math.max(latest, d.getTime()), 0);
        const lastSeenAt = lastEventMs > 0 ? new Date(lastEventMs) : created;
        const eventOccurred = lastEventMs > 0 ? (now - lastEventMs) >= SILENCE_MS : (now - created.getTime()) >= SILENCE_MS;
        return { enteredAt: created, lastSeenAt, eventOccurred };
      });
      const survival = kaplanMeier(subjects, { bucketDays: 30, horizonDays: 360 });

      res.json({
        cohorts,
        totalStartups: startups.length,
        totalScored: scores.length,
        survival: {
          silenceDays: 90,
          bucketDays: 30,
          horizonDays: 360,
          buckets: survival,
        },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      res.status(500).json({ message: msg });
    }
  });

  // Group 6.6 — LP-ready PDF export of cohort analytics. Renders cover,
  // per-cohort 30/90/180-day retention bars, and a Kaplan–Meier survival
  // curve per cohort. Streams as application/pdf.
  app.get('/api/admin/cohort-analytics/lp-export.pdf', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      // @ts-ignore - pdfkit ships without types
      const PDFDocument = (await import("pdfkit")).default;
      const { kaplanMeier } = await import("./signals/scoring");
      const [startups, events] = await Promise.all([
        storage.getStartups(),
        storage.getAllSignalEvents(),
      ]);
      const scores = await storage.getLatestVitalityScoresForStartups(startups.map((s) => s.id));
      const scoreMap = new Map(scores.map((s) => [s.startupId, s] as const));

      const eventsByStartup = new Map<string, Date[]>();
      for (const ev of events) {
        if (!ev.startupId || !ev.occurredAt) continue;
        const arr = eventsByStartup.get(ev.startupId) ?? [];
        const d = ev.occurredAt instanceof Date ? ev.occurredAt : new Date(ev.occurredAt as unknown as string);
        arr.push(d);
        eventsByStartup.set(ev.startupId, arr);
      }
      const now = Date.now();
      const DAY = 24 * 60 * 60 * 1000;
      const SILENCE_MS = 90 * DAY;

      type CohortAgg = {
        cohort: string;
        startups: number;
        avgScore: number | null;
        active30Pct: number;
        active90Pct: number;
        active180Pct: number;
        kmBuckets: ReturnType<typeof kaplanMeier>;
      };

      const groups = new Map<string, typeof startups>();
      for (const s of startups) {
        const created = s.createdAt ? new Date(s.createdAt) : new Date();
        const key = `${created.getFullYear()}-Q${Math.floor(created.getMonth() / 3) + 1}`;
        const arr = groups.get(key) ?? [];
        arr.push(s);
        groups.set(key, arr);
      }

      const cohorts: CohortAgg[] = [];
      for (const [cohort, members] of Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))) {
        let scoreSum = 0;
        let scoreCount = 0;
        let a30 = 0, a90 = 0, a180 = 0;
        const subjects = members.map((s) => {
          const created = s.createdAt ? new Date(s.createdAt) : new Date();
          const ev = eventsByStartup.get(s.id) ?? [];
          const lastEventMs = ev.reduce((latest, d) => Math.max(latest, d.getTime()), 0);
          const daysSince = lastEventMs > 0 ? (now - lastEventMs) / DAY : Infinity;
          if (daysSince <= 30) a30++;
          if (daysSince <= 90) a90++;
          if (daysSince <= 180) a180++;
          const sc = scoreMap.get(s.id);
          if (sc) { scoreSum += sc.score; scoreCount++; }
          const lastSeenAt = lastEventMs > 0 ? new Date(lastEventMs) : created;
          const eventOccurred = lastEventMs > 0
            ? (now - lastEventMs) >= SILENCE_MS
            : (now - created.getTime()) >= SILENCE_MS;
          return { enteredAt: created, lastSeenAt, eventOccurred };
        });
        const total = members.length;
        cohorts.push({
          cohort,
          startups: total,
          avgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
          active30Pct: total > 0 ? Math.round((a30 / total) * 100) : 0,
          active90Pct: total > 0 ? Math.round((a90 / total) * 100) : 0,
          active180Pct: total > 0 ? Math.round((a180 / total) * 100) : 0,
          kmBuckets: kaplanMeier(subjects, { bucketDays: 30, horizonDays: 360 }),
        });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="ventorix-cohort-lp-report.pdf"`);

      const FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
      const FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
      const ink = "#0f172a";
      const muted = "#475569";
      const faint = "#94a3b8";
      const card = "#f8fafc";
      const green = "#16a34a";
      const amber = "#ca8a04";
      const purple = "#6d28d9";

      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 54, bottom: 54, left: 50, right: 50 },
        info: {
          Title: "Ventorix — LP Cohort Report",
          Author: "Ventorix",
          Subject: "Cohort retention + Kaplan–Meier survival",
        },
      });
      doc.registerFont("Body", FONT_REG);
      doc.registerFont("Bold", FONT_BOLD);
      doc.pipe(res);

      const PAGE_W = doc.page.width;
      const M = doc.page.margins;
      const CONTENT_W = PAGE_W - M.left - M.right;

      // Cover
      doc.font("Bold").fontSize(22).fillColor(ink)
        .text("Ventorix — LP Cohort Report", M.left, M.top, { width: CONTENT_W });
      doc.moveDown(0.4);
      doc.font("Body").fontSize(10).fillColor(muted)
        .text(`Generated ${new Date().toISOString().slice(0, 10)} · ${startups.length} startups · ${cohorts.length} quarterly cohorts`,
          { width: CONTENT_W });
      doc.moveDown(0.6);
      doc.font("Body").fontSize(9.5).fillColor(muted)
        .text("Retention windows are measured by the most recent platform signal event per startup. Kaplan–Meier survival treats 90+ days of silence as a 'death' event; still-active startups are right-censored.",
          { width: CONTENT_W });
      doc.moveDown(1);

      const ensureSpace = (need: number) => {
        if (doc.y + need > doc.page.height - M.bottom) doc.addPage();
      };

      // Per-cohort sections
      for (const c of cohorts) {
        ensureSpace(220);
        // Section header
        const headerY = doc.y;
        doc.save().rect(M.left, headerY, CONTENT_W, 24).fill(ink).restore();
        doc.font("Bold").fontSize(12).fillColor("#ffffff")
          .text(`${c.cohort} — ${c.startups} startup${c.startups === 1 ? "" : "s"}${c.avgScore != null ? ` · avg vitality ${c.avgScore}/100` : ""}`,
            M.left + 10, headerY + 6);
        doc.y = headerY + 30;

        // Retention bars
        doc.font("Bold").fontSize(10).fillColor(ink).text("Retention", M.left, doc.y);
        doc.moveDown(0.2);
        const drawBar = (label: string, pct: number, color: string) => {
          const rowY = doc.y;
          doc.font("Body").fontSize(9).fillColor(muted).text(label, M.left, rowY, { width: 80 });
          const barX = M.left + 90;
          const barW = CONTENT_W - 90 - 50;
          const barH = 12;
          doc.save().rect(barX, rowY + 1, barW, barH).fill(card).restore();
          const fillW = Math.max(0, Math.min(1, pct / 100)) * barW;
          doc.save().rect(barX, rowY + 1, fillW, barH).fill(color).restore();
          doc.font("Bold").fontSize(9).fillColor(ink).text(`${pct}%`, barX + barW + 6, rowY + 1, { width: 40 });
          doc.y = rowY + barH + 6;
        };
        drawBar("30-day", c.active30Pct, green);
        drawBar("90-day", c.active90Pct, amber);
        drawBar("180-day", c.active180Pct, purple);
        doc.moveDown(0.4);

        // K-M survival mini curve
        ensureSpace(150);
        doc.font("Bold").fontSize(10).fillColor(ink).text("Kaplan–Meier survival", M.left, doc.y);
        doc.moveDown(0.2);
        const chartX = M.left;
        const chartY = doc.y;
        const chartW = CONTENT_W;
        const chartH = 110;
        doc.save().rect(chartX, chartY, chartW, chartH).fill(card).restore();
        // Axes
        doc.save().lineWidth(0.5).strokeColor(faint)
          .moveTo(chartX + 30, chartY + 8).lineTo(chartX + 30, chartY + chartH - 18).stroke()
          .moveTo(chartX + 30, chartY + chartH - 18).lineTo(chartX + chartW - 8, chartY + chartH - 18).stroke()
          .restore();
        const buckets = c.kmBuckets;
        if (buckets.length > 1) {
          const maxT = buckets[buckets.length - 1].tDays || 1;
          const innerW = chartW - 30 - 12;
          const innerH = chartH - 8 - 18;
          const px = (t: number) => chartX + 30 + (t / maxT) * innerW;
          const py = (s: number) => chartY + 8 + (1 - s) * innerH;
          doc.save().lineWidth(1.5).strokeColor(purple);
          doc.moveTo(px(buckets[0].tDays), py(buckets[0].survival));
          for (let i = 1; i < buckets.length; i++) {
            doc.lineTo(px(buckets[i].tDays), py(buckets[i].survival));
          }
          doc.stroke().restore();
          // y labels
          doc.font("Body").fontSize(7).fillColor(faint);
          for (const yPct of [0, 25, 50, 75, 100]) {
            const yy = chartY + 8 + (1 - yPct / 100) * innerH;
            doc.text(`${yPct}%`, chartX + 4, yy - 3, { width: 24, align: "right" });
          }
          // x labels
          for (const t of [0, Math.round(maxT / 2), maxT]) {
            doc.text(`${t}d`, px(t) - 10, chartY + chartH - 14, { width: 24, align: "center" });
          }
        } else {
          doc.font("Body").fontSize(9).fillColor(faint)
            .text("Insufficient data to compute survival curve.", chartX + 8, chartY + chartH / 2 - 6);
        }
        doc.y = chartY + chartH + 12;
      }

      ensureSpace(40);
      doc.moveDown(1);
      doc.font("Body").fontSize(8.5).fillColor(faint)
        .text(`Source: server/signals/scoring.ts · Ventorix Venture OS · ${new Date().toISOString().slice(0, 10)}`,
          { width: CONTENT_W, align: "center" });

      doc.end();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      if (!res.headersSent) res.status(500).json({ message: msg });
    }
  });

  app.post('/api/admin/vitality/recompute-all', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const { runJobByName: run } = await import("./signals");
      await run("vitality-recompute-nightly");
      res.json({ ok: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      res.status(500).json({ message: msg });
    }
  });

  // ============================================
  // Telegram workspace bot (Task #24 / Group 5)
  // ============================================
  const {
    handleTelegramUpdate,
    getTelegramWebhookSecret,
    getOrCreateFounderBinding,
    getTelegramBotToken,
    callTelegram,
  } = await import("./telegram");

  async function ensureFounderOrAdmin(req: any, res: any, startupId: string): Promise<{ userId: string; language: string } | null> {
    const userId = req.user?.claims?.sub || req.user?.id;
    const dbUser = await storage.getUser(userId);
    const userStartups = await storage.getUserStartups(userId);
    const isFounder = userStartups.some(
      (us) => us.startupId === startupId && (us.role === "founder" || us.role === "cofounder"),
    );
    if (!isFounder && !dbUser?.isHeadAdmin && dbUser?.role !== "innoLabsAdmin") {
      res.status(403).json({ message: "Only founders can manage Telegram bindings" });
      return null;
    }
    return { userId, language: (dbUser as any)?.language || "en" };
  }

  // Public webhook — Telegram POSTs updates here. Validated by secret header.
  app.post("/api/telegram/webhook", async (req, res) => {
    try {
      const expected = getTelegramWebhookSecret();
      if (!expected) return res.status(503).json({ ok: false, message: "TELEGRAM_WEBHOOK_SECRET not configured" });
      const provided = req.header("x-telegram-bot-api-secret-token");
      if (provided !== expected) return res.status(401).json({ ok: false });
      // Acknowledge quickly so Telegram does not retry; process async.
      res.status(200).json({ ok: true });
      handleTelegramUpdate(req.body).catch((err) => console.error("[telegram-webhook]", err));
    } catch (e: any) {
      console.error("[telegram-webhook] error:", e);
      try { res.status(200).json({ ok: true }); } catch {}
    }
  });

  // Founder-facing: get bot status + link, list bound chats
  app.get("/api/startups/:id/telegram", isAuthenticated, async (req: any, res) => {
    try {
      const ctx = await ensureFounderOrAdmin(req, res, req.params.id);
      if (!ctx) return;
      const botToken = getTelegramBotToken();
      let botUsername: string | null = null;
      if (botToken) {
        try {
          const me = await callTelegram("getMe", {});
          botUsername = me?.username || null;
        } catch {}
      }
      const webhookSecret = getTelegramWebhookSecret();
      // Provisioning is only complete when BOTH the bot token and the webhook
      // shared secret are configured. Without the webhook secret the webhook
      // route returns 503 and ingestion is non-functional, so we must not
      // surface deep links in that state.
      const botConfigured = !!botToken && !!webhookSecret;
      const binding = await getOrCreateFounderBinding(req.params.id, ctx.userId, ctx.language);
      const token = binding.linkToken;
      const chats = await storage.getTelegramChatsForStartup(req.params.id);
      const provisioningError = !botToken
        ? "TELEGRAM_BOT_TOKEN is not set"
        : !webhookSecret
          ? "TELEGRAM_WEBHOOK_SECRET is not set"
          : null;
      res.json({
        botConfigured,
        provisioningError,
        botUsername,
        linkToken: token,
        founderBound: !!binding.telegramUserId,
        founderTelegramUsername: binding.telegramUsername,
        deepLinkChat: botConfigured && botUsername ? `https://t.me/${botUsername}?startgroup=${token}` : null,
        deepLinkPrivate: botConfigured && botUsername ? `https://t.me/${botUsername}?start=${token}` : null,
        chats,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/startups/:id/telegram/chats/:telegramChatId", isAuthenticated, isNotFrozen, async (req: any, res) => {
    try {
      const ctx = await ensureFounderOrAdmin(req, res, req.params.id);
      if (!ctx) return;
      // Verify the chat actually belongs to this startup before mutating —
      // prevents a founder of startup A from unlinking a chat bound to startup B
      // by guessing or knowing its Telegram chat ID (IDOR).
      const chat = await storage.getTelegramChatByChatId(req.params.telegramChatId);
      if (!chat || chat.startupId !== req.params.id) {
        return res.status(404).json({ message: "Chat not found for this startup" });
      }
      await storage.setTelegramChatActive(req.params.telegramChatId, false);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  await bootstrapSignals();
  // Seed default global vitality weight presets (idempotent).
  try {
    const existing = await storage.getScoreWeightPresets(null);
    const seeds = [
      { name: "Balanced (default)", description: "Equal weighting across all five sub-scores.", isDefault: true,
        weights: { tech_activity: 1, team_health: 1, market_presence: 1, financial_health: 1, legal_hygiene: 1 } },
      { name: "Tech-heavy", description: "Emphasises code, releases and product activity.", isDefault: false,
        weights: { tech_activity: 3, team_health: 1, market_presence: 1, financial_health: 1, legal_hygiene: 0.5 } },
      { name: "Market-focused", description: "Emphasises market presence and financial traction.", isDefault: false,
        weights: { tech_activity: 1, team_health: 1, market_presence: 3, financial_health: 2, legal_hygiene: 0.5 } },
    ];
    for (const seed of seeds) {
      if (!existing.find((p) => p.name === seed.name)) {
        await storage.createScoreWeightPreset({ ...seed, companyId: null, createdBy: null });
      }
    }
  } catch (err) {
    console.error("[vitality] failed to seed default presets:", err);
  }

  const httpServer = createServer(app);
  return httpServer;
}

// ============================================
// Challenge Helper Functions
// ============================================

async function getAiOnlyAttachmentContext(challengeId: string): Promise<string | null> {
  try {
    const attachments = await storage.getChallengeAttachments(challengeId);
    const aiOnlyAttachments = attachments.filter(a => a.visibility === 'ai_only');
    if (aiOnlyAttachments.length === 0) return null;

    const textParts: string[] = [];

    for (const attachment of aiOnlyAttachments) {
      try {
        const { bucketName, objectName } = parseObjectPath(attachment.storageKey);
        const bucket = objectStorageClient.bucket(bucketName);
        const file = bucket.file(objectName);
        const [buffer] = await file.download();

        const mimeType = attachment.mimeType.toLowerCase();

        if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'text/csv') {
          // Plain text files: read directly
          const text = buffer.toString('utf-8');
          if (text.trim()) {
            textParts.push(`[${attachment.fileName}]\n${text.trim()}`);
          }
        } else if (
          mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          mimeType === 'application/vnd.ms-excel'
        ) {
          // Excel files: extract cell text via ExcelJS
          try {
            const excelJsModule = await import('exceljs');
            const ExcelJS = excelJsModule.default;
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);
            const lines: string[] = [];
            workbook.eachSheet((sheet) => {
              sheet.eachRow((row) => {
                const cells = (row.values as (unknown)[]).slice(1);
                const line = cells.map(c => (c !== null && c !== undefined ? String(c) : '')).join('\t');
                if (line.trim()) lines.push(line);
              });
            });
            if (lines.length > 0) {
              textParts.push(`[${attachment.fileName}]\n${lines.join('\n')}`);
            }
          } catch (xlsxError) {
            console.error(`Failed to parse Excel attachment ${attachment.fileName}:`, xlsxError);
          }
        } else if (mimeType === 'application/pdf') {
          // PDF files: extract text via pdf-parse v2 using binary data
          try {
            const { PDFParse } = await import('pdf-parse');
            const pdfData = new Uint8Array(buffer);
            const parser = new PDFParse({ data: pdfData });
            const result = await parser.getText();
            const text = result?.text?.trim();
            if (text) {
              textParts.push(`[${attachment.fileName}]\n${text}`);
            }
          } catch (pdfError) {
            console.error(`Failed to parse PDF attachment ${attachment.fileName}:`, pdfError);
          }
        }
        // Other binary formats: skip
      } catch (fileError) {
        console.error(`Failed to read attachment ${attachment.fileName}:`, fileError);
      }
    }

    return textParts.length > 0 ? textParts.join('\n\n') : null;
  } catch (error) {
    console.error('Failed to get ai_only attachment context:', error);
    return null;
  }
}

function getDebateSystemPrompt(topic: string, userPosition: string, aiInstructions?: string | null, attachmentContext?: string | null): string {
  let prompt = `Ты — искусственный интеллект, участвующий в дебатах на тему: "${topic}".

Позиция пользователя: "${userPosition}"

Твоя задача — аргументировано отстаивать ПРОТИВОПОЛОЖНУЮ точку зрения. 

Правила:
1. Будь логичен и убедителен
2. Используй факты, примеры и аналогии
3. Отвечай на аргументы оппонента
4. Не переходи на личности
5. Признавай сильные аргументы оппонента, но находи контраргументы
6. Пиши на русском языке
7. Держи ответы сфокусированными (до 200 слов)

Ведите дискуссию профессионально и уважительно.`;

  if (aiInstructions && aiInstructions.trim()) {
    prompt += `\n\n--- Дополнительные инструкции сценария ---\n${aiInstructions.trim()}`;
  }

  if (attachmentContext && attachmentContext.trim()) {
    prompt += `\n\n--- Контекст из прикреплённых материалов ---\n${attachmentContext.trim()}`;
  }

  return prompt;
}

type RoundScore = { round: number; logic: number; evidence: number; persuasiveness: number; counter: number };
type ScoreDebateResult = { score: number; feedback: string; logic?: number; evidence?: number; persuasiveness?: number; counter?: number; rounds?: RoundScore[]; customOutcome?: string | null; outcomeScore?: number | null };

async function scoreDebate(
  attempt: { messages: ChallengeMessage[]; userPosition: string },
  challenge: { topic: string; difficulty: string; aiInstructions?: string | null },
  lastUserMessage?: string
): Promise<ScoreDebateResult> {
  // Build scoring prompt
  const userMessages = attempt.messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join('\n---\n');
  
  const allUserContent = lastUserMessage 
    ? userMessages + '\n---\n' + lastUserMessage 
    : userMessages;
  
  const hasCustomScenario = !!(challenge.aiInstructions && challenge.aiInstructions.trim());
  const customOutcomeInstruction = hasCustomScenario
    ? `\n\nДополнительно: в сценарии заданы специальные инструкции:\n${challenge.aiInstructions}\n\nНа основе этих инструкций и качества аргументации пользователя определи конкретный результат сценария (например, размер инвестиции, решение, итог переговоров). Укажи его в поле "customOutcome" (строка на русском языке, например "Инвестиция: 12 млн руб за 22%"). Также укажи в поле "outcomeScore" целое число — числовой рейтинг результата для ранжирования участников (например, для инвестиций: сумма в тысячах рублей; для процентов: значение как целое; чем лучше результат для участника, тем выше число). Если сценарий не предполагает конкретного результата, оставь оба поля null.`
    : '';

  const scoringPrompt = `Оцени качество аргументации пользователя в дебатах.

Тема дебатов: "${challenge.topic}"
Позиция пользователя: "${attempt.userPosition}"
Сложность: ${challenge.difficulty}

Аргументы пользователя:
${allUserContent}

Сначала оцени КАЖДЫЙ раунд по критериям (каждый от 0 до 25 баллов):
- logic: Логика и структура аргументов
- evidence: Использование фактов и примеров
- persuasiveness: Убедительность и риторика
- counter: Умение отвечать на контраргументы

Затем дай итоговую оценку всей дискуссии.${customOutcomeInstruction}

Верни ответ СТРОГО в формате JSON:
{
  "rounds": [
    { "round": 1, "logic": <0-25>, "evidence": <0-25>, "persuasiveness": <0-25>, "counter": <0-25> }
  ],
  "logic": <итого 0-25>,
  "evidence": <итого 0-25>,
  "persuasiveness": <итого 0-25>,
  "counter": <итого 0-25>,
  "score": <итого 0-100>,
  "feedback": "<краткий отзыв на русском, 2-3 предложения о сильных и слабых сторонах аргументации>",
  "customOutcome": ${hasCustomScenario ? '"<результат сценария или null>"' : 'null'},
  "outcomeScore": ${hasCustomScenario ? '<целое число для ранжирования или null>' : 'null'}
}`;

  try {
    const response = await sendChatMessage([
      { role: 'system', content: 'Ты — эксперт по дебатам и риторике. Оценивай объективно и конструктивно.' },
      { role: 'user', content: scoringPrompt }
    ], { temperature: 0.3, maxTokens: 300 });
    
    // Parse JSON from response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      const logic = Math.min(25, Math.max(0, result.logic || 0));
      const evidence = Math.min(25, Math.max(0, result.evidence || 0));
      const persuasiveness = Math.min(25, Math.max(0, result.persuasiveness || 0));
      const counter = Math.min(25, Math.max(0, result.counter || 0));
      const computedScore = result.score ?? (logic + evidence + persuasiveness + counter);
      const rawRounds: unknown[] = Array.isArray(result.rounds) ? result.rounds : [];
      const rounds: RoundScore[] = rawRounds.flatMap((r) => {
        if (typeof r !== 'object' || r === null) return [];
        const obj = r as Record<string, unknown>;
        return [{
          round: typeof obj.round === 'number' ? obj.round : 0,
          logic: Math.min(25, Math.max(0, typeof obj.logic === 'number' ? obj.logic : 0)),
          evidence: Math.min(25, Math.max(0, typeof obj.evidence === 'number' ? obj.evidence : 0)),
          persuasiveness: Math.min(25, Math.max(0, typeof obj.persuasiveness === 'number' ? obj.persuasiveness : 0)),
          counter: Math.min(25, Math.max(0, typeof obj.counter === 'number' ? obj.counter : 0)),
        }];
      });
      const customOutcome = typeof result.customOutcome === 'string' && result.customOutcome !== 'null' ? result.customOutcome : null;
      const outcomeScore = typeof result.outcomeScore === 'number' && Number.isFinite(result.outcomeScore)
        ? Math.round(result.outcomeScore)
        : null;
      return {
        score: Math.min(100, Math.max(0, computedScore)),
        feedback: result.feedback || 'Оценка завершена.',
        logic,
        evidence,
        persuasiveness,
        counter,
        rounds,
        customOutcome,
        outcomeScore,
      };
    }
  } catch (error) {
    console.error("Error scoring debate:", error);
  }
  
  // Fallback scoring based on message count and length
  const messageCount = attempt.messages.filter(m => m.role === 'user').length;
  const avgLength = allUserContent.length / Math.max(1, messageCount);
  const baseScore = Math.min(70, 40 + messageCount * 5 + Math.floor(avgLength / 50) * 2);
  
  return {
    score: baseScore,
    feedback: 'Спасибо за участие в дебатах! Продолжайте развивать навыки аргументации.',
  };
}
