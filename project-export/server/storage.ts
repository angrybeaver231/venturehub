import {
  users,
  events,
  eventRegistrations,
  videos,
  videoComments,
  livestreams,
  courses,
  courseModules,
  courseEnrollments,
  courseLessons,
  courseMaterials,
  courseLessonProgress,
  courseTasks,
  courseQuizQuestions,
  courseQuizAttempts,
  courseSubmissions,
  courseProgress,
  passwordResetTokens,
  emailVerificationCodes,
  eventFormFields,
  eventFormResponses,
  eventFormAnswers,
  chatSessions,
  chatMessages,
  startupAiChatMessages,
  startupDocuments,
  type InsertStartupAiChatMessage,
  type StartupAiChatMessage,
  type InsertStartupDocument,
  type StartupDocument,
  challenges,
  challengeAttachments,
  challengeAttempts,
  challengeMessages,
  seasonalPoints,
  FIS_POINTS,
  normalizeEmail,
  // Phase 3: Communication tables
  announcements,
  discussionForums,
  discussionThreads,
  discussionReplies,
  privateMessages,
  conversations,
  chatMessagesPrivate,
  lessonComments,
  notifications,
  // Phase 4: Gradebook tables
  gradeCategories,
  rubrics,
  rubricCriteria,
  rubricLevels,
  rubricScores,
  gradebookEntries,
  // Career Portal tables
  jobOpenings,
  jobApplications,
  jobApplicationMessages,
  newsArticles,
  type NewsArticle,
  type InsertNewsArticle,
  landingPages,
  type LandingPage,
  type InsertLandingPage,
  // Startup & Innovation Platform tables
  companies,
  companyUsers,
  startups,
  eventShowcaseStartups,
  type EventShowcaseStartup,
  type InsertEventShowcaseStartup,
  startupMembers,
  teamMembers,
  startupMetrics,
  briefs,
  briefApplications,
  programs,
  programParticipants,
  evaluations,
  startupCompanyRelations,
  companyNotes,
  investors,
  investorMembers,
  investorInvitations,
  type User,
  type UpsertUser,
  type Event,
  type InsertEvent,
  type EventRegistration,
  type EventRegistrationWithUser,
  type InsertEventRegistration,
  type Video,
  type InsertVideo,
  type VideoComment,
  type InsertVideoComment,
  type Livestream,
  type InsertLivestream,
  type Course,
  type InsertCourse,
  type CourseModule,
  type InsertCourseModule,
  type CourseEnrollment,
  type InsertCourseEnrollment,
  type CourseLesson,
  type InsertCourseLesson,
  type CourseMaterial,
  type InsertCourseMaterial,
  type CourseLessonProgress,
  type InsertCourseLessonProgress,
  type CourseTask,
  type InsertCourseTask,
  type QuizQuestion,
  type InsertQuizQuestion,
  type QuizAttempt,
  type InsertQuizAttempt,
  type CourseSubmission,
  type InsertCourseSubmission,
  type GradeSubmission,
  type CourseProgress,
  type InsertCourseProgress,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type EmailVerificationCode,
  type InsertEmailVerificationCode,
  type EventRegistrationWithEvent,
  type EventFormField,
  type InsertEventFormField,
  type EventFormResponse,
  type InsertEventFormResponse,
  type EventFormAnswer,
  type InsertEventFormAnswer,
  type EventFormResponseWithAnswers,
  type ChatSession,
  type InsertChatSession,
  type ChatMessage,
  type InsertChatMessage,
  type ChatSessionWithMessages,
  type Challenge,
  type InsertChallenge,
  type ChallengeAttachment,
  type InsertChallengeAttachment,
  type ChallengeAttempt,
  type InsertChallengeAttempt,
  type ChallengeMessage,
  type InsertChallengeMessage,
  type ChallengeAttemptWithMessages,
  type LeaderboardEntry,
  type SeasonalPoints,
  type InsertSeasonalPoints,
  type SeasonalLeaderboardEntry,
  type TeamChampionshipEntry,
  type GlobalLatestResult,
  // Phase 3 types
  type Announcement,
  type InsertAnnouncement,
  type AnnouncementWithAuthor,
  type DiscussionForum,
  type InsertDiscussionForum,
  type DiscussionThread,
  type InsertDiscussionThread,
  type DiscussionThreadWithStats,
  type DiscussionReply,
  type InsertDiscussionReply,
  type DiscussionReplyWithAuthor,
  type PrivateMessage,
  type InsertPrivateMessage,
  type PrivateMessageWithUsers,
  type Conversation,
  type InsertConversation,
  type ConversationWithParticipant,
  type ChatMessagePrivate,
  type InsertChatMessagePrivate,
  type ChatMessageWithSender,
  type LessonComment,
  type InsertLessonComment,
  type LessonCommentWithAuthor,
  type Notification,
  type InsertNotification,
  // Phase 4 types
  type GradeCategory,
  type InsertGradeCategory,
  type Rubric,
  type InsertRubric,
  type RubricCriteria,
  type InsertRubricCriteria,
  type RubricLevel,
  type InsertRubricLevel,
  type RubricWithCriteria,
  type RubricScore,
  type InsertRubricScore,
  type GradebookEntry,
  type InsertGradebookEntry,
  type GradebookEntryWithTask,
  type StudentGradeSummary,
  // Career Portal types
  type JobOpening,
  type InsertJobOpening,
  type JobApplication,
  type InsertJobApplication,
  type JobApplicationMessage,
  type InsertJobApplicationMessage,
  // Startup & Innovation Platform types
  type Company,
  type InsertCompany,
  type CompanyUser,
  type InsertCompanyUser,
  type Startup,
  type InsertStartup,
  type StartupMember,
  type InsertStartupMember,
  type StartupMemberWithUser,
  type TeamMember,
  type InsertTeamMember,
  type StartupMetric,
  type InsertStartupMetric,
  type Brief,
  type InsertBrief,
  type BriefApplication,
  type InsertBriefApplication,
  type BriefApplicationWithStartup,
  type Program,
  type InsertProgram,
  type ProgramParticipant,
  type InsertProgramParticipant,
  type Evaluation,
  type InsertEvaluation,
  type StartupCompanyRelation,
  type InsertStartupCompanyRelation,
  type StartupCompanyRelationWithStartup,
  type CompanyNote,
  type InsertCompanyNote,
  type CompanyNoteWithAuthor,
  universities,
  clubs,
  userUniversityMemberships,
  userClubMemberships,
  startupAffiliations,
  startupReadiness,
  reviewerAssignments,
  activityLogs,
  companyPlans,
  companyUsage,
  type University,
  type InsertUniversity,
  type Club,
  type InsertClub,
  type UserUniversityMembership,
  type InsertUserUniversityMembership,
  type UserClubMembership,
  type InsertUserClubMembership,
  type StartupAffiliation,
  type InsertStartupAffiliation,
  type StartupReadiness,
  type InsertStartupReadiness,
  type ReviewerAssignment,
  type InsertReviewerAssignment,
  type ReviewerAssignmentWithDetails,
  type ActivityLog,
  type InsertActivityLog,
  type ActivityLogWithActor,
  type CompanyPlan,
  type InsertCompanyPlan,
  type CompanyUsage,
  type InsertCompanyUsage,
  type CompanyPlanWithUsage,
  type Investor,
  type InsertInvestor,
  type InvestorMember,
  type InsertInvestorMember,
  type InvestorInvitation,
  type InsertInvestorInvitation,
  signalSources,
  signalEvents,
  ingestionRuns,
  cronJobs,
  integrationCredentials,
  vitalityScores,
  milestones,
  type Milestone,
  type InsertMilestone,
  scoreWeightPresets,
  telegramChats,
  telegramChatDailyStats,
  telegramFounderBindings,
  type TelegramChat,
  type InsertTelegramChat,
  type TelegramChatDailyStat,
  type TelegramFounderBinding,
  type SignalSource,
  type InsertSignalSource,
  type SignalEvent,
  type InsertSignalEvent,
  type IngestionRun,
  type InsertIngestionRun,
  type CronJob,
  type InsertCronJob,
  type IntegrationCredential,
  type InsertIntegrationCredential,
  type VitalityScore,
  type InsertVitalityScore,
  // Group 8 — Alerts & Notifications
  alertRules,
  watchlists,
  watchlistStartups,
  manualReviewFlags,
  founderPulseStates,
  type AlertRule,
  type InsertAlertRule,
  type Watchlist,
  type InsertWatchlist,
  type WatchlistStartup,
  type InsertWatchlistStartup,
  type ManualReviewFlag,
  type InsertManualReviewFlag,
  type FounderPulseState,
  type InsertFounderPulseState,
  type ScoreWeightPreset,
  type InsertScoreWeightPreset,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, isNotNull, sql, ilike, or, count, avg, inArray, gte, gt, like } from "drizzle-orm";

export interface IStorage {
  // User operations (required for authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserPassword(id: string, hashedPassword: string): Promise<User>;
  updateUserProfile(id: string, updates: Partial<Pick<User, 'firstName' | 'lastName' | 'patronymic' | 'organizationType' | 'organizationName' | 'faculty' | 'groupNumber' | 'city' | 'company' | 'category' | 'position' | 'interests' | 'aboutMe' | 'skills' | 'previousStartups' | 'pitchDeckLink' | 'profileImageUrl' | 'mainOrgType' | 'mainOrgId'>>): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;
  updateUserAdditionalRoles(id: string, updates: { isPartner?: boolean; isResident?: boolean; isFounder?: boolean; isSpeaker?: boolean }): Promise<User>;
  freezeUser(id: string, frozenBy: string, reason: string | null): Promise<User>;
  unfreezeUser(id: string): Promise<User>;
  setNewsletterOptOut(id: string, optOut: boolean): Promise<User>;
  
  // Password reset token operations
  createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(email: string, code: string): Promise<PasswordResetToken | undefined>;
  deletePasswordResetToken(id: string): Promise<void>;
  
  // Email verification code operations
  createEmailVerificationCode(data: InsertEmailVerificationCode): Promise<EmailVerificationCode>;
  getEmailVerificationCodeByEmail(email: string): Promise<EmailVerificationCode | undefined>;
  incrementEmailVerificationAttempts(id: string): Promise<void>;
  deleteEmailVerificationCodesByEmail(email: string): Promise<void>;
  consumeEmailVerificationCodesByEmail(email: string): Promise<void>;
  countRecentEmailVerificationCodes(email: string, sinceMs: number): Promise<number>;
  getLatestEmailVerificationCodeByEmail(email: string): Promise<EmailVerificationCode | undefined>;
  setEmailVerified(userId: string): Promise<User>;
  setUserPinHash(userId: string, pinHash: string): Promise<User>;
  
  // Landing page operations
  getAllLandingPages(): Promise<LandingPage[]>;
  getLandingPage(id: string): Promise<LandingPage | undefined>;
  getLandingPageBySlug(slug: string): Promise<LandingPage | undefined>;
  createLandingPage(page: InsertLandingPage): Promise<LandingPage>;
  updateLandingPage(id: string, page: Partial<InsertLandingPage>): Promise<LandingPage>;
  deleteLandingPage(id: string): Promise<void>;

  // News operations
  getPublishedNews(): Promise<NewsArticle[]>;
  getAllNews(): Promise<NewsArticle[]>;
  getNewsArticle(id: string): Promise<NewsArticle | undefined>;
  createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle>;
  updateNewsArticle(id: string, article: Partial<InsertNewsArticle>): Promise<NewsArticle>;
  deleteNewsArticle(id: string): Promise<void>;

  // Event operations
  getEvents(): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  getEventByShowcaseSlug(slug: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: string): Promise<void>;
  getEventShowcaseStartups(eventId: string): Promise<EventShowcaseStartup[]>;
  getEventShowcaseStartup(id: string): Promise<EventShowcaseStartup | undefined>;
  createEventShowcaseStartup(eventId: string, data: InsertEventShowcaseStartup): Promise<EventShowcaseStartup>;
  updateEventShowcaseStartup(id: string, data: Partial<InsertEventShowcaseStartup>): Promise<EventShowcaseStartup>;
  importShowcaseStartupToPlatform(showcaseId: string, createdBy: string): Promise<{ startup: Startup; alreadyImported: boolean }>;
  deleteEventShowcaseStartup(id: string): Promise<void>;
  setFeaturedEvent(eventId: string, isFeatured: boolean): Promise<Event>;
  getFeaturedEvent(): Promise<Event | undefined>;
  setRegistrationStatus(eventId: string, isOpen: boolean): Promise<Event>;
  
  // Event registration operations
  getEventRegistrations(eventId: string): Promise<EventRegistrationWithUser[]>;
  getAllRegistrations(): Promise<EventRegistrationWithUser[]>;
  getOrganizationStats(): Promise<Array<{ organizationName: string; organizationType: string | null; userCount: number }>>;
  mergeOrganizations(sourceNames: string[], targetName: string, targetType: string | null): Promise<{ updatedUsers: number }>;
  createEventRegistration(registration: InsertEventRegistration): Promise<EventRegistration>;
  getUserEventRegistration(eventId: string, userId: string): Promise<EventRegistration | undefined>;
  getUserRegistrations(userId: string): Promise<EventRegistrationWithEvent[]>;
  getRegistrationById(id: string): Promise<EventRegistration | undefined>;
  markAttendance(registrationId: string): Promise<EventRegistration>;
  
  // Video operations
  getVideos(): Promise<Video[]>;
  getVideo(id: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  deleteVideo(id: string): Promise<void>;
  
  // Video comment operations
  getVideoComments(videoId: string): Promise<VideoComment[]>;
  createVideoComment(comment: InsertVideoComment): Promise<VideoComment>;
  
  // Livestream operations
  getLivestreams(): Promise<Livestream[]>;
  getActiveLivestream(): Promise<Livestream | undefined>;
  createLivestream(livestream: InsertLivestream): Promise<Livestream>;
  updateLivestream(id: string, livestream: Partial<InsertLivestream>): Promise<Livestream>;
  deleteLivestream(id: string): Promise<void>;
  
  // Course operations
  getCourses(): Promise<Course[]>;
  getCourse(id: string): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  
  // Course lesson operations
  getCourseLessons(courseId: string): Promise<CourseLesson[]>;
  createCourseLesson(lesson: InsertCourseLesson): Promise<CourseLesson>;
  
  // Course task operations
  getCourseTasks(courseId: string): Promise<CourseTask[]>;
  createCourseTask(task: InsertCourseTask): Promise<CourseTask>;
  
  // Course submission operations
  getUserTaskSubmission(taskId: string, userId: string): Promise<CourseSubmission | undefined>;
  createCourseSubmission(submission: InsertCourseSubmission): Promise<CourseSubmission>;
  
  // Course progress operations
  getUserCourseProgress(courseId: string, userId: string): Promise<CourseProgress | undefined>;
  upsertCourseProgress(progress: InsertCourseProgress): Promise<CourseProgress>;

  // Course module operations
  getCourseModules(courseId: string): Promise<CourseModule[]>;
  getCourseModule(id: string): Promise<CourseModule | undefined>;
  createCourseModule(module: InsertCourseModule): Promise<CourseModule>;
  updateCourseModule(id: string, module: Partial<InsertCourseModule>): Promise<CourseModule>;
  deleteCourseModule(id: string): Promise<void>;
  reorderCourseModules(courseId: string, moduleIds: string[]): Promise<void>;

  // Course enrollment operations
  getCourseEnrollments(courseId: string): Promise<CourseEnrollment[]>;
  getUserEnrollments(userId: string): Promise<CourseEnrollment[]>;
  getCourseEnrollment(courseId: string, userId: string): Promise<CourseEnrollment | undefined>;
  createCourseEnrollment(enrollment: InsertCourseEnrollment): Promise<CourseEnrollment>;
  updateCourseEnrollment(id: string, updates: Partial<InsertCourseEnrollment>): Promise<CourseEnrollment>;
  deleteCourseEnrollment(id: string): Promise<void>;
  isUserEnrolled(courseId: string, userId: string): Promise<boolean>;

  // Enhanced course operations
  updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  getPublishedCourses(): Promise<Course[]>;

  // Enhanced course lesson operations
  getCourseLesson(id: string): Promise<CourseLesson | undefined>;
  updateCourseLesson(id: string, lesson: Partial<InsertCourseLesson>): Promise<CourseLesson>;
  deleteCourseLesson(id: string): Promise<void>;
  reorderCourseLessons(courseId: string, lessonIds: string[]): Promise<void>;

  // Course material operations
  getCourseMaterials(lessonId: string): Promise<CourseMaterial[]>;
  getCourseMaterial(id: string): Promise<CourseMaterial | undefined>;
  createCourseMaterial(material: InsertCourseMaterial): Promise<CourseMaterial>;
  deleteCourseMaterial(id: string): Promise<void>;

  // Course lesson progress operations
  getLessonProgress(lessonId: string, userId: string): Promise<CourseLessonProgress | undefined>;
  getUserLessonProgress(userId: string, courseId: string): Promise<CourseLessonProgress[]>;
  upsertLessonProgress(progress: InsertCourseLessonProgress): Promise<CourseLessonProgress>;
  markLessonComplete(lessonId: string, userId: string): Promise<CourseLessonProgress>;

  // Enhanced course task operations
  getCourseTask(id: string): Promise<CourseTask | undefined>;
  updateCourseTask(id: string, task: Partial<InsertCourseTask>): Promise<CourseTask>;
  deleteCourseTask(id: string): Promise<void>;

  // Quiz question operations
  getQuizQuestions(taskId: string): Promise<QuizQuestion[]>;
  getQuizQuestion(id: string): Promise<QuizQuestion | undefined>;
  createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;
  updateQuizQuestion(id: string, question: Partial<InsertQuizQuestion>): Promise<QuizQuestion>;
  deleteQuizQuestion(id: string): Promise<void>;
  reorderQuizQuestions(taskId: string, questionIds: string[]): Promise<void>;

  // Quiz attempt operations
  getQuizAttempts(taskId: string, userId: string): Promise<QuizAttempt[]>;
  getQuizAttempt(id: string): Promise<QuizAttempt | undefined>;
  getLatestQuizAttempt(taskId: string, userId: string): Promise<QuizAttempt | undefined>;
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  updateQuizAttempt(id: string, updates: Partial<QuizAttempt>): Promise<QuizAttempt>;
  submitQuizAttempt(id: string, answers: string, score: number, maxScore: number): Promise<QuizAttempt>;
  countUserAttempts(taskId: string, userId: string): Promise<number>;

  // Enhanced submission operations
  getTaskSubmissions(taskId: string): Promise<CourseSubmission[]>;
  getUserSubmissions(userId: string): Promise<CourseSubmission[]>;
  getSubmission(id: string): Promise<CourseSubmission | undefined>;
  updateSubmission(id: string, updates: Partial<CourseSubmission>): Promise<CourseSubmission>;
  gradeSubmission(id: string, graderId: string, grade: number, feedback?: string): Promise<CourseSubmission>;

  // Event form field operations
  getEventFormFields(eventId: string): Promise<EventFormField[]>;
  getEventFormField(id: string): Promise<EventFormField | undefined>;
  createEventFormField(field: InsertEventFormField): Promise<EventFormField>;
  updateEventFormField(id: string, field: Partial<InsertEventFormField>): Promise<EventFormField>;
  deleteEventFormField(id: string): Promise<void>;
  reorderEventFormFields(eventId: string, fieldIds: string[]): Promise<void>;

  // Event form response operations
  getEventFormResponses(eventId: string): Promise<EventFormResponseWithAnswers[]>;
  getEventFormResponse(id: string): Promise<EventFormResponseWithAnswers | undefined>;
  getRegistrationFormResponse(registrationId: string): Promise<EventFormResponse | undefined>;
  createEventFormResponse(response: InsertEventFormResponse): Promise<EventFormResponse>;
  
  // Event form answer operations
  createEventFormAnswer(answer: InsertEventFormAnswer): Promise<EventFormAnswer>;
  createEventFormAnswers(answers: InsertEventFormAnswer[]): Promise<EventFormAnswer[]>;

  // Chat session operations
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSession(id: string): Promise<ChatSession | undefined>;
  getChatSessionWithMessages(id: string): Promise<ChatSessionWithMessages | undefined>;
  getUserChatSessions(userId: string, type?: string): Promise<ChatSession[]>;
  getEventChatSessions(eventId: string): Promise<ChatSessionWithMessages[]>;
  updateChatSession(id: string, updates: Partial<InsertChatSession>): Promise<ChatSession>;
  completeChatSession(id: string, extractedData?: string): Promise<ChatSession>;

  // Chat message operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(sessionId: string): Promise<ChatMessage[]>;

  // Challenge operations
  getChallenges(): Promise<Challenge[]>;
  getActiveChallenges(): Promise<Challenge[]>;
  getChallenge(id: string): Promise<Challenge | undefined>;
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;
  updateChallenge(id: string, challenge: Partial<InsertChallenge>): Promise<Challenge>;
  deleteChallenge(id: string): Promise<void>;

  // Challenge attachment operations
  getChallengeAttachments(challengeId: string): Promise<ChallengeAttachment[]>;
  getChallengeAttachment(id: string): Promise<ChallengeAttachment | undefined>;
  createChallengeAttachment(attachment: InsertChallengeAttachment): Promise<ChallengeAttachment>;
  updateChallengeAttachment(id: string, updates: Partial<InsertChallengeAttachment>): Promise<ChallengeAttachment>;
  deleteChallengeAttachment(id: string): Promise<void>;

  // Challenge attempt operations
  createChallengeAttempt(attempt: InsertChallengeAttempt): Promise<ChallengeAttempt>;
  getChallengeAttempt(id: string): Promise<ChallengeAttempt | undefined>;
  getChallengeAttemptWithMessages(id: string): Promise<ChallengeAttemptWithMessages | undefined>;
  getUserChallengeAttempts(userId: string): Promise<ChallengeAttempt[]>;
  getUserActiveAttempt(userId: string, challengeId: string): Promise<ChallengeAttempt | undefined>;
  updateChallengeAttempt(id: string, updates: Partial<InsertChallengeAttempt>): Promise<ChallengeAttempt>;
  completeChallengeAttempt(id: string, score: number, feedback: string, customOutcome?: string | null, outcomeScore?: number | null): Promise<ChallengeAttempt>;

  // Challenge message operations
  createChallengeMessage(message: InsertChallengeMessage): Promise<ChallengeMessage>;
  getChallengeMessages(attemptId: string): Promise<ChallengeMessage[]>;

  // Leaderboard operations
  getChallengeLeaderboard(challengeId: string, limit?: number, sortBy?: 'score' | 'customOutcome'): Promise<LeaderboardEntry[]>;
  getGlobalLeaderboard(limit?: number): Promise<LeaderboardEntry[]>;

  // FIS Seasonal points operations
  calculateAndAwardFISPoints(challengeId: string): Promise<void>;
  getSeasonalLeaderboard(limit?: number): Promise<SeasonalLeaderboardEntry[]>;
  getTeamChampionship(limit?: number): Promise<TeamChampionshipEntry[]>;
  getChallengeLatestResults(challengeId: string, limit?: number): Promise<LeaderboardEntry[]>;
  getUserSeasonalPointsForChallenge(userId: string, challengeId: string): Promise<SeasonalPoints[]>;
  getGlobalLatestResults(limit?: number): Promise<GlobalLatestResult[]>;

  // Phase 3: Announcement operations
  getAnnouncements(type?: string, courseId?: string): Promise<AnnouncementWithAuthor[]>;
  getAnnouncement(id: string): Promise<AnnouncementWithAuthor | undefined>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, updates: Partial<InsertAnnouncement>): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<void>;

  // Phase 3: Discussion forum operations
  getCourseForum(courseId: string): Promise<DiscussionForum | undefined>;
  getForum(id: string): Promise<DiscussionForum | undefined>;
  createForum(forum: InsertDiscussionForum): Promise<DiscussionForum>;
  updateForum(id: string, updates: Partial<InsertDiscussionForum>): Promise<DiscussionForum>;

  // Phase 3: Discussion thread operations
  getForumThreads(forumId: string): Promise<DiscussionThreadWithStats[]>;
  getThread(id: string): Promise<DiscussionThread | undefined>;
  createThread(thread: InsertDiscussionThread): Promise<DiscussionThread>;
  updateThread(id: string, updates: Partial<InsertDiscussionThread>): Promise<DiscussionThread>;
  deleteThread(id: string): Promise<void>;
  incrementThreadViews(id: string): Promise<void>;

  // Phase 3: Discussion reply operations
  getThreadReplies(threadId: string): Promise<DiscussionReplyWithAuthor[]>;
  createReply(reply: InsertDiscussionReply): Promise<DiscussionReply>;
  updateReply(id: string, content: string): Promise<DiscussionReply>;
  deleteReply(id: string): Promise<void>;

  // Phase 3: Private message operations (legacy)
  getUserMessages(userId: string, folder: 'inbox' | 'sent'): Promise<PrivateMessageWithUsers[]>;
  getMessage(id: string): Promise<PrivateMessageWithUsers | undefined>;
  sendMessage(message: InsertPrivateMessage): Promise<PrivateMessage>;
  markMessageRead(id: string): Promise<PrivateMessage>;
  deleteMessage(id: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;

  // WhatsApp-style chat operations
  getUserConversations(userId: string): Promise<ConversationWithParticipant[]>;
  getOrCreateConversation(userId: string, otherUserId: string): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationMessages(conversationId: string, limit?: number): Promise<ChatMessageWithSender[]>;
  sendChatMessage(conversationId: string, senderId: string, content: string, mentions?: string[]): Promise<ChatMessagePrivate>;
  markConversationMessagesRead(conversationId: string, userId: string): Promise<void>;
  getUnreadChatCount(userId: string): Promise<number>;

  // Phase 3: Lesson comment operations
  getLessonComments(lessonId: string): Promise<LessonCommentWithAuthor[]>;
  createLessonComment(comment: InsertLessonComment): Promise<LessonComment>;
  updateLessonComment(id: string, content: string): Promise<LessonComment>;
  deleteLessonComment(id: string): Promise<void>;

  // Phase 3: Notification operations
  getUserNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string, userId: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: string, userId: string): Promise<boolean>;
  getUnreadNotificationCount(userId: string): Promise<number>;

