import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  integer,
  real,
  numeric,
  unique,
  uniqueIndex,
  bigint,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for authentication)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Platform roles (Ventorix hierarchy):
// - member: default role for all users
// - teacher: can grade assignments, manage courses
// - expert: can evaluate startups
// - admin: full content access across platform
// - lmsAdmin: manages LMS (courses, programs) subsystem
// - eventAdmin: manages Events subsystem
// - innoLabsAdmin: manages InnoLabs/innovation subsystem
// Head Admin (superuser) is separate via isHeadAdmin boolean flag
export const USER_ROLES = ["member", "teacher", "expert", "lmsAdmin", "eventAdmin", "innoLabsAdmin"] as const;
export type UserRole = typeof USER_ROLES[number];

export const PLATFORM_ADMIN_ROLES: readonly UserRole[] = ["lmsAdmin", "eventAdmin", "innoLabsAdmin"] as const;

// User storage table (supports both OAuth and email/password auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password"), // hashed password for email/password auth (nullable for OAuth users)
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  patronymic: varchar("patronymic"),
  profileImageUrl: varchar("profile_image_url"),
  organizationType: varchar("organization_type"),
  organizationName: text("organization_name"),
  faculty: varchar("faculty"), // Faculty field - only for Financial University users
  groupNumber: varchar("group_number"), // Group number - only for Financial University students
  role: varchar("role", { length: 30 }).notNull().default("member"),
  isHeadAdmin: boolean("is_head_admin").notNull().default(false),
  isFrozen: boolean("is_frozen").notNull().default(false),
  frozenBy: varchar("frozen_by"), // userId of the admin who froze this account
  frozenAt: timestamp("frozen_at"),
  frozenReason: text("frozen_reason"),
  // Extended profile fields
  tag: varchar("tag").unique(), // Unique @tag like @cat123
  city: varchar("city"),
  company: varchar("company"),
  category: varchar("category"), // e.g., Investor, Founder, CEO, etc.
  position: varchar("position"), // Job title/position
  interests: text("interests"), // What I'm looking for
  aboutMe: text("about_me"), // About me section
  isFavorite: boolean("is_favorite").default(false), // For favorites list
  isPartner: boolean("is_partner").notNull().default(false),
  isResident: boolean("is_resident").notNull().default(false),
  isFounder: boolean("is_founder").notNull().default(false),
  isSpeaker: boolean("is_speaker").notNull().default(false),
  skills: text("skills"),
  previousStartups: text("previous_startups"),
  pitchDeckLink: text("pitch_deck_link"),
  emailVerified: boolean("email_verified").notNull().default(false),
  newsletterOptOut: boolean("newsletter_opt_out").notNull().default(false),
  pinHash: varchar("pin_hash"),
  telegramUsername: varchar("telegram_username", { length: 64 }),
  mainOrgType: varchar("main_org_type", { length: 30 }),
  mainOrgId: varchar("main_org_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Email normalization helper
export const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

// Registration and login schemas
export const registerSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  patronymic: z.string().optional(),
  organizationType: z.string().optional(),
  organizationName: z.string().optional(),
  faculty: z.string().optional(),
  groupNumber: z.string().optional(),
  // Accept both snake_case (per spec) and camelCase for compatibility
  verificationToken: z.string().optional(),
  verification_token: z.string().optional(),
  marketingConsent: z.boolean().optional(),
  marketing_consent: z.boolean().optional(),
}).transform((data) => ({
  ...data,
  verificationToken: data.verificationToken ?? data.verification_token,
  marketingConsent: data.marketingConsent ?? data.marketing_consent,
}));

export const loginSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
  password: z.string().min(1, "Password is required"),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export const adminChangePasswordSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export const createAdminSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  patronymic: z.string().optional(),
  organizationType: z.string().optional(),
  organizationName: z.string().optional(),
  faculty: z.string().optional(),
});

export const updateProfileSchema = z.object({
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  patronymic: z.string().nullable().optional(),
  organizationType: z.string().nullable().optional(),
  organizationName: z.string().nullable().optional(),
  faculty: z.string().nullable().optional(),
  groupNumber: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  interests: z.string().nullable().optional(),
  aboutMe: z.string().nullable().optional(),
  skills: z.string().nullable().optional(),
  previousStartups: z.string().nullable().optional(),
  pitchDeckLink: z.string().nullable().optional(),
  telegramUsername: z.string().nullable().optional(),
});

export const setMainOrgSchema = z.object({
  mainOrgType: z.enum(["club", "university", "company"]).nullable(),
  mainOrgId: z.string().nullable(),
});
export type SetMainOrgInput = z.infer<typeof setMainOrgSchema>;

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type AdminChangePasswordInput = z.infer<typeof adminChangePasswordSchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
});

export const verifyResetCodeSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
  code: z.string().length(6, "Code must be 6 digits"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
  code: z.string().length(6, "Code must be 6 digits"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Email verification codes table (used by onboarding)
export const emailVerificationCodes = pgTable("email_verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  codeHash: varchar("code_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  consumedAt: timestamp("consumed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Backwards-compat alias for older imports
export const emailVerificationTokens = emailVerificationCodes;

export const insertEmailVerificationCodeSchema = createInsertSchema(emailVerificationCodes).omit({
  id: true,
  createdAt: true,
});

export type InsertEmailVerificationCode = z.infer<typeof insertEmailVerificationCodeSchema>;
export type EmailVerificationCode = typeof emailVerificationCodes.$inferSelect;

// Backwards-compat aliases
export type InsertEmailVerificationToken = InsertEmailVerificationCode;
export type EmailVerificationToken = EmailVerificationCode;

export const sendVerificationSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
});

export const verifyEmailSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
  code: z.string().length(6, "Code must be 6 digits"),
});

export type SendVerificationInput = z.infer<typeof sendVerificationSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const setPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits"),
});

export type SetPinInput = z.infer<typeof setPinSchema>;

// Events table
// Business-club event types. Each gets a distinct card treatment in the UI.
export const EVENT_TYPES = [
  "pitch_day",
  "demo_day",
  "business_meeting",
  "conference",
  "forum",
  "networking",
  "workshop",
  "lecture",
] as const;
export type EventType = typeof EVENT_TYPES[number];
// Types whose cards showcase presenting startups (clickable -> standardized detail).
export const STARTUP_SHOWCASE_EVENT_TYPES: EventType[] = ["pitch_day", "demo_day"];

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  location: text("location").notNull(),
  duration: text("duration").notNull(),
  eventType: varchar("event_type", { length: 40 }),
  description: text("description"),
  customImage: text("custom_image"),
  photos: text("photos").array(),
  status: varchar("status", { length: 20 }).notNull().default("upcoming"),
  isFeatured: boolean("is_featured").notNull().default(false),
  registrationOpen: boolean("registration_open").notNull().default(true),
  isDraft: boolean("is_draft").notNull().default(true), // Events start as drafts until questions are added
  allowGuestChatRegistration: boolean("allow_guest_chat_registration").notNull().default(false), // Allow non-users to register via AI chat
  requiresGroupNumber: boolean("requires_group_number").notNull().default(false), // Require Financial University students to provide a group number to register
  registrationRestrictedTo: text("registration_restricted_to").array(), // Array of allowed org types (null = open to all)
  universityId: varchar("university_id").references(() => universities.id, { onDelete: "set null" }),
  clubId: varchar("club_id").references(() => clubs.id, { onDelete: "set null" }),
  isHighlighted: boolean("is_highlighted").notNull().default(false),
  isSpecialBranding: boolean("is_special_branding").notNull().default(false),
  isRecommended: boolean("is_recommended").notNull().default(false),
  specialBrandingColor: varchar("special_branding_color", { length: 20 }),
  specialBrandingLogoUrl: text("special_branding_logo_url"),
  corporateCompanyId: varchar("corporate_company_id").references(() => companies.id, { onDelete: "set null" }),
  isFeaturedByClub: boolean("is_featured_by_club").notNull().default(false),
  // Optional custom slug for the public showcase link (/showcase/<slug>). When
  // null, the public showcase is reachable only by event id.
  showcaseSlug: text("showcase_slug"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// Event registrations table
export const eventRegistrations = pgTable("event_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  attendanceMarked: boolean("attendance_marked").notNull().default(false),
  attendanceTime: timestamp("attendance_time"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("unique_event_user_registration").on(table.eventId, table.userId),
]);

export const insertEventRegistrationSchema = createInsertSchema(eventRegistrations).omit({
  id: true,
  createdAt: true,
});

export type InsertEventRegistration = z.infer<typeof insertEventRegistrationSchema>;
export type EventRegistration = typeof eventRegistrations.$inferSelect;

// Event registration with user information (for display)
export type EventRegistrationWithUser = EventRegistration & {
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userPatronymic: string | null;
  userOrganizationType: string | null;
  userOrganizationName: string | null;
  userGroupNumber: string | null;
  userFaculty: string | null;
  attendanceMarked: boolean;
  attendanceTime: string | null;
};

// Event registration with event information (for certificates)
export type EventRegistrationWithEvent = EventRegistration & {
  event?: Event;
};

// Videos table
export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  createdAt: true,
});

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

// Video comments table
export const videoComments = pgTable("video_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVideoCommentSchema = createInsertSchema(videoComments).omit({
  id: true,
  createdAt: true,
});

export type InsertVideoComment = z.infer<typeof insertVideoCommentSchema>;
export type VideoComment = typeof videoComments.$inferSelect;

// Livestreams table
export const livestreams = pgTable("livestreams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  rutubeUrl: text("rutube_url").notNull(),
  isLive: boolean("is_live").notNull().default(false),
  status: varchar("status", { length: 20 }).notNull().default("upcoming"),
  scheduledDate: text("scheduled_date"),
  scheduledTime: text("scheduled_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLivestreamSchema = createInsertSchema(livestreams).omit({
  id: true,
  createdAt: true,
});

export type InsertLivestream = z.infer<typeof insertLivestreamSchema>;
export type Livestream = typeof livestreams.$inferSelect;

// Courses table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  modules: integer("modules").notNull(),
  duration: text("duration").notNull(),
  visibility: varchar("visibility", { length: 20 }).notNull().default("draft"),
  thumbnailUrl: text("thumbnail_url"),
  track: varchar("track", { length: 20 }).notNull().default("course"),
  instructorId: varchar("instructor_id").references(() => users.id),
  category: text("category"),
  level: varchar("level", { length: 20 }).default("beginner"),
  enrollmentType: varchar("enrollment_type", { length: 20 }).default("self"),
  maxStudents: integer("max_students"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
});

// Update schema - allows partial updates without immutable fields
export const updateCourseSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  duration: z.string().optional(),
  visibility: z.string().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  track: z.string().optional(),
  instructorId: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  level: z.string().optional(),
  enrollmentType: z.string().optional(),
  maxStudents: z.number().nullable().optional(),
  startDate: z.any().optional(),
  endDate: z.any().optional(),
});

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type UpdateCourse = z.infer<typeof updateCourseSchema>;
export type Course = typeof courses.$inferSelect;

// Course modules table
export const courseModules = pgTable("course_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCourseModuleSchema = createInsertSchema(courseModules).omit({
  id: true,
  createdAt: true,
});

// Update schema - allows partial updates without immutable fields
export const updateCourseModuleSchema = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  orderIndex: z.number().optional(),
});

export type InsertCourseModule = z.infer<typeof insertCourseModuleSchema>;
export type UpdateCourseModule = z.infer<typeof updateCourseModuleSchema>;
export type CourseModule = typeof courseModules.$inferSelect;

// Course enrollments table
export const courseEnrollments = pgTable("course_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertCourseEnrollmentSchema = createInsertSchema(courseEnrollments).omit({
  id: true,
  enrolledAt: true,
  completedAt: true,
});

export type InsertCourseEnrollment = z.infer<typeof insertCourseEnrollmentSchema>;
export type CourseEnrollment = typeof courseEnrollments.$inferSelect;

// Course lessons table
export const courseLessons = pgTable("course_lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  moduleId: varchar("module_id").references(() => courseModules.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"),
  videoUrl: text("video_url"),
  durationMinutes: integer("duration_minutes"),
  lessonType: varchar("lesson_type", { length: 20 }).default("video"),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCourseLessonSchema = createInsertSchema(courseLessons).omit({
  id: true,
  createdAt: true,
});

// Update schema - allows partial updates without immutable fields
export const updateCourseLessonSchema = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  durationMinutes: z.number().nullable().optional(),
  lessonType: z.string().optional(),
  moduleId: z.string().nullable().optional(),
  orderIndex: z.number().optional(),
});

export type InsertCourseLesson = z.infer<typeof insertCourseLessonSchema>;
export type UpdateCourseLesson = z.infer<typeof updateCourseLessonSchema>;
export type CourseLesson = typeof courseLessons.$inferSelect;

// Course materials table (attachments per lesson)
export const courseMaterials = pgTable("course_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").notNull().references(() => courseLessons.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  storageKey: text("storage_key").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCourseMaterialSchema = createInsertSchema(courseMaterials).omit({
  id: true,
  createdAt: true,
});

export type InsertCourseMaterial = z.infer<typeof insertCourseMaterialSchema>;
export type CourseMaterial = typeof courseMaterials.$inferSelect;

// Course lesson progress table
export const courseLessonProgress = pgTable("course_lesson_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").notNull().references(() => courseLessons.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  completed: boolean("completed").notNull().default(false),
  progressPercent: integer("progress_percent").notNull().default(0),
  lastPosition: integer("last_position").default(0),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCourseLessonProgressSchema = createInsertSchema(courseLessonProgress).omit({
  id: true,
  updatedAt: true,
  completedAt: true,
});

export type InsertCourseLessonProgress = z.infer<typeof insertCourseLessonProgressSchema>;
export type CourseLessonProgress = typeof courseLessonProgress.$inferSelect;

// Course tasks/assessments table (quizzes, assignments)
export const TASK_TYPES = ["quiz", "assignment"] as const;
export type TaskType = typeof TASK_TYPES[number];

export const courseTasks = pgTable("course_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  moduleId: varchar("module_id").references(() => courseModules.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  taskType: varchar("task_type", { length: 20 }).notNull().default("assignment"),
  orderIndex: integer("order_index").notNull(),
  points: integer("points").notNull().default(100),
  passingScore: integer("passing_score").default(60),
  dueAt: timestamp("due_at"),
  availableFrom: timestamp("available_from"),
  timeLimit: integer("time_limit"),
  maxAttempts: integer("max_attempts").default(1),
  visibility: varchar("visibility", { length: 20 }).notNull().default("published"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCourseTaskSchema = createInsertSchema(courseTasks).omit({
  id: true,
  createdAt: true,
});

export const updateCourseTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  taskType: z.string().optional(),
  moduleId: z.string().nullable().optional(),
  orderIndex: z.number().optional(),
  points: z.number().optional(),
  passingScore: z.number().nullable().optional(),
  dueAt: z.any().nullable().optional(),
  availableFrom: z.any().nullable().optional(),
  timeLimit: z.number().nullable().optional(),
  maxAttempts: z.number().nullable().optional(),
  visibility: z.string().optional(),
});

export type InsertCourseTask = z.infer<typeof insertCourseTaskSchema>;
export type UpdateCourseTask = z.infer<typeof updateCourseTaskSchema>;
export type CourseTask = typeof courseTasks.$inferSelect;

// Quiz questions table
export const QUIZ_QUESTION_TYPES = ["multiple_choice", "true_false", "short_answer"] as const;
export type QuizQuestionType = typeof QUIZ_QUESTION_TYPES[number];

export const courseQuizQuestions = pgTable("course_quiz_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => courseTasks.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  questionType: varchar("question_type", { length: 20 }).notNull().default("multiple_choice"),
  options: text("options").array(),
  correctAnswer: text("correct_answer").notNull(),
  points: integer("points").notNull().default(10),
  orderIndex: integer("order_index").notNull().default(0),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuizQuestionSchema = createInsertSchema(courseQuizQuestions).omit({
  id: true,
  createdAt: true,
});

export const updateQuizQuestionSchema = z.object({
  questionText: z.string().optional(),
  questionType: z.string().optional(),
  options: z.array(z.string()).nullable().optional(),
  correctAnswer: z.string().optional(),
  points: z.number().optional(),
  orderIndex: z.number().optional(),
  feedback: z.string().nullable().optional(),
});

export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type UpdateQuizQuestion = z.infer<typeof updateQuizQuestionSchema>;
export type QuizQuestion = typeof courseQuizQuestions.$inferSelect;

// Quiz attempts table
export const courseQuizAttempts = pgTable("course_quiz_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => courseTasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  answers: text("answers"),
  score: integer("score"),
  maxScore: integer("max_score"),
  status: varchar("status", { length: 20 }).notNull().default("in_progress"),
  startedAt: timestamp("started_at").defaultNow(),
  submittedAt: timestamp("submitted_at"),
  gradedBy: varchar("graded_by").references(() => users.id),
  gradedAt: timestamp("graded_at"),
});

export const insertQuizAttemptSchema = createInsertSchema(courseQuizAttempts).omit({
  id: true,
  startedAt: true,
  submittedAt: true,
  gradedAt: true,
});

export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type QuizAttempt = typeof courseQuizAttempts.$inferSelect;

// Course submissions table (for assignments)
export const courseSubmissions = pgTable("course_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => courseTasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileUrl: text("file_url"),
  textContent: text("text_content"),
  status: varchar("status", { length: 20 }).notNull().default("submitted"),
  grade: integer("grade"),
  feedback: text("feedback"),
  gradedBy: varchar("graded_by").references(() => users.id),
  gradedAt: timestamp("graded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCourseSubmissionSchema = createInsertSchema(courseSubmissions).omit({
  id: true,
  createdAt: true,
  gradedAt: true,
});

export const gradeSubmissionSchema = z.object({
  grade: z.number().min(0).max(100),
  feedback: z.string().optional(),
});

export type InsertCourseSubmission = z.infer<typeof insertCourseSubmissionSchema>;
export type GradeSubmission = z.infer<typeof gradeSubmissionSchema>;
export type CourseSubmission = typeof courseSubmissions.$inferSelect;

// Course progress table
export const courseProgress = pgTable("course_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  progress: integer("progress").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("not-started"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCourseProgressSchema = createInsertSchema(courseProgress).omit({
  id: true,
  updatedAt: true,
});

export type InsertCourseProgress = z.infer<typeof insertCourseProgressSchema>;
export type CourseProgress = typeof courseProgress.$inferSelect;

// ============================================
// Event Form Fields - Custom questions per event
// ============================================

// Question types for event forms
export const FORM_FIELD_TYPES = [
  "short_text",
  "long_text", 
  "single_choice",
  "multiple_choice",
  "file",
] as const;

export type FormFieldType = typeof FORM_FIELD_TYPES[number];

// Event form fields table - stores custom questions for each event
export const eventFormFields = pgTable("event_form_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 30 }).notNull(), // short_text, long_text, single_choice, multiple_choice, file
  label: text("label").notNull(), // Question text
  description: text("description"), // Optional help text
  required: boolean("required").notNull().default(false),
  orderIndex: integer("order_index").notNull().default(0),
  options: text("options").array(), // For choice questions - array of option strings
  maxFileSize: integer("max_file_size"), // For file uploads - max size in bytes
  allowedFileTypes: text("allowed_file_types").array(), // For file uploads - e.g. ['.pdf', '.docx']
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEventFormFieldSchema = createInsertSchema(eventFormFields).omit({
  id: true,
  createdAt: true,
});

export type InsertEventFormField = z.infer<typeof insertEventFormFieldSchema>;
export type EventFormField = typeof eventFormFields.$inferSelect;

// Event form responses table - links registration to their form answers
export const eventFormResponses = pgTable("event_form_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  registrationId: varchar("registration_id").notNull().references(() => eventRegistrations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // Nullable for guest registrations
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEventFormResponseSchema = createInsertSchema(eventFormResponses).omit({
  id: true,
  createdAt: true,
});

export type InsertEventFormResponse = z.infer<typeof insertEventFormResponseSchema>;
export type EventFormResponse = typeof eventFormResponses.$inferSelect;

// Event form answers table - individual answers to form fields
export const eventFormAnswers = pgTable("event_form_answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  responseId: varchar("response_id").notNull().references(() => eventFormResponses.id, { onDelete: "cascade" }),
  fieldId: varchar("field_id").notNull().references(() => eventFormFields.id, { onDelete: "cascade" }),
  valueText: text("value_text"), // For text answers
  valueOptions: text("value_options").array(), // For choice answers - selected option(s)
  filePath: text("file_path"), // For file uploads - object storage path
  fileName: text("file_name"), // Original file name for display
  fileMimeType: text("file_mime_type"), // MIME type of uploaded file
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEventFormAnswerSchema = createInsertSchema(eventFormAnswers).omit({
  id: true,
  createdAt: true,
});

export type InsertEventFormAnswer = z.infer<typeof insertEventFormAnswerSchema>;
export type EventFormAnswer = typeof eventFormAnswers.$inferSelect;

// Types for form response with all related data
export type EventFormResponseWithAnswers = EventFormResponse & {
  answers: (EventFormAnswer & { field: EventFormField })[];
  userEmail?: string | null;
  userFirstName?: string | null;
  userLastName?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
};

// Validation schemas for API requests
export const createFormFieldSchema = z.object({
  eventId: z.string().min(1),
  type: z.enum(FORM_FIELD_TYPES),
  label: z.string().min(1, "Question text is required"),
  description: z.string().optional(),
  required: z.boolean().default(false),
  orderIndex: z.number().int().default(0),
  options: z.array(z.string()).optional(), // Required for choice types
  maxFileSize: z.number().int().optional(),
  allowedFileTypes: z.array(z.string()).optional(),
});

export const updateFormFieldSchema = createFormFieldSchema.partial().omit({ eventId: true });

export const submitFormAnswersSchema = z.object({
  answers: z.array(z.object({
    fieldId: z.string().min(1),
    valueText: z.string().optional(),
    valueOptions: z.array(z.string()).optional(),
    filePath: z.string().optional(),
    fileName: z.string().optional(),
  })),
});

export type CreateFormFieldInput = z.infer<typeof createFormFieldSchema>;
export type UpdateFormFieldInput = z.infer<typeof updateFormFieldSchema>;
export type SubmitFormAnswersInput = z.infer<typeof submitFormAnswersSchema>;

// ============================================
// AI Chat Sessions - For registration and onboarding
// ============================================

export const CHAT_SESSION_TYPES = ['event_registration', 'onboarding'] as const;
export type ChatSessionType = typeof CHAT_SESSION_TYPES[number];

export const CHAT_SESSION_STATUSES = ['active', 'completed', 'cancelled'] as const;
export type ChatSessionStatus = typeof CHAT_SESSION_STATUSES[number];

// Chat sessions table
export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 30 }).notNull(), // event_registration, onboarding
  status: varchar("status", { length: 20 }).notNull().default("active"),
  extractedData: text("extracted_data"), // JSON string of extracted registration data
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // user, assistant, system
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Chat session with messages type
export type ChatSessionWithMessages = ChatSession & {
  messages: ChatMessage[];
  userName?: string | null;
  userEmail?: string | null;
  eventName?: string | null;
};

// ============================================
// AI Debate Challenges
// ============================================

export const CHALLENGE_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type ChallengeDifficulty = typeof CHALLENGE_DIFFICULTIES[number];

export const CHALLENGE_ATTEMPT_STATUSES = ['active', 'completed', 'abandoned'] as const;
export type ChallengeAttemptStatus = typeof CHALLENGE_ATTEMPT_STATUSES[number];

// FIS World Cup Points Distribution (positions 1-30)
export const FIS_POINTS = [100, 80, 60, 50, 45, 40, 36, 32, 29, 26, 24, 22, 20, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const;

// Challenges table - Admin-created debate topics
export const challenges = pgTable("challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  topic: text("topic").notNull(), // The specific debate topic/thesis
  difficulty: varchar("difficulty", { length: 20 }).notNull().default("medium"),
  maxRounds: integer("max_rounds").notNull().default(3), // Number of back-and-forth exchanges
  isActive: boolean("is_active").notNull().default(true),
  startDate: timestamp("start_date"), // When the challenge becomes available
  endDate: timestamp("end_date"), // When the challenge closes
  responseTimeLimit: integer("response_time_limit"), // Max seconds to respond to AI
  thumbnailStorageKey: text("thumbnail_storage_key"), // Object storage key for challenge thumbnail
  infoForUsers: text("info_for_users"), // Shown to participants before they start
  aiInstructions: text("ai_instructions"), // Hidden from participants; used as AI context
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChallengeSchema = createInsertSchema(challenges).omit({
  id: true,
  createdAt: true,
});

export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challenges.$inferSelect;

// Challenge attachment visibility levels
export const CHALLENGE_ATTACHMENT_VISIBILITY = ['ai_only', 'both'] as const;
export type ChallengeAttachmentVisibility = typeof CHALLENGE_ATTACHMENT_VISIBILITY[number];

// Challenge attachments table - Files attached to challenges
export const challengeAttachments = pgTable("challenge_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(), // Path in object storage
  fileName: text("file_name").notNull(), // Original file name
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(), // Size in bytes
  visibility: varchar("visibility", { length: 20 }).notNull().default("ai_only"), // "ai_only" or "both"
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChallengeAttachmentSchema = createInsertSchema(challengeAttachments).omit({
  id: true,
  createdAt: true,
});

export type InsertChallengeAttachment = z.infer<typeof insertChallengeAttachmentSchema>;
export type ChallengeAttachment = typeof challengeAttachments.$inferSelect;

// Challenge attempts table - User's debate sessions
export const challengeAttempts = pgTable("challenge_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userPosition: text("user_position").notNull(), // The position user is arguing for
  currentRound: integer("current_round").notNull().default(1),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  score: integer("score"), // Final score (0-100) after completion
  feedback: text("feedback"), // AI feedback on argumentation quality
  customOutcome: text("custom_outcome"), // Scenario-specific outcome (e.g. investment amount)
  outcomeScore: integer("outcome_score"), // Numeric ranking score derived from customOutcome (for deterministic sorting)
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertChallengeAttemptSchema = createInsertSchema(challengeAttempts).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export type InsertChallengeAttempt = z.infer<typeof insertChallengeAttemptSchema>;
export type ChallengeAttempt = typeof challengeAttempts.$inferSelect;

// Challenge messages table - Debate conversation history
export const challengeMessages = pgTable("challenge_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  attemptId: varchar("attempt_id").notNull().references(() => challengeAttempts.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // user, assistant
  content: text("content").notNull(),
  round: integer("round").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChallengeMessageSchema = createInsertSchema(challengeMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertChallengeMessage = z.infer<typeof insertChallengeMessageSchema>;
export type ChallengeMessage = typeof challengeMessages.$inferSelect;

// Challenge attempt with messages type
export type ChallengeAttemptWithMessages = ChallengeAttempt & {
  messages: ChallengeMessage[];
  challenge?: Challenge;
  userName?: string | null;
};

// Leaderboard entry type
export type LeaderboardEntry = {
  rank: number;
  userId: string;
  userName: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  score: number;
  completedAt: Date | null;
  customOutcome?: string | null;
  outcomeScore?: number | null;
};

// Seasonal points table - FIS-style scoring per challenge
export const seasonalPoints = pgTable("seasonal_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  attemptId: varchar("attempt_id").notNull().references(() => challengeAttempts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  position: integer("position").notNull(), // 1-50+ ranking position
  points: integer("points").notNull(), // FIS points (100 for 1st, 80 for 2nd, etc.)
  earnedAt: timestamp("earned_at").defaultNow(),
});

export const insertSeasonalPointsSchema = createInsertSchema(seasonalPoints).omit({
  id: true,
  earnedAt: true,
});

export type InsertSeasonalPoints = z.infer<typeof insertSeasonalPointsSchema>;
export type SeasonalPoints = typeof seasonalPoints.$inferSelect;

// Seasonal leaderboard entry type
export type SeasonalLeaderboardEntry = {
  rank: number;
  userId: string;
  userName: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  totalPoints: number;
  challengeCount: number;
};

// Team championship entry type (by organization)
export type TeamChampionshipEntry = {
  rank: number;
  organizationName: string;
  organizationType: string | null;
  totalPoints: number;
  memberCount: number;
  participantCount: number;
};

// Global latest results entry type - results grouped by challenge
export type GlobalLatestResult = {
  challengeId: string;
  challengeTitle: string;
  completedAt: Date | null;
  entries: LeaderboardEntry[];
};

// Validation schemas for API requests
export const createChallengeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  topic: z.string().min(1, "Debate topic is required"),
  difficulty: z.enum(CHALLENGE_DIFFICULTIES).default("medium"),
  maxRounds: z.number().int().min(1).max(10).default(3),
  isActive: z.boolean().default(true),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  responseTimeLimit: z.number().int().min(10).max(600).nullable().optional(),
  infoForUsers: z.string().nullable().optional(),
  aiInstructions: z.string().nullable().optional(),
});

export const updateChallengeSchema = createChallengeSchema.partial();

export const startChallengeSchema = z.object({
  position: z.string().min(1, "Your position is required"),
});

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;
export type StartChallengeInput = z.infer<typeof startChallengeSchema>;

// ============================================
// Phase 3: Communication & Collaboration
// ============================================

// Announcement types
export const ANNOUNCEMENT_TYPES = ['platform', 'course'] as const;
export type AnnouncementType = typeof ANNOUNCEMENT_TYPES[number];

// Announcements table - Platform-wide and course-specific announcements
export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: varchar("type", { length: 20 }).notNull().default("platform"), // platform or course
  courseId: varchar("course_id").references(() => courses.id, { onDelete: "cascade" }), // null for platform announcements
  authorId: varchar("author_id").notNull().references(() => users.id),
  isPinned: boolean("is_pinned").notNull().default(false),
  publishedAt: timestamp("published_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Optional expiration
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
});

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

// Announcement with author info
export type AnnouncementWithAuthor = Announcement & {
  authorFirstName: string | null;
  authorLastName: string | null;
  authorEmail: string | null;
  courseName?: string | null;
};

// Discussion forums table - One forum per course
export const discussionForums = pgTable("discussion_forums", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDiscussionForumSchema = createInsertSchema(discussionForums).omit({
  id: true,
  createdAt: true,
});

export type InsertDiscussionForum = z.infer<typeof insertDiscussionForumSchema>;
export type DiscussionForum = typeof discussionForums.$inferSelect;

// Discussion threads table - Topics within forums
export const discussionThreads = pgTable("discussion_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  forumId: varchar("forum_id").notNull().references(() => discussionForums.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  isLocked: boolean("is_locked").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDiscussionThreadSchema = createInsertSchema(discussionThreads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
});

export type InsertDiscussionThread = z.infer<typeof insertDiscussionThreadSchema>;
export type DiscussionThread = typeof discussionThreads.$inferSelect;

// Discussion thread with stats
export type DiscussionThreadWithStats = DiscussionThread & {
  authorFirstName: string | null;
  authorLastName: string | null;
  replyCount: number;
  lastReplyAt: Date | null;
};

// Discussion replies table - Replies to threads
export const discussionReplies = pgTable("discussion_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => discussionThreads.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentReplyId: varchar("parent_reply_id"), // For nested replies
  content: text("content").notNull(),
  isEdited: boolean("is_edited").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDiscussionReplySchema = createInsertSchema(discussionReplies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isEdited: true,
});

export type InsertDiscussionReply = z.infer<typeof insertDiscussionReplySchema>;
export type DiscussionReply = typeof discussionReplies.$inferSelect;

// Reply with author info
export type DiscussionReplyWithAuthor = DiscussionReply & {
  authorFirstName: string | null;
  authorLastName: string | null;
  authorRole: string | null;
};

// ============================================
// WhatsApp-style Chat Messaging System
// ============================================

// Conversations table - tracks 1:1 chat threads
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participant1Id: varchar("participant1_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  participant2Id: varchar("participant2_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  lastMessageContent: text("last_message_content"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
  lastMessageContent: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Conversation with other participant info
export type ConversationWithParticipant = Conversation & {
  otherUserId: string;
  otherUserFirstName: string | null;
  otherUserLastName: string | null;
  otherUserEmail: string | null;
  unreadCount: number;
};

// Chat messages table - individual messages in conversations
export const chatMessagesPrivate = pgTable("chat_messages_private", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  mentions: text("mentions").array(), // Array of mentioned user IDs like @username
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatMessagePrivateSchema = createInsertSchema(chatMessagesPrivate).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export type InsertChatMessagePrivate = z.infer<typeof insertChatMessagePrivateSchema>;
export type ChatMessagePrivate = typeof chatMessagesPrivate.$inferSelect;

// Chat message with sender info
export type ChatMessageWithSender = ChatMessagePrivate & {
  senderFirstName: string | null;
  senderLastName: string | null;
};

// Legacy private messages table - keeping for migration compatibility
export const privateMessages = pgTable("private_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: varchar("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject"),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPrivateMessageSchema = createInsertSchema(privateMessages).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export type InsertPrivateMessage = z.infer<typeof insertPrivateMessageSchema>;
export type PrivateMessage = typeof privateMessages.$inferSelect;

// Message with sender/recipient info (legacy)
export type PrivateMessageWithUsers = PrivateMessage & {
  senderFirstName: string | null;
  senderLastName: string | null;
  senderEmail: string | null;
  recipientFirstName: string | null;
  recipientLastName: string | null;
  recipientEmail: string | null;
};

// Lesson comments table - Comments on lessons with @mentions
export const lessonComments = pgTable("lesson_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").notNull().references(() => courseLessons.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentCommentId: varchar("parent_comment_id"), // For nested replies
  content: text("content").notNull(),
  mentions: text("mentions").array(), // Array of mentioned user IDs
  isEdited: boolean("is_edited").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLessonCommentSchema = createInsertSchema(lessonComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isEdited: true,
});

export type InsertLessonComment = z.infer<typeof insertLessonCommentSchema>;
export type LessonComment = typeof lessonComments.$inferSelect;

// Comment with author info
export type LessonCommentWithAuthor = LessonComment & {
  authorFirstName: string | null;
  authorLastName: string | null;
  authorRole: string | null;
  replies?: LessonCommentWithAuthor[];
};

// Notification types
export const NOTIFICATION_TYPES = [
  'announcement',
  'message',
  'mention',
  'grade',
  'enrollment',
  'forum_reply',
  'lesson_comment',
  'assignment_due',
  'course_update',
  // Group 8 — Alerts & Notifications
  'alert_critical',
  'alert_inconsistency',
  'alert_watchlist_digest',
  'alert_watchlist_event',
  'alert_founder_pulse',
  'alert_custom_rule',
] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];

export const NOTIFICATION_SEVERITIES = ['info', 'positive', 'warning', 'critical'] as const;
export type NotificationSeverity = typeof NOTIFICATION_SEVERITIES[number];

export const NOTIFICATION_CATEGORIES = ['system', 'signal', 'alert', 'review', 'social', 'learning'] as const;
export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[number];

// Notifications table - User notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 40 }).notNull(),
  title: text("title").notNull(),
  content: text("content"),
  linkUrl: text("link_url"), // Where to navigate when clicked
  relatedId: varchar("related_id"), // ID of related entity (course, message, etc.)
  // Group 8 additions: severity drives bell color; category enables filtering;
  // pushPayload is a placeholder for future mobile push delivery (no-op now).
  severity: varchar("severity", { length: 20 }).notNull().default("info"),
  category: varchar("category", { length: 30 }).notNull().default("system"),
  pushPayload: jsonb("push_payload"),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ============================================
// Phase 4: Gradebook & Enhanced Grading
// ============================================

// Grade categories for weighted grading
export const gradeCategories = pgTable("grade_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Assignments", "Quizzes", "Participation"
  weight: integer("weight").notNull().default(100), // Percentage weight (0-100)
  dropLowest: integer("drop_lowest").default(0), // Number of lowest grades to drop
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGradeCategorySchema = createInsertSchema(gradeCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertGradeCategory = z.infer<typeof insertGradeCategorySchema>;
export type GradeCategory = typeof gradeCategories.$inferSelect;

// Rubrics table - Grading rubrics for assignments
export const rubrics = pgTable("rubrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  totalPoints: integer("total_points").notNull().default(100),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRubricSchema = createInsertSchema(rubrics).omit({
  id: true,
  createdAt: true,
});

export type InsertRubric = z.infer<typeof insertRubricSchema>;
export type Rubric = typeof rubrics.$inferSelect;

// Rubric criteria table - Individual criteria within a rubric
export const rubricCriteria = pgTable("rubric_criteria", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rubricId: varchar("rubric_id").notNull().references(() => rubrics.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  maxPoints: integer("max_points").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
});

export const insertRubricCriteriaSchema = createInsertSchema(rubricCriteria).omit({
  id: true,
});

export type InsertRubricCriteria = z.infer<typeof insertRubricCriteriaSchema>;
export type RubricCriteria = typeof rubricCriteria.$inferSelect;

// Rubric levels table - Performance levels for each criterion
export const rubricLevels = pgTable("rubric_levels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  criteriaId: varchar("criteria_id").notNull().references(() => rubricCriteria.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Excellent", "Good", "Needs Improvement"
  description: text("description"),
  points: integer("points").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
});

export const insertRubricLevelSchema = createInsertSchema(rubricLevels).omit({
  id: true,
});

export type InsertRubricLevel = z.infer<typeof insertRubricLevelSchema>;
export type RubricLevel = typeof rubricLevels.$inferSelect;

// Rubric with all criteria and levels
export type RubricWithCriteria = Rubric & {
  criteria: (RubricCriteria & { levels: RubricLevel[] })[];
};

// Rubric scores table - Scores applied to submissions
export const rubricScores = pgTable("rubric_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => courseSubmissions.id, { onDelete: "cascade" }),
  criteriaId: varchar("criteria_id").notNull().references(() => rubricCriteria.id, { onDelete: "cascade" }),
  levelId: varchar("level_id").references(() => rubricLevels.id, { onDelete: "set null" }),
  score: integer("score").notNull(),
  comment: text("comment"), // Inline feedback for this criterion
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRubricScoreSchema = createInsertSchema(rubricScores).omit({
  id: true,
  createdAt: true,
});

export type InsertRubricScore = z.infer<typeof insertRubricScoreSchema>;
export type RubricScore = typeof rubricScores.$inferSelect;

// Gradebook entries table - Aggregated grades per student per course
export const gradebookEntries = pgTable("gradebook_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").references(() => gradeCategories.id, { onDelete: "set null" }),
  taskId: varchar("task_id").references(() => courseTasks.id, { onDelete: "cascade" }),
  score: integer("score"), // Points earned
  maxScore: integer("max_score"), // Maximum possible points
  letterGrade: varchar("letter_grade", { length: 5 }), // A, B+, etc.
  isExcused: boolean("is_excused").notNull().default(false),
  notes: text("notes"), // Teacher notes
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_gradebook_entry").on(table.courseId, table.userId, table.taskId),
]);

export const insertGradebookEntrySchema = createInsertSchema(gradebookEntries).omit({
  id: true,
  updatedAt: true,
});

export type InsertGradebookEntry = z.infer<typeof insertGradebookEntrySchema>;
export type GradebookEntry = typeof gradebookEntries.$inferSelect;

// Gradebook entry with task info
export type GradebookEntryWithTask = GradebookEntry & {
  taskTitle: string | null;
  taskType: string | null;
  categoryName: string | null;
};

// Student gradebook summary
export type StudentGradeSummary = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  totalScore: number;
  totalMaxScore: number;
  percentage: number;
  letterGrade: string;
  categoryGrades: {
    categoryId: string;
    categoryName: string;
    weight: number;
    score: number;
    maxScore: number;
    percentage: number;
  }[];
};

// Validation schemas for Phase 3 & 4
export const createAnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  type: z.enum(ANNOUNCEMENT_TYPES).default("platform"),
  courseId: z.string().nullable().optional(),
  isPinned: z.boolean().default(false),
  expiresAt: z.string().nullable().optional(),
});

export const createThreadSchema = z.object({
  forumId: z.string().min(1, "Forum ID is required"),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});

export const createReplySchema = z.object({
  threadId: z.string().min(1, "Thread ID is required"),
  content: z.string().min(1, "Content is required"),
  parentReplyId: z.string().nullable().optional(),
});

export const sendMessageSchema = z.object({
  recipientId: z.string().min(1, "Recipient is required"),
  subject: z.string().optional(),
  content: z.string().min(1, "Message content is required"),
});

// WhatsApp-style chat message schema
export const sendChatMessageSchema = z.object({
  recipientId: z.string().min(1, "Recipient is required"),
  content: z.string().min(1, "Message content is required"),
  mentions: z.array(z.string()).optional(),
});

export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;

export const createLessonCommentSchema = z.object({
  lessonId: z.string().min(1, "Lesson ID is required"),
  content: z.string().min(1, "Comment is required"),
  parentCommentId: z.string().nullable().optional(),
  mentions: z.array(z.string()).optional(),
});

export const createGradeCategorySchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  name: z.string().min(1, "Category name is required"),
  weight: z.number().min(0).max(100),
  dropLowest: z.number().min(0).optional(),
  orderIndex: z.number().optional(),
});

export const createRubricSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  name: z.string().min(1, "Rubric name is required"),
  description: z.string().optional(),
  criteria: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    maxPoints: z.number().min(1),
    levels: z.array(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      points: z.number().min(0),
    })),
  })),
});