  // Phase 4: Grade category operations
  getCourseGradeCategories(courseId: string): Promise<GradeCategory[]>;
  createGradeCategory(category: InsertGradeCategory): Promise<GradeCategory>;
  updateGradeCategory(id: string, updates: Partial<InsertGradeCategory>): Promise<GradeCategory>;
  deleteGradeCategory(id: string): Promise<void>;

  // Phase 4: Rubric operations
  getCourseRubrics(courseId: string): Promise<Rubric[]>;
  getRubric(id: string): Promise<RubricWithCriteria | undefined>;
  createRubric(rubric: InsertRubric): Promise<Rubric>;
  deleteRubric(id: string): Promise<void>;

  // Phase 4: Rubric criteria operations
  createRubricCriteria(criteria: InsertRubricCriteria): Promise<RubricCriteria>;
  createRubricLevel(level: InsertRubricLevel): Promise<RubricLevel>;

  // Phase 4: Rubric scoring operations
  createRubricScore(score: InsertRubricScore): Promise<RubricScore>;
  getSubmissionRubricScores(submissionId: string): Promise<RubricScore[]>;

  // Phase 4: Gradebook operations
  getCourseGradebook(courseId: string): Promise<StudentGradeSummary[]>;
  getStudentGrades(courseId: string, userId: string): Promise<GradebookEntryWithTask[]>;
  upsertGradebookEntry(entry: InsertGradebookEntry): Promise<GradebookEntry>;
  exportGradebook(courseId: string): Promise<any[]>;

  // Career Portal operations
  getJobOpenings(includeAll?: boolean): Promise<JobOpening[]>;
  getJobOpening(id: string): Promise<JobOpening | undefined>;
  createJobOpening(opening: InsertJobOpening): Promise<JobOpening>;
  updateJobOpening(id: string, updates: Partial<InsertJobOpening>): Promise<JobOpening>;
  deleteJobOpening(id: string): Promise<void>;
  incrementJobViewCount(id: string): Promise<void>;
  getUserJobOpenings(userId: string): Promise<JobOpening[]>;
  getPendingJobOpenings(): Promise<(JobOpening & { submitterFirstName?: string | null; submitterLastName?: string | null; submitterEmail?: string | null })[]>;
  getJobApplications(jobId?: string): Promise<(JobApplication & { jobTitle?: string })[]>;
  getJobApplication(id: string): Promise<(JobApplication & { jobTitle?: string }) | undefined>;
  createJobApplication(application: InsertJobApplication): Promise<JobApplication>;
  updateJobApplicationStatus(id: string, status: string): Promise<JobApplication>;
  getApplicationMessages(applicationId: string): Promise<JobApplicationMessage[]>;
  createApplicationMessage(message: InsertJobApplicationMessage): Promise<JobApplicationMessage>;
  getJobApplicationsByCandidate(candidateId: string): Promise<(JobApplication & { jobTitle?: string })[]>;
  getJobApplicationForCandidate(applicationId: string, candidateId: string): Promise<(JobApplication & { jobTitle?: string }) | undefined>;
  linkApplicationsToCandidate(email: string, candidateId: string): Promise<void>;