export const gradeWithRubricSchema = z.object({
  submissionId: z.string().min(1, "Submission ID is required"),
  scores: z.array(z.object({
    criteriaId: z.string().min(1),
    levelId: z.string().nullable().optional(),
    score: z.number().min(0),
    comment: z.string().optional(),
  })),
  overallFeedback: z.string().optional(),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type CreateThreadInput = z.infer<typeof createThreadSchema>;
export type CreateReplyInput = z.infer<typeof createReplySchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateLessonCommentInput = z.infer<typeof createLessonCommentSchema>;
export type CreateGradeCategoryInput = z.infer<typeof createGradeCategorySchema>;
export type CreateRubricInput = z.infer<typeof createRubricSchema>;
export type GradeWithRubricInput = z.infer<typeof gradeWithRubricSchema>;

// ==================== Career Portal ====================

export const jobOpenings = pgTable("job_openings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  department: text("department").notNull(),
  location: text("location").notNull(),
  employmentType: varchar("employment_type", { length: 30 }).notNull().default("full-time"),
  description: text("description").notNull(),
  requirements: text("requirements"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryCurrency: varchar("salary_currency", { length: 10 }).default("RUB"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  isPartner: boolean("is_partner").notNull().default(false),
  isHighlighted: boolean("is_highlighted").notNull().default(false),
  isFounderProject: boolean("is_founder_project").notNull().default(false),
  companyName: text("company_name"),
  companyLogoUrl: text("company_logo_url"),
  founderName: text("founder_name"),
  founderProjectName: text("founder_project_name"),
  founderLogoUrl: text("founder_logo_url"),
  submittedBy: varchar("submitted_by").references(() => users.id, { onDelete: "set null" }),
  experienceLevel: varchar("experience_level", { length: 30 }),
  viewCount: integer("view_count").notNull().default(0),
  paymentFrequency: varchar("payment_frequency", { length: 30 }),
  accentColor: varchar("accent_color", { length: 20 }),
  metroStations: text("metro_stations"),
  isVerified: boolean("is_verified").notNull().default(false),
  publishedAt: timestamp("published_at"),
  field: varchar("field", { length: 50 }),
  specialization: varchar("specialization", { length: 100 }),
  companyDescription: text("company_description"),
  companyType: varchar("company_type", { length: 50 }),
  schedule: varchar("schedule", { length: 50 }),
  workHours: varchar("work_hours", { length: 30 }),
  isRemote: boolean("is_remote").notNull().default(false),
  isSpecialBranding: boolean("is_special_branding").notNull().default(false),
  specialBrandingColor: varchar("special_branding_color", { length: 20 }),
  specialBrandingLogoUrl: text("special_branding_logo_url"),
  specialBrandingBannerUrl: text("special_branding_banner_url"),
  corporateCompanyId: varchar("corporate_company_id").references(() => companies.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertJobOpeningSchema = createInsertSchema(jobOpenings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertJobOpening = z.infer<typeof insertJobOpeningSchema>;
export type JobOpening = typeof jobOpenings.$inferSelect;

export const jobApplications = pgTable("job_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobOpenings.id, { onDelete: "cascade" }),
  candidateId: varchar("candidate_id").references(() => users.id, { onDelete: "set null" }),
  applicantName: text("applicant_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  resumeText: text("resume_text"),
  resumeUrl: text("resume_url"),
  coverLetter: text("cover_letter"),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  status: true,
  createdAt: true,
});

export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;

export const jobApplicationMessages = pgTable("job_application_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => jobApplications.id, { onDelete: "cascade" }),
  senderType: varchar("sender_type", { length: 20 }).notNull(),
  senderId: varchar("sender_id"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertJobApplicationMessageSchema = createInsertSchema(jobApplicationMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertJobApplicationMessage = z.infer<typeof insertJobApplicationMessageSchema>;
export type JobApplicationMessage = typeof jobApplicationMessages.$inferSelect;

export const createJobOpeningSchema = z.object({
  title: z.string().min(1, "Title is required"),
  department: z.string().optional().default(""),
  location: z.string().optional().default(""),
  employmentType: z.enum(["full-time", "part-time", "internship"]).optional().default("full-time"),
  description: z.string().min(1, "Description is required"),
  requirements: z.string().nullable().optional(),
  salaryMin: z.number().nullable().optional(),
  salaryMax: z.number().nullable().optional(),
  salaryCurrency: z.string().optional(),
  status: z.enum(["draft", "open", "closed", "pending_review", "rejected"]).optional(),
  isPartner: z.boolean().optional(),
  isHighlighted: z.boolean().optional(),
  isFounderProject: z.boolean().optional(),
  companyName: z.string().nullable().optional(),
  companyLogoUrl: z.string().nullable().optional(),
  founderName: z.string().nullable().optional(),
  founderProjectName: z.string().nullable().optional(),
  founderLogoUrl: z.string().nullable().optional(),
  submittedBy: z.string().nullable().optional(),
  experienceLevel: z.string().nullable().optional(),
  paymentFrequency: z.string().nullable().optional(),
  accentColor: z.string().nullable().optional(),
  metroStations: z.string().nullable().optional(),
  isVerified: z.boolean().optional(),
  isSpecialBranding: z.boolean().optional(),
  specialBrandingColor: z.string().nullable().optional(),
  specialBrandingLogoUrl: z.string().nullable().optional(),
  specialBrandingBannerUrl: z.string().nullable().optional(),
  corporateCompanyId: z.string().nullable().optional(),
});

export const applyJobSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  applicantName: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().nullable().optional(),
  resumeText: z.string().nullable().optional(),
  resumeUrl: z.string().nullable().optional(),
  coverLetter: z.string().nullable().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(["new", "reviewing", "interview", "offered", "rejected", "hired"]),
});

export const sendApplicationMessageSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  senderType: z.enum(["admin", "candidate"]),
  senderId: z.string().nullable().optional(),
  content: z.string().min(1, "Message content is required"),
});

export type CreateJobOpeningInput = z.infer<typeof createJobOpeningSchema>;
export type ApplyJobInput = z.infer<typeof applyJobSchema>;
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;
export type SendApplicationMessageInput = z.infer<typeof sendApplicationMessageSchema>;

export const candidateRegisterSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
});

export const candidateLoginSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
  password: z.string().min(1, "Password is required"),
});

export type CandidateRegisterInput = z.infer<typeof candidateRegisterSchema>;
export type CandidateLoginInput = z.infer<typeof candidateLoginSchema>;

// ============================================================
// STARTUP & INNOVATION PLATFORM TABLES
// ============================================================

// --- Companies (Corporate Innovation Accounts) ---
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  logo: text("logo"),
  industry: text("industry"),
  description: text("description"),
  focusAreas: text("focus_areas"),
  website: text("website"),
  contactEmail: text("contact_email"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
});
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  logo: z.string().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
  focusAreas: z.string().optional(),
  website: z.string().optional(),
  contactEmail: z.string().email().optional(),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

// --- Company Users (Corporate Team Members) ---
// Corporation roles (Ventorix hierarchy):
// headAdmin → admin + headAdminProgram → analyst + adminProgram → participant → member (invited only)
export const COMPANY_ROLES = ["member", "participant", "analyst", "mentor", "adminProgram", "headAdminProgram", "companyAdmin", "companyReviewer", "innovationLead", "headAdmin"] as const;
export type CompanyRole = typeof COMPANY_ROLES[number];

export const companyUsers = pgTable("company_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  companyId: varchar("company_id").notNull(),
  role: varchar("role", { length: 30 }).notNull().default("analyst"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [unique("company_user_unique").on(table.userId, table.companyId)]);

export const insertCompanyUserSchema = createInsertSchema(companyUsers).omit({
  id: true,
  createdAt: true,
});
export type InsertCompanyUser = z.infer<typeof insertCompanyUserSchema>;
export type CompanyUser = typeof companyUsers.$inferSelect;

// --- Startups ---
export const STARTUP_STAGES = ["idea", "mvp", "seed", "seriesA", "seriesB", "growth", "scaleUp"] as const;
export type StartupStage = typeof STARTUP_STAGES[number];

export const startups = pgTable("startups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  website: text("website"),
  vertical: text("vertical"),
  stage: varchar("stage", { length: 20 }).default("idea"),
  techStack: text("tech_stack"),
  hqCity: text("hq_city"),
  teamSize: integer("team_size"),
  logo: text("logo"),
  pitchDeckUrl: text("pitch_deck_url"),
  universityAffiliation: text("university_affiliation"),
  programAffiliation: text("program_affiliation"),
  // --- Public-signal config (Task #20 / Group 1 parsers) ---
  domain: text("domain"),
  githubRepoUrl: text("github_repo_url"),
  telegramChannel: text("telegram_channel"),
  hhEmployerId: text("hh_employer_id"),
  inn: varchar("inn", { length: 20 }),
  appStoreIds: jsonb("app_store_ids").$type<{ appStore?: string; googlePlay?: string; ruStore?: string }>(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  // Last time the startup showed any sign of life: a founder action on the
  // platform OR a signal event from any integrated source. Drives the
  // active/inactive activity status (see STARTUP_INACTIVITY_DAYS).
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStartupSchema = createInsertSchema(startups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStartup = z.infer<typeof insertStartupSchema>;
export type Startup = typeof startups.$inferSelect;

// A startup is "active" when its lastActivityAt is within this many days; if
// nothing — neither a founder action nor any integrated signal source — has
// touched it for longer than this window, it's flagged "inactive".
export const STARTUP_INACTIVITY_DAYS = 180;
export type StartupActivityStatus = "active" | "inactive";

export function deriveStartupActivityStatus(
  lastActivityAt: Date | string | null | undefined,
  now: Date = new Date(),
): StartupActivityStatus {
  if (!lastActivityAt) return "inactive";
  const ts = lastActivityAt instanceof Date ? lastActivityAt : new Date(lastActivityAt);
  if (Number.isNaN(ts.getTime())) return "inactive";
  const ageDays = (now.getTime() - ts.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays <= STARTUP_INACTIVITY_DAYS ? "active" : "inactive";
}

export const createStartupSchema = z.object({
  name: z.string().min(1, "Startup name is required"),
  description: z.string().optional(),
  website: z.string().optional(),
  vertical: z.string().optional(),
  stage: z.enum(STARTUP_STAGES).optional(),
  techStack: z.string().optional(),
  hqCity: z.string().optional(),
  teamSize: z.number().int().positive().optional(),
  logo: z.string().optional(),
  pitchDeckUrl: z.string().optional(),
  universityAffiliation: z.string().optional(),
  programAffiliation: z.string().optional(),
  domain: z.string().optional(),
  githubRepoUrl: z.string().optional(),
  telegramChannel: z.string().optional(),
  hhEmployerId: z.string().optional(),
  inn: z.string().optional(),
  appStoreIds: z.object({
    appStore: z.string().optional(),
    googlePlay: z.string().optional(),
    ruStore: z.string().optional(),
  }).optional(),
});
export type CreateStartupInput = z.infer<typeof createStartupSchema>;

// --- Event presenting startups (pitch day / demo day showcase) ---
// Fully self-contained showcase entries: a startup does NOT need to exist on the
// platform. Admins enter all details inline (incl. uploaded pitch deck PDF/PPTX and
// a demo video) per event.
export const showcaseCofounderSchema = z.object({
  name: z.string().min(1),
  telegram: z.string().trim().optional().default(""),
  avatarUrl: z.string().trim().optional().default(""),
});
export type ShowcaseCofounder = z.infer<typeof showcaseCofounderSchema>;

export const eventShowcaseStartups = pgTable("event_showcase_startups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  shortDescription: text("short_description"),
  longDescription: text("long_description"),
  sector: varchar("sector", { length: 80 }),
  presentationUrl: text("presentation_url"),
  presentationPdfUrl: text("presentation_pdf_url"),
  presentationPptxUrl: text("presentation_pptx_url"),
  websiteUrl: text("website_url"),
  founderName: text("founder_name"),
  founderAvatarUrl: text("founder_avatar_url"),
  founderTelegram: text("founder_telegram"),
  cofounders: jsonb("cofounders").$type<ShowcaseCofounder[]>().default(sql`'[]'::jsonb`),
  videoUrl: text("video_url"),
  logoUrl: text("logo_url"),
  coverImageUrl: text("cover_image_url"),
  materialImages: jsonb("material_images").$type<string[]>().default(sql`'[]'::jsonb`),
  displayOrder: integer("display_order").notNull().default(0),
  // Set once this pitch-day project has been imported into the main platform
  // startups directory (see POST .../import-to-platform). Prevents re-import.
  platformStartupId: varchar("platform_startup_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEventShowcaseStartupSchema = createInsertSchema(eventShowcaseStartups, {
  cofounders: z.array(showcaseCofounderSchema).optional(),
  materialImages: z.array(z.string()).optional(),
})
  .omit({ id: true, eventId: true, createdAt: true, platformStartupId: true })
  .extend({
    name: z.string().trim().min(1, "Name is required"),
  });
export type InsertEventShowcaseStartup = z.infer<typeof insertEventShowcaseStartupSchema>;
export type EventShowcaseStartup = typeof eventShowcaseStartups.$inferSelect;

// Public (unauthenticated) showcase view. Anonymous visitors may see a project's
// name, sector, short description, cover, logo, website link, founder/cofounder
// names + avatars, and attached photos — but NEVER founder contacts (telegram),
// presentation files/links, demo video, or the long description. The server
// sanitizes every startup into this shape before returning it publicly.
export type PublicShowcaseEvent = {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  eventType: string | null;
  description: string | null;
  customImage: string | null;
  photos: string[] | null;
  showcaseSlug: string | null;
};
// Flags describing which private sections exist for a project. The public view
// shows a "locked — verify to access" placeholder for each `true` flag instead
// of the actual content, which is never sent to anonymous visitors.
export type PublicShowcaseLocked = {
  longDescription: boolean;
  materials: boolean;
  video: boolean;
  contact: boolean;
};
export type PublicShowcaseStartup = {
  id: string;
  name: string;
  sector: string | null;
  shortDescription: string | null;
  websiteUrl: string | null;
  founderName: string | null;
  founderAvatarUrl: string | null;
  cofounders: { name: string; avatarUrl: string }[];
  logoUrl: string | null;
  coverImageUrl: string | null;
  materialImages: string[];
  locked: PublicShowcaseLocked;
};
export type PublicShowcaseResponse = {
  event: PublicShowcaseEvent;
  startups: PublicShowcaseStartup[];
};

// --- Startup Members ---
export const STARTUP_MEMBER_ROLES = ["founder", "cofounder", "teamMember", "advisor"] as const;
export type StartupMemberRole = typeof STARTUP_MEMBER_ROLES[number];

export const startupMembers = pgTable("startup_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startupId: varchar("startup_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("teamMember"),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [unique("startup_member_unique").on(table.startupId, table.userId)]);

export const insertStartupMemberSchema = createInsertSchema(startupMembers).omit({
  id: true,
  createdAt: true,
});
export type InsertStartupMember = z.infer<typeof insertStartupMemberSchema>;
export type StartupMember = typeof startupMembers.$inferSelect;

export type StartupMemberWithUser = StartupMember & {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImageUrl: string | null;
    tag: string | null;
  };
};

// --- Team Members (Group 2: founder & team social trackers) ---
// Lightweight roster of founders / key team members that signal sources poll.
// Distinct from `startupMembers` (which links platform users to a startup).
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startupId: varchar("startup_id").notNull().references(() => startups.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  role: text("role"),
  isFounder: boolean("is_founder").notNull().default(false),
  linkedinUrl: text("linkedin_url"),
  twitterHandle: text("twitter_handle"),
  vkUrl: text("vk_url"),
  habrCareerUrl: text("habr_career_url"),
  youtubeChannelId: text("youtube_channel_id"),
  lastKnownPosition: text("last_known_position"),
  lastConnectionCount: integer("last_connection_count"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_team_members_startup").on(table.startupId),
]);

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

export const createTeamMemberSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  role: z.string().optional().nullable(),
  isFounder: z.boolean().optional(),
  linkedinUrl: z.string().url().optional().nullable().or(z.literal("")),
  twitterHandle: z.string().optional().nullable(),
  vkUrl: z.string().url().optional().nullable().or(z.literal("")),
  habrCareerUrl: z.string().url().optional().nullable().or(z.literal("")),
  youtubeChannelId: z.string().optional().nullable(),
});
export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;

export const FOUNDER_PULSE_STATUSES = ["active", "quiet", "silent"] as const;
export type FounderPulseStatus = typeof FOUNDER_PULSE_STATUSES[number];
export type FounderPulse = {
  status: FounderPulseStatus;
  lastActivityAt: string | null;
  eventsLast21Days: number;
  // Group 8.5 — per-channel event counts in the same 21d window. Optional
  // for backwards compatibility with older callers.
  channelBreakdown?: Record<string, number>;
  lastNudgeAt?: string | null;
};

// --- Startup Metrics (Monthly Snapshots) ---
export const startupMetrics = pgTable("startup_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startupId: varchar("startup_id").notNull(),
  month: varchar("month", { length: 7 }).notNull(),
  users: integer("users"),
  revenue: integer("revenue"),
  pilots: integer("pilots"),
  mrr: integer("mrr"),
  customMetrics: jsonb("custom_metrics"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStartupMetricSchema = createInsertSchema(startupMetrics).omit({
  id: true,
  createdAt: true,
});
export type InsertStartupMetric = z.infer<typeof insertStartupMetricSchema>;
export type StartupMetric = typeof startupMetrics.$inferSelect;

// --- Briefs (Corporate Startup Scouting Requests) ---
export const BRIEF_STATUSES = ["draft", "open", "closed", "archived"] as const;
export type BriefStatus = typeof BRIEF_STATUSES[number];

export const briefs = pgTable("briefs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  vertical: text("vertical"),
  targetStage: varchar("target_stage", { length: 20 }),
  technologies: text("technologies"),
  geography: text("geography"),
  timeline: text("timeline"),
  budgetFormat: text("budget_format"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBriefSchema = createInsertSchema(briefs).omit({
  id: true,
  createdAt: true,
});
export type InsertBrief = z.infer<typeof insertBriefSchema>;
export type Brief = typeof briefs.$inferSelect;

export const createBriefSchema = z.object({
  companyId: z.string().min(1),
  title: z.string().min(1, "Brief title is required"),
  description: z.string().optional(),
  vertical: z.string().optional(),
  targetStage: z.string().optional(),
  technologies: z.string().optional(),
  geography: z.string().optional(),
  timeline: z.string().optional(),
  budgetFormat: z.string().optional(),
});
export type CreateBriefInput = z.infer<typeof createBriefSchema>;

// --- Brief Applications ---
export const BRIEF_APP_STATUSES = ["new", "underReview", "shortlisted", "pilot", "rejected"] as const;
export type BriefAppStatus = typeof BRIEF_APP_STATUSES[number];

export const briefApplications = pgTable("brief_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  briefId: varchar("brief_id").notNull(),
  startupId: varchar("startup_id").notNull(),
  fitDescription: text("fit_description"),
  useCase: text("use_case"),
  metricsHighlight: text("metrics_highlight"),
  pitchDeckUrl: text("pitch_deck_url"),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [unique("brief_app_unique").on(table.briefId, table.startupId)]);

export const insertBriefApplicationSchema = createInsertSchema(briefApplications).omit({
  id: true,
  createdAt: true,
});
export type InsertBriefApplication = z.infer<typeof insertBriefApplicationSchema>;
export type BriefApplication = typeof briefApplications.$inferSelect;

export type BriefApplicationWithStartup = BriefApplication & {
  startup: { id: string; name: string; logo: string | null; vertical: string | null; stage: string | null; universityAffiliation?: string | null };
};

export const applyToBriefSchema = z.object({
  briefId: z.string().min(1),
  startupId: z.string().min(1),
  fitDescription: z.string().optional(),
  useCase: z.string().optional(),
  metricsHighlight: z.string().optional(),
  pitchDeckUrl: z.string().optional(),
});
export type ApplyToBriefInput = z.infer<typeof applyToBriefSchema>;

// --- Programs (Accelerator / Corporate Tracks) ---
export const PROGRAM_STATUSES = ["draft", "applications", "selection", "active", "demoDay", "completed"] as const;
export type ProgramStatus = typeof PROGRAM_STATUSES[number];

export const programs = pgTable("programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id"),
  name: text("name").notNull(),
  theme: text("theme"),
  cohort: text("cohort"),
  description: text("description"),
  targetGroup: text("target_group"),
  capacity: integer("capacity"),
  logoUrl: text("logo_url"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProgramSchema = createInsertSchema(programs).omit({
  id: true,
  createdAt: true,
});
export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type Program = typeof programs.$inferSelect;

export const createProgramSchema = z.object({
  companyId: z.string().optional(),
  name: z.string().min(1, "Program name is required"),
  theme: z.string().optional(),
  cohort: z.string().optional(),
  description: z.string().optional(),
  targetGroup: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type CreateProgramInput = z.infer<typeof createProgramSchema>;

// Program roles (Ventorix hierarchy): headAdmin → admin → participant
export const PROGRAM_PARTICIPANT_ROLES = ["participant", "founder", "mentor", "expert", "judge", "admin", "headAdmin"] as const;
export type ProgramParticipantRole = typeof PROGRAM_PARTICIPANT_ROLES[number];

export const programParticipants = pgTable("program_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull(),
  startupId: varchar("startup_id"),
  userId: varchar("user_id"),
  role: varchar("role", { length: 30 }).notNull().default("participant"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProgramParticipantSchema = createInsertSchema(programParticipants).omit({
  id: true,
  createdAt: true,
});
export type InsertProgramParticipant = z.infer<typeof insertProgramParticipantSchema>;
export type ProgramParticipant = typeof programParticipants.$inferSelect;

// --- Evaluations (Multi-Reviewer Scoring) ---
export const EVAL_ENTITY_TYPES = ["startup", "briefApplication", "programParticipant"] as const;
export type EvalEntityType = typeof EVAL_ENTITY_TYPES[number];

export const evaluations = pgTable("evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type", { length: 30 }).notNull(),
  entityId: varchar("entity_id").notNull(),
  evaluatorId: varchar("evaluator_id").notNull(),
  companyId: varchar("company_id"),
  teamScore: integer("team_score"),
  productScore: integer("product_score"),
  marketScore: integer("market_score"),
  tractionScore: integer("traction_score"),
  strategicFitScore: integer("strategic_fit_score"),
  riskScore: integer("risk_score"),
  totalScore: integer("total_score"),
  comments: text("comments"),
  flags: text("flags"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEvaluationSchema = createInsertSchema(evaluations).omit({
  id: true,
  createdAt: true,
});
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;
export type Evaluation = typeof evaluations.$inferSelect;

export const createEvaluationSchema = z.object({
  entityType: z.enum(EVAL_ENTITY_TYPES),
  entityId: z.string().min(1),
  companyId: z.string().optional(),
  teamScore: z.number().int().min(0).max(10).optional(),
  productScore: z.number().int().min(0).max(10).optional(),
  marketScore: z.number().int().min(0).max(10).optional(),
  tractionScore: z.number().int().min(0).max(10).optional(),
  strategicFitScore: z.number().int().min(0).max(10).optional(),
  riskScore: z.number().int().min(0).max(10).optional(),
  comments: z.string().optional(),
  flags: z.string().optional(),
});
export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;

// --- Startup-Company Relations (Pipeline / CRM) ---
export const PIPELINE_STATUSES = ["discovered", "inEvaluation", "inPilot", "inScaleUp", "archived"] as const;
export type PipelineStatus = typeof PIPELINE_STATUSES[number];

export const startupCompanyRelations = pgTable("startup_company_relations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startupId: varchar("startup_id").notNull(),
  companyId: varchar("company_id").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("discovered"),
  tags: jsonb("tags"),
  lastContacted: timestamp("last_contacted"),
  ownerUserId: varchar("owner_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [unique("startup_company_rel_unique").on(table.startupId, table.companyId)]);

export const insertStartupCompanyRelationSchema = createInsertSchema(startupCompanyRelations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStartupCompanyRelation = z.infer<typeof insertStartupCompanyRelationSchema>;
export type StartupCompanyRelation = typeof startupCompanyRelations.$inferSelect;

export type StartupCompanyRelationWithStartup = StartupCompanyRelation & {
  startup: { id: string; name: string; logo: string | null; vertical: string | null; stage: string | null; universityAffiliation?: string | null };
};

// --- Company Notes (Internal CRM Notes) ---
export const companyNotes = pgTable("company_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  startupId: varchar("startup_id"),
  authorId: varchar("author_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompanyNoteSchema = createInsertSchema(companyNotes).omit({
  id: true,
  createdAt: true,
});
export type InsertCompanyNote = z.infer<typeof insertCompanyNoteSchema>;
export type CompanyNote = typeof companyNotes.$inferSelect;

export type CompanyNoteWithAuthor = CompanyNote & {
  author: { id: string; firstName: string | null; lastName: string | null; profileImageUrl: string | null };
};

export const createCompanyNoteSchema = z.object({
  companyId: z.string().min(1),
  startupId: z.string().optional(),
  content: z.string().min(1, "Note content is required"),
});
export type CreateCompanyNoteInput = z.infer<typeof createCompanyNoteSchema>;

// ============================================================
// MULTI-INSTITUTION & COMMUNITY LAYER
// ============================================================

export const UNIVERSITY_TYPES = ["university", "hub", "acceleratorPartner"] as const;
export type UniversityType = typeof UNIVERSITY_TYPES[number];

export const universities = pgTable("universities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  city: text("city"),
  region: text("region"),
  type: varchar("type", { length: 30 }).notNull().default("university"),
  logoUrl: text("logo_url"),
  website: text("website"),
  shortDescription: text("short_description"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUniversitySchema = createInsertSchema(universities).omit({ id: true, createdAt: true });
export type InsertUniversity = z.infer<typeof insertUniversitySchema>;
export type University = typeof universities.$inferSelect;

export const createUniversitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  city: z.string().optional(),
  region: z.string().optional(),
  type: z.enum(UNIVERSITY_TYPES).optional(),
  logoUrl: z.string().optional(),
  website: z.string().optional(),
  shortDescription: z.string().optional(),
});
export type CreateUniversityInput = z.infer<typeof createUniversitySchema>;

export const CLUB_FOCUSES = ["entrepreneurship", "ai", "fintech", "product", "consulting", "marketing", "other"] as const;
export type ClubFocus = typeof CLUB_FOCUSES[number];

export const CLUB_TIERS = ["basic", "pro", "pro_plus"] as const;
export type ClubTier = typeof CLUB_TIERS[number];

export const clubs = pgTable("clubs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  universityId: varchar("university_id").references(() => universities.id, { onDelete: "set null" }),
  focus: varchar("focus", { length: 30 }),
  description: text("description"),
  logoUrl: text("logo_url"),
  isOfficial: boolean("is_official").notNull().default(false),
  isPartnerClub: boolean("is_partner_club").notNull().default(false),
  tier: varchar("tier", { length: 20 }).notNull().default("basic"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClubSchema = createInsertSchema(clubs).omit({ id: true, createdAt: true });
export type InsertClub = z.infer<typeof insertClubSchema>;
export type Club = typeof clubs.$inferSelect;

export const createClubSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  universityId: z.string().optional(),
  focus: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  isOfficial: z.boolean().optional(),
  isPartnerClub: z.boolean().optional(),
});
export type CreateClubInput = z.infer<typeof createClubSchema>;

// University roles (Ventorix hierarchy):
// headAdmin → admin → headAdminProgram / headAdminCourses / headAdminClub → adminProgram / adminClub → teacher → member
export const UNI_MEMBERSHIP_ROLES = ["member", "student", "alumni", "staff", "mentor", "teacher", "adminClub", "headAdminClub", "adminProgram", "headAdminProgram", "headAdminCourses", "admin", "headAdmin"] as const;
export type UniMembershipRole = typeof UNI_MEMBERSHIP_ROLES[number];

export const MEMBERSHIP_STATUSES = ["pending", "approved", "rejected"] as const;
export type MembershipStatus = typeof MEMBERSHIP_STATUSES[number];

export type MembershipPermissions = {
  canCreateEvents?: boolean;
  canCreateVacancies?: boolean;
  canManageMembers?: boolean;
};

export const userUniversityMemberships = pgTable("user_university_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  universityId: varchar("university_id").notNull().references(() => universities.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 30 }).notNull().default("student"),
  status: varchar("status", { length: 20 }).notNull().default("approved"),
  permissions: jsonb("permissions").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [unique("user_uni_unique").on(table.userId, table.universityId)]);

export const insertUserUniversityMembershipSchema = createInsertSchema(userUniversityMemberships).omit({ id: true, createdAt: true });
export type InsertUserUniversityMembership = z.infer<typeof insertUserUniversityMembershipSchema>;
export type UserUniversityMembership = typeof userUniversityMemberships.$inferSelect;

// Club roles (Ventorix hierarchy): headAdmin → admin → member
export const CLUB_MEMBERSHIP_ROLES = ["member", "leader", "organizer", "mentor", "admin", "headAdmin"] as const;
export type ClubMembershipRole = typeof CLUB_MEMBERSHIP_ROLES[number];

export const userClubMemberships = pgTable("user_club_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clubId: varchar("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull().default("member"),
  status: varchar("status", { length: 20 }).notNull().default("approved"),
  permissions: jsonb("permissions").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [unique("user_club_unique").on(table.userId, table.clubId)]);

export const insertUserClubMembershipSchema = createInsertSchema(userClubMemberships).omit({ id: true, createdAt: true });
export type InsertUserClubMembership = z.infer<typeof insertUserClubMembershipSchema>;
export type UserClubMembership = typeof userClubMemberships.$inferSelect;

export const startupAffiliations = pgTable("startup_affiliations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startupId: varchar("startup_id").notNull().references(() => startups.id, { onDelete: "cascade" }),
  universityId: varchar("university_id").references(() => universities.id, { onDelete: "set null" }),
  clubId: varchar("club_id").references(() => clubs.id, { onDelete: "set null" }),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStartupAffiliationSchema = createInsertSchema(startupAffiliations).omit({ id: true, createdAt: true });
export type InsertStartupAffiliation = z.infer<typeof insertStartupAffiliationSchema>;
export type StartupAffiliation = typeof startupAffiliations.$inferSelect;

// ============================================================
// STARTUP READINESS & CORPORATE USE-CASE FIELDS
// ============================================================

export const startupReadiness = pgTable("startup_readiness", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startupId: varchar("startup_id").notNull().references(() => startups.id, { onDelete: "cascade" }).unique(),
  hasLiveB2BPilots: boolean("has_live_b2b_pilots").notNull().default(false),
  hasBankFintechExperience: boolean("has_bank_fintech_experience").notNull().default(false),
  isRegulated: boolean("is_regulated").notNull().default(false),
  isSecurityReviewed: boolean("is_security_reviewed").notNull().default(false),
  problemStatement: text("problem_statement"),
  targetUnits: text("target_units"),
  integrationModel: varchar("integration_model", { length: 30 }),
  dataRequirements: text("data_requirements"),
  existingReferences: text("existing_references"),
  completenessScore: integer("completeness_score").default(0),
  visibilityScope: varchar("visibility_scope", { length: 20 }).notNull().default("global"),
  visibleToCompanyIds: text("visible_to_company_ids").array(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStartupReadinessSchema = createInsertSchema(startupReadiness).omit({ id: true, updatedAt: true });
export type InsertStartupReadiness = z.infer<typeof insertStartupReadinessSchema>;
export type StartupReadiness = typeof startupReadiness.$inferSelect;

export const updateStartupReadinessSchema = z.object({
  hasLiveB2BPilots: z.boolean().optional(),
  hasBankFintechExperience: z.boolean().optional(),
  isRegulated: z.boolean().optional(),
  isSecurityReviewed: z.boolean().optional(),
  problemStatement: z.string().optional(),
  targetUnits: z.string().optional(),
  integrationModel: z.string().optional(),
  dataRequirements: z.string().optional(),
  existingReferences: z.string().optional(),
  visibilityScope: z.enum(["global", "companySpecific", "hidden"]).optional(),
  visibleToCompanyIds: z.array(z.string()).optional(),
});
export type UpdateStartupReadinessInput = z.infer<typeof updateStartupReadinessSchema>;

export const INTEGRATION_MODELS = ["saas", "onPrem", "api", "sdk", "hybrid"] as const;
export type IntegrationModel = typeof INTEGRATION_MODELS[number];

// ============================================================
// REVIEWER ASSIGNMENT & EVALUATION WORKFLOWS
// ============================================================

export const REVIEWER_STATUSES = ["assigned", "inReview", "done"] as const;
export type ReviewerStatus = typeof REVIEWER_STATUSES[number];

export const reviewerAssignments = pgTable("reviewer_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type", { length: 30 }).notNull(),
  entityId: varchar("entity_id").notNull(),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
  companyId: varchar("company_id").references(() => companies.id, { onDelete: "cascade" }),
  dueDate: timestamp("due_date"),
  status: varchar("status", { length: 20 }).notNull().default("assigned"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReviewerAssignmentSchema = createInsertSchema(reviewerAssignments).omit({ id: true, createdAt: true, completedAt: true });
export type InsertReviewerAssignment = z.infer<typeof insertReviewerAssignmentSchema>;
export type ReviewerAssignment = typeof reviewerAssignments.$inferSelect;

export type ReviewerAssignmentWithDetails = ReviewerAssignment & {
  reviewerFirstName: string | null;
  reviewerLastName: string | null;
  reviewerEmail: string | null;
  entityName: string | null;
};

export const createReviewerAssignmentSchema = z.object({
  entityType: z.enum(["briefApplication", "startup", "programParticipant"]),
  entityId: z.string().min(1),
  reviewerId: z.string().min(1),
  companyId: z.string().optional(),
  dueDate: z.string().optional(),
});
export type CreateReviewerAssignmentInput = z.infer<typeof createReviewerAssignmentSchema>;

// ============================================================
// ACTIVITY / AUDIT LOG
// ============================================================

export const ACTIVITY_ACTIONS = [
  "createdBrief", "updatedBrief", "closedBrief",
  "createdStartup", "updatedStartup",
  "changedPipelineStatus", "addedEvaluation",
  "assignedReviewer", "completedReview",
  "createdProgram", "addedParticipant",
  "changedVisibility", "addedNote",
  "other"
] as const;
export type ActivityAction = typeof ACTIVITY_ACTIONS[number];

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").notNull().references(() => users.id),
  actorType: varchar("actor_type", { length: 20 }).notNull().default("user"),
  companyId: varchar("company_id").references(() => companies.id, { onDelete: "cascade" }),
  actionType: varchar("action_type", { length: 30 }).notNull(),
  entityType: varchar("entity_type", { length: 30 }),
  entityId: varchar("entity_id"),
  entityName: text("entity_name"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export type ActivityLogWithActor = ActivityLog & {
  actorFirstName: string | null;
  actorLastName: string | null;
  actorEmail: string | null;
};

// ============================================================
// CORPORATION LEVELS & USAGE COUNTERS
// ============================================================

export const CORPORATION_LEVELS = [1, 2, 3] as const;
export type CorporationLevel = typeof CORPORATION_LEVELS[number];

export const PLAN_TIERS = ["level1", "level2", "level3"] as const;
export type PlanTier = typeof PLAN_TIERS[number];

export const CORPORATION_LEVEL_LIMITS = {
  1: {
    highlightedEventsPerMonth: 1,
    recommendedEventsPerMonth: 0,
    specialBrandingEvents: 0,
    canHighlightAllEvents: false,
    unlimitedVacancies: true,
    canHighlightVacancies: false,
    specialBrandingVacancies: 0,
    maxActivePrograms: 1,
    maxProgramParticipants: 100,
    maxBusinessTasks: 1,
    maxPendingApplications: 30,
  },
  2: {
    highlightedEventsPerMonth: -1,
    recommendedEventsPerMonth: 4,
    specialBrandingEvents: 1,
    canHighlightAllEvents: true,
    unlimitedVacancies: true,
    canHighlightVacancies: true,
    specialBrandingVacancies: 1,
    maxActivePrograms: 2,
    maxProgramParticipants: 500,
    maxBusinessTasks: 5,
    maxPendingApplications: 150,
  },
  3: {
    highlightedEventsPerMonth: -1,
    recommendedEventsPerMonth: 8,
    specialBrandingEvents: -1,
    canHighlightAllEvents: true,
    unlimitedVacancies: true,
    canHighlightVacancies: true,
    specialBrandingVacancies: -1,
    maxActivePrograms: -1,
    maxProgramParticipants: -1,
    maxBusinessTasks: -1,
    maxPendingApplications: -1,
  },
} as const;

export const companyPlans = pgTable("company_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }).unique(),
  tier: varchar("tier", { length: 20 }).notNull().default("level1"),
  corporationLevel: integer("corporation_level").notNull().default(1),
  maxBriefsPerYear: integer("max_briefs_per_year").notNull().default(3),
  maxProgramsPerYear: integer("max_programs_per_year").notNull().default(1),
  maxStartupsInPipeline: integer("max_startups_in_pipeline").notNull().default(50),
  maxCorporateUsers: integer("max_corporate_users").notNull().default(5),
  includedServices: text("included_services"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompanyPlanSchema = createInsertSchema(companyPlans).omit({ id: true, createdAt: true });
export type InsertCompanyPlan = z.infer<typeof insertCompanyPlanSchema>;
export type CompanyPlan = typeof companyPlans.$inferSelect;

export const createCompanyPlanSchema = z.object({
  companyId: z.string().min(1),
  tier: z.enum(PLAN_TIERS).optional(),
  corporationLevel: z.number().int().min(1).max(3).optional(),
  maxBriefsPerYear: z.number().int().positive().optional(),
  maxProgramsPerYear: z.number().int().positive().optional(),
  maxStartupsInPipeline: z.number().int().positive().optional(),
  maxCorporateUsers: z.number().int().positive().optional(),
  includedServices: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type CreateCompanyPlanInput = z.infer<typeof createCompanyPlanSchema>;

export const companyUsage = pgTable("company_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }).unique(),
  briefsYtd: integer("briefs_ytd").notNull().default(0),
  programsYtd: integer("programs_ytd").notNull().default(0),
  startupsInPipeline: integer("startups_in_pipeline").notNull().default(0),
  evaluationsYtd: integer("evaluations_ytd").notNull().default(0),
  currentUsers: integer("current_users").notNull().default(0),
  highlightedEventsThisMonth: integer("highlighted_events_this_month").notNull().default(0),
  recommendedEventsThisMonth: integer("recommended_events_this_month").notNull().default(0),
  specialBrandingEventsActive: integer("special_branding_events_active").notNull().default(0),
  highlightedVacanciesActive: integer("highlighted_vacancies_active").notNull().default(0),
  specialBrandingVacanciesActive: integer("special_branding_vacancies_active").notNull().default(0),
  activePrograms: integer("active_programs").notNull().default(0),
  activeProgramParticipants: integer("active_program_participants").notNull().default(0),
  activeBusinessTasks: integer("active_business_tasks").notNull().default(0),
  pendingApplications: integer("pending_applications").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCompanyUsageSchema = createInsertSchema(companyUsage).omit({ id: true, updatedAt: true });
export type InsertCompanyUsage = z.infer<typeof insertCompanyUsageSchema>;
export type CompanyUsage = typeof companyUsage.$inferSelect;

export type CompanyPlanWithUsage = CompanyPlan & {
  usage: CompanyUsage | null;
};

export function getCorporationLevelLimits(level: number) {
  const lvl = (level >= 1 && level <= 3 ? level : 1) as CorporationLevel;
  return CORPORATION_LEVEL_LIMITS[lvl];
}

// ============================================================
// ENTITY-LEVEL ROLE HIERARCHY HELPERS
// ============================================================

// University role tiers (higher number = more authority)
export const UNI_ROLE_TIERS: Record<string, number> = {
  member: 0, student: 0, alumni: 0,
  staff: 1, mentor: 1,
  teacher: 2,
  adminClub: 3, adminProgram: 3,
  headAdminClub: 4, headAdminProgram: 4, headAdminCourses: 4,
  admin: 5,
  headAdmin: 6,
};

// Club role tiers (higher number = more authority)
export const CLUB_ROLE_TIERS: Record<string, number> = {
  member: 0,
  leader: 1, organizer: 1, mentor: 1,
  admin: 2,
  headAdmin: 3,
};

// Corporation role tiers (higher number = more authority)
export const COMPANY_ROLE_TIERS: Record<string, number> = {
  member: 0,
  participant: 1,
  analyst: 2, mentor: 2, companyReviewer: 2,
  adminProgram: 3, innovationLead: 3,
  headAdminProgram: 4,
  companyAdmin: 5,
  headAdmin: 6,
};

// Club headAdmin (tier 3) is equivalent to university admin (tier 5) in cross-entity context
export const CLUB_HEAD_ADMIN_EQUIVALENT_UNI_TIER = 5; // equals "admin" in university

export function getUniRoleTier(role: string): number {
  return UNI_ROLE_TIERS[role] ?? 0;
}

export function getClubRoleTier(role: string): number {
  return CLUB_ROLE_TIERS[role] ?? 0;
}

export function getCompanyRoleTier(role: string): number {
  return COMPANY_ROLE_TIERS[role] ?? 0;
}

// Check if a role has at least the given tier in university context
export function hasUniRoleTier(role: string, minTier: number): boolean {
  return getUniRoleTier(role) >= minTier;
}

// Check if a role has at least the given tier in club context
export function hasClubRoleTier(role: string, minTier: number): boolean {
  return getClubRoleTier(role) >= minTier;
}

// Check if a role has at least the given tier in company context
export function hasCompanyRoleTier(role: string, minTier: number): boolean {
  return getCompanyRoleTier(role) >= minTier;
}

// Check if user is at least admin-tier in university (admin or headAdmin)
export function isUniAdmin(role: string): boolean {
  return getUniRoleTier(role) >= UNI_ROLE_TIERS.admin;
}

// Check if user is at least admin-tier in club (admin or headAdmin)
export function isClubAdmin(role: string): boolean {
  return getClubRoleTier(role) >= CLUB_ROLE_TIERS.admin;
}

// Check if user is at least admin-tier in company (companyAdmin or headAdmin)
export function isCompanyAdmin(role: string): boolean {
  return getCompanyRoleTier(role) >= COMPANY_ROLE_TIERS.companyAdmin;
}

// News articles
export const newsArticles = pgTable("news_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  body: text("body").notNull().default(""),
  coverImage: text("cover_image"),
  category: varchar("category", { length: 50 }),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  authorId: varchar("author_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNewsArticleSchema = createInsertSchema(newsArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  publishedAt: z.union([z.string(), z.date(), z.null()]).optional().transform((v) => {
    if (!v) return null;
    if (v instanceof Date) return v;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }),
});

export type InsertNewsArticle = z.infer<typeof insertNewsArticleSchema>;
export type NewsArticle = typeof newsArticles.$inferSelect;

// Landing pages (event microsites at x.ecfinuni.com / /p/x)
export const landingPages = pgTable("landing_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  title: text("title").notNull(),
  eventId: varchar("event_id").references(() => events.id, { onDelete: "set null" }),
  theme: jsonb("theme").$type<{
    primary: string;
    bg: string;
    text: string;
    accent: string;
    font: "sans" | "serif" | "display";
  }>().notNull().default({ primary: "#f59e0b", bg: "#0a0a0a", text: "#ffffff", accent: "#fbbf24", font: "display" }),
  sections: jsonb("sections").$type<Array<{ id: string; type: string; data: Record<string, any> }>>().notNull().default([]),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  ogImage: text("og_image"),
  customCss: text("custom_css"),
  isPublished: boolean("is_published").notNull().default(false),
  authorId: varchar("author_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLandingPageSchema = createInsertSchema(landingPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  slug: z.string().min(2).max(64).regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Slug must be lowercase letters, digits, and hyphens"),
});

export type InsertLandingPage = z.infer<typeof insertLandingPageSchema>;
export type LandingPage = typeof landingPages.$inferSelect;

// ============================================================
// INVESTORS (VC Funds, Angels, Family Offices, Corporate VCs)
// ============================================================
export const INVESTOR_KINDS = ["vcFund", "angel", "familyOffice", "corporateVc"] as const;
export type InvestorKind = typeof INVESTOR_KINDS[number];

export const INVESTOR_STAGES = ["preSeed", "seed", "seriesA", "seriesB", "growth", "lateStage"] as const;
export type InvestorStage = typeof INVESTOR_STAGES[number];

export const investors = pgTable("investors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  kind: varchar("kind", { length: 30 }).notNull().default("vcFund"),
  logo: text("logo"),
  thesis: text("thesis"),
  description: text("description"),
  website: text("website"),
  contactEmail: text("contact_email"),
  hqCity: text("hq_city"),
  checkSizeMin: integer("check_size_min"),
  checkSizeMax: integer("check_size_max"),
  stageFocus: text("stage_focus").array(),
  verticals: text("verticals").array(),
  geographies: text("geographies").array(),
  aum: integer("aum"),
  portfolioCount: integer("portfolio_count").default(0),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvestorSchema = createInsertSchema(investors).omit({
  id: true,
  createdAt: true,
  portfolioCount: true,
});
export type InsertInvestor = z.infer<typeof insertInvestorSchema>;
export type Investor = typeof investors.$inferSelect;

export const createInvestorSchema = z.object({
  name: z.string().min(1, "Investor name is required"),
  kind: z.enum(INVESTOR_KINDS).optional(),
  logo: z.string().optional(),
  thesis: z.string().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  hqCity: z.string().optional(),
  checkSizeMin: z.number().int().nonnegative().optional(),
  checkSizeMax: z.number().int().nonnegative().optional(),
  stageFocus: z.array(z.string()).optional(),
  verticals: z.array(z.string()).optional(),
  geographies: z.array(z.string()).optional(),
  aum: z.number().int().nonnegative().optional(),
});
export type CreateInvestorInput = z.infer<typeof createInvestorSchema>;

export const INVESTOR_MEMBER_ROLES = ["member", "analyst", "partner", "managingPartner", "headAdmin"] as const;
export type InvestorMemberRole = typeof INVESTOR_MEMBER_ROLES[number];

export const investorMembers = pgTable("investor_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investorId: varchar("investor_id").notNull().references(() => investors.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 30 }).notNull().default("analyst"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [unique("investor_member_unique").on(table.investorId, table.userId)]);

export const insertInvestorMemberSchema = createInsertSchema(investorMembers).omit({ id: true, createdAt: true });
export type InsertInvestorMember = z.infer<typeof insertInvestorMemberSchema>;
export type InvestorMember = typeof investorMembers.$inferSelect;

// Investor email invitations — head admins / managing partners can invite colleagues by email.
export const INVITATION_STATUSES = ["pending", "accepted", "cancelled", "expired"] as const;
export type InvitationStatus = typeof INVITATION_STATUSES[number];

export const investorInvitations = pgTable("investor_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investorId: varchar("investor_id").notNull().references(() => investors.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: varchar("role", { length: 30 }).notNull().default("analyst"),
  token: varchar("token", { length: 64 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  invitedBy: varchar("invited_by").references(() => users.id, { onDelete: "set null" }),
  acceptedUserId: varchar("accepted_user_id").references(() => users.id, { onDelete: "set null" }),
  acceptedAt: timestamp("accepted_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvestorInvitationSchema = createInsertSchema(investorInvitations).omit({
  id: true,
  token: true,
  status: true,
  acceptedUserId: true,
  acceptedAt: true,
  createdAt: true,
});
export type InsertInvestorInvitation = z.infer<typeof insertInvestorInvitationSchema>;
export type InvestorInvitation = typeof investorInvitations.$inferSelect;

export const createInvestorInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(INVESTOR_MEMBER_ROLES).default("analyst"),
});
export type CreateInvestorInvitationInput = z.infer<typeof createInvestorInvitationSchema>;

// =============================================================================
// Signals foundation (Task #19)
// =============================================================================

export const SIGNAL_SOURCE_CATEGORIES = [
  "publicWeb",
  "social",
  "founderOAuth",
  "financial",
  "telegram",
  "internal",
] as const;
export type SignalSourceCategory = typeof SIGNAL_SOURCE_CATEGORIES[number];

export const SIGNAL_SOURCE_STATUSES = [
  "live",
  "no_credentials",
  "error",
  "disabled",
  "idle",
] as const;
export type SignalSourceStatus = typeof SIGNAL_SOURCE_STATUSES[number];

export const SIGNAL_EVENT_SEVERITIES = ["info", "positive", "warning", "critical"] as const;
export type SignalEventSeverity = typeof SIGNAL_EVENT_SEVERITIES[number];

// Vitality sub-score categories. Each signal source declares which sub-score
// bucket its events feed into. `internal` tools (compute jobs) use null.
export const VITALITY_CATEGORIES = [
  "tech_activity",
  "team_health",
  "market_presence",
  "financial_health",
  "legal_hygiene",
] as const;
export type VitalityCategory = typeof VITALITY_CATEGORIES[number];

export const signalSources = pgTable("signal_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceKey: varchar("source_key", { length: 80 }).notNull().unique(),
  displayName: text("display_name").notNull(),
  category: varchar("category", { length: 30 }).notNull(),
  scoreCategory: varchar("score_category", { length: 30 }),
  description: text("description"),
  requiresCredentials: boolean("requires_credentials").notNull().default(false),
  credentialKind: varchar("credential_kind", { length: 60 }),
  status: varchar("status", { length: 30 }).notNull().default("idle"),
  isPaused: boolean("is_paused").notNull().default(false),
  lastRunAt: timestamp("last_run_at"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSignalSourceSchema = createInsertSchema(signalSources).omit({
  id: true,
  createdAt: true,
});
export type InsertSignalSource = z.infer<typeof insertSignalSourceSchema>;
export type SignalSource = typeof signalSources.$inferSelect;

export const signalEvents = pgTable("signal_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startupId: varchar("startup_id").references(() => startups.id, { onDelete: "cascade" }),
  sourceKey: varchar("source_key", { length: 80 }).notNull(),
  eventType: varchar("event_type", { length: 60 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default("info"),
  title: text("title"),
  summary: text("summary"),
  url: text("url"),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  payload: jsonb("payload"),
  dedupeHash: varchar("dedupe_hash", { length: 120 }).notNull().unique(),
  verifiedBy: text("verified_by").array(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_signal_events_startup").on(table.startupId),
  index("idx_signal_events_source").on(table.sourceKey),
  index("idx_signal_events_occurred").on(table.occurredAt),
]);

export const insertSignalEventSchema = createInsertSchema(signalEvents).omit({
  id: true,
  createdAt: true,
});
export type InsertSignalEvent = z.infer<typeof insertSignalEventSchema>;
export type SignalEvent = typeof signalEvents.$inferSelect;

export const ingestionRuns = pgTable("ingestion_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceKey: varchar("source_key", { length: 80 }).notNull(),
  startupId: varchar("startup_id").references(() => startups.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  eventsCreated: integer("events_created").notNull().default(0),
  status: varchar("status", { length: 30 }).notNull().default("running"),
  error: text("error"),
}, (table) => [
  index("idx_ingestion_runs_source").on(table.sourceKey),
  index("idx_ingestion_runs_started").on(table.startedAt),
]);

export const insertIngestionRunSchema = createInsertSchema(ingestionRuns).omit({
  id: true,
});
export type InsertIngestionRun = z.infer<typeof insertIngestionRunSchema>;
export type IngestionRun = typeof ingestionRuns.$inferSelect;

export const cronJobs = pgTable("cron_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobName: varchar("job_name", { length: 80 }).notNull().unique(),
  schedule: varchar("schedule", { length: 80 }).notNull(),
  description: text("description"),
  handler: varchar("handler", { length: 80 }).notNull(),
  isPaused: boolean("is_paused").notNull().default(false),
  isHeavy: boolean("is_heavy").notNull().default(false),
  lastRunAt: timestamp("last_run_at"),
  lastStatus: varchar("last_status", { length: 30 }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCronJobSchema = createInsertSchema(cronJobs).omit({
  id: true,
  createdAt: true,
});
export type InsertCronJob = z.infer<typeof insertCronJobSchema>;
export type CronJob = typeof cronJobs.$inferSelect;

export const integrationCredentials = pgTable("integration_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startupId: varchar("startup_id").references(() => startups.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 60 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  encryptedConfig: jsonb("encrypted_config"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Partial unique indexes: one per (startupId, kind) when startupId is set,
  // and one per kind when startupId IS NULL (global). Postgres NULL semantics
  // would otherwise allow duplicate global rows under a single composite unique.
  uniqueIndex("integration_credentials_startup_kind_idx")
    .on(table.startupId, table.kind)
    .where(sql`${table.startupId} IS NOT NULL`),
  uniqueIndex("integration_credentials_global_kind_idx")
    .on(table.kind)
    .where(sql`${table.startupId} IS NULL`),
]);

export const insertIntegrationCredentialSchema = createInsertSchema(integrationCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIntegrationCredential = z.infer<typeof insertIntegrationCredentialSchema>;
export type IntegrationCredential = typeof integrationCredentials.$inferSelect;

export const vitalityScores = pgTable("vitality_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startupId: varchar("startup_id").notNull().references(() => startups.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  subscores: jsonb("subscores"),
  isLatest: boolean("is_latest").notNull().default(true),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
}, (table) => [
  index("idx_vitality_startup").on(table.startupId),
  index("idx_vitality_latest").on(table.startupId, table.isLatest),
]);

export const insertVitalityScoreSchema = createInsertSchema(vitalityScores).omit({
  id: true,
});
export type InsertVitalityScore = z.infer<typeof insertVitalityScoreSchema>;
export type VitalityScore = typeof vitalityScores.$inferSelect;

// Group 6 — Vitality Score weight presets. A preset assigns a 0..1 weight to
// each of the five sub-scores. `companyId === null` means the preset is
// global (system / built-in). `isDefault` marks the fallback preset used when
// the caller did not pick one.
export const scoreWeightPresets = pgTable("score_weight_presets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  weights: jsonb("weights").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_score_preset_company").on(table.companyId),
]);

export const insertScoreWeightPresetSchema = createInsertSchema(scoreWeightPresets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertScoreWeightPreset = z.infer<typeof insertScoreWeightPresetSchema>;
export type ScoreWeightPreset = typeof scoreWeightPresets.$inferSelect;

export type VitalityWeights = Record<VitalityCategory, number>;

export const DEFAULT_VITALITY_WEIGHTS: VitalityWeights = {
  tech_activity: 1,
  team_health: 1,
  market_presence: 1,
  financial_health: 1,
  legal_hygiene: 1,
};

// Auto-generated milestones (Group 7 — Unified timeline & auto milestones)
// Each row clusters one or more `signal_events` (by id, in `sourceEventIds`)
// into a named, human-readable milestone. The LLM job (`extractMilestonesForStartup`)
// uses sourceEventIds overlap as the idempotency key — re-running with the same
// cluster updates the existing row instead of creating a duplicate.
export const MILESTONE_KINDS = [
  "fundraise",
  "product_release",
  "team_hire",
  "mrr_milestone",
  "user_milestone",
  "partnership",
  "media_coverage",
  "regulatory",
  "other",
] as const;
export type MilestoneKind = typeof MILESTONE_KINDS[number];

export const milestones = pgTable("milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startupId: varchar("startup_id").notNull().references(() => startups.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 40 }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  confidence: integer("confidence").notNull().default(50),
  sourceEventIds: text("source_event_ids").array(),
  llmModel: varchar("llm_model", { length: 60 }),
  // Group 7.2 review queue. "auto_approved" when confidence >= threshold;
  // "pending_review" when below; "approved" / "rejected" once a reviewer acts.
  reviewStatus: varchar("review_status", { length: 20 }).notNull().default("auto_approved"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_milestones_startup").on(table.startupId),
  index("idx_milestones_occurred").on(table.occurredAt),
  index("idx_milestones_review_status").on(table.reviewStatus),
]);

export const insertMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
  createdAt: true,
});
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestones.$inferSelect;

// =============================================================================
// Group 8 — Alerts & Notifications
// =============================================================================

export const ALERT_RULE_OWNER_TYPES = ["user", "company"] as const;
export type AlertRuleOwnerType = typeof ALERT_RULE_OWNER_TYPES[number];

export const ALERT_DELIVERY_CHANNELS = ["inApp", "email", "telegram", "push"] as const;
export type AlertDeliveryChannel = typeof ALERT_DELIVERY_CHANNELS[number];

// Custom alert rule. The condition DSL is a JSON expression of the form:
//   { all?: Cond[], any?: Cond[] }
// where Cond = { field: string, op: 'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'contains'|'in', value: any }
// Fields can reference 'event.type', 'event.severity', 'event.payload.<key>',
// 'startup.vertical', 'startup.stage', 'startup.name'.
export const alertRules = pgTable("alert_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerType: varchar("owner_type", { length: 20 }).notNull(), // 'user' | 'company'
  ownerId: varchar("owner_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  conditionDsl: jsonb("condition_dsl").notNull(),
  deliveryChannels: text("delivery_channels").array().notNull().default(sql`ARRAY['inApp']::text[]`),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_alert_rules_owner").on(table.ownerType, table.ownerId),
  index("idx_alert_rules_active").on(table.isActive),
]);

export const insertAlertRuleSchema = createInsertSchema(alertRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAlertRule = z.infer<typeof insertAlertRuleSchema>;
export type AlertRule = typeof alertRules.$inferSelect;

// Investor watchlists.
// `cadence` controls how often the digest fires: "daily" (07:00 UTC every day),
// "weekly" (Mon 06:00 UTC = 09:00 MSK), or "on_event" (sent immediately by the
// alert dispatcher when a new critical/warning event lands on a watched startup).
export const watchlists = pgTable("watchlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  cadence: varchar("cadence", { length: 16 }).default("weekly").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_watchlists_user").on(table.userId),
  index("idx_watchlists_cadence").on(table.cadence),
]);

export const insertWatchlistSchema = createInsertSchema(watchlists).omit({
  id: true,
  createdAt: true,
});
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type Watchlist = typeof watchlists.$inferSelect;

export const watchlistStartups = pgTable("watchlist_startups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  watchlistId: varchar("watchlist_id").notNull().references(() => watchlists.id, { onDelete: "cascade" }),
  startupId: varchar("startup_id").notNull().references(() => startups.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").defaultNow(),
}, (table) => [
  unique("watchlist_startup_unique").on(table.watchlistId, table.startupId),
  index("idx_watchlist_startups_wl").on(table.watchlistId),
]);

export const insertWatchlistStartupSchema = createInsertSchema(watchlistStartups).omit({
  id: true,
  addedAt: true,
});
export type InsertWatchlistStartup = z.infer<typeof insertWatchlistStartupSchema>;
export type WatchlistStartup = typeof watchlistStartups.$inferSelect;

// Manual review flags raised by the inconsistency detector.
export const MANUAL_REVIEW_FLAG_STATUSES = ["open", "acknowledged", "resolved", "dismissed"] as const;
export type ManualReviewFlagStatus = typeof MANUAL_REVIEW_FLAG_STATUSES[number];

export const manualReviewFlags = pgTable("manual_review_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  entityId: varchar("entity_id").notNull(),
  reviewerId: varchar("reviewer_id"), // optional — if null, surfaces to all assigned reviewers for that entity
  reason: text("reason").notNull(),
  details: jsonb("details"),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => [
  index("idx_mrf_entity").on(table.entityType, table.entityId),
  index("idx_mrf_reviewer").on(table.reviewerId),
  index("idx_mrf_status").on(table.status),
]);

export const insertManualReviewFlagSchema = createInsertSchema(manualReviewFlags).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});
export type InsertManualReviewFlag = z.infer<typeof insertManualReviewFlagSchema>;
export type ManualReviewFlag = typeof manualReviewFlags.$inferSelect;

// Founder pulse state — last computed status per startup. Used to detect
// transitions to "silent" and emit a one-shot alert.
// (FOUNDER_PULSE_STATUSES / FounderPulseStatus declared earlier near startup metrics.)
export const founderPulseStates = pgTable("founder_pulse_states", {
  startupId: varchar("startup_id").primaryKey().references(() => startups.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  lastSignalAt: timestamp("last_signal_at"),
  // Group 8.5 founder-facing nudge — last time we DM'd the founder a "your
  // pulse looks quiet" warning. Used to throttle nudges to at most once / 7d.
  lastNudgeAt: timestamp("last_nudge_at"),
  // Per-channel breakdown snapshot (last computed). Keys: github, telegram,
  // calendar, telegram_channel, media, financials, etc.
  channelBreakdown: jsonb("channel_breakdown"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFounderPulseStateSchema = createInsertSchema(founderPulseStates).omit({
  updatedAt: true,
});
export type InsertFounderPulseState = z.infer<typeof insertFounderPulseStateSchema>;
export type FounderPulseState = typeof founderPulseStates.$inferSelect;

// ===== Group 4: Financial verification & Verified MRR =====
// One snapshot per (startup, source, snapshotDate). The daily aggregator picks
// the latest per source to compute the displayed Verified MRR.
export const startupFinancials = pgTable("startup_financials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startupId: varchar("startup_id").notNull().references(() => startups.id, { onDelete: "cascade" }),
  // signal source key, e.g. "fin-tinkoff-business", "fin-yookassa", "fin-bank-ocr"
  sourceKey: varchar("source_key", { length: 80 }).notNull(),
  // ISO date (YYYY-MM-DD) the snapshot represents
  snapshotDate: varchar("snapshot_date", { length: 10 }).notNull(),
  // Monthly recurring revenue, in minor currency units (kopecks/cents) for precision
  mrrMinor: integer("mrr_minor").notNull().default(0),
  // Trailing-30d revenue (gross inflow), minor units
  revenueMinor: integer("revenue_minor").notNull().default(0),
  // Annual run-rate (typically MRR * 12), minor units
  arrMinor: integer("arr_minor").notNull().default(0),
  // Trailing-30d revenue, kept as a named column matching the spec
  revenueLast30dMinor: integer("revenue_last_30d_minor").notNull().default(0),
  // Trailing-30d burn (outflows when known), minor units
  burnLast30dMinor: integer("burn_last_30d_minor").notNull().default(0),
  // Months of runway = cashOnHand / burnLast30d (when both known)
  runwayMonths: integer("runway_months"),
  currency: varchar("currency", { length: 8 }).notNull().default("RUB"),
  // active recurring customers (when known)
  activeCustomers: integer("active_customers"),
  // free-form payload from the connector (raw, redacted) — also holds
  // retention %, refusal %, geography breakdown when the source provides them.
  payload: jsonb("payload"),
  capturedAt: timestamp("captured_at").notNull().defaultNow(),
}, (table) => [
  index("idx_startup_financials_startup").on(table.startupId),
  index("idx_startup_financials_captured").on(table.capturedAt),
  uniqueIndex("startup_financials_unique_snapshot")
    .on(table.startupId, table.sourceKey, table.snapshotDate),
]);

export const insertStartupFinancialSchema = createInsertSchema(startupFinancials).omit({
  id: true,
  capturedAt: true,
});
export type InsertStartupFinancial = z.infer<typeof insertStartupFinancialSchema>;
export type StartupFinancial = typeof startupFinancials.$inferSelect;

// Aggregated view returned by the API for the Verified MRR badge.
export type VerifiedMrr = {
  startupId: string;
  mrrMinor: number;
  arrMinor: number;
  revenueMinor: number;
  revenueLast30dMinor: number;
  burnLast30dMinor: number;
  runwayMonths: number | null;
  currency: string;
  sourceKey: string;
  sourceLabel: string;
  capturedAt: string; // ISO
  // True iff all of:
  //  - non-zero MRR snapshot exists within the last 35 days, AND
  //  - the startup has at least one currently active financial connector.
  isVerified: boolean;
  hasLiveConnector: boolean;
};

// Richer analytics derived from the snapshot history. Returned by
// GET /api/startups/:id/financials/analytics.
export type FinancialAnalytics = {
  startupId: string;
  currency: string;
  isVerified: boolean;
  hasLiveConnector: boolean;
  current: {
    mrrMinor: number;
    arrMinor: number;
    revenue30dMinor: number;
    burn30dMinor: number;
    runwayMonths: number | null;
    activeCustomers: number | null;
    capturedAt: string;
    sourceLabel: string;
  } | null;
  // Aggregate snapshot ~30 days ago, used to derive growth/churn/retention.
  previous30d: { mrrMinor: number; capturedAt: string } | null;
  netNewMrrMinor: number | null;
  growthRatePct: number | null; // (cur - prev) / prev * 100
  churnRatePct: number | null; // sum of negative MRR moves over the trailing 30d / starting MRR
  grossRetentionPct: number | null; // 1 - churn
  netRetentionPct: number | null; // current / prev30
  // Up to 90 days of aggregate trend points for the chart.
  series: { date: string; mrrMinor: number; revenueMinor: number }[];
  // Latest per-source contribution (excluding the synthetic `fin-aggregate`).
  perSource: {
    sourceKey: string;
    sourceLabel: string;
    mrrMinor: number;
    revenue30dMinor: number;
    capturedAt: string;
  }[];
};

// =============================================================================
// Telegram workspace bot (Task #24 / Group 5)
// =============================================================================

// One row per Telegram chat (group/channel) the platform bot has been added to.
// Bound to a startup via the `/start <linkToken>` deep link.
export const telegramChats = pgTable("telegram_chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startupId: varchar("startup_id").notNull().references(() => startups.id, { onDelete: "cascade" }),
  telegramChatId: varchar("telegram_chat_id", { length: 40 }).notNull().unique(),
  title: text("title"),
  chatType: varchar("chat_type", { length: 20 }),
  addedAt: timestamp("added_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  lastMemberCount: integer("last_member_count"),
}, (table) => [
  index("idx_telegram_chats_startup").on(table.startupId),
]);

export const insertTelegramChatSchema = createInsertSchema(telegramChats).omit({
  id: true,
  addedAt: true,
});
export type InsertTelegramChat = z.infer<typeof insertTelegramChatSchema>;
export type TelegramChat = typeof telegramChats.$inferSelect;

// Per-chat per-day rolling stats. Updated incrementally by the webhook
// handler (metadata only — message content is never stored).
export const telegramChatDailyStats = pgTable("telegram_chat_daily_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramChatId: varchar("telegram_chat_id", { length: 40 }).notNull(),
  day: varchar("day", { length: 10 }).notNull(),
  messageCount: integer("message_count").notNull().default(0),
  activeMembers: text("active_members").array(),
  memberCount: integer("member_count"),
  dispatchedAt: timestamp("dispatched_at"),
}, (table) => [
  uniqueIndex("telegram_chat_daily_stats_chat_day_idx").on(table.telegramChatId, table.day),
]);

export type TelegramChatDailyStat = typeof telegramChatDailyStats.$inferSelect;

// Per-(startup, user) Telegram founder binding. Each row owns its own deep-link
// token, so multiple founders / cofounders of the same startup can each bind
// their own Telegram account independently.
export const telegramFounderBindings = pgTable("telegram_founder_bindings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startupId: varchar("startup_id").notNull().references(() => startups.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  telegramUserId: varchar("telegram_user_id", { length: 40 }),
  telegramUsername: varchar("telegram_username", { length: 64 }),
  linkToken: varchar("link_token", { length: 40 }).notNull().unique(),
  language: varchar("language", { length: 8 }).notNull().default("en"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  boundAt: timestamp("bound_at"),
}, (table) => [
  uniqueIndex("telegram_founder_bindings_startup_user_idx").on(table.startupId, table.userId),
  index("idx_telegram_founder_bindings_telegram_user").on(table.telegramUserId),
]);

export type TelegramFounderBinding = typeof telegramFounderBindings.$inferSelect;

// --- Startup AI Assistant: chat messages + uploaded documents -----------
// Founder-only AI chat scoped to a single startup. Each message belongs to a
// startup; only members (founder/cofounder/team_member/advisor) and platform
// admins can read or write. Messages may reference an uploaded document.
export const startupAiChatMessages = pgTable("startup_ai_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startupId: varchar("startup_id").notNull().references(() => startups.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  role: varchar("role", { length: 16 }).notNull(), // user | assistant | system
  content: text("content").notNull(),
  documentId: varchar("document_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_startup_ai_chat_messages_startup").on(table.startupId, table.createdAt),
]);

export const insertStartupAiChatMessageSchema = createInsertSchema(startupAiChatMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertStartupAiChatMessage = z.infer<typeof insertStartupAiChatMessageSchema>;
export type StartupAiChatMessage = typeof startupAiChatMessages.$inferSelect;

// Files uploaded against a startup. Founders can mark a document as
// `isPublic` to expose it to investors / capital entities visiting the
// startup card; non-public docs are visible only to founders / platform
// admins. AI extraction output is cached on the row.
export const startupDocuments = pgTable("startup_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startupId: varchar("startup_id").notNull().references(() => startups.id, { onDelete: "cascade" }),
  uploaderUserId: varchar("uploader_user_id").references(() => users.id, { onDelete: "set null" }),
  filename: text("filename").notNull(),
  mimeType: varchar("mime_type", { length: 128 }).notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  storageKey: text("storage_key").notNull(), // gs object name within bucket
  bucketName: varchar("bucket_name", { length: 128 }).notNull(),
  title: text("title"),
  description: text("description"),
  isPublic: boolean("is_public").notNull().default(false),
  aiSummary: text("ai_summary"),
  extractedTraction: jsonb("extracted_traction"),
  extractedTextPreview: text("extracted_text_preview"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_startup_documents_startup").on(table.startupId, table.createdAt),
  index("idx_startup_documents_public").on(table.startupId, table.isPublic),
]);

export const insertStartupDocumentSchema = createInsertSchema(startupDocuments).omit({
  id: true,
  createdAt: true,
});
export type InsertStartupDocument = z.infer<typeof insertStartupDocumentSchema>;
export type StartupDocument = typeof startupDocuments.$inferSelect;

// AI extraction shape stored in `startupDocuments.extractedTraction`.
export type ExtractedTraction = {
  mrr?: number | null;            // monthly recurring revenue, base currency units
  arr?: number | null;            // annual recurring revenue
  revenue?: number | null;        // any revenue figure (per period)
  revenuePeriod?: string | null;  // e.g. "monthly", "quarterly", "ttm"
  users?: number | null;
  activeUsers?: number | null;
  paidCustomers?: number | null;
  pilots?: number | null;
  growthRatePct?: number | null;
  churnPct?: number | null;
  fundingRaisedUsd?: number | null;
  partnerships?: string[];
  highlights?: string[];
  currency?: string | null;
  asOf?: string | null;           // ISO date the metrics refer to
  confidence?: number;            // 0..1
};

// =============================================================================
// Pre-Revenue Discovery Engine (Sprint 0 — Foundation)
// 5-layer pipeline: raw_observations -> founder_signals -> proto_startups
// -> startup_profile_facts (+ metric_history) -> promoted to startups.
// Privacy is mandatory from day 1: source_whitelist + do_not_track + retention.
// =============================================================================

// Layer 1 — append-only firehose of every signal we observe. No interpretation.
export const rawObservations = pgTable("raw_observations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  collector: varchar("collector", { length: 60 }).notNull(),
  collectedAt: timestamp("collected_at").notNull().defaultNow(),
  sourceUrl: text("source_url"),
  sourceId: text("source_id"),
  dedupeHash: varchar("dedupe_hash", { length: 80 }).notNull().unique(),
  rawPayload: jsonb("raw_payload").notNull(),
  // 'raw' | 'stripped' | 'rejected' (rejected = source/identifier on do_not_track)
  piiStatus: varchar("pii_status", { length: 20 }).notNull().default("raw"),
  // 'pending' | 'classified' | 'irrelevant' | 'extracted' | 'failed'
  processingStatus: varchar("processing_status", { length: 20 }).notNull().default("pending"),
  retentionUntil: timestamp("retention_until"),
  // Optional short audit string written by gates (e.g. "blacklist:domain:skyeng.ru",
  // "wrong_stage:launched", "wrong_stage:unknown_external"). Never user-displayed.
  processingError: text("processing_error"),
}, (table) => [
  index("idx_raw_obs_collector_time").on(table.collector, table.collectedAt),
  index("idx_raw_obs_status").on(table.processingStatus),
  index("idx_raw_obs_retention").on(table.retentionUntil),
]);

export const insertRawObservationSchema = createInsertSchema(rawObservations).omit({
  id: true,
  collectedAt: true,
});
export type InsertRawObservation = z.infer<typeof insertRawObservationSchema>;
export type RawObservation = typeof rawObservations.$inferSelect;

// Layer 2 — classified, entity-extracted signals. No raw text persisted.
export const founderSignals = pgTable("founder_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rawObservationId: varchar("raw_observation_id").notNull()
    .references(() => rawObservations.id, { onDelete: "cascade" }),
  // 'looking_for_cofounder' | 'launching_mvp' | 'seeking_users' |
  // 'fundraising_pre_seed' | 'sharing_progress_metric' | 'asking_for_feedback' |
  // 'announcing_pivot' | 'looking_for_advisor' | 'recruiting_first_hires'
  intent: varchar("intent", { length: 40 }).notNull(),
  intentConfidence: numeric("intent_confidence", { precision: 4, scale: 3 }).notNull(),
  // Extracted entities (project name, vertical, links, person handles, etc.)
  // Schema: { person?, project?, links_extracted?, evidence_quote? }
  entities: jsonb("entities").notNull().default(sql`'{}'::jsonb`),
  // 'idea' | 'building' | 'mvp' | 'launched' | 'unknown'
  stageEstimate: varchar("stage_estimate", { length: 20 }),
  vertical: varchar("vertical", { length: 60 }),
  projectName: varchar("project_name", { length: 200 }),
  domain: varchar("domain", { length: 200 }),
  githubOrg: varchar("github_org", { length: 200 }),
  personKey: varchar("person_key", { length: 80 }),
  protoStartupId: varchar("proto_startup_id"),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
}, (table) => [
  index("idx_fs_proto").on(table.protoStartupId),
  index("idx_fs_person").on(table.personKey),
  index("idx_fs_domain").on(table.domain),
  index("idx_fs_github").on(table.githubOrg),
  index("idx_fs_occurred").on(table.occurredAt),
]);

export const insertFounderSignalSchema = createInsertSchema(founderSignals).omit({
  id: true,
  occurredAt: true,
});
export type InsertFounderSignal = z.infer<typeof insertFounderSignalSchema>;
export type FounderSignal = typeof founderSignals.$inferSelect;

// Canonical person identities — same human across tg/github/twitter/email.
export const personIdentities = pgTable("person_identities", {
  personKey: varchar("person_key", { length: 80 }).primaryKey(),
  tgUserIds: text("tg_user_ids").array().notNull().default(sql`ARRAY[]::text[]`),
  githubLogins: text("github_logins").array().notNull().default(sql`ARRAY[]::text[]`),
  twitterHandles: text("twitter_handles").array().notNull().default(sql`ARRAY[]::text[]`),
  emailHashes: text("email_hashes").array().notNull().default(sql`ARRAY[]::text[]`),
  domainsOwned: text("domains_owned").array().notNull().default(sql`ARRAY[]::text[]`),
  displayNames: text("display_names").array().notNull().default(sql`ARRAY[]::text[]`),
  firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
  credibilityScore: numeric("credibility_score", { precision: 5, scale: 2 }).notNull().default("0"),
  // If this person has claimed their account in Ventorix, link to users.id
  claimedUserId: varchar("claimed_user_id").references(() => users.id, { onDelete: "set null" }),
}, (table) => [
  index("idx_person_last_seen").on(table.lastSeenAt),
]);

export const insertPersonIdentitySchema = createInsertSchema(personIdentities);
export type InsertPersonIdentity = z.infer<typeof insertPersonIdentitySchema>;
export type PersonIdentity = typeof personIdentities.$inferSelect;

// Layer 3 — clusters of signals that look like the same project.
// pgvector extension is OPTIONAL for MVP — embeddings are stored as
// jsonb float arrays and matching is exact-on-domain/github/canonical-name.
// When pgvector is enabled we can swap the column to vector(1536) without
// touching app code (the cosine helper would be replaced with `<#>`).
export const protoStartups = pgTable("proto_startups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cluserSeedSignalId: varchar("cluster_seed_signal_id"),
  canonicalName: varchar("canonical_name", { length: 200 }),
  aliases: text("aliases").array().notNull().default(sql`ARRAY[]::text[]`),
  domain: varchar("domain", { length: 200 }),
  githubOrg: varchar("github_org", { length: 200 }),
  vertical: varchar("vertical", { length: 60 }),
  stage: varchar("stage", { length: 20 }),
  founderPersonKeys: text("founder_person_keys").array().notNull().default(sql`ARRAY[]::text[]`),
  signalCount: integer("signal_count").notNull().default(0),
  sourceDiversity: integer("source_diversity").notNull().default(0),
  // 'active' | 'stale' | 'promoted_lead' | 'promoted_startup' | 'duplicate'
  // | 'too_mature' | 'blacklisted'
  clusterStatus: varchar("cluster_status", { length: 20 }).notNull().default("active"),
  // Maturity / blacklist signals — populated by maturity-check cron and the
  // brand blacklist filter. Used to keep big-brand and mature companies out
  // of the active scout feed (Skyeng, GetCourse, Yandex, Sber, etc.).
  companyAgeYears: numeric("company_age_years", { precision: 5, scale: 2 }),
  domainAgeYears: numeric("domain_age_years", { precision: 5, scale: 2 }),
  employeeCountEstimate: integer("employee_count_estimate"),
  annualRevenueRub: bigint("annual_revenue_rub", { mode: "number" }),
  maturityFlags: jsonb("maturity_flags").$type<{
    sources?: Record<string, { value: any; source: string; checked_at: string }>;
    blocked_by?: string[];
    checked_at?: string | null;
  }>(),
  isBlacklisted: boolean("is_blacklisted").notNull().default(false),
  excludedReason: text("excluded_reason"),
  // Score snapshot — recomputed by score-recompute cron.
  readinessScore: integer("readiness_score").notNull().default(0),
  clusterHeat: integer("cluster_heat").notNull().default(0),
  embedding: jsonb("embedding"),  // float[] or null until embeddings job runs
  promotedStartupId: varchar("promoted_startup_id").references(() => startups.id, { onDelete: "set null" }),
  firstSignalAt: timestamp("first_signal_at").notNull().defaultNow(),
  lastSignalAt: timestamp("last_signal_at").notNull().defaultNow(),
}, (table) => [
  index("idx_proto_status").on(table.clusterStatus),
  index("idx_proto_last_signal").on(table.lastSignalAt),
  index("idx_proto_domain").on(table.domain),
  index("idx_proto_github").on(table.githubOrg),
  index("idx_proto_readiness").on(table.readinessScore),
]);

export const insertProtoStartupSchema = createInsertSchema(protoStartups).omit({
  id: true,
  firstSignalAt: true,
  lastSignalAt: true,
});
export type InsertProtoStartup = z.infer<typeof insertProtoStartupSchema>;
export type ProtoStartup = typeof protoStartups.$inferSelect;

// Brand / domain blacklist for the Pre-Revenue Discovery Engine. Hard-blocks
// well-known mature companies (Skyeng, GetCourse, Yandex, Sber, etc.) from
// being clustered as pre-revenue startups. Seeded from `blacklist-seed.ts`
// on first boot; admins can extend it via /api/admin/scout/blacklist.
export const scoutBlacklist = pgTable("scout_blacklist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // 'domain' | 'company_name' | 'inn' | 'tg_channel'
  matchType: varchar("match_type", { length: 20 }).notNull(),
  // Normalised value (lower-cased, trimmed; for company_name juridic forms
  // like ООО / OOO / ИП / ПАО / LLC / Inc / Ltd are stripped).
  value: text("value").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: varchar("created_by"),
}, (table) => [
  unique("uniq_scout_blacklist_match").on(table.matchType, table.value),
  index("idx_scout_blacklist_type").on(table.matchType),
]);

export const insertScoutBlacklistSchema = createInsertSchema(scoutBlacklist).omit({
  id: true,
  createdAt: true,
});
export type InsertScoutBlacklistEntry = z.infer<typeof insertScoutBlacklistSchema>;
export type ScoutBlacklistEntry = typeof scoutBlacklist.$inferSelect;

// Layer 4 — facts, each with provenance, confidence, supersession chain.
export const startupProfileFacts = pgTable("startup_profile_facts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  protoStartupId: varchar("proto_startup_id").notNull()
    .references(() => protoStartups.id, { onDelete: "cascade" }),
  field: varchar("field", { length: 60 }).notNull(),
  value: jsonb("value").notNull(),
  confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
  // { rawObservationIds: string[], extractedBy: string, llmModel?: string }
  provenance: jsonb("provenance").notNull(),
  extractedAt: timestamp("extracted_at").notNull().defaultNow(),
  supersededBy: varchar("superseded_by"),
}, (table) => [
  index("idx_fact_proto_field").on(table.protoStartupId, table.field),
  index("idx_fact_extracted").on(table.extractedAt),
]);

export const insertStartupProfileFactSchema = createInsertSchema(startupProfileFacts).omit({
  id: true,
  extractedAt: true,
});
export type InsertStartupProfileFact = z.infer<typeof insertStartupProfileFactSchema>;
export type StartupProfileFact = typeof startupProfileFacts.$inferSelect;

// Layer 4 — daily snapshots of every metric we observe.
export const metricHistory = pgTable("metric_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  protoStartupId: varchar("proto_startup_id").notNull()
    .references(() => protoStartups.id, { onDelete: "cascade" }),
  metricKey: varchar("metric_key", { length: 60 }).notNull(),
  valueNumeric: numeric("value_numeric", { precision: 20, scale: 4 }),
  valuePayload: jsonb("value_payload"),
  measuredAt: timestamp("measured_at").notNull().defaultNow(),
  collector: varchar("collector", { length: 60 }).notNull(),
}, (table) => [
  unique("metric_history_unique").on(table.protoStartupId, table.metricKey, table.measuredAt),
  index("idx_metric_proto_key").on(table.protoStartupId, table.metricKey, table.measuredAt),
]);

export const insertMetricHistorySchema = createInsertSchema(metricHistory).omit({
  id: true,
  measuredAt: true,
});
export type InsertMetricHistory = z.infer<typeof insertMetricHistorySchema>;
export type MetricHistory = typeof metricHistory.$inferSelect;

// Privacy — only sources on the whitelist are ingested.
export const scoutSourceWhitelist = pgTable("scout_source_whitelist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  collector: varchar("collector", { length: 60 }).notNull(),
  // For tg-watcher: chat_id or @handle. For reddit: subreddit name. Etc.
  sourceIdentifier: varchar("source_identifier", { length: 200 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("public"),
  // 'public' | 'admin-approved' | 'private-blocked'
  notes: text("notes"),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("scout_whitelist_unique").on(table.collector, table.sourceIdentifier),
]);

export const insertScoutSourceWhitelistSchema = createInsertSchema(scoutSourceWhitelist).omit({
  id: true,
  createdAt: true,
});
export type InsertScoutSourceWhitelist = z.infer<typeof insertScoutSourceWhitelistSchema>;
export type ScoutSourceWhitelist = typeof scoutSourceWhitelist.$inferSelect;

// Privacy — opt-out / right-to-be-forgotten registry. Checked BEFORE every
// raw_observations insert. Identifier matching is exact.
export const scoutDoNotTrack = pgTable("scout_do_not_track", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // 'email_hash' | 'tg_username' | 'tg_user_id' | 'github_login' | 'twitter_handle' | 'domain'
  identifierType: varchar("identifier_type", { length: 30 }).notNull(),
  identifierValue: varchar("identifier_value", { length: 200 }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  unique("scout_dnt_unique").on(table.identifierType, table.identifierValue),
  index("idx_scout_dnt_value").on(table.identifierValue),
]);

export const insertScoutDoNotTrackSchema = createInsertSchema(scoutDoNotTrack).omit({
  id: true,
  createdAt: true,
});
export type InsertScoutDoNotTrack = z.infer<typeof insertScoutDoNotTrackSchema>;
export type ScoutDoNotTrack = typeof scoutDoNotTrack.$inferSelect;

// ============================================================================
// LEGACY TABLES — kept in schema so drizzle-kit push doesn't try to drop them
// or treat new tables as renames of these. Not actively used by current code;
// safe to remove once verified empty in production.
// ============================================================================

export const legacyEmailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  code: varchar("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const systemSettings = pgTable("system_settings", {
  key: varchar("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const communityPosts = pgTable("community_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull(),
  content: text("content").notNull(),
  type: varchar("type").notNull().default("general"),
  title: varchar("title"),
  mediaUrls: text("media_urls").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
});

export const postComments = pgTable("post_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  authorId: varchar("author_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const postLikes = pgTable("post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// =============================================================================
// EVENT NETWORKING (Phase 1: matchmaking + chat + venue map)
// =============================================================================

// A user's "I'm looking for..." request scoped to a single event.
export const networkingRequests = pgTable("networking_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Free-text description of what / who the user is looking for.
  requestText: text("request_text").notNull(),
  // High-level goal tag ('cofounder' | 'hiring' | 'job' | 'mentor' | 'investor' | 'casual').
  goal: varchar("goal", { length: 20 }).notNull().default("casual"),
  // OpenAI text-embedding-3-small (1536 floats), stored as jsonb array.
  embedding: jsonb("embedding").$type<number[]>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  uniqUserEvent: unique("networking_request_user_event_unique").on(t.eventId, t.userId),
  byEvent: index("networking_requests_event_idx").on(t.eventId),
}));

// A pair-wise match suggested between two users at an event.
// userAId < userBId (lexicographic) so each pair has exactly one row.
export const networkingMatches = pgTable("networking_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userAId: varchar("user_a_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userBId: varchar("user_b_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Cosine similarity 0..1 (sorted-pair canonical).
  score: real("score").notNull(),
  // 1-line "why match" generated by gpt-4o-mini.
  reason: text("reason"),
  // Each side's stance: 'suggested' | 'accepted' | 'passed'.
  statusA: varchar("status_a", { length: 20 }).notNull().default("suggested"),
  statusB: varchar("status_b", { length: 20 }).notNull().default("suggested"),
  // Set when both sides accept → opens the chat.
  connectedAt: timestamp("connected_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  uniqPair: unique("networking_match_pair_unique").on(t.eventId, t.userAId, t.userBId),
  byEvent: index("networking_matches_event_idx").on(t.eventId),
}));

// 1-to-1 chat thread opened when a match is mutually accepted.
export const networkingChats = pgTable("networking_chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull().references(() => networkingMatches.id, { onDelete: "cascade" }).unique(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const networkingMessages = pgTable("networking_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull().references(() => networkingChats.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // 'text' | 'tg_share' (payload contains @username) | 'icebreaker' (system) | 'meet_invite_ref'
  kind: varchar("kind", { length: 20 }).notNull().default("text"),
  content: text("content").notNull(),
  // Optional structured payload (e.g. { tgUsername: "@foo" }).
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  byChat: index("networking_messages_chat_idx").on(t.chatId, t.createdAt),
}));

// Per-event venue map (admin uploads single image; pins overlay on top).
export const eventVenueMaps = pgTable("event_venue_maps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }).unique(),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Named pin on the venue map (booth / stage / coffee / registration / other).
// x,y are normalized 0..1 coordinates relative to the map image.
export const eventVenuePins = pgTable("event_venue_pins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: varchar("kind", { length: 20 }).notNull().default("other"),
  x: real("x").notNull(),
  y: real("y").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  byEvent: index("event_venue_pins_event_idx").on(t.eventId),
}));

// "Let's meet at <pin> at <time>" invite sent inside a networking chat.
export const eventMeetInvites = pgTable("event_meet_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull().references(() => networkingChats.id, { onDelete: "cascade" }),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toUserId: varchar("to_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pinId: varchar("pin_id").notNull().references(() => eventVenuePins.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  // 'pending' | 'accepted' | 'declined' | 'cancelled'
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  byChat: index("event_meet_invites_chat_idx").on(t.chatId),
}));

export const insertNetworkingRequestSchema = createInsertSchema(networkingRequests).omit({ id: true, createdAt: true, updatedAt: true, embedding: true });
export type InsertNetworkingRequest = z.infer<typeof insertNetworkingRequestSchema>;
export type NetworkingRequest = typeof networkingRequests.$inferSelect;
export type NetworkingMatch = typeof networkingMatches.$inferSelect;
export type NetworkingChat = typeof networkingChats.$inferSelect;
export type NetworkingMessage = typeof networkingMessages.$inferSelect;
export type EventVenueMap = typeof eventVenueMaps.$inferSelect;
export type EventVenuePin = typeof eventVenuePins.$inferSelect;
export const insertEventVenuePinSchema = createInsertSchema(eventVenuePins).omit({ id: true, createdAt: true });
export type InsertEventVenuePin = z.infer<typeof insertEventVenuePinSchema>;
export type EventMeetInvite = typeof eventMeetInvites.$inferSelect;