  // Company operations
  getCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, updates: Partial<InsertCompany>): Promise<Company>;
  deleteCompany(id: string): Promise<void>;
  getCompanyUsers(companyId: string): Promise<(CompanyUser & { user: { id: string; firstName: string | null; lastName: string | null; email: string; profileImageUrl: string | null } })[]>;
  addCompanyUser(data: InsertCompanyUser): Promise<CompanyUser>;
  removeCompanyUser(id: string): Promise<void>;
  getUserCompanies(userId: string): Promise<(CompanyUser & { company: Company })[]>;

  // Startup operations
  getStartups(filters?: { vertical?: string; stage?: string }): Promise<Startup[]>;
  getStartup(id: string): Promise<Startup | undefined>;
  createStartup(startup: InsertStartup): Promise<Startup>;
  updateStartup(id: string, updates: Partial<InsertStartup>): Promise<Startup>;
  deleteStartup(id: string): Promise<void>;
  getStartupMembers(startupId: string): Promise<StartupMemberWithUser[]>;
  addStartupMember(data: InsertStartupMember): Promise<StartupMember>;
  removeStartupMember(id: string): Promise<void>;
  touchStartupActivity(startupId: string, when?: Date): Promise<void>;
  // Group 2: founder/team social tracker roster
  getTeamMembers(startupId: string): Promise<TeamMember[]>;
  getAllTeamMembers(): Promise<TeamMember[]>;
  getTeamMember(id: string): Promise<TeamMember | undefined>;
  createTeamMember(data: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: string, updates: Partial<InsertTeamMember>): Promise<TeamMember>;
  deleteTeamMember(id: string): Promise<void>;
  countSignalEvents(filter: { startupId: string; sourceKeyPrefix?: string; sinceMs: number }): Promise<{ count: number; lastOccurredAt: Date | null }>;
  getUserStartups(userId: string): Promise<(StartupMember & { startup: Startup })[]>;
  getStartupMetrics(startupId: string): Promise<StartupMetric[]>;
  createStartupMetric(metric: InsertStartupMetric): Promise<StartupMetric>;
  updateStartupMetric(id: string, updates: Partial<InsertStartupMetric>): Promise<StartupMetric>;
  deleteStartupMetric(id: string): Promise<void>;

  // Investor operations
  getInvestors(): Promise<Investor[]>;
  getInvestor(id: string): Promise<Investor | undefined>;
  getInvestorCreatorImage(investorId: string): Promise<string | null>;
  getInvestorsWithCreatorImage(): Promise<Array<Investor & { creatorImage: string | null }>>;
  createInvestor(data: InsertInvestor): Promise<Investor>;
  updateInvestor(id: string, updates: Partial<InsertInvestor>): Promise<Investor>;
  deleteInvestor(id: string): Promise<void>;
  createInvestorInvitation(data: InsertInvestorInvitation & { token: string }): Promise<InvestorInvitation>;
  getInvestorInvitations(investorId: string): Promise<InvestorInvitation[]>;
  getInvestorInvitationByToken(token: string): Promise<(InvestorInvitation & { investor: Investor }) | undefined>;
  updateInvestorInvitation(id: string, updates: Partial<InvestorInvitation>): Promise<InvestorInvitation>;
  hasPendingInvestorInvitation(investorId: string, email: string): Promise<boolean>;
  getInvestorMembers(investorId: string): Promise<Array<InvestorMember & { firstName: string | null; lastName: string | null; email: string | null }>>;
  addInvestorMember(data: InsertInvestorMember): Promise<InvestorMember>;
  removeInvestorMember(id: string): Promise<void>;
  getUserInvestors(userId: string): Promise<Array<InvestorMember & { investor: Investor }>>;
  getCompanyPortfolioDashboard(companyId: string): Promise<{
    pipelineByStatus: Record<string, number>;
    activeBriefs: number;
    activePrograms: number;
    avgEvaluationScore: number;
    totalEvaluations: number;
    monthlyMetrics: Array<{ month: string; revenue: number; mrr: number; users: number; pilots: number; startupCount: number }>;
    topStartups: Array<{ id: string; name: string; vertical: string | null; stage: string | null; logo: string | null; status: string }>;
  }>;

  // Brief operations
  getBriefs(companyId?: string, publicOnly?: boolean): Promise<Brief[]>;
  getBrief(id: string): Promise<Brief | undefined>;
  createBrief(brief: InsertBrief): Promise<Brief>;
  updateBrief(id: string, updates: Partial<InsertBrief>): Promise<Brief>;
  deleteBrief(id: string): Promise<void>;
  getBriefApplications(briefId: string): Promise<BriefApplicationWithStartup[]>;
  getBriefApplication(id: string): Promise<BriefApplication | undefined>;
  createBriefApplication(application: InsertBriefApplication): Promise<BriefApplication>;
  updateBriefApplicationStatus(id: string, status: string): Promise<BriefApplication>;
  getStartupBriefApplications(startupId: string): Promise<(BriefApplication & { briefTitle?: string })[]>;

  // Program operations
  getPrograms(companyId?: string): Promise<Program[]>;
  getProgram(id: string): Promise<Program | undefined>;
  createProgram(program: InsertProgram): Promise<Program>;
  updateProgram(id: string, updates: Partial<InsertProgram>): Promise<Program>;
  deleteProgram(id: string): Promise<void>;
  getProgramParticipants(programId: string): Promise<ProgramParticipant[]>;
  addProgramParticipant(data: InsertProgramParticipant): Promise<ProgramParticipant>;
  removeProgramParticipant(id: string): Promise<void>;

  // Evaluation operations
  getEvaluation(id: string): Promise<Evaluation | undefined>;
  getEvaluations(entityType: string, entityId: string): Promise<Evaluation[]>;
  getEntityEvaluationSummary(entityType: string, entityId: string): Promise<{ avgScore: number; count: number }>;
  createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation>;
  deleteEvaluation(id: string): Promise<void>;

  // Startup-Company Relations (Pipeline CRM)
  getCompanyPipeline(companyId: string, status?: string): Promise<StartupCompanyRelationWithStartup[]>;
  getStartupCompanyRelation(startupId: string, companyId: string): Promise<StartupCompanyRelation | undefined>;
  upsertStartupCompanyRelation(data: InsertStartupCompanyRelation): Promise<StartupCompanyRelation>;
  updateStartupCompanyRelationStatus(id: string, status: string): Promise<StartupCompanyRelation>;

  // Company Notes
  getCompanyNotes(companyId: string, startupId?: string): Promise<CompanyNoteWithAuthor[]>;
  createCompanyNote(note: InsertCompanyNote): Promise<CompanyNote>;
  deleteCompanyNote(id: string): Promise<void>;

  // Corporate Reporting
  getCompanyReport(companyId: string): Promise<{
    briefCount: number;
    applicationCount: number;
    programCount: number;
    pipelineByStatus: Record<string, number>;
    avgEvaluationScore: number;
  }>;

  // University & Club operations  
  getUniversities(): Promise<University[]>;
  getUniversityBySlug(slug: string): Promise<University | undefined>;
  getUniversity(id: string): Promise<University | undefined>;
  createUniversity(data: InsertUniversity): Promise<University>;
  updateUniversity(id: string, updates: Partial<InsertUniversity>): Promise<University>;
  deleteUniversity(id: string): Promise<void>;
  
  getClubs(universityId?: string): Promise<Club[]>;
  getClubBySlug(slug: string): Promise<Club | undefined>;
  getClub(id: string): Promise<Club | undefined>;
  createClub(data: InsertClub): Promise<Club>;
  updateClub(id: string, updates: Partial<InsertClub>): Promise<Club>;
  deleteClub(id: string): Promise<void>;
  
  getUserUniversityMemberships(userId: string): Promise<(UserUniversityMembership & { university: University })[]>;
  addUserUniversityMembership(data: InsertUserUniversityMembership): Promise<UserUniversityMembership>;
  removeUserUniversityMembership(id: string): Promise<void>;
  getUniversityMembers(universityId: string): Promise<UserUniversityMembership[]>;
  getUserUniversityMembership(userId: string, universityId: string): Promise<UserUniversityMembership | undefined>;
  updateUserUniversityMembership(id: string, updates: Partial<InsertUserUniversityMembership>): Promise<UserUniversityMembership>;
  
  getUserClubMemberships(userId: string): Promise<(UserClubMembership & { club: Club })[]>;
  addUserClubMembership(data: InsertUserClubMembership): Promise<UserClubMembership>;
  removeUserClubMembership(id: string): Promise<void>;
  getClubMembers(clubId: string): Promise<UserClubMembership[]>;
  getUserClubMembership(userId: string, clubId: string): Promise<UserClubMembership | undefined>;
  updateUserClubMembership(id: string, updates: Partial<InsertUserClubMembership>): Promise<UserClubMembership>;
  
  getStartupAffiliations(startupId: string): Promise<StartupAffiliation[]>;
  getStartupAffiliationsByUniversity(universityId: string): Promise<StartupAffiliation[]>;
  getStartupAffiliationsByClub(clubId: string): Promise<StartupAffiliation[]>;
  addStartupAffiliation(data: InsertStartupAffiliation): Promise<StartupAffiliation>;
  removeStartupAffiliation(id: string): Promise<void>;
  getEventsByUniversity(universityId: string): Promise<Event[]>;
  getEventsByClub(clubId: string): Promise<Event[]>;

  // Startup Readiness operations
  getStartupReadiness(startupId: string): Promise<StartupReadiness | undefined>;
  upsertStartupReadiness(startupId: string, data: Partial<InsertStartupReadiness>): Promise<StartupReadiness>;
  
  // Reviewer Assignment operations
  getReviewerAssignments(companyId: string): Promise<ReviewerAssignmentWithDetails[]>;
  getMyReviewAssignments(reviewerId: string): Promise<ReviewerAssignmentWithDetails[]>;
  createReviewerAssignment(data: InsertReviewerAssignment): Promise<ReviewerAssignment>;
  updateReviewerAssignmentStatus(id: string, status: string): Promise<ReviewerAssignment>;
  deleteReviewerAssignment(id: string): Promise<void>;
  getEntityReviewProgress(entityType: string, entityId: string): Promise<{ total: number; completed: number }>;
  
  // Activity Log operations
  createActivityLog(data: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(companyId: string, limit?: number): Promise<ActivityLogWithActor[]>;
  getActivityLogsByEntity(entityId: string, entityType?: string, limit?: number): Promise<ActivityLogWithActor[]>;
  
  // Company Plan & Usage operations
  getCompanyPlan(companyId: string): Promise<CompanyPlan | undefined>;
  upsertCompanyPlan(companyId: string, data: Partial<InsertCompanyPlan>): Promise<CompanyPlan>;
  getCompanyUsage(companyId: string): Promise<CompanyUsage | undefined>;
  incrementCompanyUsage(companyId: string, field: string): Promise<CompanyUsage>;
  decrementCompanyUsage(companyId: string, field: string): Promise<CompanyUsage>;
  updateCompanyUsageField(companyId: string, field: string, value: number): Promise<CompanyUsage>;
  getCompanyPlanWithUsage(companyId: string): Promise<CompanyPlanWithUsage | undefined>;

  getSystemSetting(key: string): Promise<string | null>;
  setSystemSetting(key: string, value: string): Promise<void>;

  // Signals foundation
  getAllSignalSources(): Promise<SignalSource[]>;
  getSignalSourceByKey(sourceKey: string): Promise<SignalSource | undefined>;
  upsertSignalSource(source: { sourceKey: string; displayName: string; category: string; scoreCategory?: string | null; description?: string | null; requiresCredentials: boolean; credentialKind?: string | null }): Promise<SignalSource>;
  markSignalSourceStatus(sourceKey: string, status: string, error: string | null): Promise<void>;
  setSignalSourcePaused(sourceKey: string, isPaused: boolean): Promise<SignalSource>;
  recordSignalEvent(event: InsertSignalEvent): Promise<boolean>;
  getSignalEventsForStartup(startupId: string, limit?: number): Promise<SignalEvent[]>;
  createIngestionRun(run: InsertIngestionRun): Promise<IngestionRun>;
  finishIngestionRun(id: string, updates: { finishedAt: Date; eventsCreated: number; status: string; error: string | null }): Promise<void>;
  getRecentIngestionRuns(sourceKey: string, limit?: number): Promise<IngestionRun[]>;
  getAllCronJobs(): Promise<CronJob[]>;
  getCronJobByName(jobName: string): Promise<CronJob | undefined>;
  createCronJob(job: InsertCronJob): Promise<CronJob>;
  markCronJobStarted(id: string): Promise<void>;
  markCronJobFinished(id: string, status: string, error: string | null): Promise<void>;
  setCronJobPaused(jobName: string, isPaused: boolean): Promise<CronJob>;
  getIntegrationCredential(startupId: string | null, kind: string): Promise<IntegrationCredential | undefined>;
  upsertIntegrationCredential(data: InsertIntegrationCredential): Promise<IntegrationCredential>;
  listIntegrationCredentials(startupId: string): Promise<IntegrationCredential[]>;
  getIntegrationCredentialsForStartup(startupId: string): Promise<IntegrationCredential[]>;
  getActiveIntegrationCredentialsByKind(kind: string): Promise<IntegrationCredential[]>;
  deleteIntegrationCredential(startupId: string | null, kind: string): Promise<void>;
  listIntegrationCredentialsByKind(kind: string): Promise<IntegrationCredential[]>;
  getLatestVitalityScore(startupId: string): Promise<VitalityScore | undefined>;
  getVitalityScoreHistory(startupId: string, limit?: number): Promise<VitalityScore[]>;
  getLatestVitalityScoresForStartups(startupIds: string[]): Promise<VitalityScore[]>;
  insertVitalityScore(data: InsertVitalityScore): Promise<VitalityScore>;

  // Unified timeline & milestones (Task #26 — Group 7)
  getStartupTimeline(startupId: string, opts?: {
    cursor?: { occurredAt: Date; id: string } | null;
    limit?: number;
    categories?: string[];
    sources?: string[];
    severities?: string[];
    after?: Date;
    before?: Date;
  }): Promise<{ events: SignalEvent[]; nextCursor: { occurredAt: string; id: string } | null }>;
  getStartupSignalEventsInWindow(startupId: string, since: Date): Promise<SignalEvent[]>;
  listAllStartupIdsWithSignals(): Promise<string[]>;
  getMilestonesForStartup(startupId: string, opts?: { since?: Date; includeStatuses?: string[] }): Promise<Milestone[]>;
  upsertMilestoneByEventOverlap(data: InsertMilestone): Promise<Milestone>;
  // Group 7.2 — Milestone review queue
  listMilestonesForReview(opts?: { status?: string; limit?: number }): Promise<Array<Milestone & { startup: { id: string; name: string } | null }>>;
  setMilestoneReviewStatus(id: string, status: "approved" | "rejected" | "pending_review", reviewerId: string | null): Promise<Milestone | undefined>;
  deleteMilestone(id: string): Promise<void>;

  // Group 8 — Alerts & Notifications
  listAlertRules(filter?: { ownerType?: string; ownerId?: string; isActive?: boolean }): Promise<AlertRule[]>;
  getAlertRule(id: string): Promise<AlertRule | undefined>;
  createAlertRule(rule: InsertAlertRule): Promise<AlertRule>;
  updateAlertRule(id: string, updates: Partial<InsertAlertRule>): Promise<AlertRule>;
  deleteAlertRule(id: string): Promise<void>;

  listUserWatchlists(userId: string): Promise<(Watchlist & { startupCount: number })[]>;
  getWatchlist(id: string): Promise<Watchlist | undefined>;
  getWatchlistStartups(watchlistId: string): Promise<(WatchlistStartup & { startup: Startup })[]>;
  createWatchlist(data: InsertWatchlist): Promise<Watchlist>;
  deleteWatchlist(id: string): Promise<void>;
  addWatchlistStartup(data: InsertWatchlistStartup): Promise<WatchlistStartup>;
  removeWatchlistStartup(watchlistId: string, startupId: string): Promise<void>;
  updateWatchlist(id: string, updates: Partial<InsertWatchlist>): Promise<Watchlist>;
  getAllWatchlistsWithStartups(opts?: { cadence?: string }): Promise<(Watchlist & { startupIds: string[] })[]>;
  getWatchlistsContainingStartup(startupId: string, opts?: { cadence?: string }): Promise<Watchlist[]>;

  createManualReviewFlag(flag: InsertManualReviewFlag): Promise<ManualReviewFlag>;
  listManualReviewFlags(filter: { reviewerId?: string; entityType?: string; entityId?: string; status?: string }): Promise<ManualReviewFlag[]>;
  getManualReviewFlag(id: string): Promise<ManualReviewFlag | undefined>;
  updateManualReviewFlagStatus(id: string, status: string): Promise<ManualReviewFlag>;

  upsertFounderPulseState(state: InsertFounderPulseState): Promise<FounderPulseState>;
  getFounderPulseState(startupId: string): Promise<FounderPulseState | undefined>;
  listFounderPulseStates(): Promise<FounderPulseState[]>;

  getSignalEventsSince(since: Date, startupIds?: string[]): Promise<SignalEvent[]>;
  getRecentSignalEventForStartup(startupId: string): Promise<SignalEvent | undefined>;

  // Group 6 — Vitality scoring
  getAllSignalEvents(): Promise<SignalEvent[]>;
  getScoreWeightPresets(companyId?: string | null): Promise<ScoreWeightPreset[]>;
  getScoreWeightPreset(id: string): Promise<ScoreWeightPreset | undefined>;
  createScoreWeightPreset(data: InsertScoreWeightPreset): Promise<ScoreWeightPreset>;
  updateScoreWeightPreset(id: string, updates: Partial<InsertScoreWeightPreset>): Promise<ScoreWeightPreset>;
  deleteScoreWeightPreset(id: string): Promise<void>;

  // Telegram workspace bot (Task #24)
  getTelegramChatsForStartup(startupId: string): Promise<TelegramChat[]>;
  getTelegramChatByChatId(telegramChatId: string): Promise<TelegramChat | undefined>;
  upsertTelegramChat(data: InsertTelegramChat): Promise<TelegramChat>;
  setTelegramChatActive(telegramChatId: string, isActive: boolean): Promise<void>;
  setTelegramChatMemberCount(telegramChatId: string, memberCount: number): Promise<void>;
  bumpTelegramChatStats(telegramChatId: string, day: string, telegramUserId: string | null): Promise<void>;
  getUndispatchedTelegramStats(beforeDay: string): Promise<TelegramChatDailyStat[]>;
  markTelegramStatsDispatched(id: string): Promise<void>;
  getTelegramFounderBinding(startupId: string, userId: string): Promise<TelegramFounderBinding | undefined>;
  createTelegramFounderBinding(data: { startupId: string; userId: string; linkToken: string; language: string }): Promise<TelegramFounderBinding>;
  getTelegramFounderBindingByToken(linkToken: string): Promise<TelegramFounderBinding | undefined>;
  getTelegramFounderBindingsByTelegramUser(telegramUserId: string): Promise<TelegramFounderBinding[]>;
  bindTelegramFounder(id: string, telegramUserId: string, telegramUsername: string | null): Promise<void>;

  // --- Startup AI assistant + documents ---
  createStartupAiChatMessage(data: InsertStartupAiChatMessage): Promise<StartupAiChatMessage>;
  getStartupAiChatMessages(startupId: string, limit?: number): Promise<StartupAiChatMessage[]>;
  clearStartupAiChat(startupId: string): Promise<void>;
  createStartupDocument(data: InsertStartupDocument): Promise<StartupDocument>;
  getStartupDocuments(startupId: string, opts?: { publicOnly?: boolean }): Promise<StartupDocument[]>;
  getStartupDocument(id: string): Promise<StartupDocument | undefined>;
  updateStartupDocument(id: string, patch: Partial<InsertStartupDocument>): Promise<StartupDocument | undefined>;
  deleteStartupDocument(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = normalizeEmail(email);
    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));
    return user;
  }

  // Generate unique @tag for users
  private async generateUniqueTag(): Promise<string> {
    const animals = ['cat', 'dog', 'fox', 'owl', 'bee', 'elk', 'bat', 'ant', 'emu', 'jay', 'ram', 'yak', 'cod', 'eel', 'koi', 'ray'];
    const maxAttempts = 100;
    
    for (let i = 0; i < maxAttempts; i++) {
      const animal = animals[Math.floor(Math.random() * animals.length)];
      const number = Math.floor(100 + Math.random() * 900); // 3 digits
      const tag = `${animal}${number}`;
      
      // Check if tag already exists
      const [existing] = await db.select().from(users).where(eq(users.tag, tag));
      if (!existing) {
        return tag;
      }
    }
    
    // Fallback to UUID-based tag
    return `user${Date.now().toString(36)}`;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Normalize email before upserting
    const normalizedUserData = {
      ...userData,
      email: normalizeEmail(userData.email!),
    };
    
    // Check if user exists by email
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedUserData.email));

    if (existingUser) {
      // Update existing user
      const [updatedUser] = await db
        .update(users)
        .set({
          ...normalizedUserData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return updatedUser;
    }

    // Generate unique tag for new user
    const tag = await this.generateUniqueTag();

    // Insert new user with generated tag
    const [user] = await db
      .insert(users)
      .values({ ...normalizedUserData, tag })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async updateUserProfile(id: string, updates: Partial<Pick<User, 'firstName' | 'lastName' | 'patronymic' | 'organizationType' | 'organizationName' | 'faculty' | 'groupNumber' | 'city' | 'company' | 'category' | 'position' | 'interests' | 'aboutMe' | 'skills' | 'previousStartups' | 'pitchDeckLink' | 'profileImageUrl' | 'mainOrgType' | 'mainOrgId'>>): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        role: role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async updateUserAdditionalRoles(id: string, updates: { isPartner?: boolean; isResident?: boolean; isFounder?: boolean; isSpeaker?: boolean }): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async freezeUser(id: string, frozenBy: string, reason: string | null): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        isFrozen: true,
        frozenBy,
        frozenAt: new Date(),
        frozenReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async unfreezeUser(id: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        isFrozen: false,
        frozenBy: null,
        frozenAt: null,
        frozenReason: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async setNewsletterOptOut(id: string, optOut: boolean): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({
        newsletterOptOut: optOut,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  // Password reset token operations
  async createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken> {
    // Normalize email before storing
    const normalizedData = {
      ...data,
      email: normalizeEmail(data.email),
    };

    // Delete any existing tokens for this email first (prevent multiple active codes)
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.email, normalizedData.email));

    // Create new token
    const [token] = await db
      .insert(passwordResetTokens)
      .values(normalizedData)
      .returning();
    return token;
  }

  async getPasswordResetToken(email: string, code: string): Promise<PasswordResetToken | undefined> {
    const normalizedEmail = normalizeEmail(email);
    const [token] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.email, normalizedEmail),
        eq(passwordResetTokens.code, code)
      ));
    return token;
  }

  async deletePasswordResetToken(id: string): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, id));
  }

  // Email verification code operations
  // NOTE: We intentionally keep historical rows so the per-email/hour rate
  // limit can be enforced. Rows are cleaned up on successful verification
  // or on registration completion.
  async createEmailVerificationCode(data: InsertEmailVerificationCode): Promise<EmailVerificationCode> {
    const normalizedData = {
      ...data,
      email: normalizeEmail(data.email),
    };
    const [code] = await db
      .insert(emailVerificationCodes)
      .values(normalizedData)
      .returning();
    return code;
  }

  async getEmailVerificationCodeByEmail(email: string): Promise<EmailVerificationCode | undefined> {
    const normalizedEmail = normalizeEmail(email);
    // Active = not yet consumed. We keep historical (consumed) rows so they
    // still count toward the per-hour rate limit.
    const [code] = await db
      .select()
      .from(emailVerificationCodes)
      .where(and(
        eq(emailVerificationCodes.email, normalizedEmail),
        sql`${emailVerificationCodes.consumedAt} IS NULL`
      ))
      .orderBy(desc(emailVerificationCodes.createdAt))
      .limit(1);
    return code;
  }

  async incrementEmailVerificationAttempts(id: string): Promise<void> {
    await db
      .update(emailVerificationCodes)
      .set({ attempts: sql`${emailVerificationCodes.attempts} + 1` })
      .where(eq(emailVerificationCodes.id, id));
  }

  async consumeEmailVerificationCodesByEmail(email: string): Promise<void> {
    // Mark all currently-active codes for this email as consumed. The rows
    // are preserved so they continue to count against the hourly send quota.
    const normalizedEmail = normalizeEmail(email);
    await db
      .update(emailVerificationCodes)
      .set({ consumedAt: new Date() })
      .where(and(
        eq(emailVerificationCodes.email, normalizedEmail),
        sql`${emailVerificationCodes.consumedAt} IS NULL`
      ));
  }

  async deleteEmailVerificationCodesByEmail(email: string): Promise<void> {
    // Retained for API compatibility; delegates to consume so historical
    // rows survive for rate-limit accounting.
    await this.consumeEmailVerificationCodesByEmail(email);
  }

  async getLatestEmailVerificationCodeByEmail(email: string): Promise<EmailVerificationCode | undefined> {
    // Returns the most recently created row regardless of consumed status,
    // so the 60s send-throttle cannot be bypassed by consuming a code.
    const normalizedEmail = normalizeEmail(email);
    const [code] = await db
      .select()
      .from(emailVerificationCodes)
      .where(eq(emailVerificationCodes.email, normalizedEmail))
      .orderBy(desc(emailVerificationCodes.createdAt))
      .limit(1);
    return code;
  }

  async countRecentEmailVerificationCodes(email: string, sinceMs: number): Promise<number> {
    const normalizedEmail = normalizeEmail(email);
    const since = new Date(Date.now() - sinceMs);
    const [row] = await db
      .select({ value: count() })
      .from(emailVerificationCodes)
      .where(and(
        eq(emailVerificationCodes.email, normalizedEmail),
        sql`${emailVerificationCodes.createdAt} >= ${since}`
      ));
    return Number(row?.value ?? 0);
  }

  async setUserPinHash(userId: string, pinHash: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ pinHash, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async setEmailVerified(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Landing page operations
  async getAllLandingPages(): Promise<LandingPage[]> {
    return await db.select().from(landingPages).orderBy(desc(landingPages.updatedAt));
  }

  async getLandingPage(id: string): Promise<LandingPage | undefined> {
    const [p] = await db.select().from(landingPages).where(eq(landingPages.id, id));
    return p;
  }

  async getLandingPageBySlug(slug: string): Promise<LandingPage | undefined> {
    const [p] = await db.select().from(landingPages).where(eq(landingPages.slug, slug.toLowerCase()));
    return p;
  }

  async createLandingPage(page: InsertLandingPage): Promise<LandingPage> {
    const [created] = await db.insert(landingPages).values({ ...page, slug: page.slug.toLowerCase() }).returning();
    return created;
  }

  async updateLandingPage(id: string, page: Partial<InsertLandingPage>): Promise<LandingPage> {
    const patch: any = { ...page, updatedAt: new Date() };
    if (typeof patch.slug === "string") patch.slug = patch.slug.toLowerCase();
    const [updated] = await db.update(landingPages).set(patch).where(eq(landingPages.id, id)).returning();
    return updated;
  }

  async deleteLandingPage(id: string): Promise<void> {
    await db.delete(landingPages).where(eq(landingPages.id, id));
  }

  // News operations
  async getPublishedNews(): Promise<NewsArticle[]> {
    return await db
      .select()
      .from(newsArticles)
      .where(eq(newsArticles.isPublished, true))
      .orderBy(desc(newsArticles.publishedAt), desc(newsArticles.createdAt));
  }

  async getAllNews(): Promise<NewsArticle[]> {
    return await db.select().from(newsArticles).orderBy(desc(newsArticles.createdAt));
  }

  async getNewsArticle(id: string): Promise<NewsArticle | undefined> {
    const [a] = await db.select().from(newsArticles).where(eq(newsArticles.id, id));
    return a;
  }

  async createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle> {
    const [created] = await db.insert(newsArticles).values(article).returning();
    return created;
  }

  async updateNewsArticle(id: string, article: Partial<InsertNewsArticle>): Promise<NewsArticle> {
    const [updated] = await db
      .update(newsArticles)
      .set({ ...article, updatedAt: new Date() })
      .where(eq(newsArticles.id, id))
      .returning();
    return updated;
  }

  async deleteNewsArticle(id: string): Promise<void> {
    await db.delete(newsArticles).where(eq(newsArticles.id, id));
  }

  // Event operations
  async getEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(desc(events.createdAt));
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getEventByShowcaseSlug(slug: string): Promise<Event | undefined> {
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.showcaseSlug, slug));
    return event;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  async updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event> {
    const [updated] = await db
      .update(events)
      .set(event)
      .where(eq(events.id, id))
      .returning();
    return updated;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  async getEventShowcaseStartups(eventId: string): Promise<EventShowcaseStartup[]> {
    return db
      .select()
      .from(eventShowcaseStartups)
      .where(eq(eventShowcaseStartups.eventId, eventId))
      .orderBy(asc(eventShowcaseStartups.displayOrder), asc(eventShowcaseStartups.createdAt));
  }

  async getEventShowcaseStartup(id: string): Promise<EventShowcaseStartup | undefined> {
    const [row] = await db
      .select()
      .from(eventShowcaseStartups)
      .where(eq(eventShowcaseStartups.id, id));
    return row;
  }

  async createEventShowcaseStartup(eventId: string, data: InsertEventShowcaseStartup): Promise<EventShowcaseStartup> {
    const [row] = await db
      .insert(eventShowcaseStartups)
      .values({ ...data, eventId, cofounders: data.cofounders ?? [] })
      .returning();
    return row;
  }

  async updateEventShowcaseStartup(id: string, data: Partial<InsertEventShowcaseStartup>): Promise<EventShowcaseStartup> {
    const [row] = await db
      .update(eventShowcaseStartups)
      .set(data)
      .where(eq(eventShowcaseStartups.id, id))
      .returning();
    return row;
  }

  // Atomically import a showcase project into the platform startups directory.
  // A row-level lock on the showcase row (FOR UPDATE) makes this idempotent even
  // under concurrent requests: only the first caller creates+links a startup;
  // others observe the existing link and return it without duplicating.
  async importShowcaseStartupToPlatform(
    showcaseId: string,
    createdBy: string,
  ): Promise<{ startup: Startup; alreadyImported: boolean }> {
    return await db.transaction(async (tx) => {
      const [showcase] = await tx
        .select()
        .from(eventShowcaseStartups)
        .where(eq(eventShowcaseStartups.id, showcaseId))
        .for("update");
      if (!showcase) {
        throw new Error("Showcase startup not found");
      }
      if (showcase.platformStartupId) {
        const [existing] = await tx
          .select()
          .from(startups)
          .where(eq(startups.id, showcase.platformStartupId));
        if (existing) {
          return { startup: existing, alreadyImported: true };
        }
      }
      const description = showcase.longDescription || showcase.shortDescription || undefined;
      const pitchDeckUrl =
        showcase.presentationPdfUrl || showcase.presentationUrl || showcase.presentationPptxUrl || undefined;
      const [created] = await tx
        .insert(startups)
        .values({
          name: showcase.name,
          description: description ?? undefined,
          vertical: showcase.sector ?? undefined,
          website: showcase.websiteUrl ?? undefined,
          logo: showcase.logoUrl ?? undefined,
          pitchDeckUrl: pitchDeckUrl ?? undefined,
          createdBy,
        })
        .returning();
      await tx
        .update(eventShowcaseStartups)
        .set({ platformStartupId: created.id })
        .where(eq(eventShowcaseStartups.id, showcaseId));
      return { startup: created, alreadyImported: false };
    });
  }

  async deleteEventShowcaseStartup(id: string): Promise<void> {
    await db.delete(eventShowcaseStartups).where(eq(eventShowcaseStartups.id, id));
  }

  async setFeaturedEvent(eventId: string, isFeatured: boolean): Promise<Event> {
    // First, verify the event exists
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) {
      throw new Error("Event not found");
    }
    
    // If setting as featured, verify it's upcoming and unset all others
    if (isFeatured) {
      if (event.status !== "upcoming") {
        throw new Error("Only upcoming events can be featured");
      }
      // Atomically unset all featured events first
      await db.update(events).set({ isFeatured: false });
    }

    // Set the new featured status
    const [updatedEvent] = await db
      .update(events)
      .set({ isFeatured })
      .where(eq(events.id, eventId))
      .returning();
    
    return updatedEvent;
  }

  async getFeaturedEvent(): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.isFeatured, true));
    return event;
  }

  async setRegistrationStatus(eventId: string, isOpen: boolean): Promise<Event> {
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) {
      throw new Error("Event not found");
    }

    const [updatedEvent] = await db
      .update(events)
      .set({ registrationOpen: isOpen })
      .where(eq(events.id, eventId))
      .returning();
    
    return updatedEvent;
  }

  // Event registration operations
  async getEventRegistrations(eventId: string): Promise<EventRegistrationWithUser[]> {
    const results = await db
      .select({
        id: eventRegistrations.id,
        eventId: eventRegistrations.eventId,
        userId: eventRegistrations.userId,
        guestName: eventRegistrations.guestName,
        guestEmail: eventRegistrations.guestEmail,
        attendanceMarked: eventRegistrations.attendanceMarked,
        attendanceTime: eventRegistrations.attendanceTime,
        createdAt: eventRegistrations.createdAt,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userPatronymic: users.patronymic,
        userOrganizationType: users.organizationType,
        userOrganizationName: users.organizationName,
        userGroupNumber: users.groupNumber,
        userFaculty: users.faculty,
      })
      .from(eventRegistrations)
      .leftJoin(users, eq(eventRegistrations.userId, users.id))
      .where(eq(eventRegistrations.eventId, eventId));
    return results;
  }

  async getOrganizationStats(): Promise<Array<{ organizationName: string; organizationType: string | null; userCount: number }>> {
    const rows = await db
      .select({
        organizationName: users.organizationName,
        organizationType: users.organizationType,
        userCount: sql<number>`COUNT(*)::int`,
      })
      .from(users)
      .where(and(isNotNull(users.organizationName), sql`TRIM(${users.organizationName}) <> ''`))
      .groupBy(users.organizationName, users.organizationType)
      .orderBy(sql`COUNT(*) DESC`);
    return rows
      .filter((r) => r.organizationName)
      .map((r) => ({
        organizationName: r.organizationName!,
        organizationType: r.organizationType,
        userCount: r.userCount || 0,
      }));
  }

  async mergeOrganizations(
    sourceNames: string[],
    targetName: string,
    targetType: string | null,
  ): Promise<{ updatedUsers: number }> {
    if (!sourceNames.length || !targetName.trim()) {
      return { updatedUsers: 0 };
    }
    const trimmedTarget = targetName.trim();
    const updates: Partial<typeof users.$inferInsert> = {
      organizationName: trimmedTarget,
    };
    if (targetType !== null && targetType !== undefined) {
      updates.organizationType = targetType;
    }
    const result = await db
      .update(users)
      .set(updates)
      .where(inArray(users.organizationName, sourceNames))
      .returning({ id: users.id });
    return { updatedUsers: result.length };
  }

  async getAllRegistrations(): Promise<EventRegistrationWithUser[]> {
    const results = await db
      .select({
        id: eventRegistrations.id,
        eventId: eventRegistrations.eventId,
        userId: eventRegistrations.userId,
        guestName: eventRegistrations.guestName,
        guestEmail: eventRegistrations.guestEmail,
        attendanceMarked: eventRegistrations.attendanceMarked,
        attendanceTime: eventRegistrations.attendanceTime,
        createdAt: eventRegistrations.createdAt,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userPatronymic: users.patronymic,
        userOrganizationType: users.organizationType,
        userOrganizationName: users.organizationName,
        userGroupNumber: users.groupNumber,
        userFaculty: users.faculty,
      })
      .from(eventRegistrations)
      .leftJoin(users, eq(eventRegistrations.userId, users.id))
      .orderBy(desc(eventRegistrations.createdAt));
    return results;
  }

  async createEventRegistration(registration: InsertEventRegistration): Promise<EventRegistration> {
    const [newRegistration] = await db
      .insert(eventRegistrations)
      .values(registration)
      .returning();
    return newRegistration;
  }

  async getUserEventRegistration(eventId: string, userId: string): Promise<EventRegistration | undefined> {
    const [registration] = await db
      .select()
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.userId, userId)
        )
      );
    return registration;
  }

  async getUserRegistrations(userId: string): Promise<EventRegistrationWithEvent[]> {
    const registrations = await db
      .select({
        id: eventRegistrations.id,
        userId: eventRegistrations.userId,
        eventId: eventRegistrations.eventId,
        guestName: eventRegistrations.guestName,
        guestEmail: eventRegistrations.guestEmail,
        attendanceMarked: eventRegistrations.attendanceMarked,
        attendanceTime: eventRegistrations.attendanceTime,
        createdAt: eventRegistrations.createdAt,
        event: events,
      })
      .from(eventRegistrations)
      .leftJoin(events, eq(eventRegistrations.eventId, events.id))
      .where(eq(eventRegistrations.userId, userId));
    
    return registrations.map(r => ({
      id: r.id,
      userId: r.userId,
      eventId: r.eventId,
      guestName: r.guestName,
      guestEmail: r.guestEmail,
      attendanceMarked: r.attendanceMarked,
      attendanceTime: r.attendanceTime,
      createdAt: r.createdAt,
      event: r.event || undefined,
    }));
  }

  async getRegistrationById(id: string): Promise<EventRegistration | undefined> {
    const [registration] = await db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.id, id));
    return registration;
  }

  async markAttendance(registrationId: string): Promise<EventRegistration> {
    const [updatedRegistration] = await db
      .update(eventRegistrations)
      .set({
        attendanceMarked: true,
        attendanceTime: new Date(),
      })
      .where(eq(eventRegistrations.id, registrationId))
      .returning();
    
    if (!updatedRegistration) {
      throw new Error("Registration not found");
    }
    
    return updatedRegistration;
  }

  async unmarkAttendance(registrationId: string): Promise<EventRegistration> {
    const [updatedRegistration] = await db
      .update(eventRegistrations)
      .set({
        attendanceMarked: false,
        attendanceTime: null,
      })
      .where(eq(eventRegistrations.id, registrationId))
      .returning();
    
    if (!updatedRegistration) {
      throw new Error("Registration not found");
    }
    
    return updatedRegistration;
  }

  // Video operations
  async getVideos(): Promise<Video[]> {
    return await db.select().from(videos).orderBy(desc(videos.createdAt));
  }

  async getVideo(id: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const [newVideo] = await db.insert(videos).values(video).returning();
    return newVideo;
  }

  async deleteVideo(id: string): Promise<void> {
    await db.delete(videos).where(eq(videos.id, id));
  }

  // Video comment operations
  async getVideoComments(videoId: string): Promise<VideoComment[]> {
    return await db
      .select()
      .from(videoComments)
      .where(eq(videoComments.videoId, videoId))
      .orderBy(desc(videoComments.createdAt));
  }

  async createVideoComment(comment: InsertVideoComment): Promise<VideoComment> {
    const [newComment] = await db
      .insert(videoComments)
      .values(comment)
      .returning();
    return newComment;
  }

  // Livestream operations
  async getLivestreams(): Promise<Livestream[]> {
    return await db.select().from(livestreams).orderBy(desc(livestreams.createdAt));
  }

  async getActiveLivestream(): Promise<Livestream | undefined> {
    const [stream] = await db
      .select()
      .from(livestreams)
      .where(eq(livestreams.isLive, true))
      .limit(1);
    return stream;
  }

  async createLivestream(livestream: InsertLivestream): Promise<Livestream> {
    const [newStream] = await db.insert(livestreams).values(livestream).returning();
    return newStream;
  }

  async updateLivestream(id: string, livestream: Partial<InsertLivestream>): Promise<Livestream> {
    const [updated] = await db
      .update(livestreams)
      .set(livestream)
      .where(eq(livestreams.id, id))
      .returning();
    return updated;
  }

  async deleteLivestream(id: string): Promise<void> {
    await db.delete(livestreams).where(eq(livestreams.id, id));
  }

  // Course operations
  async getCourses(): Promise<Course[]> {
    return await db.select().from(courses).orderBy(desc(courses.createdAt));
  }

  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db.insert(courses).values(course).returning();
    return newCourse;
  }

  // Course lesson operations
  async getCourseLessons(courseId: string): Promise<CourseLesson[]> {
    return await db
      .select()
      .from(courseLessons)
      .where(eq(courseLessons.courseId, courseId))
      .orderBy(courseLessons.orderIndex);
  }

  async createCourseLesson(lesson: InsertCourseLesson): Promise<CourseLesson> {
    const [newLesson] = await db.insert(courseLessons).values(lesson).returning();
    return newLesson;
  }

  // Course task operations
  async getCourseTasks(courseId: string): Promise<CourseTask[]> {
    return await db
      .select()
      .from(courseTasks)
      .where(eq(courseTasks.courseId, courseId))
      .orderBy(courseTasks.orderIndex);
  }

  async createCourseTask(task: InsertCourseTask): Promise<CourseTask> {
    const [newTask] = await db.insert(courseTasks).values(task).returning();
    return newTask;
  }

  // Course submission operations
  async getUserTaskSubmission(taskId: string, userId: string): Promise<CourseSubmission | undefined> {
    const [submission] = await db
      .select()
      .from(courseSubmissions)
      .where(
        and(
          eq(courseSubmissions.taskId, taskId),
          eq(courseSubmissions.userId, userId)
        )
      );
    return submission;
  }

  async createCourseSubmission(submission: InsertCourseSubmission): Promise<CourseSubmission> {
    const [newSubmission] = await db
      .insert(courseSubmissions)
      .values(submission)
      .returning();
    return newSubmission;
  }

  // Course progress operations
  async getUserCourseProgress(courseId: string, userId: string): Promise<CourseProgress | undefined> {
    const [progress] = await db
      .select()
      .from(courseProgress)
      .where(
        and(
          eq(courseProgress.courseId, courseId),
          eq(courseProgress.userId, userId)
        )
      );
    return progress;
  }

  async upsertCourseProgress(progressData: InsertCourseProgress): Promise<CourseProgress> {
    const [progress] = await db
      .insert(courseProgress)
      .values(progressData)
      .onConflictDoUpdate({
        target: [courseProgress.courseId, courseProgress.userId],
        set: {
          ...progressData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return progress;
  }

  // Course module operations
  async getCourseModules(courseId: string): Promise<CourseModule[]> {
    return await db
      .select()
      .from(courseModules)
      .where(eq(courseModules.courseId, courseId))
      .orderBy(courseModules.orderIndex);
  }

  async getCourseModule(id: string): Promise<CourseModule | undefined> {
    const [module] = await db.select().from(courseModules).where(eq(courseModules.id, id));
    return module;
  }

  async createCourseModule(module: InsertCourseModule): Promise<CourseModule> {
    const [newModule] = await db.insert(courseModules).values(module).returning();
    return newModule;
  }

  async updateCourseModule(id: string, module: Partial<InsertCourseModule>): Promise<CourseModule> {
    const [updated] = await db
      .update(courseModules)
      .set(module)
      .where(eq(courseModules.id, id))
      .returning();
    return updated;
  }

  async deleteCourseModule(id: string): Promise<void> {
    await db.delete(courseModules).where(eq(courseModules.id, id));
  }

  async reorderCourseModules(courseId: string, moduleIds: string[]): Promise<void> {
    for (let i = 0; i < moduleIds.length; i++) {
      await db
        .update(courseModules)
        .set({ orderIndex: i })
        .where(and(eq(courseModules.id, moduleIds[i]), eq(courseModules.courseId, courseId)));
    }
  }

  // Course enrollment operations
  async getCourseEnrollments(courseId: string): Promise<CourseEnrollment[]> {
    return await db
      .select()
      .from(courseEnrollments)
      .where(eq(courseEnrollments.courseId, courseId))
      .orderBy(desc(courseEnrollments.enrolledAt));
  }

  async getUserEnrollments(userId: string): Promise<CourseEnrollment[]> {
    return await db
      .select()
      .from(courseEnrollments)
      .where(eq(courseEnrollments.userId, userId))
      .orderBy(desc(courseEnrollments.enrolledAt));
  }

  async getCourseEnrollment(courseId: string, userId: string): Promise<CourseEnrollment | undefined> {
    const [enrollment] = await db
      .select()
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.courseId, courseId),
          eq(courseEnrollments.userId, userId)
        )
      );
    return enrollment;
  }

  async createCourseEnrollment(enrollment: InsertCourseEnrollment): Promise<CourseEnrollment> {
    const [newEnrollment] = await db.insert(courseEnrollments).values(enrollment).returning();
    return newEnrollment;
  }

  async updateCourseEnrollment(id: string, updates: Partial<InsertCourseEnrollment>): Promise<CourseEnrollment> {
    const [updated] = await db
      .update(courseEnrollments)
      .set(updates)
      .where(eq(courseEnrollments.id, id))
      .returning();
    return updated;
  }

  async deleteCourseEnrollment(id: string): Promise<void> {
    await db.delete(courseEnrollments).where(eq(courseEnrollments.id, id));
  }

  async isUserEnrolled(courseId: string, userId: string): Promise<boolean> {
    const enrollment = await this.getCourseEnrollment(courseId, userId);
    return enrollment !== undefined && enrollment.status === 'active';
  }

  // Enhanced course operations
  async updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course> {
    const [updated] = await db
      .update(courses)
      .set(course)
      .where(eq(courses.id, id))
      .returning();
    return updated;
  }

  async deleteCourse(id: string): Promise<void> {
    await db.delete(courses).where(eq(courses.id, id));
  }

  async getPublishedCourses(): Promise<Course[]> {
    return await db
      .select()
      .from(courses)
      .where(eq(courses.visibility, 'published'))
      .orderBy(desc(courses.createdAt));
  }

  // Enhanced course lesson operations
  async getCourseLesson(id: string): Promise<CourseLesson | undefined> {
    const [lesson] = await db.select().from(courseLessons).where(eq(courseLessons.id, id));
    return lesson;
  }

  async updateCourseLesson(id: string, lesson: Partial<InsertCourseLesson>): Promise<CourseLesson> {
    const [updated] = await db
      .update(courseLessons)
      .set(lesson)
      .where(eq(courseLessons.id, id))
      .returning();
    return updated;
  }

  async deleteCourseLesson(id: string): Promise<void> {
    await db.delete(courseLessons).where(eq(courseLessons.id, id));
  }

  async reorderCourseLessons(courseId: string, lessonIds: string[]): Promise<void> {
    for (let i = 0; i < lessonIds.length; i++) {
      await db
        .update(courseLessons)
        .set({ orderIndex: i })
        .where(and(eq(courseLessons.id, lessonIds[i]), eq(courseLessons.courseId, courseId)));
    }
  }

  // Course material operations
  async getCourseMaterials(lessonId: string): Promise<CourseMaterial[]> {
    return await db
      .select()
      .from(courseMaterials)
      .where(eq(courseMaterials.lessonId, lessonId))
      .orderBy(courseMaterials.createdAt);
  }

  async getCourseMaterial(id: string): Promise<CourseMaterial | undefined> {
    const [material] = await db.select().from(courseMaterials).where(eq(courseMaterials.id, id));
    return material;
  }

  async createCourseMaterial(material: InsertCourseMaterial): Promise<CourseMaterial> {
    const [newMaterial] = await db.insert(courseMaterials).values(material).returning();
    return newMaterial;
  }

  async deleteCourseMaterial(id: string): Promise<void> {
    await db.delete(courseMaterials).where(eq(courseMaterials.id, id));
  }

  // Course lesson progress operations
  async getLessonProgress(lessonId: string, userId: string): Promise<CourseLessonProgress | undefined> {
    const [progress] = await db
      .select()
      .from(courseLessonProgress)
      .where(
        and(
          eq(courseLessonProgress.lessonId, lessonId),
          eq(courseLessonProgress.userId, userId)
        )
      );
    return progress;
  }

  async getUserLessonProgress(userId: string, courseId: string): Promise<CourseLessonProgress[]> {
    const lessons = await this.getCourseLessons(courseId);
    const lessonIds = lessons.map(l => l.id);
    if (lessonIds.length === 0) return [];
    
    const progress = await db
      .select()
      .from(courseLessonProgress)
      .where(
        and(
          eq(courseLessonProgress.userId, userId),
          sql`${courseLessonProgress.lessonId} = ANY(${lessonIds})`
        )
      );
    return progress;
  }

  async upsertLessonProgress(progressData: InsertCourseLessonProgress): Promise<CourseLessonProgress> {
    const [progress] = await db
      .insert(courseLessonProgress)
      .values(progressData)
      .onConflictDoUpdate({
        target: [courseLessonProgress.lessonId, courseLessonProgress.userId],
        set: {
          ...progressData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return progress;
  }

  async markLessonComplete(lessonId: string, userId: string): Promise<CourseLessonProgress> {
    return this.upsertLessonProgress({
      lessonId,
      userId,
      completed: true,
      progressPercent: 100,
    });
  }

  // Enhanced course task operations
  async getCourseTask(id: string): Promise<CourseTask | undefined> {
    const [task] = await db.select().from(courseTasks).where(eq(courseTasks.id, id));
    return task;
  }

  async updateCourseTask(id: string, task: Partial<InsertCourseTask>): Promise<CourseTask> {
    const [updated] = await db
      .update(courseTasks)
      .set(task)
      .where(eq(courseTasks.id, id))
      .returning();
    return updated;
  }

  async deleteCourseTask(id: string): Promise<void> {
    await db.delete(courseQuizQuestions).where(eq(courseQuizQuestions.taskId, id));
    await db.delete(courseQuizAttempts).where(eq(courseQuizAttempts.taskId, id));
    await db.delete(courseSubmissions).where(eq(courseSubmissions.taskId, id));
    await db.delete(courseTasks).where(eq(courseTasks.id, id));
  }

  // Quiz question operations
  async getQuizQuestions(taskId: string): Promise<QuizQuestion[]> {
    return await db
      .select()
      .from(courseQuizQuestions)
      .where(eq(courseQuizQuestions.taskId, taskId))
      .orderBy(courseQuizQuestions.orderIndex);
  }

  async getQuizQuestion(id: string): Promise<QuizQuestion | undefined> {
    const [question] = await db.select().from(courseQuizQuestions).where(eq(courseQuizQuestions.id, id));
    return question;
  }

  async createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion> {
    const [newQuestion] = await db.insert(courseQuizQuestions).values(question).returning();
    return newQuestion;
  }

  async updateQuizQuestion(id: string, question: Partial<InsertQuizQuestion>): Promise<QuizQuestion> {
    const [updated] = await db
      .update(courseQuizQuestions)
      .set(question)
      .where(eq(courseQuizQuestions.id, id))
      .returning();
    return updated;
  }

  async deleteQuizQuestion(id: string): Promise<void> {
    await db.delete(courseQuizQuestions).where(eq(courseQuizQuestions.id, id));
  }

  async reorderQuizQuestions(taskId: string, questionIds: string[]): Promise<void> {
    for (let i = 0; i < questionIds.length; i++) {
      await db
        .update(courseQuizQuestions)
        .set({ orderIndex: i })
        .where(and(eq(courseQuizQuestions.id, questionIds[i]), eq(courseQuizQuestions.taskId, taskId)));
    }
  }

  // Quiz attempt operations
  async getQuizAttempts(taskId: string, userId: string): Promise<QuizAttempt[]> {
    return await db
      .select()
      .from(courseQuizAttempts)
      .where(
        and(
          eq(courseQuizAttempts.taskId, taskId),
          eq(courseQuizAttempts.userId, userId)
        )
      )
      .orderBy(desc(courseQuizAttempts.startedAt));
  }

  async getQuizAttempt(id: string): Promise<QuizAttempt | undefined> {
    const [attempt] = await db.select().from(courseQuizAttempts).where(eq(courseQuizAttempts.id, id));
    return attempt;
  }

  async getLatestQuizAttempt(taskId: string, userId: string): Promise<QuizAttempt | undefined> {
    const [attempt] = await db
      .select()
      .from(courseQuizAttempts)
      .where(
        and(
          eq(courseQuizAttempts.taskId, taskId),
          eq(courseQuizAttempts.userId, userId)
        )
      )
      .orderBy(desc(courseQuizAttempts.startedAt))
      .limit(1);
    return attempt;
  }

  async createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const [newAttempt] = await db.insert(courseQuizAttempts).values(attempt).returning();
    return newAttempt;
  }

  async updateQuizAttempt(id: string, updates: Partial<QuizAttempt>): Promise<QuizAttempt> {
    const [updated] = await db
      .update(courseQuizAttempts)
      .set(updates)
      .where(eq(courseQuizAttempts.id, id))
      .returning();
    return updated;
  }

  async submitQuizAttempt(id: string, answers: string, score: number, maxScore: number): Promise<QuizAttempt> {
    const [submitted] = await db
      .update(courseQuizAttempts)
      .set({
        answers,
        score,
        maxScore,
        completed: true,
        completedAt: new Date(),
      })
      .where(eq(courseQuizAttempts.id, id))
      .returning();
    return submitted;
  }

  async countUserAttempts(taskId: string, userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(courseQuizAttempts)
      .where(
        and(
          eq(courseQuizAttempts.taskId, taskId),
          eq(courseQuizAttempts.userId, userId)
        )
      );
    return result[0]?.count ?? 0;
  }

  // Enhanced submission operations
  async getTaskSubmissions(taskId: string): Promise<CourseSubmission[]> {
    return await db
      .select()
      .from(courseSubmissions)
      .where(eq(courseSubmissions.taskId, taskId))
      .orderBy(desc(courseSubmissions.submittedAt));
  }

  async getUserSubmissions(userId: string): Promise<CourseSubmission[]> {
    return await db
      .select()
      .from(courseSubmissions)
      .where(eq(courseSubmissions.userId, userId))
      .orderBy(desc(courseSubmissions.submittedAt));
  }

  async getSubmission(id: string): Promise<CourseSubmission | undefined> {
    const [submission] = await db.select().from(courseSubmissions).where(eq(courseSubmissions.id, id));
    return submission;
  }

  async updateSubmission(id: string, updates: Partial<CourseSubmission>): Promise<CourseSubmission> {
    const [updated] = await db
      .update(courseSubmissions)
      .set(updates)
      .where(eq(courseSubmissions.id, id))
      .returning();
    return updated;
  }

  async gradeSubmission(id: string, graderId: string, grade: number, feedback?: string): Promise<CourseSubmission> {
    const [graded] = await db
      .update(courseSubmissions)
      .set({
        grade,
        graderId,
        gradedAt: new Date(),
        feedback: feedback || null,
        status: 'graded',
      })
      .where(eq(courseSubmissions.id, id))
      .returning();
    return graded;
  }

  // Event form field operations
  async getEventFormFields(eventId: string): Promise<EventFormField[]> {
    return await db
      .select()
      .from(eventFormFields)
      .where(eq(eventFormFields.eventId, eventId))
      .orderBy(eventFormFields.orderIndex);
  }

  async getEventFormField(id: string): Promise<EventFormField | undefined> {
    const [field] = await db.select().from(eventFormFields).where(eq(eventFormFields.id, id));
    return field;
  }

  async createEventFormField(field: InsertEventFormField): Promise<EventFormField> {
    const [newField] = await db.insert(eventFormFields).values(field).returning();
    return newField;
  }

  async updateEventFormField(id: string, field: Partial<InsertEventFormField>): Promise<EventFormField> {
    const [updated] = await db
      .update(eventFormFields)
      .set(field)
      .where(eq(eventFormFields.id, id))
      .returning();
    return updated;
  }

  async deleteEventFormField(id: string): Promise<void> {
    await db.delete(eventFormFields).where(eq(eventFormFields.id, id));
  }

  async reorderEventFormFields(eventId: string, fieldIds: string[]): Promise<void> {
    for (let i = 0; i < fieldIds.length; i++) {
      await db
        .update(eventFormFields)
        .set({ orderIndex: i })
        .where(and(eq(eventFormFields.id, fieldIds[i]), eq(eventFormFields.eventId, eventId)));
    }
  }

  // Event form response operations
  async getEventFormResponses(eventId: string): Promise<EventFormResponseWithAnswers[]> {
    const responses = await db
      .select()
      .from(eventFormResponses)
      .where(eq(eventFormResponses.eventId, eventId))
      .orderBy(desc(eventFormResponses.createdAt));

    const result: EventFormResponseWithAnswers[] = [];
    
    for (const response of responses) {
      const answers = await db
        .select()
        .from(eventFormAnswers)
        .where(eq(eventFormAnswers.responseId, response.id));
      
      const fields = await this.getEventFormFields(eventId);
      const fieldMap = new Map(fields.map(f => [f.id, f]));
      
      const registration = await db
        .select()
        .from(eventRegistrations)
        .where(eq(eventRegistrations.id, response.registrationId))
        .limit(1);
      
      let userData: { userEmail?: string | null; userFirstName?: string | null; userLastName?: string | null; guestName?: string | null; guestEmail?: string | null } = {};
      
      if (registration.length > 0) {
        const reg = registration[0];
        if (reg.userId) {
          const user = await this.getUser(reg.userId);
          if (user) {
            userData = {
              userEmail: user.email,
              userFirstName: user.firstName,
              userLastName: user.lastName,
            };
          }
        } else {
          userData = {
            guestName: reg.guestName,
            guestEmail: reg.guestEmail,
          };
        }
      }
      
      result.push({
        ...response,
        ...userData,
        answers: answers.map(a => ({
          ...a,
          field: fieldMap.get(a.fieldId)!,
        })).filter(a => a.field),
      });
    }
    
    return result;
  }

  async getEventFormResponse(id: string): Promise<EventFormResponseWithAnswers | undefined> {
    const [response] = await db
      .select()
      .from(eventFormResponses)
      .where(eq(eventFormResponses.id, id));
    
    if (!response) return undefined;
    
    const answers = await db
      .select()
      .from(eventFormAnswers)
      .where(eq(eventFormAnswers.responseId, response.id));
    
    const fields = await this.getEventFormFields(response.eventId);
    const fieldMap = new Map(fields.map(f => [f.id, f]));
    
    const registration = await db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.id, response.registrationId))
      .limit(1);
    
    let userData: { userEmail?: string | null; userFirstName?: string | null; userLastName?: string | null; guestName?: string | null; guestEmail?: string | null } = {};
    
    if (registration.length > 0) {
      const reg = registration[0];
      if (reg.userId) {
        const user = await this.getUser(reg.userId);
        if (user) {
          userData = {
            userEmail: user.email,
            userFirstName: user.firstName,
            userLastName: user.lastName,
          };
        }
      } else {
        userData = {
          guestName: reg.guestName,
          guestEmail: reg.guestEmail,
        };
      }
    }
    
    return {
      ...response,
      ...userData,
      answers: answers.map(a => ({
        ...a,
        field: fieldMap.get(a.fieldId)!,
      })).filter(a => a.field),
    };
  }

  async getRegistrationFormResponse(registrationId: string): Promise<EventFormResponse | undefined> {
    const [response] = await db
      .select()
      .from(eventFormResponses)
      .where(eq(eventFormResponses.registrationId, registrationId));
    return response;
  }

  async createEventFormResponse(response: InsertEventFormResponse): Promise<EventFormResponse> {
    const [newResponse] = await db.insert(eventFormResponses).values(response).returning();
    return newResponse;
  }

  // Event form answer operations
  async createEventFormAnswer(answer: InsertEventFormAnswer): Promise<EventFormAnswer> {
    const [newAnswer] = await db.insert(eventFormAnswers).values(answer).returning();
    return newAnswer;
  }

  async createEventFormAnswers(answers: InsertEventFormAnswer[]): Promise<EventFormAnswer[]> {
    if (answers.length === 0) return [];
    const newAnswers = await db.insert(eventFormAnswers).values(answers).returning();
    return newAnswers;
  }

  // Chat session operations
  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    const [newSession] = await db.insert(chatSessions).values(session).returning();
    return newSession;
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session;
  }

  async getChatSessionWithMessages(id: string): Promise<ChatSessionWithMessages | undefined> {
    const session = await this.getChatSession(id);
    if (!session) return undefined;

    const messages = await this.getChatMessages(id);
    
    let userName: string | null = null;
    let userEmail: string | null = null;
    let eventName: string | null = null;

    if (session.userId) {
      const user = await this.getUser(session.userId);
      if (user) {
        userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
        userEmail = user.email;
      }
    }

    if (session.eventId) {
      const event = await this.getEvent(session.eventId);
      if (event) {
        eventName = event.name;
      }
    }

    return {
      ...session,
      messages,
      userName,
      userEmail,
      eventName,
    };
  }

  async getUserChatSessions(userId: string, type?: string): Promise<ChatSession[]> {
    if (type) {
      return db.select().from(chatSessions)
        .where(and(eq(chatSessions.userId, userId), eq(chatSessions.type, type)))
        .orderBy(desc(chatSessions.createdAt));
    }
    return db.select().from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.createdAt));
  }

  async getEventChatSessions(eventId: string): Promise<ChatSessionWithMessages[]> {
    const sessions = await db.select().from(chatSessions)
      .where(eq(chatSessions.eventId, eventId))
      .orderBy(desc(chatSessions.createdAt));
    
    const sessionsWithMessages: ChatSessionWithMessages[] = [];
    for (const session of sessions) {
      const withMessages = await this.getChatSessionWithMessages(session.id);
      if (withMessages) {
        sessionsWithMessages.push(withMessages);
      }
    }
    return sessionsWithMessages;
  }

  async updateChatSession(id: string, updates: Partial<InsertChatSession>): Promise<ChatSession> {
    const [updated] = await db.update(chatSessions)
      .set(updates)
      .where(eq(chatSessions.id, id))
      .returning();
    return updated;
  }

  async completeChatSession(id: string, extractedData?: string): Promise<ChatSession> {
    const [updated] = await db.update(chatSessions)
      .set({
        status: 'completed',
        extractedData,
        completedAt: new Date(),
      })
      .where(eq(chatSessions.id, id))
      .returning();
    return updated;
  }

  // Chat message operations
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt);
  }

  // Challenge operations
  async getChallenges(): Promise<Challenge[]> {
    return db.select().from(challenges).orderBy(desc(challenges.createdAt));
  }

  async getActiveChallenges(): Promise<Challenge[]> {
    return db.select().from(challenges)
      .where(eq(challenges.isActive, true))
      .orderBy(desc(challenges.createdAt));
  }

  async getChallenge(id: string): Promise<Challenge | undefined> {
    const [challenge] = await db.select().from(challenges).where(eq(challenges.id, id));
    return challenge;
  }

  async createChallenge(challenge: InsertChallenge): Promise<Challenge> {
    const [newChallenge] = await db.insert(challenges).values(challenge).returning();
    return newChallenge;
  }

  async updateChallenge(id: string, challenge: Partial<InsertChallenge>): Promise<Challenge> {
    const [updated] = await db.update(challenges)
      .set(challenge)
      .where(eq(challenges.id, id))
      .returning();
    return updated;
  }

  async deleteChallenge(id: string): Promise<void> {
    await db.delete(challenges).where(eq(challenges.id, id));
  }

  // Challenge attachment operations
  async getChallengeAttachments(challengeId: string): Promise<ChallengeAttachment[]> {
    return db.select().from(challengeAttachments)
      .where(eq(challengeAttachments.challengeId, challengeId))
      .orderBy(challengeAttachments.createdAt);
  }

  async getChallengeAttachment(id: string): Promise<ChallengeAttachment | undefined> {
    const [attachment] = await db.select().from(challengeAttachments).where(eq(challengeAttachments.id, id));
    return attachment;
  }

  async createChallengeAttachment(attachment: InsertChallengeAttachment): Promise<ChallengeAttachment> {
    const [newAttachment] = await db.insert(challengeAttachments).values(attachment).returning();
    return newAttachment;
  }

  async updateChallengeAttachment(id: string, updates: Partial<InsertChallengeAttachment>): Promise<ChallengeAttachment> {
    const [updated] = await db.update(challengeAttachments)
      .set(updates)
      .where(eq(challengeAttachments.id, id))
      .returning();
    return updated;
  }

  async deleteChallengeAttachment(id: string): Promise<void> {
    await db.delete(challengeAttachments).where(eq(challengeAttachments.id, id));
  }

  // Challenge attempt operations
  async createChallengeAttempt(attempt: InsertChallengeAttempt): Promise<ChallengeAttempt> {
    const [newAttempt] = await db.insert(challengeAttempts).values(attempt).returning();
    return newAttempt;
  }

  async getChallengeAttempt(id: string): Promise<ChallengeAttempt | undefined> {
    const [attempt] = await db.select().from(challengeAttempts).where(eq(challengeAttempts.id, id));
    return attempt;
  }

  async getChallengeAttemptWithMessages(id: string): Promise<ChallengeAttemptWithMessages | undefined> {
    const attempt = await this.getChallengeAttempt(id);
    if (!attempt) return undefined;

    const messages = await this.getChallengeMessages(id);
    const challenge = await this.getChallenge(attempt.challengeId);
    
    let userName: string | null = null;
    const user = await this.getUser(attempt.userId);
    if (user) {
      userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
    }

    return {
      ...attempt,
      messages,
      challenge,
      userName,
    };
  }

  async getUserChallengeAttempts(userId: string): Promise<ChallengeAttempt[]> {
    return db.select().from(challengeAttempts)
      .where(eq(challengeAttempts.userId, userId))
      .orderBy(desc(challengeAttempts.startedAt));
  }

  async getUserActiveAttempt(userId: string, challengeId: string): Promise<ChallengeAttempt | undefined> {
    const [attempt] = await db.select().from(challengeAttempts)
      .where(and(
        eq(challengeAttempts.userId, userId),
        eq(challengeAttempts.challengeId, challengeId),
        eq(challengeAttempts.status, 'active')
      ));
    return attempt;
  }

  async updateChallengeAttempt(id: string, updates: Partial<InsertChallengeAttempt>): Promise<ChallengeAttempt> {
    const [updated] = await db.update(challengeAttempts)
      .set(updates)
      .where(eq(challengeAttempts.id, id))
      .returning();
    return updated;
  }

  async completeChallengeAttempt(id: string, score: number, feedback: string, customOutcome?: string | null, outcomeScore?: number | null): Promise<ChallengeAttempt> {
    const [updated] = await db.update(challengeAttempts)
      .set({
        status: 'completed',
        score,
        feedback,
        customOutcome: customOutcome ?? null,
        outcomeScore: outcomeScore ?? null,
        completedAt: new Date(),
      })
      .where(eq(challengeAttempts.id, id))
      .returning();
    return updated;
  }

  // Challenge message operations
  async createChallengeMessage(message: InsertChallengeMessage): Promise<ChallengeMessage> {
    const [newMessage] = await db.insert(challengeMessages).values(message).returning();
    return newMessage;
  }

  async getChallengeMessages(attemptId: string): Promise<ChallengeMessage[]> {
    return db.select().from(challengeMessages)
      .where(eq(challengeMessages.attemptId, attemptId))
      .orderBy(challengeMessages.createdAt);
  }

  // Leaderboard operations
  async getChallengeLeaderboard(challengeId: string, limit: number = 10, sortBy: 'score' | 'customOutcome' = 'score'): Promise<LeaderboardEntry[]> {
    const baseQuery = db
      .select({
        oderId: challengeAttempts.userId,
        score: challengeAttempts.score,
        completedAt: challengeAttempts.completedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        customOutcome: challengeAttempts.customOutcome,
        outcomeScore: challengeAttempts.outcomeScore,
      })
      .from(challengeAttempts)
      .leftJoin(users, eq(challengeAttempts.userId, users.id))
      .where(and(
        eq(challengeAttempts.challengeId, challengeId),
        eq(challengeAttempts.status, 'completed'),
        isNotNull(challengeAttempts.score)
      ))
      .limit(limit);

    const results = sortBy === 'customOutcome'
      ? await baseQuery.orderBy(sql`${challengeAttempts.outcomeScore} DESC NULLS LAST`, desc(challengeAttempts.score))
      : await baseQuery.orderBy(desc(challengeAttempts.score));

    return results.map((r, index) => ({
      rank: index + 1,
      userId: r.oderId,
      userName: [r.userFirstName, r.userLastName].filter(Boolean).join(' ') || null,
      userFirstName: r.userFirstName,
      userLastName: r.userLastName,
      score: r.score!,
      completedAt: r.completedAt,
      customOutcome: r.customOutcome,
      outcomeScore: r.outcomeScore,
    }));
  }

  async getGlobalLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const results = await db
      .select({
        oderId: challengeAttempts.userId,
        score: challengeAttempts.score,
        completedAt: challengeAttempts.completedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(challengeAttempts)
      .leftJoin(users, eq(challengeAttempts.userId, users.id))
      .where(and(
        eq(challengeAttempts.status, 'completed'),
        isNotNull(challengeAttempts.score)
      ))
      .orderBy(desc(challengeAttempts.score))
      .limit(limit);

    return results.map((r, index) => ({
      rank: index + 1,
      userId: r.oderId,
      userName: [r.userFirstName, r.userLastName].filter(Boolean).join(' ') || null,
      userFirstName: r.userFirstName,
      userLastName: r.userLastName,
      score: r.score!,
      completedAt: r.completedAt,
    }));
  }

  // FIS Seasonal points operations
  async calculateAndAwardFISPoints(challengeId: string): Promise<void> {
    // Get all completed attempts for this challenge, ordered by score descending
    const attempts = await db
      .select({
        id: challengeAttempts.id,
        userId: challengeAttempts.userId,
        score: challengeAttempts.score,
        completedAt: challengeAttempts.completedAt,
      })
      .from(challengeAttempts)
      .where(and(
        eq(challengeAttempts.challengeId, challengeId),
        eq(challengeAttempts.status, 'completed'),
        isNotNull(challengeAttempts.score)
      ))
      .orderBy(desc(challengeAttempts.score));

    // Delete existing seasonal points for this challenge (recalculate)
    await db.delete(seasonalPoints).where(eq(seasonalPoints.challengeId, challengeId));

    // Award points based on position (top 50 get tracked, top 30 get points)
    const pointsToAward: InsertSeasonalPoints[] = [];
    for (let i = 0; i < Math.min(attempts.length, 50); i++) {
      const position = i + 1;
      const points = position <= 30 ? FIS_POINTS[position - 1] : 0;
      
      pointsToAward.push({
        challengeId,
        attemptId: attempts[i].id,
        userId: attempts[i].userId,
        position,
        points,
      });
    }

    if (pointsToAward.length > 0) {
      await db.insert(seasonalPoints).values(pointsToAward);
    }
  }

  async getSeasonalLeaderboard(limit: number = 50): Promise<SeasonalLeaderboardEntry[]> {
    // Aggregate total points per user across all challenges
    const results = await db
      .select({
        userId: seasonalPoints.userId,
        totalPoints: sql<number>`SUM(${seasonalPoints.points})::int`,
        challengeCount: sql<number>`COUNT(DISTINCT ${seasonalPoints.challengeId})::int`,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(seasonalPoints)
      .leftJoin(users, eq(seasonalPoints.userId, users.id))
      .groupBy(seasonalPoints.userId, users.firstName, users.lastName)
      .orderBy(sql`SUM(${seasonalPoints.points}) DESC`)
      .limit(limit);

    return results.map((r, index) => ({
      rank: index + 1,
      userId: r.userId,
      userName: [r.userFirstName, r.userLastName].filter(Boolean).join(' ') || null,
      userFirstName: r.userFirstName,
      userLastName: r.userLastName,
      totalPoints: r.totalPoints || 0,
      challengeCount: r.challengeCount || 0,
    }));
  }

  async getTeamChampionship(limit: number = 20): Promise<TeamChampionshipEntry[]> {
    // Aggregate points by organization name
    const results = await db
      .select({
        organizationName: users.organizationName,
        organizationType: users.organizationType,
        totalPoints: sql<number>`SUM(${seasonalPoints.points})::int`,
        memberCount: sql<number>`COUNT(DISTINCT ${users.id})::int`,
        participantCount: sql<number>`COUNT(DISTINCT ${seasonalPoints.userId})::int`,
      })
      .from(seasonalPoints)
      .leftJoin(users, eq(seasonalPoints.userId, users.id))
      .where(isNotNull(users.organizationName))
      .groupBy(users.organizationName, users.organizationType)
      .orderBy(sql`SUM(${seasonalPoints.points}) DESC`)
      .limit(limit);

    return results
      .filter(r => r.organizationName) // Filter out null organizations
      .map((r, index) => ({
        rank: index + 1,
        organizationName: r.organizationName!,
        organizationType: r.organizationType,
        totalPoints: r.totalPoints || 0,
        memberCount: r.memberCount || 0,
        participantCount: r.participantCount || 0,
      }));
  }

  async getChallengeLatestResults(challengeId: string, limit: number = 30): Promise<LeaderboardEntry[]> {
    // Get the latest results for a specific challenge from seasonal_points
    const results = await db
      .select({
        userId: seasonalPoints.userId,
        position: seasonalPoints.position,
        points: seasonalPoints.points,
        earnedAt: seasonalPoints.earnedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        attemptId: seasonalPoints.attemptId,
      })
      .from(seasonalPoints)
      .leftJoin(users, eq(seasonalPoints.userId, users.id))
      .leftJoin(challengeAttempts, eq(seasonalPoints.attemptId, challengeAttempts.id))
      .where(eq(seasonalPoints.challengeId, challengeId))
      .orderBy(seasonalPoints.position)
      .limit(limit);

    // Get scores from challenge attempts
    const attemptIds = results.map(r => r.attemptId);
    const attemptScores = new Map<string, { score: number; completedAt: Date | null }>();
    
    if (attemptIds.length > 0) {
      const attempts = await db
        .select({
          id: challengeAttempts.id,
          score: challengeAttempts.score,
          completedAt: challengeAttempts.completedAt,
        })
        .from(challengeAttempts)
        .where(sql`${challengeAttempts.id} = ANY(${attemptIds})`);
      
      for (const a of attempts) {
        attemptScores.set(a.id, { score: a.score || 0, completedAt: a.completedAt });
      }
    }

    return results.map((r) => ({
      rank: r.position,
      userId: r.userId,
      userName: [r.userFirstName, r.userLastName].filter(Boolean).join(' ') || null,
      userFirstName: r.userFirstName,
      userLastName: r.userLastName,
      score: attemptScores.get(r.attemptId)?.score || 0,
      completedAt: attemptScores.get(r.attemptId)?.completedAt || null,
    }));
  }

  async getUserSeasonalPointsForChallenge(userId: string, challengeId: string): Promise<SeasonalPoints[]> {
    return db.select()
      .from(seasonalPoints)
      .where(and(
        eq(seasonalPoints.userId, userId),
        eq(seasonalPoints.challengeId, challengeId)
      ))
      .orderBy(desc(seasonalPoints.earnedAt));
  }

  async getGlobalLatestResults(limit: number = 5): Promise<GlobalLatestResult[]> {
    // Get the most recent challenges that have seasonal points (completed challenges)
    const recentChallenges = await db
      .selectDistinct({
        challengeId: seasonalPoints.challengeId,
        earnedAt: sql<Date>`MAX(${seasonalPoints.earnedAt})`.as('earned_at'),
      })
      .from(seasonalPoints)
      .groupBy(seasonalPoints.challengeId)
      .orderBy(desc(sql`MAX(${seasonalPoints.earnedAt})`))
      .limit(limit);

    const results: GlobalLatestResult[] = [];

    for (const challenge of recentChallenges) {
      // Get challenge info
      const [challengeInfo] = await db
        .select({ id: challenges.id, title: challenges.title })
        .from(challenges)
        .where(eq(challenges.id, challenge.challengeId));

      if (!challengeInfo) continue;

      // Get top entries for this challenge
      const entries = await this.getChallengeLatestResults(challenge.challengeId, 10);

      results.push({
        challengeId: challengeInfo.id,
        challengeTitle: challengeInfo.title,
        completedAt: challenge.earnedAt,
        entries,
      });
    }

    return results;
  }

  // ============================================
  // Phase 3: Announcement Operations
  // ============================================

  async getAnnouncements(type?: string, courseId?: string): Promise<AnnouncementWithAuthor[]> {
    let query = db
      .select({
        id: announcements.id,
        title: announcements.title,
        content: announcements.content,
        type: announcements.type,
        courseId: announcements.courseId,
        authorId: announcements.authorId,
        isPinned: announcements.isPinned,
        publishedAt: announcements.publishedAt,
        expiresAt: announcements.expiresAt,
        createdAt: announcements.createdAt,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        authorEmail: users.email,
      })
      .from(announcements)
      .leftJoin(users, eq(announcements.authorId, users.id))
      .orderBy(desc(announcements.isPinned), desc(announcements.publishedAt));

    const results = await query;
    
    return results.filter(a => {
      if (type && a.type !== type) return false;
      if (courseId && a.courseId !== courseId) return false;
      if (a.expiresAt && new Date(a.expiresAt) < new Date()) return false;
      return true;
    }) as AnnouncementWithAuthor[];
  }

  async getAnnouncement(id: string): Promise<AnnouncementWithAuthor | undefined> {
    const [result] = await db
      .select({
        id: announcements.id,
        title: announcements.title,
        content: announcements.content,
        type: announcements.type,
        courseId: announcements.courseId,
        authorId: announcements.authorId,
        isPinned: announcements.isPinned,
        publishedAt: announcements.publishedAt,
        expiresAt: announcements.expiresAt,
        createdAt: announcements.createdAt,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        authorEmail: users.email,
      })
      .from(announcements)
      .leftJoin(users, eq(announcements.authorId, users.id))
      .where(eq(announcements.id, id));
    return result as AnnouncementWithAuthor | undefined;
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [created] = await db.insert(announcements).values(announcement).returning();
    return created;
  }

  async updateAnnouncement(id: string, updates: Partial<InsertAnnouncement>): Promise<Announcement> {
    const [updated] = await db.update(announcements).set(updates).where(eq(announcements.id, id)).returning();
    return updated;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await db.delete(announcements).where(eq(announcements.id, id));
  }

  // ============================================
  // Phase 3: Discussion Forum Operations
  // ============================================

  async getCourseForum(courseId: string): Promise<DiscussionForum | undefined> {
    const [forum] = await db.select().from(discussionForums).where(eq(discussionForums.courseId, courseId));
    return forum;
  }

  async getForum(id: string): Promise<DiscussionForum | undefined> {
    const [forum] = await db.select().from(discussionForums).where(eq(discussionForums.id, id));
    return forum;
  }

  async createForum(forum: InsertDiscussionForum): Promise<DiscussionForum> {
    const [created] = await db.insert(discussionForums).values(forum).returning();
    return created;
  }

  async updateForum(id: string, updates: Partial<InsertDiscussionForum>): Promise<DiscussionForum> {
    const [updated] = await db.update(discussionForums).set(updates).where(eq(discussionForums.id, id)).returning();
    return updated;
  }

  // ============================================
  // Phase 3: Discussion Thread Operations
  // ============================================

  async getForumThreads(forumId: string): Promise<DiscussionThreadWithStats[]> {
    const threads = await db
      .select({
        id: discussionThreads.id,
        forumId: discussionThreads.forumId,
        authorId: discussionThreads.authorId,
        title: discussionThreads.title,
        content: discussionThreads.content,
        isPinned: discussionThreads.isPinned,
        isLocked: discussionThreads.isLocked,
        viewCount: discussionThreads.viewCount,
        createdAt: discussionThreads.createdAt,
        updatedAt: discussionThreads.updatedAt,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
      })
      .from(discussionThreads)
      .leftJoin(users, eq(discussionThreads.authorId, users.id))
      .where(eq(discussionThreads.forumId, forumId))
      .orderBy(desc(discussionThreads.isPinned), desc(discussionThreads.updatedAt));

    // Get reply counts for each thread
    const threadsWithStats = await Promise.all(threads.map(async (thread) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(discussionReplies)
        .where(eq(discussionReplies.threadId, thread.id));
      
      const [lastReply] = await db
        .select({ createdAt: discussionReplies.createdAt })
        .from(discussionReplies)
        .where(eq(discussionReplies.threadId, thread.id))
        .orderBy(desc(discussionReplies.createdAt))
        .limit(1);

      return {
        ...thread,
        replyCount: Number(count),
        lastReplyAt: lastReply?.createdAt || null,
      } as DiscussionThreadWithStats;
    }));

    return threadsWithStats;
  }

  async getThread(id: string): Promise<DiscussionThread | undefined> {
    const [thread] = await db.select().from(discussionThreads).where(eq(discussionThreads.id, id));
    return thread;
  }

  async createThread(thread: InsertDiscussionThread): Promise<DiscussionThread> {
    const [created] = await db.insert(discussionThreads).values(thread).returning();
    return created;
  }

  async updateThread(id: string, updates: Partial<InsertDiscussionThread>): Promise<DiscussionThread> {
    const [updated] = await db
      .update(discussionThreads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(discussionThreads.id, id))
      .returning();
    return updated;
  }

  async deleteThread(id: string): Promise<void> {
    await db.delete(discussionThreads).where(eq(discussionThreads.id, id));
  }

  async incrementThreadViews(id: string): Promise<void> {
    await db
      .update(discussionThreads)
      .set({ viewCount: sql`${discussionThreads.viewCount} + 1` })
      .where(eq(discussionThreads.id, id));
  }

  // ============================================
  // Phase 3: Discussion Reply Operations
  // ============================================

  async getThreadReplies(threadId: string): Promise<DiscussionReplyWithAuthor[]> {
    const replies = await db
      .select({
        id: discussionReplies.id,
        threadId: discussionReplies.threadId,
        authorId: discussionReplies.authorId,
        parentReplyId: discussionReplies.parentReplyId,
        content: discussionReplies.content,
        isEdited: discussionReplies.isEdited,
        createdAt: discussionReplies.createdAt,
        updatedAt: discussionReplies.updatedAt,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        authorRole: users.role,
      })
      .from(discussionReplies)
      .leftJoin(users, eq(discussionReplies.authorId, users.id))
      .where(eq(discussionReplies.threadId, threadId))
      .orderBy(discussionReplies.createdAt);
    return replies as DiscussionReplyWithAuthor[];
  }

  async createReply(reply: InsertDiscussionReply): Promise<DiscussionReply> {
    const [created] = await db.insert(discussionReplies).values(reply).returning();
    // Update thread's updatedAt
    await db
      .update(discussionThreads)
      .set({ updatedAt: new Date() })
      .where(eq(discussionThreads.id, reply.threadId));
    return created;
  }

  async updateReply(id: string, content: string): Promise<DiscussionReply> {
    const [updated] = await db
      .update(discussionReplies)
      .set({ content, isEdited: true, updatedAt: new Date() })
      .where(eq(discussionReplies.id, id))
      .returning();
    return updated;
  }

  async deleteReply(id: string): Promise<void> {
    await db.delete(discussionReplies).where(eq(discussionReplies.id, id));
  }

  // ============================================
  // Phase 3: Private Message Operations
  // ============================================

  async getUserMessages(userId: string, folder: 'inbox' | 'sent'): Promise<PrivateMessageWithUsers[]> {
    const condition = folder === 'inbox' 
      ? eq(privateMessages.recipientId, userId)
      : eq(privateMessages.senderId, userId);

    const messages = await db
      .select({
        id: privateMessages.id,
        senderId: privateMessages.senderId,
        recipientId: privateMessages.recipientId,
        subject: privateMessages.subject,
        content: privateMessages.content,
        isRead: privateMessages.isRead,
        readAt: privateMessages.readAt,
        createdAt: privateMessages.createdAt,
      })
      .from(privateMessages)
      .where(condition)
      .orderBy(desc(privateMessages.createdAt));

    // Get user info for each message
    const messagesWithUsers = await Promise.all(messages.map(async (msg) => {
      const [sender] = await db.select().from(users).where(eq(users.id, msg.senderId));
      const [recipient] = await db.select().from(users).where(eq(users.id, msg.recipientId));
      return {
        ...msg,
        senderFirstName: sender?.firstName || null,
        senderLastName: sender?.lastName || null,
        senderEmail: sender?.email || null,
        recipientFirstName: recipient?.firstName || null,
        recipientLastName: recipient?.lastName || null,
        recipientEmail: recipient?.email || null,
      } as PrivateMessageWithUsers;
    }));

    return messagesWithUsers;
  }

  async getMessage(id: string): Promise<PrivateMessageWithUsers | undefined> {
    const [msg] = await db.select().from(privateMessages).where(eq(privateMessages.id, id));
    if (!msg) return undefined;

    const [sender] = await db.select().from(users).where(eq(users.id, msg.senderId));
    const [recipient] = await db.select().from(users).where(eq(users.id, msg.recipientId));
    
    return {
      ...msg,
      senderFirstName: sender?.firstName || null,
      senderLastName: sender?.lastName || null,
      senderEmail: sender?.email || null,
      recipientFirstName: recipient?.firstName || null,
      recipientLastName: recipient?.lastName || null,
      recipientEmail: recipient?.email || null,
    } as PrivateMessageWithUsers;
  }

  async sendMessage(message: InsertPrivateMessage): Promise<PrivateMessage> {
    const [created] = await db.insert(privateMessages).values(message).returning();
    return created;
  }

  async markMessageRead(id: string): Promise<PrivateMessage> {
    const [updated] = await db
      .update(privateMessages)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(privateMessages.id, id))
      .returning();
    return updated;
  }

  async deleteMessage(id: string): Promise<void> {
    await db.delete(privateMessages).where(eq(privateMessages.id, id));
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(privateMessages)
      .where(and(eq(privateMessages.recipientId, userId), eq(privateMessages.isRead, false)));
    return Number(count);
  }

  // ============================================
  // WhatsApp-style Chat Operations
  // ============================================

  async getUserConversations(userId: string): Promise<ConversationWithParticipant[]> {
    // Get all conversations where user is a participant
    const convos = await db
      .select()
      .from(conversations)
      .where(
        sql`${conversations.participant1Id} = ${userId} OR ${conversations.participant2Id} = ${userId}`
      )
      .orderBy(desc(conversations.lastMessageAt));

    // For each conversation, determine the other participant and count unread
    const result: ConversationWithParticipant[] = [];
    for (const convo of convos) {
      const otherUserId = convo.participant1Id === userId ? convo.participant2Id : convo.participant1Id;
      const [otherUser] = await db.select().from(users).where(eq(users.id, otherUserId));
      
      // Count unread messages in this conversation
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(chatMessagesPrivate)
        .where(
          and(
            eq(chatMessagesPrivate.conversationId, convo.id),
            sql`${chatMessagesPrivate.senderId} != ${userId}`,
            eq(chatMessagesPrivate.isRead, false)
          )
        );

      result.push({
        ...convo,
        otherUserId,
        otherUserFirstName: otherUser?.firstName || null,
        otherUserLastName: otherUser?.lastName || null,
        otherUserEmail: otherUser?.email || null,
        unreadCount: Number(count),
      });
    }

    return result;
  }

  async getOrCreateConversation(userId: string, otherUserId: string): Promise<Conversation> {
    // Normalize order for consistent lookup (smaller ID first)
    const [p1, p2] = userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];
    
    // Check if conversation already exists
    const [existing] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.participant1Id, p1),
          eq(conversations.participant2Id, p2)
        )
      );

    if (existing) {
      return existing;
    }

    // Create new conversation
    const [created] = await db
      .insert(conversations)
      .values({
        participant1Id: p1,
        participant2Id: p2,
      })
      .returning();

    return created;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [convo] = await db.select().from(conversations).where(eq(conversations.id, id));
    return convo;
  }

  async getConversationMessages(conversationId: string, limit: number = 100): Promise<ChatMessageWithSender[]> {
    const messages = await db
      .select({
        id: chatMessagesPrivate.id,
        conversationId: chatMessagesPrivate.conversationId,
        senderId: chatMessagesPrivate.senderId,
        content: chatMessagesPrivate.content,
        mentions: chatMessagesPrivate.mentions,
        isRead: chatMessagesPrivate.isRead,
        readAt: chatMessagesPrivate.readAt,
        createdAt: chatMessagesPrivate.createdAt,
        senderFirstName: users.firstName,
        senderLastName: users.lastName,
      })
      .from(chatMessagesPrivate)
      .leftJoin(users, eq(chatMessagesPrivate.senderId, users.id))
      .where(eq(chatMessagesPrivate.conversationId, conversationId))
      .orderBy(chatMessagesPrivate.createdAt)
      .limit(limit);

    return messages as ChatMessageWithSender[];
  }

  async sendChatMessage(conversationId: string, senderId: string, content: string, mentions?: string[]): Promise<ChatMessagePrivate> {
    // Insert the message
    const [message] = await db
      .insert(chatMessagesPrivate)
      .values({
        conversationId,
        senderId,
        content,
        mentions: mentions || [],
        isRead: false,
      })
      .returning();

    // Update conversation's last message info
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        lastMessageContent: content.substring(0, 100),
      })
      .where(eq(conversations.id, conversationId));

    return message;
  }

  async markConversationMessagesRead(conversationId: string, userId: string): Promise<void> {
    // Mark all messages from other user as read
    await db
      .update(chatMessagesPrivate)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(chatMessagesPrivate.conversationId, conversationId),
          sql`${chatMessagesPrivate.senderId} != ${userId}`,
          eq(chatMessagesPrivate.isRead, false)
        )
      );
  }

  async getUnreadChatCount(userId: string): Promise<number> {
    // Get all conversations where user is a participant
    const convos = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        sql`${conversations.participant1Id} = ${userId} OR ${conversations.participant2Id} = ${userId}`
      );

    if (convos.length === 0) return 0;

    const convoIds = convos.map(c => c.id);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatMessagesPrivate)
      .where(
        and(
          sql`${chatMessagesPrivate.conversationId} IN (${sql.join(convoIds.map(id => sql`${id}`), sql`, `)})`,
          sql`${chatMessagesPrivate.senderId} != ${userId}`,
          eq(chatMessagesPrivate.isRead, false)
        )
      );

    return Number(count);
  }

  // ============================================
  // Phase 3: Lesson Comment Operations
  // ============================================

  async getLessonComments(lessonId: string): Promise<LessonCommentWithAuthor[]> {
    const comments = await db
      .select({
        id: lessonComments.id,
        lessonId: lessonComments.lessonId,
        authorId: lessonComments.authorId,
        parentCommentId: lessonComments.parentCommentId,
        content: lessonComments.content,
        mentions: lessonComments.mentions,
        isEdited: lessonComments.isEdited,
        createdAt: lessonComments.createdAt,
        updatedAt: lessonComments.updatedAt,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        authorRole: users.role,
      })
      .from(lessonComments)
      .leftJoin(users, eq(lessonComments.authorId, users.id))
      .where(eq(lessonComments.lessonId, lessonId))
      .orderBy(lessonComments.createdAt);
    return comments as LessonCommentWithAuthor[];
  }

  async createLessonComment(comment: InsertLessonComment): Promise<LessonComment> {
    const [created] = await db.insert(lessonComments).values(comment).returning();
    return created;
  }

  async updateLessonComment(id: string, content: string): Promise<LessonComment> {
    const [updated] = await db
      .update(lessonComments)
      .set({ content, isEdited: true, updatedAt: new Date() })
      .where(eq(lessonComments.id, id))
      .returning();
    return updated;
  }

  async deleteLessonComment(id: string): Promise<void> {
    await db.delete(lessonComments).where(eq(lessonComments.id, id));
  }

  // ============================================
  // Phase 3: Notification Operations
  // ============================================

  async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    let query = db.select().from(notifications).where(eq(notifications.userId, userId));
    if (unreadOnly) {
      return db.select().from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
        .orderBy(desc(notifications.createdAt));
    }
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: string, userId: string): Promise<Notification | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return updated;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async deleteNotification(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, userId))).returning();
    return result.length > 0;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return Number(count);
  }

  // ============================================
  // Phase 4: Grade Category Operations
  // ============================================

  async getCourseGradeCategories(courseId: string): Promise<GradeCategory[]> {
    return db.select().from(gradeCategories)
      .where(eq(gradeCategories.courseId, courseId))
      .orderBy(gradeCategories.orderIndex);
  }

  async createGradeCategory(category: InsertGradeCategory): Promise<GradeCategory> {
    const [created] = await db.insert(gradeCategories).values(category).returning();
    return created;
  }

  async updateGradeCategory(id: string, updates: Partial<InsertGradeCategory>): Promise<GradeCategory> {
    const [updated] = await db.update(gradeCategories).set(updates).where(eq(gradeCategories.id, id)).returning();
    return updated;
  }

  async deleteGradeCategory(id: string): Promise<void> {
    await db.delete(gradeCategories).where(eq(gradeCategories.id, id));
  }

  // ============================================
  // Phase 4: Rubric Operations
  // ============================================

  async getCourseRubrics(courseId: string): Promise<Rubric[]> {
    return db.select().from(rubrics).where(eq(rubrics.courseId, courseId));
  }

  async getRubric(id: string): Promise<RubricWithCriteria | undefined> {
    const [rubric] = await db.select().from(rubrics).where(eq(rubrics.id, id));
    if (!rubric) return undefined;

    const criteria = await db.select().from(rubricCriteria)
      .where(eq(rubricCriteria.rubricId, id))
      .orderBy(rubricCriteria.orderIndex);

    const criteriaWithLevels = await Promise.all(criteria.map(async (c) => {
      const levels = await db.select().from(rubricLevels)
        .where(eq(rubricLevels.criteriaId, c.id))
        .orderBy(rubricLevels.orderIndex);
      return { ...c, levels };
    }));

    return { ...rubric, criteria: criteriaWithLevels };
  }

  async createRubric(rubric: InsertRubric): Promise<Rubric> {
    const [created] = await db.insert(rubrics).values(rubric).returning();
    return created;
  }

  async deleteRubric(id: string): Promise<void> {
    await db.delete(rubrics).where(eq(rubrics.id, id));
  }

  // ============================================
  // Phase 4: Rubric Criteria Operations
  // ============================================

  async createRubricCriteria(criteria: InsertRubricCriteria): Promise<RubricCriteria> {
    const [created] = await db.insert(rubricCriteria).values(criteria).returning();
    return created;
  }

  async createRubricLevel(level: InsertRubricLevel): Promise<RubricLevel> {
    const [created] = await db.insert(rubricLevels).values(level).returning();
    return created;
  }

  // ============================================
  // Phase 4: Rubric Scoring Operations
  // ============================================

  async createRubricScore(score: InsertRubricScore): Promise<RubricScore> {
    const [created] = await db.insert(rubricScores).values(score).returning();
    return created;
  }

  async getSubmissionRubricScores(submissionId: string): Promise<RubricScore[]> {
    return db.select().from(rubricScores).where(eq(rubricScores.submissionId, submissionId));
  }

  // ============================================
  // Phase 4: Gradebook Operations
  // ============================================

  async getCourseGradebook(courseId: string): Promise<StudentGradeSummary[]> {
    // Get all enrolled students
    const enrollments = await db.select().from(courseEnrollments)
      .where(eq(courseEnrollments.courseId, courseId));

    const summaries: StudentGradeSummary[] = [];

    for (const enrollment of enrollments) {
      const [user] = await db.select().from(users).where(eq(users.id, enrollment.userId));
      if (!user) continue;

      const grades = await this.getStudentGrades(courseId, enrollment.userId);
      const categories = await this.getCourseGradeCategories(courseId);

      let totalScore = 0;
      let totalMaxScore = 0;
      const categoryGrades: StudentGradeSummary['categoryGrades'] = [];

      for (const category of categories) {
        const categoryEntries = grades.filter(g => g.categoryId === category.id);
        const catScore = categoryEntries.reduce((sum, e) => sum + (e.score || 0), 0);
        const catMaxScore = categoryEntries.reduce((sum, e) => sum + (e.maxScore || 0), 0);
        
        categoryGrades.push({
          categoryId: category.id,
          categoryName: category.name,
          weight: category.weight,
          score: catScore,
          maxScore: catMaxScore,
          percentage: catMaxScore > 0 ? (catScore / catMaxScore) * 100 : 0,
        });

        totalScore += catScore * (category.weight / 100);
        totalMaxScore += catMaxScore * (category.weight / 100);
      }

      const percentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
      const letterGrade = this.calculateLetterGrade(percentage);

      summaries.push({
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        totalScore,
        totalMaxScore,
        percentage,
        letterGrade,
        categoryGrades,
      });
    }

    return summaries;
  }

  private calculateLetterGrade(percentage: number): string {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  async getStudentGrades(courseId: string, userId: string): Promise<GradebookEntryWithTask[]> {
    const entries = await db
      .select({
        id: gradebookEntries.id,
        courseId: gradebookEntries.courseId,
        userId: gradebookEntries.userId,
        categoryId: gradebookEntries.categoryId,
        taskId: gradebookEntries.taskId,
        score: gradebookEntries.score,
        maxScore: gradebookEntries.maxScore,
        letterGrade: gradebookEntries.letterGrade,
        isExcused: gradebookEntries.isExcused,
        notes: gradebookEntries.notes,
        updatedAt: gradebookEntries.updatedAt,
        taskTitle: courseTasks.title,
        taskType: courseTasks.taskType,
      })
      .from(gradebookEntries)
      .leftJoin(courseTasks, eq(gradebookEntries.taskId, courseTasks.id))
      .where(and(eq(gradebookEntries.courseId, courseId), eq(gradebookEntries.userId, userId)));

    // Add category names
    const categories = await this.getCourseGradeCategories(courseId);
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    return entries.map(e => ({
      ...e,
      categoryName: e.categoryId ? categoryMap.get(e.categoryId) || null : null,
    })) as GradebookEntryWithTask[];
  }

  async upsertGradebookEntry(entry: InsertGradebookEntry): Promise<GradebookEntry> {
    // Check if entry exists
    const existing = await db.select().from(gradebookEntries)
      .where(and(
        eq(gradebookEntries.courseId, entry.courseId),
        eq(gradebookEntries.userId, entry.userId),
        entry.taskId ? eq(gradebookEntries.taskId, entry.taskId) : sql`${gradebookEntries.taskId} IS NULL`
      ));

    if (existing.length > 0) {
      const [updated] = await db
        .update(gradebookEntries)
        .set({ ...entry, updatedAt: new Date() })
        .where(eq(gradebookEntries.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(gradebookEntries).values(entry).returning();
    return created;
  }

  async exportGradebook(courseId: string): Promise<any[]> {
    const summaries = await this.getCourseGradebook(courseId);
    return summaries.map(s => ({
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      totalScore: s.totalScore.toFixed(2),
      totalMaxScore: s.totalMaxScore.toFixed(2),
      percentage: s.percentage.toFixed(2) + '%',
      letterGrade: s.letterGrade,
    }));
  }

  // Career Portal operations
  async getJobOpenings(includeAll = false): Promise<JobOpening[]> {
    if (includeAll) {
      return db.select().from(jobOpenings).orderBy(desc(jobOpenings.createdAt));
    }
    return db.select().from(jobOpenings)
      .where(eq(jobOpenings.status, "open"))
      .orderBy(desc(jobOpenings.createdAt));
  }

  async getJobOpening(id: string): Promise<JobOpening | undefined> {
    const [opening] = await db.select().from(jobOpenings).where(eq(jobOpenings.id, id));
    return opening;
  }

  async createJobOpening(opening: InsertJobOpening): Promise<JobOpening> {
    const [created] = await db.insert(jobOpenings).values(opening).returning();
    return created;
  }

  async updateJobOpening(id: string, updates: Partial<InsertJobOpening>): Promise<JobOpening> {
    const [updated] = await db.update(jobOpenings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(jobOpenings.id, id))
      .returning();
    return updated;
  }

  async deleteJobOpening(id: string): Promise<void> {
    await db.delete(jobOpenings).where(eq(jobOpenings.id, id));
  }

  async incrementJobViewCount(id: string): Promise<void> {
    await db.update(jobOpenings).set({
      viewCount: sql`COALESCE(view_count, 0) + 1`,
    }).where(eq(jobOpenings.id, id));
  }

  async getUserJobOpenings(userId: string): Promise<JobOpening[]> {
    return db.select().from(jobOpenings)
      .where(eq(jobOpenings.submittedBy, userId))
      .orderBy(desc(jobOpenings.createdAt));
  }

  async getPendingJobOpenings(): Promise<(JobOpening & { submitterFirstName?: string | null; submitterLastName?: string | null; submitterEmail?: string | null })[]> {
    const results = await db.select({
      id: jobOpenings.id,
      title: jobOpenings.title,
      department: jobOpenings.department,
      location: jobOpenings.location,
      employmentType: jobOpenings.employmentType,
      description: jobOpenings.description,
      requirements: jobOpenings.requirements,
      salaryMin: jobOpenings.salaryMin,
      salaryMax: jobOpenings.salaryMax,
      salaryCurrency: jobOpenings.salaryCurrency,
      status: jobOpenings.status,
      isPartner: jobOpenings.isPartner,
      isHighlighted: jobOpenings.isHighlighted,
      isFounderProject: jobOpenings.isFounderProject,
      companyName: jobOpenings.companyName,
      companyLogoUrl: jobOpenings.companyLogoUrl,
      founderName: jobOpenings.founderName,
      founderProjectName: jobOpenings.founderProjectName,
      founderLogoUrl: jobOpenings.founderLogoUrl,
      submittedBy: jobOpenings.submittedBy,
      createdAt: jobOpenings.createdAt,
      updatedAt: jobOpenings.updatedAt,
      submitterFirstName: users.firstName,
      submitterLastName: users.lastName,
      submitterEmail: users.email,
    })
      .from(jobOpenings)
      .leftJoin(users, eq(jobOpenings.submittedBy, users.id))
      .where(eq(jobOpenings.status, "pending_review"))
      .orderBy(desc(jobOpenings.createdAt));
    return results;
  }

  async getJobApplications(jobId?: string): Promise<(JobApplication & { jobTitle?: string })[]> {
    if (jobId) {
      const results = await db.select({
        id: jobApplications.id,
        jobId: jobApplications.jobId,
        candidateId: jobApplications.candidateId,
        applicantName: jobApplications.applicantName,
        email: jobApplications.email,
        phone: jobApplications.phone,
        resumeText: jobApplications.resumeText,
        coverLetter: jobApplications.coverLetter,
        status: jobApplications.status,
        createdAt: jobApplications.createdAt,
        jobTitle: jobOpenings.title,
      })
        .from(jobApplications)
        .leftJoin(jobOpenings, eq(jobApplications.jobId, jobOpenings.id))
        .where(eq(jobApplications.jobId, jobId))
        .orderBy(desc(jobApplications.createdAt));
      return results;
    }
    const results = await db.select({
      id: jobApplications.id,
      jobId: jobApplications.jobId,
      candidateId: jobApplications.candidateId,
      applicantName: jobApplications.applicantName,
      email: jobApplications.email,
      phone: jobApplications.phone,
      resumeText: jobApplications.resumeText,
      coverLetter: jobApplications.coverLetter,
      status: jobApplications.status,
      createdAt: jobApplications.createdAt,
      jobTitle: jobOpenings.title,
    })
      .from(jobApplications)
      .leftJoin(jobOpenings, eq(jobApplications.jobId, jobOpenings.id))
      .orderBy(desc(jobApplications.createdAt));
    return results;
  }

  async getJobApplication(id: string): Promise<(JobApplication & { jobTitle?: string }) | undefined> {
    const [result] = await db.select({
      id: jobApplications.id,
      jobId: jobApplications.jobId,
      candidateId: jobApplications.candidateId,
      applicantName: jobApplications.applicantName,
      email: jobApplications.email,
      phone: jobApplications.phone,
      resumeText: jobApplications.resumeText,
      coverLetter: jobApplications.coverLetter,
      status: jobApplications.status,
      createdAt: jobApplications.createdAt,
      jobTitle: jobOpenings.title,
    })
      .from(jobApplications)
      .leftJoin(jobOpenings, eq(jobApplications.jobId, jobOpenings.id))
      .where(eq(jobApplications.id, id));
    return result;
  }

  async createJobApplication(application: InsertJobApplication): Promise<JobApplication> {
    const [created] = await db.insert(jobApplications).values(application).returning();
    return created;
  }

  async updateJobApplicationStatus(id: string, status: string): Promise<JobApplication> {
    const [updated] = await db.update(jobApplications)
      .set({ status })
      .where(eq(jobApplications.id, id))
      .returning();
    return updated;
  }

  async getApplicationMessages(applicationId: string): Promise<JobApplicationMessage[]> {
    return db.select().from(jobApplicationMessages)
      .where(eq(jobApplicationMessages.applicationId, applicationId))
      .orderBy(jobApplicationMessages.createdAt);
  }

  async createApplicationMessage(message: InsertJobApplicationMessage): Promise<JobApplicationMessage> {
    const [created] = await db.insert(jobApplicationMessages).values(message).returning();
    return created;
  }

  async getJobApplicationsByCandidate(candidateId: string): Promise<(JobApplication & { jobTitle?: string })[]> {
    const results = await db
      .select({
        application: jobApplications,
        jobTitle: jobOpenings.title,
      })
      .from(jobApplications)
      .leftJoin(jobOpenings, eq(jobApplications.jobId, jobOpenings.id))
      .where(eq(jobApplications.candidateId, candidateId))
      .orderBy(sql`${jobApplications.createdAt} DESC`);
    return results.map((r) => ({ ...r.application, jobTitle: r.jobTitle ?? undefined }));
  }

  async getJobApplicationForCandidate(applicationId: string, candidateId: string): Promise<(JobApplication & { jobTitle?: string }) | undefined> {
    const results = await db
      .select({
        application: jobApplications,
        jobTitle: jobOpenings.title,
      })
      .from(jobApplications)
      .leftJoin(jobOpenings, eq(jobApplications.jobId, jobOpenings.id))
      .where(and(eq(jobApplications.id, applicationId), eq(jobApplications.candidateId, candidateId)));
    if (results.length === 0) return undefined;
    return { ...results[0].application, jobTitle: results[0].jobTitle ?? undefined };
  }

  async linkApplicationsToCandidate(email: string, candidateId: string): Promise<void> {
    await db.update(jobApplications)
      .set({ candidateId })
      .where(and(eq(jobApplications.email, email), sql`${jobApplications.candidateId} IS NULL`));
  }

  // ============================================================
  // STARTUP & INNOVATION PLATFORM OPERATIONS
  // ============================================================

  // Company operations
  async getCompanies(): Promise<Company[]> {
    return db.select().from(companies).orderBy(desc(companies.createdAt));
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [created] = await db.insert(companies).values(company).returning();
    return created;
  }

  async updateCompany(id: string, updates: Partial<InsertCompany>): Promise<Company> {
    const [updated] = await db.update(companies).set(updates).where(eq(companies.id, id)).returning();
    return updated;
  }

  async deleteCompany(id: string): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }

  async getCompanyUsers(companyId: string): Promise<(CompanyUser & { user: { id: string; firstName: string | null; lastName: string | null; email: string; profileImageUrl: string | null } })[]> {
    const results = await db
      .select({
        companyUser: companyUsers,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(companyUsers)
      .leftJoin(users, eq(companyUsers.userId, users.id))
      .where(eq(companyUsers.companyId, companyId));
    return results.map((r) => ({
      ...r.companyUser,
      user: r.user as { id: string; firstName: string | null; lastName: string | null; email: string; profileImageUrl: string | null },
    }));
  }

  async addCompanyUser(data: InsertCompanyUser): Promise<CompanyUser> {
    const [created] = await db.insert(companyUsers).values(data).returning();
    return created;
  }

  async removeCompanyUser(id: string): Promise<void> {
    await db.delete(companyUsers).where(eq(companyUsers.id, id));
  }

  async getUserCompanies(userId: string): Promise<(CompanyUser & { company: Company })[]> {
    const results = await db
      .select({
        companyUser: companyUsers,
        company: companies,
      })
      .from(companyUsers)
      .leftJoin(companies, eq(companyUsers.companyId, companies.id))
      .where(eq(companyUsers.userId, userId));
    return results.map((r) => ({
      ...r.companyUser,
      company: r.company as Company,
    }));
  }

  // Startup operations
  async getStartups(filters?: { vertical?: string; stage?: string }): Promise<Startup[]> {
    const conditions = [];
    if (filters?.vertical) {
      conditions.push(eq(startups.vertical, filters.vertical));
    }
    if (filters?.stage) {
      conditions.push(eq(startups.stage, filters.stage));
    }
    if (conditions.length > 0) {
      return db.select().from(startups).where(and(...conditions)).orderBy(desc(startups.createdAt));
    }
    return db.select().from(startups).orderBy(desc(startups.createdAt));
  }

  async getStartup(id: string): Promise<Startup | undefined> {
    const [startup] = await db.select().from(startups).where(eq(startups.id, id));
    return startup;
  }

  async createStartup(startup: InsertStartup): Promise<Startup> {
    const [created] = await db.insert(startups).values(startup).returning();
    return created;
  }

  async updateStartup(id: string, updates: Partial<InsertStartup>): Promise<Startup> {
    const [updated] = await db.update(startups).set({ ...updates, updatedAt: new Date() }).where(eq(startups.id, id)).returning();
    return updated;
  }

  async deleteStartup(id: string): Promise<void> {
    await db.delete(startupMembers).where(eq(startupMembers.startupId, id));
    await db.delete(startupMetrics).where(eq(startupMetrics.startupId, id));
    await db.delete(briefApplications).where(eq(briefApplications.startupId, id));
    await db.delete(startupCompanyRelations).where(eq(startupCompanyRelations.startupId, id));
    await db.delete(programParticipants).where(eq(programParticipants.startupId, id));
    await db.delete(evaluations).where(
      and(eq(evaluations.entityType, 'startup'), eq(evaluations.entityId, id))
    );
    await db.delete(startups).where(eq(startups.id, id));
  }

  async getStartupMembers(startupId: string): Promise<StartupMemberWithUser[]> {
    const results = await db
      .select({
        member: startupMembers,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
          tag: users.tag,
        },
      })
      .from(startupMembers)
      .leftJoin(users, eq(startupMembers.userId, users.id))
      .where(eq(startupMembers.startupId, startupId));
    return results.map((r) => ({
      ...r.member,
      user: r.user as { id: string; firstName: string | null; lastName: string | null; email: string; profileImageUrl: string | null; tag: string | null },
    }));
  }

  async addStartupMember(data: InsertStartupMember): Promise<StartupMember> {
    const [created] = await db.insert(startupMembers).values(data).returning();
    return created;
  }

  async removeStartupMember(id: string): Promise<void> {
    await db.delete(startupMembers).where(eq(startupMembers.id, id));
  }

  async getTeamMembers(startupId: string): Promise<TeamMember[]> {
    return await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.startupId, startupId))
      .orderBy(desc(teamMembers.isFounder), desc(teamMembers.createdAt));
  }

  async getAllTeamMembers(): Promise<TeamMember[]> {
    return await db.select().from(teamMembers);
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    const [row] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return row;
  }

  async createTeamMember(data: InsertTeamMember): Promise<TeamMember> {
    const [created] = await db.insert(teamMembers).values(data).returning();
    return created;
  }

  async updateTeamMember(id: string, updates: Partial<InsertTeamMember>): Promise<TeamMember> {
    const [updated] = await db
      .update(teamMembers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(teamMembers.id, id))
      .returning();
    return updated;
  }

  async deleteTeamMember(id: string): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  async countSignalEvents(filter: { startupId: string; sourceKeyPrefix?: string; sinceMs: number }): Promise<{ count: number; lastOccurredAt: Date | null }> {
    const since = new Date(Date.now() - filter.sinceMs);
    const conditions = [
      eq(signalEvents.startupId, filter.startupId),
      gte(signalEvents.occurredAt, since),
    ];
    if (filter.sourceKeyPrefix) {
      conditions.push(like(signalEvents.sourceKey, `${filter.sourceKeyPrefix}%`));
    }
    const [row] = await db
      .select({
        c: sql<number>`count(*)::int`,
        last: sql<Date | null>`max(${signalEvents.occurredAt})`,
      })
      .from(signalEvents)
      .where(and(...conditions));
    return { count: row?.c ?? 0, lastOccurredAt: row?.last ?? null };
  }

  async getUserStartups(userId: string): Promise<(StartupMember & { startup: Startup })[]> {
    const results = await db
      .select({
        member: startupMembers,
        startup: startups,
      })
      .from(startupMembers)
      .leftJoin(startups, eq(startupMembers.startupId, startups.id))
      .where(eq(startupMembers.userId, userId));
    return results.map((r) => ({
      ...r.member,
      startup: r.startup as Startup,
    }));
  }

  async getStartupMetrics(startupId: string): Promise<StartupMetric[]> {
    return db.select().from(startupMetrics)
      .where(eq(startupMetrics.startupId, startupId))
      .orderBy(desc(startupMetrics.month));
  }

  async createStartupMetric(metric: InsertStartupMetric): Promise<StartupMetric> {
    const [created] = await db.insert(startupMetrics).values(metric).returning();
    return created;
  }

  async updateStartupMetric(id: string, updates: Partial<InsertStartupMetric>): Promise<StartupMetric> {
    const [updated] = await db.update(startupMetrics).set(updates).where(eq(startupMetrics.id, id)).returning();
    return updated;
  }

  async deleteStartupMetric(id: string): Promise<void> {
    await db.delete(startupMetrics).where(eq(startupMetrics.id, id));
  }

  // Investor operations
  async getInvestors(): Promise<Investor[]> {
    return db.select().from(investors).orderBy(desc(investors.createdAt));
  }

  async getInvestor(id: string): Promise<Investor | undefined> {
    const [row] = await db.select().from(investors).where(eq(investors.id, id));
    return row;
  }

  async createInvestor(data: InsertInvestor): Promise<Investor> {
    const [created] = await db.insert(investors).values(data).returning();
    return created;
  }

  async updateInvestor(id: string, updates: Partial<InsertInvestor>): Promise<Investor> {
    const [updated] = await db.update(investors).set(updates).where(eq(investors.id, id)).returning();
    return updated;
  }

  async deleteInvestor(id: string): Promise<void> {
    await db.delete(investors).where(eq(investors.id, id));
  }

  async getInvestorMembers(investorId: string): Promise<Array<InvestorMember & { firstName: string | null; lastName: string | null; email: string | null }>> {
    const results = await db
      .select({
        member: investorMembers,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(investorMembers)
      .leftJoin(users, eq(investorMembers.userId, users.id))
      .where(eq(investorMembers.investorId, investorId));
    return results.map((r) => ({ ...r.member, firstName: r.firstName, lastName: r.lastName, email: r.email }));
  }

  async addInvestorMember(data: InsertInvestorMember): Promise<InvestorMember> {
    const [created] = await db.insert(investorMembers).values(data).returning();
    return created;
  }

  async removeInvestorMember(id: string): Promise<void> {
    await db.delete(investorMembers).where(eq(investorMembers.id, id));
  }

  async getUserInvestors(userId: string): Promise<Array<InvestorMember & { investor: Investor }>> {
    const results = await db
      .select({ member: investorMembers, investor: investors })
      .from(investorMembers)
      .innerJoin(investors, eq(investorMembers.investorId, investors.id))
      .where(eq(investorMembers.userId, userId));
    return results.map((r) => ({ ...r.member, investor: r.investor }));
  }

  async getInvestorCreatorImage(investorId: string): Promise<string | null> {
    const [row] = await db
      .select({ image: users.profileImageUrl })
      .from(investors)
      .leftJoin(users, eq(investors.createdBy, users.id))
      .where(eq(investors.id, investorId));
    return row?.image ?? null;
  }

  async getInvestorsWithCreatorImage(): Promise<Array<Investor & { creatorImage: string | null }>> {
    const results = await db
      .select({ investor: investors, image: users.profileImageUrl })
      .from(investors)
      .leftJoin(users, eq(investors.createdBy, users.id))
      .orderBy(desc(investors.createdAt));
    return results.map((r) => ({ ...r.investor, creatorImage: r.image ?? null }));
  }

  // Investor invitations
  async createInvestorInvitation(data: InsertInvestorInvitation & { token: string }): Promise<InvestorInvitation> {
    const [created] = await db.insert(investorInvitations).values(data).returning();
    return created;
  }

  async getInvestorInvitations(investorId: string): Promise<InvestorInvitation[]> {
    return db
      .select()
      .from(investorInvitations)
      .where(eq(investorInvitations.investorId, investorId))
      .orderBy(desc(investorInvitations.createdAt));
  }

  async getInvestorInvitationByToken(token: string): Promise<(InvestorInvitation & { investor: Investor }) | undefined> {
    const [row] = await db
      .select({ inv: investorInvitations, investor: investors })
      .from(investorInvitations)
      .innerJoin(investors, eq(investorInvitations.investorId, investors.id))
      .where(eq(investorInvitations.token, token));
    return row ? { ...row.inv, investor: row.investor } : undefined;
  }

  async updateInvestorInvitation(id: string, updates: Partial<InvestorInvitation>): Promise<InvestorInvitation> {
    const [updated] = await db.update(investorInvitations).set(updates).where(eq(investorInvitations.id, id)).returning();
    return updated;
  }

  async hasPendingInvestorInvitation(investorId: string, email: string): Promise<boolean> {
    const [row] = await db
      .select({ id: investorInvitations.id })
      .from(investorInvitations)
      .where(and(
        eq(investorInvitations.investorId, investorId),
        eq(investorInvitations.email, email),
        eq(investorInvitations.status, "pending"),
        gt(investorInvitations.expiresAt, new Date()),
      ));
    return !!row;
  }

  async getCompanyPortfolioDashboard(companyId: string): Promise<{
    pipelineByStatus: Record<string, number>;
    activeBriefs: number;
    activePrograms: number;
    avgEvaluationScore: number;
    totalEvaluations: number;
    monthlyMetrics: Array<{ month: string; revenue: number; mrr: number; users: number; pilots: number; startupCount: number }>;
    topStartups: Array<{ id: string; name: string; vertical: string | null; stage: string | null; logo: string | null; status: string }>;
  }> {
    const pipeline = await db.select().from(startupCompanyRelations).where(eq(startupCompanyRelations.companyId, companyId));
    const pipelineByStatus: Record<string, number> = {};
    pipeline.forEach((p) => { pipelineByStatus[p.status] = (pipelineByStatus[p.status] || 0) + 1; });

    const [brResult] = await db.select({ c: count() }).from(briefs).where(and(eq(briefs.companyId, companyId), eq(briefs.status, "active")));
    const [pgResult] = await db.select({ c: count() }).from(programs).where(eq(programs.companyId, companyId));

    const startupIds = pipeline.map((p) => p.startupId);
    let avgScore = 0;
    let totalEvals = 0;
    if (startupIds.length > 0) {
      const evals = await db.select().from(evaluations).where(and(eq(evaluations.entityType, "startup"), inArray(evaluations.entityId, startupIds)));
      totalEvals = evals.length;
      if (evals.length > 0) {
        const totals = evals.map((e) => Number(e.totalScore || 0)).filter((n) => n > 0);
        avgScore = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
      }
    }

    const monthlyMetrics: Array<{ month: string; revenue: number; mrr: number; users: number; pilots: number; startupCount: number }> = [];
    if (startupIds.length > 0) {
      const allMetrics = await db.select().from(startupMetrics).where(inArray(startupMetrics.startupId, startupIds));
      const grouped: Record<string, { revenue: number; mrr: number; users: number; pilots: number; startups: Set<string> }> = {};
      allMetrics.forEach((m) => {
        const key = m.month;
        if (!grouped[key]) grouped[key] = { revenue: 0, mrr: 0, users: 0, pilots: 0, startups: new Set() };
        grouped[key].revenue += Number(m.revenue || 0);
        grouped[key].mrr += Number(m.mrr || 0);
        grouped[key].users += Number(m.users || 0);
        grouped[key].pilots += Number(m.pilots || 0);
        grouped[key].startups.add(m.startupId);
      });
      Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .forEach(([month, v]) => monthlyMetrics.push({ month, revenue: v.revenue, mrr: v.mrr, users: v.users, pilots: v.pilots, startupCount: v.startups.size }));
    }

    let topStartups: Array<{ id: string; name: string; vertical: string | null; stage: string | null; logo: string | null; status: string }> = [];
    if (startupIds.length > 0) {
      const startupRows = await db.select().from(startups).where(inArray(startups.id, startupIds));
      const statusMap: Record<string, string> = {};
      pipeline.forEach((p) => { statusMap[p.startupId] = p.status; });
      topStartups = startupRows.slice(0, 12).map((s) => ({
        id: s.id, name: s.name, vertical: s.vertical, stage: s.stage, logo: s.logo, status: statusMap[s.id] || "discovered",
      }));
    }

    return {
      pipelineByStatus,
      activeBriefs: Number(brResult?.c || 0),
      activePrograms: Number(pgResult?.c || 0),
      avgEvaluationScore: avgScore,
      totalEvaluations: totalEvals,
      monthlyMetrics,
      topStartups,
    };
  }

  // Brief operations
  async getBriefs(companyId?: string, publicOnly?: boolean): Promise<Brief[]> {
    const conditions = [];
    if (companyId) {
      conditions.push(eq(briefs.companyId, companyId));
    }
    if (publicOnly) {
      conditions.push(eq(briefs.status, "open"));
    }
    if (conditions.length > 0) {
      return db.select().from(briefs).where(and(...conditions)).orderBy(desc(briefs.createdAt));
    }
    return db.select().from(briefs).orderBy(desc(briefs.createdAt));
  }

  async getBrief(id: string): Promise<Brief | undefined> {
    const [brief] = await db.select().from(briefs).where(eq(briefs.id, id));
    return brief;
  }

  async createBrief(brief: InsertBrief): Promise<Brief> {
    const [created] = await db.insert(briefs).values(brief).returning();
    return created;
  }

  async updateBrief(id: string, updates: Partial<InsertBrief>): Promise<Brief> {
    const [updated] = await db.update(briefs).set(updates).where(eq(briefs.id, id)).returning();
    return updated;
  }

  async deleteBrief(id: string): Promise<void> {
    await db.delete(briefs).where(eq(briefs.id, id));
  }

  async getBriefApplications(briefId: string): Promise<BriefApplicationWithStartup[]> {
    const results = await db
      .select({
        application: briefApplications,
        startup: {
          id: startups.id,
          name: startups.name,
          logo: startups.logo,
          vertical: startups.vertical,
          stage: startups.stage,
          universityAffiliation: startups.universityAffiliation,
        },
      })
      .from(briefApplications)
      .leftJoin(startups, eq(briefApplications.startupId, startups.id))
      .where(eq(briefApplications.briefId, briefId))
      .orderBy(desc(briefApplications.createdAt));
    return results.map((r) => ({
      ...r.application,
      startup: r.startup as { id: string; name: string; logo: string | null; vertical: string | null; stage: string | null; universityAffiliation: string | null },
    }));
  }

  async getBriefApplication(id: string): Promise<BriefApplication | undefined> {
    const [application] = await db.select().from(briefApplications).where(eq(briefApplications.id, id));
    return application;
  }

  async createBriefApplication(application: InsertBriefApplication): Promise<BriefApplication> {
    const [created] = await db.insert(briefApplications).values(application).returning();
    return created;
  }

  async updateBriefApplicationStatus(id: string, status: string): Promise<BriefApplication> {
    const [updated] = await db.update(briefApplications).set({ status }).where(eq(briefApplications.id, id)).returning();
    return updated;
  }

  async getStartupBriefApplications(startupId: string): Promise<(BriefApplication & { briefTitle?: string })[]> {
    const results = await db
      .select({
        application: briefApplications,
        briefTitle: briefs.title,
      })
      .from(briefApplications)
      .leftJoin(briefs, eq(briefApplications.briefId, briefs.id))
      .where(eq(briefApplications.startupId, startupId))
      .orderBy(desc(briefApplications.createdAt));
    return results.map((r) => ({ ...r.application, briefTitle: r.briefTitle ?? undefined }));
  }

  // Program operations
  async getPrograms(companyId?: string): Promise<Program[]> {
    if (companyId) {
      return db.select().from(programs).where(eq(programs.companyId, companyId)).orderBy(desc(programs.createdAt));
    }
    return db.select().from(programs).orderBy(desc(programs.createdAt));
  }

  async getProgram(id: string): Promise<Program | undefined> {
    const [program] = await db.select().from(programs).where(eq(programs.id, id));
    return program;
  }

  async createProgram(program: InsertProgram): Promise<Program> {
    const [created] = await db.insert(programs).values(program).returning();
    return created;
  }

  async updateProgram(id: string, updates: Partial<InsertProgram>): Promise<Program> {
    const [updated] = await db.update(programs).set(updates).where(eq(programs.id, id)).returning();
    return updated;
  }

  async deleteProgram(id: string): Promise<void> {
    await db.delete(programs).where(eq(programs.id, id));
  }

  async getProgramParticipants(programId: string): Promise<ProgramParticipant[]> {
    return db.select().from(programParticipants).where(eq(programParticipants.programId, programId));
  }

  async addProgramParticipant(data: InsertProgramParticipant): Promise<ProgramParticipant> {
    const [created] = await db.insert(programParticipants).values(data).returning();
    return created;
  }

  async removeProgramParticipant(id: string): Promise<void> {
    await db.delete(programParticipants).where(eq(programParticipants.id, id));
  }

  // Evaluation operations
  async getEvaluation(id: string): Promise<Evaluation | undefined> {
    const [evaluation] = await db.select().from(evaluations)
      .where(eq(evaluations.id, id))
      .limit(1);
    return evaluation;
  }

  async getEvaluations(entityType: string, entityId: string): Promise<Evaluation[]> {
    return db.select().from(evaluations)
      .where(and(eq(evaluations.entityType, entityType), eq(evaluations.entityId, entityId)))
      .orderBy(desc(evaluations.createdAt));
  }

  async getEntityEvaluationSummary(entityType: string, entityId: string): Promise<{ avgScore: number; count: number }> {
    const [result] = await db
      .select({
        avgScore: avg(evaluations.totalScore),
        count: count(),
      })
      .from(evaluations)
      .where(and(eq(evaluations.entityType, entityType), eq(evaluations.entityId, entityId)));
    return {
      avgScore: result?.avgScore ? parseFloat(result.avgScore) : 0,
      count: result?.count ?? 0,
    };
  }

  async createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation> {
    const [created] = await db.insert(evaluations).values(evaluation).returning();
    return created;
  }

  async deleteEvaluation(id: string): Promise<void> {
    await db.delete(evaluations).where(eq(evaluations.id, id));
  }

  // Startup-Company Relations (Pipeline CRM)
  async getCompanyPipeline(companyId: string, status?: string): Promise<StartupCompanyRelationWithStartup[]> {
    const conditions = [eq(startupCompanyRelations.companyId, companyId)];
    if (status) {
      conditions.push(eq(startupCompanyRelations.status, status));
    }
    const results = await db
      .select({
        relation: startupCompanyRelations,
        startup: {
          id: startups.id,
          name: startups.name,
          logo: startups.logo,
          vertical: startups.vertical,
          stage: startups.stage,
          universityAffiliation: startups.universityAffiliation,
        },
      })
      .from(startupCompanyRelations)
      .leftJoin(startups, eq(startupCompanyRelations.startupId, startups.id))
      .where(and(...conditions))
      .orderBy(desc(startupCompanyRelations.updatedAt));
    return results.map((r) => ({
      ...r.relation,
      startup: r.startup as { id: string; name: string; logo: string | null; vertical: string | null; stage: string | null; universityAffiliation: string | null },
    }));
  }

  async getStartupCompanyRelation(startupId: string, companyId: string): Promise<StartupCompanyRelation | undefined> {
    const [relation] = await db.select().from(startupCompanyRelations)
      .where(and(eq(startupCompanyRelations.startupId, startupId), eq(startupCompanyRelations.companyId, companyId)));
    return relation;
  }

  async upsertStartupCompanyRelation(data: InsertStartupCompanyRelation): Promise<StartupCompanyRelation> {
    const existing = await this.getStartupCompanyRelation(data.startupId, data.companyId);
    if (existing) {
      const [updated] = await db.update(startupCompanyRelations)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(startupCompanyRelations.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(startupCompanyRelations).values(data).returning();
    return created;
  }

  async updateStartupCompanyRelationStatus(id: string, status: string): Promise<StartupCompanyRelation> {
    const [updated] = await db.update(startupCompanyRelations)
      .set({ status, updatedAt: new Date() })
      .where(eq(startupCompanyRelations.id, id))
      .returning();
    return updated;
  }

  // Company Notes
  async getCompanyNotes(companyId: string, startupId?: string): Promise<CompanyNoteWithAuthor[]> {
    const conditions = [eq(companyNotes.companyId, companyId)];
    if (startupId) {
      conditions.push(eq(companyNotes.startupId, startupId));
    }
    const results = await db
      .select({
        note: companyNotes,
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(companyNotes)
      .leftJoin(users, eq(companyNotes.authorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(companyNotes.createdAt));
    return results.map((r) => ({
      ...r.note,
      author: r.author as { id: string; firstName: string | null; lastName: string | null; profileImageUrl: string | null },
    }));
  }

  async createCompanyNote(note: InsertCompanyNote): Promise<CompanyNote> {
    const [created] = await db.insert(companyNotes).values(note).returning();
    return created;
  }

  async deleteCompanyNote(id: string): Promise<void> {
    await db.delete(companyNotes).where(eq(companyNotes.id, id));
  }

  // Corporate Reporting
  async getCompanyReport(companyId: string): Promise<{
    briefCount: number;
    applicationCount: number;
    programCount: number;
    pipelineByStatus: Record<string, number>;
    avgEvaluationScore: number;
  }> {
    const [briefResult] = await db
      .select({ count: count() })
      .from(briefs)
      .where(eq(briefs.companyId, companyId));

    const companyBriefs = await db.select({ id: briefs.id }).from(briefs).where(eq(briefs.companyId, companyId));
    const briefIds = companyBriefs.map((b) => b.id);
    let applicationCount = 0;
    if (briefIds.length > 0) {
      const [appResult] = await db
        .select({ count: count() })
        .from(briefApplications)
        .where(sql`${briefApplications.briefId} IN (${sql.join(briefIds.map(id => sql`${id}`), sql`, `)})`);
      applicationCount = appResult?.count ?? 0;
    }

    const [programResult] = await db
      .select({ count: count() })
      .from(programs)
      .where(eq(programs.companyId, companyId));

    const pipelineResults = await db
      .select({
        status: startupCompanyRelations.status,
        count: count(),
      })
      .from(startupCompanyRelations)
      .where(eq(startupCompanyRelations.companyId, companyId))
      .groupBy(startupCompanyRelations.status);
    const pipelineByStatus: Record<string, number> = {};
    for (const row of pipelineResults) {
      pipelineByStatus[row.status] = row.count;
    }

    const [evalResult] = await db
      .select({ avgScore: avg(evaluations.totalScore) })
      .from(evaluations)
      .where(eq(evaluations.companyId, companyId));

    return {
      briefCount: briefResult?.count ?? 0,
      applicationCount,
      programCount: programResult?.count ?? 0,
      pipelineByStatus,
      avgEvaluationScore: evalResult?.avgScore ? parseFloat(evalResult.avgScore) : 0,
    };
  }

  async getUniversities(): Promise<University[]> {
    return await db.select().from(universities);
  }

  async getUniversityBySlug(slug: string): Promise<University | undefined> {
    const [result] = await db.select().from(universities).where(eq(universities.slug, slug));
    return result;
  }

  async getUniversity(id: string): Promise<University | undefined> {
    const [result] = await db.select().from(universities).where(eq(universities.id, id));
    return result;
  }

  async createUniversity(data: InsertUniversity): Promise<University> {
    const [result] = await db.insert(universities).values(data).returning();
    return result;
  }

  async updateUniversity(id: string, updates: Partial<InsertUniversity>): Promise<University> {
    const [result] = await db.update(universities).set(updates).where(eq(universities.id, id)).returning();
    return result;
  }

  async deleteUniversity(id: string): Promise<void> {
    await db.delete(universities).where(eq(universities.id, id));
  }

  async getClubs(universityId?: string): Promise<Club[]> {
    if (universityId) {
      return await db.select().from(clubs).where(eq(clubs.universityId, universityId));
    }
    return await db.select().from(clubs);
  }

  async getClubBySlug(slug: string): Promise<Club | undefined> {
    const [result] = await db.select().from(clubs).where(eq(clubs.slug, slug));
    return result;
  }

  async getClub(id: string): Promise<Club | undefined> {
    const [result] = await db.select().from(clubs).where(eq(clubs.id, id));
    return result;
  }

  async createClub(data: InsertClub): Promise<Club> {
    const [result] = await db.insert(clubs).values(data).returning();
    return result;
  }

  async updateClub(id: string, updates: Partial<InsertClub>): Promise<Club> {
    const [result] = await db.update(clubs).set(updates).where(eq(clubs.id, id)).returning();
    return result;
  }

  async deleteClub(id: string): Promise<void> {
    await db.delete(clubs).where(eq(clubs.id, id));
  }

  async getUserUniversityMemberships(userId: string): Promise<(UserUniversityMembership & { university: University })[]> {
    const results = await db
      .select({
        membership: userUniversityMemberships,
        university: universities,
      })
      .from(userUniversityMemberships)
      .leftJoin(universities, eq(userUniversityMemberships.universityId, universities.id))
      .where(eq(userUniversityMemberships.userId, userId));
    return results.map((r) => ({
      ...r.membership,
      university: r.university as University,
    }));
  }

  async addUserUniversityMembership(data: InsertUserUniversityMembership): Promise<UserUniversityMembership> {
    const [result] = await db.insert(userUniversityMemberships).values(data).returning();
    return result;
  }

  async removeUserUniversityMembership(id: string): Promise<void> {
    await db.delete(userUniversityMemberships).where(eq(userUniversityMemberships.id, id));
  }

  async getUniversityMembers(universityId: string): Promise<UserUniversityMembership[]> {
    return await db.select().from(userUniversityMemberships).where(eq(userUniversityMemberships.universityId, universityId));
  }

  async getUserUniversityMembership(userId: string, universityId: string): Promise<UserUniversityMembership | undefined> {
    const [result] = await db.select().from(userUniversityMemberships)
      .where(and(eq(userUniversityMemberships.userId, userId), eq(userUniversityMemberships.universityId, universityId)));
    return result;
  }

  async updateUserUniversityMembership(id: string, updates: Partial<InsertUserUniversityMembership>): Promise<UserUniversityMembership> {
    const [result] = await db.update(userUniversityMemberships).set(updates).where(eq(userUniversityMemberships.id, id)).returning();
    return result;
  }

  async getUserClubMemberships(userId: string): Promise<(UserClubMembership & { club: Club })[]> {
    const results = await db
      .select({
        membership: userClubMemberships,
        club: clubs,
      })
      .from(userClubMemberships)
      .leftJoin(clubs, eq(userClubMemberships.clubId, clubs.id))
      .where(eq(userClubMemberships.userId, userId));
    return results.map((r) => ({
      ...r.membership,
      club: r.club as Club,
    }));
  }

  async addUserClubMembership(data: InsertUserClubMembership): Promise<UserClubMembership> {
    const [result] = await db.insert(userClubMemberships).values(data).returning();
    return result;
  }

  async removeUserClubMembership(id: string): Promise<void> {
    await db.delete(userClubMemberships).where(eq(userClubMemberships.id, id));
  }

  async getClubMembers(clubId: string): Promise<UserClubMembership[]> {
    return await db.select().from(userClubMemberships).where(eq(userClubMemberships.clubId, clubId));
  }

  async getUserClubMembership(userId: string, clubId: string): Promise<UserClubMembership | undefined> {
    const [result] = await db.select().from(userClubMemberships)
      .where(and(eq(userClubMemberships.userId, userId), eq(userClubMemberships.clubId, clubId)));
    return result;
  }

  async updateUserClubMembership(id: string, updates: Partial<InsertUserClubMembership>): Promise<UserClubMembership> {
    const [result] = await db.update(userClubMemberships).set(updates).where(eq(userClubMemberships.id, id)).returning();
    return result;
  }

  async getStartupAffiliations(startupId: string): Promise<StartupAffiliation[]> {
    return await db.select().from(startupAffiliations).where(eq(startupAffiliations.startupId, startupId));
  }

  async addStartupAffiliation(data: InsertStartupAffiliation): Promise<StartupAffiliation> {
    const [result] = await db.insert(startupAffiliations).values(data).returning();
    return result;
  }

  async getStartupAffiliationsByUniversity(universityId: string): Promise<StartupAffiliation[]> {
    return await db.select().from(startupAffiliations).where(eq(startupAffiliations.universityId, universityId));
  }

  async getStartupAffiliationsByClub(clubId: string): Promise<StartupAffiliation[]> {
    return await db.select().from(startupAffiliations).where(eq(startupAffiliations.clubId, clubId));
  }

  async removeStartupAffiliation(id: string): Promise<void> {
    await db.delete(startupAffiliations).where(eq(startupAffiliations.id, id));
  }

  async getEventsByUniversity(universityId: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.universityId, universityId));
  }

  async getEventsByClub(clubId: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.clubId, clubId));
  }

  async getStartupReadiness(startupId: string): Promise<StartupReadiness | undefined> {
    const [result] = await db.select().from(startupReadiness).where(eq(startupReadiness.startupId, startupId));
    return result;
  }

  async upsertStartupReadiness(startupId: string, data: Partial<InsertStartupReadiness>): Promise<StartupReadiness> {
    const merged = { ...data, startupId };
    let filledCount = 0;
    if (merged.hasLiveB2BPilots) filledCount++;
    if (merged.hasBankFintechExperience) filledCount++;
    if (merged.problemStatement && merged.problemStatement.length > 0) filledCount++;
    if (merged.targetUnits && merged.targetUnits.length > 0) filledCount++;
    if (merged.integrationModel && merged.integrationModel.length > 0) filledCount++;
    if (merged.dataRequirements && merged.dataRequirements.length > 0) filledCount++;
    if (merged.existingReferences && merged.existingReferences.length > 0) filledCount++;
    if (merged.isRegulated) filledCount++;
    if (merged.isSecurityReviewed) filledCount++;
    const completenessScore = Math.round((filledCount / 9) * 100);

    const existing = await this.getStartupReadiness(startupId);
    if (existing) {
      const [result] = await db
        .update(startupReadiness)
        .set({ ...data, completenessScore, updatedAt: new Date() })
        .where(eq(startupReadiness.startupId, startupId))
        .returning();
      return result;
    } else {
      const [result] = await db
        .insert(startupReadiness)
        .values({ ...merged, completenessScore })
        .returning();
      return result;
    }
  }

  async getReviewerAssignments(companyId: string): Promise<ReviewerAssignmentWithDetails[]> {
    const results = await db
      .select({
        assignment: reviewerAssignments,
        reviewerFirstName: users.firstName,
        reviewerLastName: users.lastName,
        reviewerEmail: users.email,
      })
      .from(reviewerAssignments)
      .leftJoin(users, eq(reviewerAssignments.reviewerId, users.id))
      .where(eq(reviewerAssignments.companyId, companyId));
    return results.map((r) => ({
      ...r.assignment,
      reviewerFirstName: r.reviewerFirstName,
      reviewerLastName: r.reviewerLastName,
      reviewerEmail: r.reviewerEmail,
      entityName: null,
    }));
  }

  async getMyReviewAssignments(reviewerId: string): Promise<ReviewerAssignmentWithDetails[]> {
    const results = await db
      .select({
        assignment: reviewerAssignments,
        reviewerFirstName: users.firstName,
        reviewerLastName: users.lastName,
        reviewerEmail: users.email,
      })
      .from(reviewerAssignments)
      .leftJoin(users, eq(reviewerAssignments.reviewerId, users.id))
      .where(eq(reviewerAssignments.reviewerId, reviewerId));
    return results.map((r) => ({
      ...r.assignment,
      reviewerFirstName: r.reviewerFirstName,
      reviewerLastName: r.reviewerLastName,
      reviewerEmail: r.reviewerEmail,
      entityName: null,
    }));
  }

  async createReviewerAssignment(data: InsertReviewerAssignment): Promise<ReviewerAssignment> {
    const [result] = await db.insert(reviewerAssignments).values(data).returning();
    return result;
  }

  async updateReviewerAssignmentStatus(id: string, status: string): Promise<ReviewerAssignment> {
    const updates: any = { status };
    if (status === "done") {
      updates.completedAt = new Date();
    }
    const [result] = await db.update(reviewerAssignments).set(updates).where(eq(reviewerAssignments.id, id)).returning();
    return result;
  }

  async deleteReviewerAssignment(id: string): Promise<void> {
    await db.delete(reviewerAssignments).where(eq(reviewerAssignments.id, id));
  }

  async getEntityReviewProgress(entityType: string, entityId: string): Promise<{ total: number; completed: number }> {
    const all = await db
      .select()
      .from(reviewerAssignments)
      .where(and(eq(reviewerAssignments.entityType, entityType), eq(reviewerAssignments.entityId, entityId)));
    const completed = all.filter((a) => a.status === "done").length;
    return { total: all.length, completed };
  }

  async createActivityLog(data: InsertActivityLog): Promise<ActivityLog> {
    const [result] = await db.insert(activityLogs).values(data).returning();
    return result;
  }

  async getActivityLogs(companyId: string, limit?: number): Promise<ActivityLogWithActor[]> {
    let query = db
      .select({
        log: activityLogs,
        actorFirstName: users.firstName,
        actorLastName: users.lastName,
        actorEmail: users.email,
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.actorId, users.id))
      .where(eq(activityLogs.companyId, companyId))
      .orderBy(desc(activityLogs.createdAt));

    const results = limit ? await (query as any).limit(limit) : await query;
    return results.map((r: any) => ({
      ...r.log,
      actorFirstName: r.actorFirstName,
      actorLastName: r.actorLastName,
      actorEmail: r.actorEmail,
    }));
  }

  async getActivityLogsByEntity(entityId: string, entityType?: string, limit?: number): Promise<ActivityLogWithActor[]> {
    const conditions = [eq(activityLogs.entityId, entityId)];
    if (entityType) {
      conditions.push(eq(activityLogs.entityType, entityType));
    }
    let query = db
      .select({
        log: activityLogs,
        actorFirstName: users.firstName,
        actorLastName: users.lastName,
        actorEmail: users.email,
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.actorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(activityLogs.createdAt));

    const results = limit ? await (query as any).limit(limit) : await query;
    return results.map((r: any) => ({
      ...r.log,
      actorFirstName: r.actorFirstName,
      actorLastName: r.actorLastName,
      actorEmail: r.actorEmail,
    }));
  }

  async getCompanyPlan(companyId: string): Promise<CompanyPlan | undefined> {
    const [result] = await db.select().from(companyPlans).where(eq(companyPlans.companyId, companyId));
    return result;
  }

  async upsertCompanyPlan(companyId: string, data: Partial<InsertCompanyPlan>): Promise<CompanyPlan> {
    const existing = await this.getCompanyPlan(companyId);
    if (existing) {
      const [result] = await db
        .update(companyPlans)
        .set(data)
        .where(eq(companyPlans.companyId, companyId))
        .returning();
      return result;
    } else {
      const [result] = await db
        .insert(companyPlans)
        .values({ ...data, companyId } as InsertCompanyPlan)
        .returning();
      return result;
    }
  }

  async getCompanyUsage(companyId: string): Promise<CompanyUsage | undefined> {
    const [result] = await db.select().from(companyUsage).where(eq(companyUsage.companyId, companyId));
    return result;
  }

  async incrementCompanyUsage(companyId: string, field: string): Promise<CompanyUsage> {
    const existing = await this.getCompanyUsage(companyId);
    if (existing) {
      const currentVal = (existing as any)[field] ?? 0;
      const [result] = await db
        .update(companyUsage)
        .set({ [field]: currentVal + 1, updatedAt: new Date() })
        .where(eq(companyUsage.companyId, companyId))
        .returning();
      return result;
    } else {
      const [result] = await db
        .insert(companyUsage)
        .values({ companyId, [field]: 1 } as any)
        .returning();
      return result;
    }
  }

  async decrementCompanyUsage(companyId: string, field: string): Promise<CompanyUsage> {
    const existing = await this.getCompanyUsage(companyId);
    if (existing) {
      const currentVal = Math.max(0, ((existing as any)[field] ?? 0) - 1);
      const [result] = await db
        .update(companyUsage)
        .set({ [field]: currentVal, updatedAt: new Date() })
        .where(eq(companyUsage.companyId, companyId))
        .returning();
      return result;
    } else {
      const [result] = await db
        .insert(companyUsage)
        .values({ companyId, [field]: 0 } as any)
        .returning();
      return result;
    }
  }

  async updateCompanyUsageField(companyId: string, field: string, value: number): Promise<CompanyUsage> {
    const existing = await this.getCompanyUsage(companyId);
    if (existing) {
      const [result] = await db
        .update(companyUsage)
        .set({ [field]: value, updatedAt: new Date() })
        .where(eq(companyUsage.companyId, companyId))
        .returning();
      return result;
    } else {
      const [result] = await db
        .insert(companyUsage)
        .values({ companyId, [field]: value } as any)
        .returning();
      return result;
    }
  }

  async getCompanyPlanWithUsage(companyId: string): Promise<CompanyPlanWithUsage | undefined> {
    const results = await db
      .select({
        plan: companyPlans,
        usage: companyUsage,
      })
      .from(companyPlans)
      .leftJoin(companyUsage, eq(companyPlans.companyId, companyUsage.companyId))
      .where(eq(companyPlans.companyId, companyId));
    if (results.length === 0) return undefined;
    const r = results[0];
    return {
      ...r.plan,
      usage: r.usage,
    };
  }

  async getSystemSetting(key: string): Promise<string | null> {
    const result = await db.execute(sql`SELECT value FROM system_settings WHERE key = ${key}`);
    const rows = result.rows as any[];
    return rows.length > 0 ? rows[0].value : null;
  }

  async setSystemSetting(key: string, value: string): Promise<void> {
    await db.execute(sql`
      INSERT INTO system_settings (key, value, updated_at) VALUES (${key}, ${value}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
    `);
  }

  // ===== Signals foundation =====
  async getAllSignalSources(): Promise<SignalSource[]> {
    return await db.select().from(signalSources).orderBy(signalSources.category, signalSources.displayName);
  }

  async getSignalSourceByKey(sourceKey: string): Promise<SignalSource | undefined> {
    const [row] = await db.select().from(signalSources).where(eq(signalSources.sourceKey, sourceKey));
    return row;
  }

  async upsertSignalSource(source: { sourceKey: string; displayName: string; category: string; scoreCategory?: string | null; description?: string | null; requiresCredentials: boolean; credentialKind?: string | null }): Promise<SignalSource> {
    const existing = await this.getSignalSourceByKey(source.sourceKey);
    if (existing) {
      const [updated] = await db.update(signalSources).set({
        displayName: source.displayName,
        category: source.category,
        scoreCategory: source.scoreCategory ?? null,
        description: source.description ?? null,
        requiresCredentials: source.requiresCredentials,
        credentialKind: source.credentialKind ?? null,
      }).where(eq(signalSources.sourceKey, source.sourceKey)).returning();
      return updated;
    }
    const [inserted] = await db.insert(signalSources).values({
      sourceKey: source.sourceKey,
      displayName: source.displayName,
      category: source.category,
      scoreCategory: source.scoreCategory ?? null,
      description: source.description ?? null,
      requiresCredentials: source.requiresCredentials,
      credentialKind: source.credentialKind ?? null,
      status: "idle",
    }).returning();
    return inserted;
  }

  async markSignalSourceStatus(sourceKey: string, status: string, error: string | null): Promise<void> {
    await db.update(signalSources).set({
      status,
      lastError: error,
      lastRunAt: new Date(),
    }).where(eq(signalSources.sourceKey, sourceKey));
  }

  async setSignalSourcePaused(sourceKey: string, isPaused: boolean): Promise<SignalSource> {
    const [updated] = await db.update(signalSources).set({
      isPaused,
      status: isPaused ? "disabled" : "idle",
    }).where(eq(signalSources.sourceKey, sourceKey)).returning();
    return updated;
  }

  async touchStartupActivity(startupId: string, when: Date = new Date()): Promise<void> {
    await db.update(startups).set({ lastActivityAt: when }).where(eq(startups.id, startupId));
  }

  async recordSignalEvent(event: InsertSignalEvent): Promise<boolean> {
    try {
      await db.insert(signalEvents).values(event);
    } catch (err: any) {
      if (err?.code === "23505") return false;
      throw err;
    }
    // Any incoming signal — internal or external — counts as activity, so the
    // startup's active/inactive flag tracks it.
    if (event.startupId) {
      try {
        const occurred =
          event.occurredAt instanceof Date
            ? event.occurredAt
            : event.occurredAt
              ? new Date(event.occurredAt as any)
              : new Date();
        await this.touchStartupActivity(event.startupId, occurred);
      } catch (err) {
        console.error("[signals] touchStartupActivity failed", err);
      }
    }
    // Verification correlator: when ≥2 sources independently report the same
    // logical event for the same startup within ±3 days, mark them all as
    // mutually verified (verified_by = union of distinct sourceKeys).
    try {
      if (event.startupId) {
        const raw: unknown = event.occurredAt;
        let occurred: Date;
        if (raw instanceof Date) occurred = raw;
        else if (typeof raw === "string" || typeof raw === "number") occurred = new Date(raw);
        else occurred = new Date();
        await this.runVerificationCorrelator(event.startupId, event.eventType, occurred);
      }
    } catch (err) {
      console.error("[signals] verification correlator failed:", err);
    }
    return true;
  }

  private async runVerificationCorrelator(startupId: string, eventType: string, occurredAt: Date): Promise<void> {
    const windowMs = 3 * 24 * 60 * 60 * 1000;
    const start = new Date(occurredAt.getTime() - windowMs);
    const end = new Date(occurredAt.getTime() + windowMs);
    const siblings = await db.select().from(signalEvents).where(and(
      eq(signalEvents.startupId, startupId),
      eq(signalEvents.eventType, eventType),
      sql`${signalEvents.occurredAt} >= ${start}`,
      sql`${signalEvents.occurredAt} <= ${end}`,
    ));
    if (siblings.length < 2) return;
    const sourceUnion = Array.from(new Set(siblings.map((s) => s.sourceKey))).sort();
    if (sourceUnion.length < 2) return;
    for (const ev of siblings) {
      const current = ev.verifiedBy ?? [];
      const merged = Array.from(new Set([...current, ...sourceUnion])).sort();
      if (merged.length === current.length && merged.every((v, i) => v === current[i])) continue;
      await db.update(signalEvents).set({ verifiedBy: merged }).where(eq(signalEvents.id, ev.id));
    }
  }

  async getSignalEventsForStartup(startupId: string, limit = 50): Promise<SignalEvent[]> {
    return await db.select().from(signalEvents)
      .where(eq(signalEvents.startupId, startupId))
      .orderBy(desc(signalEvents.occurredAt))
      .limit(limit);
  }

  async getStartupTimeline(startupId: string, opts: {
    cursor?: { occurredAt: Date; id: string } | null;
    limit?: number;
    categories?: string[];
    sources?: string[];
    severities?: string[];
    after?: Date;
    before?: Date;
  } = {}): Promise<{ events: SignalEvent[]; nextCursor: { occurredAt: string; id: string } | null }> {
    const limit = Math.max(1, Math.min(100, opts.limit ?? 25));
    const conds: any[] = [eq(signalEvents.startupId, startupId)];
    const ALLOWED_SEVERITIES = ["info", "positive", "warning", "critical"] as const;
    type Severity = typeof ALLOWED_SEVERITIES[number];
    if (opts.severities?.length) {
      const sevs: Severity[] = opts.severities.filter(
        (s): s is Severity => (ALLOWED_SEVERITIES as readonly string[]).includes(s),
      );
      if (sevs.length) conds.push(inArray(signalEvents.severity, sevs));
    }
    if (opts.sources?.length) conds.push(inArray(signalEvents.sourceKey, opts.sources));
    if (opts.after) conds.push(sql`${signalEvents.occurredAt} >= ${opts.after}`);
    if (opts.before) conds.push(sql`${signalEvents.occurredAt} <= ${opts.before}`);
    if (opts.categories?.length) {
      const matchingSources = await db.select({ sourceKey: signalSources.sourceKey })
        .from(signalSources)
        .where(inArray(signalSources.category, opts.categories));
      const keys = matchingSources.map((s) => s.sourceKey);
      if (keys.length === 0) return { events: [], nextCursor: null };
      conds.push(inArray(signalEvents.sourceKey, keys));
    }
    if (opts.cursor) {
      conds.push(sql`(${signalEvents.occurredAt}, ${signalEvents.id}) < (${opts.cursor.occurredAt}, ${opts.cursor.id})`);
    }
    const rows = await db.select().from(signalEvents)
      .where(and(...conds))
      .orderBy(desc(signalEvents.occurredAt), desc(signalEvents.id))
      .limit(limit + 1);
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const last = slice[slice.length - 1];
    const nextCursor = hasMore && last
      ? { occurredAt: (last.occurredAt as Date).toISOString(), id: last.id }
      : null;
    return { events: slice, nextCursor };
  }

  async getStartupSignalEventsInWindow(startupId: string, since: Date): Promise<SignalEvent[]> {
    return await db.select().from(signalEvents).where(and(
      eq(signalEvents.startupId, startupId),
      sql`${signalEvents.occurredAt} >= ${since}`,
    )).orderBy(desc(signalEvents.occurredAt));
  }

  async listAllStartupIdsWithSignals(): Promise<string[]> {
    const rows = await db.selectDistinct({ id: signalEvents.startupId }).from(signalEvents)
      .where(isNotNull(signalEvents.startupId));
    return rows.map((r) => r.id!).filter(Boolean);
  }

  async getMilestonesForStartup(startupId: string, opts: { since?: Date; includeStatuses?: string[] } = {}): Promise<Milestone[]> {
    const conds: any[] = [eq(milestones.startupId, startupId)];
    if (opts.since) conds.push(sql`${milestones.occurredAt} >= ${opts.since}`);
    // Default: only show milestones cleared for the public timeline.
    const statuses = opts.includeStatuses ?? ["auto_approved", "approved"];
    if (statuses.length > 0) conds.push(inArray(milestones.reviewStatus, statuses));
    return await db.select().from(milestones)
      .where(and(...conds))
      .orderBy(desc(milestones.occurredAt));
  }

  async upsertMilestoneByEventOverlap(data: InsertMilestone): Promise<Milestone> {
    const ids = (data.sourceEventIds ?? []).filter(Boolean);
    if (ids.length > 0) {
      const existing = await db.select().from(milestones).where(and(
        eq(milestones.startupId, data.startupId),
        sql`${milestones.sourceEventIds} && ${ids}::text[]`,
      )).limit(1);
      if (existing[0]) {
        const merged = Array.from(new Set([...(existing[0].sourceEventIds ?? []), ...ids]));
        // Preserve a manual reviewer decision: never downgrade an
        // already-approved or already-rejected milestone back to pending.
        const preserveReview = existing[0].reviewStatus === "approved" || existing[0].reviewStatus === "rejected";
        const [updated] = await db.update(milestones).set({
          kind: data.kind,
          title: data.title,
          description: data.description ?? existing[0].description,
          occurredAt: data.occurredAt ?? existing[0].occurredAt,
          confidence: data.confidence ?? existing[0].confidence,
          sourceEventIds: merged,
          llmModel: data.llmModel ?? existing[0].llmModel,
          reviewStatus: preserveReview
            ? existing[0].reviewStatus
            : ((data as any).reviewStatus ?? existing[0].reviewStatus),
        }).where(eq(milestones.id, existing[0].id)).returning();
        return updated;
      }
    }
    const [inserted] = await db.insert(milestones).values(data).returning();
    return inserted;
  }

  async listMilestonesForReview(opts: { status?: string; limit?: number } = {}): Promise<Array<Milestone & { startup: { id: string; name: string } | null }>> {
    const status = opts.status ?? "pending_review";
    const limit = Math.max(1, Math.min(500, opts.limit ?? 100));
    const rows = await db.select({ m: milestones, st: startups })
      .from(milestones)
      .leftJoin(startups, eq(startups.id, milestones.startupId))
      .where(eq(milestones.reviewStatus, status))
      .orderBy(desc(milestones.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      ...(r.m as Milestone),
      startup: r.st ? { id: r.st.id, name: r.st.name } : null,
    }));
  }

  async setMilestoneReviewStatus(id: string, status: "approved" | "rejected" | "pending_review", reviewerId: string | null): Promise<Milestone | undefined> {
    const [row] = await db.update(milestones)
      .set({
        reviewStatus: status,
        reviewedBy: reviewerId,
        reviewedAt: status === "pending_review" ? null : new Date(),
      } as any)
      .where(eq(milestones.id, id))
      .returning();
    return row;
  }

  async deleteMilestone(id: string): Promise<void> {
    await db.delete(milestones).where(eq(milestones.id, id));
  }

  async createIngestionRun(run: InsertIngestionRun): Promise<IngestionRun> {
    const [inserted] = await db.insert(ingestionRuns).values(run).returning();
    return inserted;
  }

  async finishIngestionRun(id: string, updates: { finishedAt: Date; eventsCreated: number; status: string; error: string | null }): Promise<void> {
    await db.update(ingestionRuns).set(updates).where(eq(ingestionRuns.id, id));
  }

  async getRecentIngestionRuns(sourceKey: string, limit = 10): Promise<IngestionRun[]> {
    return await db.select().from(ingestionRuns)
      .where(eq(ingestionRuns.sourceKey, sourceKey))
      .orderBy(desc(ingestionRuns.startedAt))
      .limit(limit);
  }

  async getAllCronJobs(): Promise<CronJob[]> {
    return await db.select().from(cronJobs).orderBy(cronJobs.jobName);
  }

  async getCronJobByName(jobName: string): Promise<CronJob | undefined> {
    const [row] = await db.select().from(cronJobs).where(eq(cronJobs.jobName, jobName));
    return row;
  }

  async createCronJob(job: InsertCronJob): Promise<CronJob> {
    const [inserted] = await db.insert(cronJobs).values(job).returning();
    return inserted;
  }

  async markCronJobStarted(id: string): Promise<void> {
    await db.update(cronJobs).set({ lastRunAt: new Date(), lastStatus: "running" }).where(eq(cronJobs.id, id));
  }

  async markCronJobFinished(id: string, status: string, error: string | null): Promise<void> {
    await db.update(cronJobs).set({ lastStatus: status, lastError: error }).where(eq(cronJobs.id, id));
  }

  async setCronJobPaused(jobName: string, isPaused: boolean): Promise<CronJob> {
    const [updated] = await db.update(cronJobs).set({ isPaused }).where(eq(cronJobs.jobName, jobName)).returning();
    return updated;
  }

  async getIntegrationCredential(startupId: string | null, kind: string): Promise<IntegrationCredential | undefined> {
    const condition = startupId
      ? and(eq(integrationCredentials.startupId, startupId), eq(integrationCredentials.kind, kind))
      : and(sql`${integrationCredentials.startupId} IS NULL`, eq(integrationCredentials.kind, kind));
    const [row] = await db.select().from(integrationCredentials).where(condition);
    return row;
  }

  async upsertIntegrationCredential(data: InsertIntegrationCredential): Promise<IntegrationCredential> {
    const existing = await this.getIntegrationCredential(data.startupId ?? null, data.kind);
    if (existing) {
      const [updated] = await db.update(integrationCredentials).set({
        status: data.status ?? existing.status,
        encryptedConfig: data.encryptedConfig ?? existing.encryptedConfig,
        updatedAt: new Date(),
      }).where(eq(integrationCredentials.id, existing.id)).returning();
      return updated;
    }
    const [inserted] = await db.insert(integrationCredentials).values(data).returning();
    return inserted;
  }

  async listIntegrationCredentials(startupId: string): Promise<IntegrationCredential[]> {
    return await db.select().from(integrationCredentials)
      .where(eq(integrationCredentials.startupId, startupId));
  }

  async getIntegrationCredentialsForStartup(startupId: string): Promise<IntegrationCredential[]> {
    return await db.select().from(integrationCredentials).where(eq(integrationCredentials.startupId, startupId));
  }

  async getActiveIntegrationCredentialsByKind(kind: string): Promise<IntegrationCredential[]> {
    return await db.select().from(integrationCredentials).where(
      and(eq(integrationCredentials.kind, kind), eq(integrationCredentials.status, "active")),
    );
  }

  async deleteIntegrationCredential(startupId: string | null, kind: string): Promise<void> {
    const condition = startupId
      ? and(eq(integrationCredentials.startupId, startupId), eq(integrationCredentials.kind, kind))
      : and(sql`${integrationCredentials.startupId} IS NULL`, eq(integrationCredentials.kind, kind));
    await db.delete(integrationCredentials).where(condition);
  }

  async getLatestVitalityScore(startupId: string): Promise<VitalityScore | undefined> {
    const [row] = await db.select().from(vitalityScores)
      .where(and(eq(vitalityScores.startupId, startupId), eq(vitalityScores.isLatest, true)))
      .limit(1);
    return row;
  }

  async insertVitalityScore(data: InsertVitalityScore): Promise<VitalityScore> {
    await db.update(vitalityScores).set({ isLatest: false })
      .where(eq(vitalityScores.startupId, data.startupId));
    const [inserted] = await db.insert(vitalityScores).values({ ...data, isLatest: true }).returning();
    return inserted;
  }

  async getVitalityScoreHistory(startupId: string, limit = 400, sinceDays = 365): Promise<VitalityScore[]> {
    const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    const rows = await db.select().from(vitalityScores)
      .where(and(eq(vitalityScores.startupId, startupId), gte(vitalityScores.computedAt, cutoff)))
      .orderBy(desc(vitalityScores.computedAt))
      .limit(limit);
    return rows.reverse();
  }

  async getLatestVitalityScoresForStartups(startupIds: string[]): Promise<VitalityScore[]> {
    if (startupIds.length === 0) return [];
    return db.select().from(vitalityScores)
      .where(and(inArray(vitalityScores.startupId, startupIds), eq(vitalityScores.isLatest, true)));
  }

  // ==========================================================================
  // Group 8 — Alerts & Notifications
  // ==========================================================================

  async listAlertRules(filter: { ownerType?: string; ownerId?: string; isActive?: boolean } = {}): Promise<AlertRule[]> {
    const conds = [] as any[];
    if (filter.ownerType) conds.push(eq(alertRules.ownerType, filter.ownerType));
    if (filter.ownerId) conds.push(eq(alertRules.ownerId, filter.ownerId));
    if (typeof filter.isActive === "boolean") conds.push(eq(alertRules.isActive, filter.isActive));
    let q = db.select().from(alertRules).$dynamic();
    if (conds.length) q = q.where(and(...conds));
    return await q.orderBy(desc(alertRules.createdAt));
  }

  async getAlertRule(id: string): Promise<AlertRule | undefined> {
    const [row] = await db.select().from(alertRules).where(eq(alertRules.id, id));
    return row;
  }

  async createAlertRule(rule: InsertAlertRule): Promise<AlertRule> {
    const [inserted] = await db.insert(alertRules).values(rule).returning();
    return inserted;
  }

  async updateAlertRule(id: string, updates: Partial<InsertAlertRule>): Promise<AlertRule> {
    const [updated] = await db.update(alertRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(alertRules.id, id))
      .returning();
    return updated;
  }

  async deleteAlertRule(id: string): Promise<void> {
    await db.delete(alertRules).where(eq(alertRules.id, id));
  }

  async listUserWatchlists(userId: string): Promise<(Watchlist & { startupCount: number })[]> {
    const rows = await db.select().from(watchlists)
      .where(eq(watchlists.userId, userId))
      .orderBy(desc(watchlists.createdAt));
    if (rows.length === 0) return [];
    const counts = await db.select({
      watchlistId: watchlistStartups.watchlistId,
      c: count(watchlistStartups.id),
    }).from(watchlistStartups)
      .where(inArray(watchlistStartups.watchlistId, rows.map((r) => r.id)))
      .groupBy(watchlistStartups.watchlistId);
    const map = new Map(counts.map((c) => [c.watchlistId, Number(c.c)]));
    return rows.map((r) => ({ ...r, startupCount: map.get(r.id) ?? 0 }));
  }

  async getWatchlist(id: string): Promise<Watchlist | undefined> {
    const [row] = await db.select().from(watchlists).where(eq(watchlists.id, id));
    return row;
  }

  async getWatchlistStartups(watchlistId: string): Promise<(WatchlistStartup & { startup: Startup })[]> {
    const rows = await db.select({
      ws: watchlistStartups,
      st: startups,
    }).from(watchlistStartups)
      .innerJoin(startups, eq(watchlistStartups.startupId, startups.id))
      .where(eq(watchlistStartups.watchlistId, watchlistId))
      .orderBy(desc(watchlistStartups.addedAt));
    return rows.map((r) => ({ ...r.ws, startup: r.st }));
  }

  async createWatchlist(data: InsertWatchlist): Promise<Watchlist> {
    const [inserted] = await db.insert(watchlists).values(data).returning();
    return inserted;
  }

  async deleteWatchlist(id: string): Promise<void> {
    await db.delete(watchlists).where(eq(watchlists.id, id));
  }

  async addWatchlistStartup(data: InsertWatchlistStartup): Promise<WatchlistStartup> {
    const [inserted] = await db.insert(watchlistStartups).values(data).onConflictDoNothing().returning();
    if (inserted) return inserted;
    const [existing] = await db.select().from(watchlistStartups)
      .where(and(eq(watchlistStartups.watchlistId, data.watchlistId), eq(watchlistStartups.startupId, data.startupId)));
    return existing;
  }

  async removeWatchlistStartup(watchlistId: string, startupId: string): Promise<void> {
    await db.delete(watchlistStartups)
      .where(and(eq(watchlistStartups.watchlistId, watchlistId), eq(watchlistStartups.startupId, startupId)));
  }

  async updateWatchlist(id: string, updates: Partial<InsertWatchlist>): Promise<Watchlist> {
    const [row] = await db.update(watchlists).set(updates as any).where(eq(watchlists.id, id)).returning();
    return row;
  }

  async getAllWatchlistsWithStartups(opts?: { cadence?: string }): Promise<(Watchlist & { startupIds: string[] })[]> {
    const wls = opts?.cadence
      ? await db.select().from(watchlists).where(eq(watchlists.cadence, opts.cadence))
      : await db.select().from(watchlists);
    if (wls.length === 0) return [];
    const links = await db.select().from(watchlistStartups)
      .where(inArray(watchlistStartups.watchlistId, wls.map((w) => w.id)));
    const map = new Map<string, string[]>();
    for (const l of links) {
      const arr = map.get(l.watchlistId) ?? [];
      arr.push(l.startupId);
      map.set(l.watchlistId, arr);
    }
    return wls.map((w) => ({ ...w, startupIds: map.get(w.id) ?? [] }));
  }

  async getWatchlistsContainingStartup(startupId: string, opts?: { cadence?: string }): Promise<Watchlist[]> {
    const links = await db.select({ wlId: watchlistStartups.watchlistId })
      .from(watchlistStartups)
      .where(eq(watchlistStartups.startupId, startupId));
    if (links.length === 0) return [];
    const ids = links.map((l) => l.wlId);
    const conds: any[] = [inArray(watchlists.id, ids)];
    if (opts?.cadence) conds.push(eq(watchlists.cadence, opts.cadence));
    return db.select().from(watchlists).where(and(...conds));
  }

  async createManualReviewFlag(flag: InsertManualReviewFlag): Promise<ManualReviewFlag> {
    const [inserted] = await db.insert(manualReviewFlags).values(flag).returning();
    return inserted;
  }

  async listManualReviewFlags(filter: { reviewerId?: string; entityType?: string; entityId?: string; status?: string }): Promise<ManualReviewFlag[]> {
    const conds = [] as any[];
    if (filter.reviewerId) conds.push(eq(manualReviewFlags.reviewerId, filter.reviewerId));
    if (filter.entityType) conds.push(eq(manualReviewFlags.entityType, filter.entityType));
    if (filter.entityId) conds.push(eq(manualReviewFlags.entityId, filter.entityId));
    if (filter.status) conds.push(eq(manualReviewFlags.status, filter.status));
    let q = db.select().from(manualReviewFlags).$dynamic();
    if (conds.length) q = q.where(and(...conds));
    return await q.orderBy(desc(manualReviewFlags.createdAt));
  }

  async getManualReviewFlag(id: string): Promise<ManualReviewFlag | undefined> {
    const [row] = await db.select().from(manualReviewFlags).where(eq(manualReviewFlags.id, id));
    return row;
  }

  async updateManualReviewFlagStatus(id: string, status: string): Promise<ManualReviewFlag> {
    const updates: any = { status };
    if (status === "resolved" || status === "dismissed") updates.resolvedAt = new Date();
    const [updated] = await db.update(manualReviewFlags).set(updates).where(eq(manualReviewFlags.id, id)).returning();
    return updated;
  }

  async upsertFounderPulseState(state: InsertFounderPulseState): Promise<FounderPulseState> {
    const existing = await this.getFounderPulseState(state.startupId);
    if (existing) {
      const [updated] = await db.update(founderPulseStates)
        .set({ status: state.status, lastSignalAt: state.lastSignalAt ?? null, updatedAt: new Date() })
        .where(eq(founderPulseStates.startupId, state.startupId))
        .returning();
      return updated;
    }
    const [inserted] = await db.insert(founderPulseStates).values({ ...state, updatedAt: new Date() } as any).returning();
    return inserted;
  }

  async getFounderPulseState(startupId: string): Promise<FounderPulseState | undefined> {
    const [row] = await db.select().from(founderPulseStates).where(eq(founderPulseStates.startupId, startupId));
    return row;
  }

  async listFounderPulseStates(): Promise<FounderPulseState[]> {
    return await db.select().from(founderPulseStates);
  }

  async getSignalEventsSince(since: Date, startupIds?: string[]): Promise<SignalEvent[]> {
    const conds = [sql`${signalEvents.occurredAt} >= ${since}`] as any[];
    if (startupIds && startupIds.length > 0) {
      conds.push(inArray(signalEvents.startupId, startupIds));
    }
    return await db.select().from(signalEvents)
      .where(and(...conds))
      .orderBy(desc(signalEvents.occurredAt));
  }

  async getRecentSignalEventForStartup(startupId: string): Promise<SignalEvent | undefined> {
    const [row] = await db.select().from(signalEvents)
      .where(eq(signalEvents.startupId, startupId))
      .orderBy(desc(signalEvents.occurredAt))
      .limit(1);
    return row;
  }

  // ==========================================================================
  // Group 6 — Vitality scoring helpers (extra accessors used by recompute job)
  // ==========================================================================

  async getAllSignalEvents(): Promise<SignalEvent[]> {
    return db.select().from(signalEvents);
  }

  async getScoreWeightPresets(companyId?: string | null): Promise<ScoreWeightPreset[]> {
    const cond = companyId
      ? or(eq(scoreWeightPresets.companyId, companyId), sql`${scoreWeightPresets.companyId} IS NULL`)
      : sql`${scoreWeightPresets.companyId} IS NULL`;
    return db.select().from(scoreWeightPresets).where(cond).orderBy(desc(scoreWeightPresets.isDefault), scoreWeightPresets.name);
  }

  async getScoreWeightPreset(id: string): Promise<ScoreWeightPreset | undefined> {
    const [row] = await db.select().from(scoreWeightPresets).where(eq(scoreWeightPresets.id, id));
    return row;
  }

  async createScoreWeightPreset(data: InsertScoreWeightPreset): Promise<ScoreWeightPreset> {
    const [row] = await db.insert(scoreWeightPresets).values(data).returning();
    return row;
  }

  async updateScoreWeightPreset(id: string, updates: Partial<InsertScoreWeightPreset>): Promise<ScoreWeightPreset> {
    const [row] = await db.update(scoreWeightPresets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(scoreWeightPresets.id, id)).returning();
    return row;
  }

  async deleteScoreWeightPreset(id: string): Promise<void> {
    await db.delete(scoreWeightPresets).where(eq(scoreWeightPresets.id, id));
  }

  // Telegram workspace bot (Task #24)
  async getTelegramChatsForStartup(startupId: string): Promise<TelegramChat[]> {
    return await db.select().from(telegramChats)
      .where(eq(telegramChats.startupId, startupId))
      .orderBy(desc(telegramChats.addedAt));
  }

  async getTelegramChatByChatId(telegramChatId: string): Promise<TelegramChat | undefined> {
    const [row] = await db.select().from(telegramChats)
      .where(eq(telegramChats.telegramChatId, telegramChatId));
    return row;
  }

  async upsertTelegramChat(data: InsertTelegramChat): Promise<TelegramChat> {
    const existing = await this.getTelegramChatByChatId(data.telegramChatId);
    if (existing) {
      const [updated] = await db.update(telegramChats).set({
        startupId: data.startupId,
        title: data.title ?? existing.title,
        chatType: data.chatType ?? existing.chatType,
        isActive: data.isActive ?? true,
      }).where(eq(telegramChats.id, existing.id)).returning();
      return updated;
    }
    const [inserted] = await db.insert(telegramChats).values(data).returning();
    return inserted;
  }

  async setTelegramChatActive(telegramChatId: string, isActive: boolean): Promise<void> {
    await db.update(telegramChats).set({ isActive })
      .where(eq(telegramChats.telegramChatId, telegramChatId));
  }

  async setTelegramChatMemberCount(telegramChatId: string, memberCount: number): Promise<void> {
    await db.update(telegramChats).set({ lastMemberCount: memberCount })
      .where(eq(telegramChats.telegramChatId, telegramChatId));
  }

  async bumpTelegramChatStats(telegramChatId: string, day: string, telegramUserId: string | null): Promise<void> {
    const userArr = telegramUserId ? [telegramUserId] : [];
    await db.execute(sql`
      INSERT INTO telegram_chat_daily_stats (telegram_chat_id, day, message_count, active_members)
      VALUES (${telegramChatId}, ${day}, 1, ${userArr})
      ON CONFLICT (telegram_chat_id, day) DO UPDATE SET
        message_count = telegram_chat_daily_stats.message_count + 1,
        active_members = CASE
          WHEN ${telegramUserId}::text IS NULL THEN telegram_chat_daily_stats.active_members
          WHEN ${telegramUserId}::text = ANY(COALESCE(telegram_chat_daily_stats.active_members, ARRAY[]::text[]))
            THEN telegram_chat_daily_stats.active_members
          ELSE array_append(COALESCE(telegram_chat_daily_stats.active_members, ARRAY[]::text[]), ${telegramUserId})
        END
    `);
  }

  async getUndispatchedTelegramStats(beforeDay: string): Promise<TelegramChatDailyStat[]> {
    return await db.select().from(telegramChatDailyStats)
      .where(and(
        sql`${telegramChatDailyStats.day} < ${beforeDay}`,
        sql`${telegramChatDailyStats.dispatchedAt} IS NULL`,
      ));
  }

  async markTelegramStatsDispatched(id: string): Promise<void> {
    await db.update(telegramChatDailyStats)
      .set({ dispatchedAt: new Date() })
      .where(eq(telegramChatDailyStats.id, id));
  }

  async getTelegramFounderBinding(startupId: string, userId: string): Promise<TelegramFounderBinding | undefined> {
    const [row] = await db.select().from(telegramFounderBindings)
      .where(and(eq(telegramFounderBindings.startupId, startupId), eq(telegramFounderBindings.userId, userId)));
    return row;
  }

  async createTelegramFounderBinding(data: { startupId: string; userId: string; linkToken: string; language: string }): Promise<TelegramFounderBinding> {
    const [row] = await db.insert(telegramFounderBindings).values(data).returning();
    return row;
  }

  async getTelegramFounderBindingByToken(linkToken: string): Promise<TelegramFounderBinding | undefined> {
    const [row] = await db.select().from(telegramFounderBindings)
      .where(eq(telegramFounderBindings.linkToken, linkToken));
    return row;
  }

  async getTelegramFounderBindingsByTelegramUser(telegramUserId: string): Promise<TelegramFounderBinding[]> {
    return await db.select().from(telegramFounderBindings)
      .where(eq(telegramFounderBindings.telegramUserId, telegramUserId));
  }

  async bindTelegramFounder(id: string, telegramUserId: string, telegramUsername: string | null): Promise<void> {
    await db.update(telegramFounderBindings)
      .set({ telegramUserId, telegramUsername, boundAt: new Date() })
      .where(eq(telegramFounderBindings.id, id));
  }

  // --- Startup AI assistant + documents ---
  async createStartupAiChatMessage(data: InsertStartupAiChatMessage): Promise<StartupAiChatMessage> {
    const [row] = await db.insert(startupAiChatMessages).values(data).returning();
    return row;
  }
  async getStartupAiChatMessages(startupId: string, limit = 100): Promise<StartupAiChatMessage[]> {
    return await db.select().from(startupAiChatMessages)
      .where(eq(startupAiChatMessages.startupId, startupId))
      .orderBy(startupAiChatMessages.createdAt)
      .limit(limit);
  }
  async clearStartupAiChat(startupId: string): Promise<void> {
    await db.delete(startupAiChatMessages).where(eq(startupAiChatMessages.startupId, startupId));
  }
  async createStartupDocument(data: InsertStartupDocument): Promise<StartupDocument> {
    const [row] = await db.insert(startupDocuments).values(data).returning();
    return row;
  }
  async getStartupDocuments(startupId: string, opts?: { publicOnly?: boolean }): Promise<StartupDocument[]> {
    const where = opts?.publicOnly
      ? and(eq(startupDocuments.startupId, startupId), eq(startupDocuments.isPublic, true))
      : eq(startupDocuments.startupId, startupId);
    return await db.select().from(startupDocuments).where(where).orderBy(desc(startupDocuments.createdAt));
  }
  async getStartupDocument(id: string): Promise<StartupDocument | undefined> {
    const [row] = await db.select().from(startupDocuments).where(eq(startupDocuments.id, id));
    return row;
  }
  async updateStartupDocument(id: string, patch: Partial<InsertStartupDocument>): Promise<StartupDocument | undefined> {
    const [row] = await db.update(startupDocuments).set(patch).where(eq(startupDocuments.id, id)).returning();
    return row;
  }
  async deleteStartupDocument(id: string): Promise<boolean> {
    const rows = await db.delete(startupDocuments).where(eq(startupDocuments.id, id)).returning({ id: startupDocuments.id });
    return rows.length > 0;
  }
}

export const storage = new DatabaseStorage();
