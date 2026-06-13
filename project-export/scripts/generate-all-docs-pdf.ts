import PDFDocument from "pdfkit";
import fs from "fs";

const colors = {
  primary: "#0ea5e9",
  dark: "#0f172a",
  text: "#1e293b",
  secondary: "#475569",
  light: "#f1f5f9",
  accent: "#06b6d4",
  white: "#ffffff",
  divider: "#cbd5e1",
  codeBg: "#f8fafc",
  codeBorder: "#e2e8f0",
};

const contentWidth = 595.28 - 110;

class DocBuilder {
  doc: InstanceType<typeof PDFDocument>;
  pageNum = 1;
  title: string;

  constructor(outputPath: string, title: string, subtitle: string, tags: string, meta: { Title: string; Subject: string }) {
    this.title = title;
    this.doc = new PDFDocument({
      size: "A4",
      margins: { top: 60, bottom: 60, left: 55, right: 55 },
      info: { ...meta, Author: "Business Club \u2014 Financial University" },
    });
    const output = fs.createWriteStream(outputPath);
    this.doc.pipe(output);

    this.doc.rect(0, 0, this.doc.page.width, 150).fill(colors.dark);
    const grad = this.doc.linearGradient(0, 140, this.doc.page.width, 150);
    grad.stop(0, colors.primary).stop(1, colors.accent);
    this.doc.rect(0, 140, this.doc.page.width, 10).fill(grad);

    this.doc.fontSize(22).font("Helvetica-Bold").fillColor(colors.white).text(title.toUpperCase(), 55, 35);
    this.doc.fontSize(13).font("Helvetica").fillColor(colors.accent).text(subtitle.toUpperCase(), 55, 65);
    this.doc.fontSize(10).fillColor("#94a3b8").text("Business Club \u2014 Financial University Platform", 55, 90);
    this.doc.fontSize(8.5).fillColor("#64748b").text(tags, 55, 110, { width: contentWidth });
    this.doc.y = 170;
  }

  footer() {
    const s = this.doc.y;
    this.doc.fontSize(8).font("Helvetica").fillColor("#94a3b8")
      .text(`${this.title} \u2014 Technical Documentation  |  Page ${this.pageNum}`, 55, this.doc.page.height - 40, { align: "center", width: contentWidth });
    this.doc.y = s;
  }

  pageBreak(needed: number) {
    if (this.doc.y + needed > this.doc.page.height - 80) {
      this.footer();
      this.doc.addPage();
      this.pageNum++;
      this.doc.y = 50;
    }
  }

  section(t: string) {
    this.pageBreak(60);
    this.doc.moveDown(1.2);
    const y = this.doc.y;
    this.doc.rect(55, y, 4, 22).fill(colors.primary);
    this.doc.fontSize(15).font("Helvetica-Bold").fillColor(colors.dark).text(t.toUpperCase(), 68, y + 3);
    this.doc.moveDown(0.6);
    this.doc.moveTo(55, this.doc.y).lineTo(this.doc.page.width - 55, this.doc.y).strokeColor(colors.divider).lineWidth(0.5).stroke();
    this.doc.moveDown(0.5);
  }

  sub(t: string) {
    this.pageBreak(40);
    this.doc.moveDown(0.5);
    this.doc.fontSize(11.5).font("Helvetica-Bold").fillColor(colors.primary).text(t, 55);
    this.doc.moveDown(0.3);
  }

  p(t: string) {
    this.pageBreak(22);
    this.doc.fontSize(9.5).font("Helvetica").fillColor(colors.text).text(t, 55, undefined, { width: contentWidth, lineGap: 3 });
    this.doc.moveDown(0.3);
  }

  bold(t: string) {
    this.pageBreak(22);
    this.doc.fontSize(9.5).font("Helvetica-Bold").fillColor(colors.dark).text(t, 55, undefined, { width: contentWidth, lineGap: 3 });
    this.doc.moveDown(0.3);
  }

  bullet(t: string, indent = 0) {
    this.pageBreak(20);
    const x = 65 + indent;
    const ch = indent > 0 ? "\u2013" : "\u2022";
    this.doc.fontSize(9.5).font("Helvetica").fillColor(colors.secondary).text(ch, x, this.doc.y, { continued: true }).fillColor(colors.text).text(`  ${t}`, { width: this.doc.page.width - x - 65, lineGap: 2 });
    this.doc.moveDown(0.1);
  }

  boldBullet(label: string, desc: string, indent = 0) {
    this.pageBreak(20);
    const x = 65 + indent;
    const ch = indent > 0 ? "\u2013" : "\u2022";
    this.doc.fontSize(9.5).font("Helvetica").fillColor(colors.secondary).text(ch, x, this.doc.y, { continued: true })
      .font("Helvetica-Bold").fillColor(colors.dark).text(`  ${label}`, { continued: true })
      .font("Helvetica").fillColor(colors.text).text(` \u2014 ${desc}`, { width: this.doc.page.width - x - 65, lineGap: 2 });
    this.doc.moveDown(0.1);
  }

  label(l: string, v: string) {
    this.pageBreak(18);
    this.doc.fontSize(9).font("Helvetica-Bold").fillColor(colors.secondary).text(`${l}: `, 65, this.doc.y, { continued: true })
      .font("Helvetica").fillColor(colors.text).text(v, { width: contentWidth - 20 });
    this.doc.moveDown(0.1);
  }

  code(c: string, lang?: string) {
    const lines = c.split("\n");
    const lh = 11;
    const bh = lines.length * lh + 16;
    this.pageBreak(bh + 10);
    const y = this.doc.y;
    this.doc.roundedRect(55, y, contentWidth, bh, 4).fillAndStroke(colors.codeBg, colors.codeBorder);
    if (lang) {
      this.doc.fontSize(7).font("Helvetica-Bold").fillColor(colors.secondary).text(lang.toUpperCase(), contentWidth - 10, y + 4, { align: "right", width: 60 });
    }
    this.doc.fontSize(8.5).font("Courier").fillColor(colors.dark);
    let ty = y + 8;
    for (const line of lines) { this.doc.text(line, 65, ty, { width: contentWidth - 20 }); ty += lh; }
    this.doc.y = y + bh + 6;
  }

  table(headers: string[], rows: string[][], widths: number[]) {
    const rh = 18;
    this.pageBreak(rh * (rows.length + 1) + 5);
    const drawRow = (cells: string[], isH: boolean) => {
      this.pageBreak(rh + 2);
      const ry = this.doc.y;
      const tw = widths.reduce((a, b) => a + b, 0);
      this.doc.rect(55, ry, tw, rh).fill(isH ? colors.light : colors.white);
      this.doc.rect(55, ry, tw, rh).stroke(colors.divider);
      let x = 55;
      for (let i = 0; i < cells.length; i++) {
        this.doc.fontSize(8).font(isH ? "Helvetica-Bold" : "Helvetica").fillColor(isH ? colors.dark : colors.text)
          .text(cells[i], x + 4, ry + 5, { width: widths[i] - 8 });
        x += widths[i];
      }
      this.doc.y = ry + rh;
    };
    drawRow(headers, true);
    for (const r of rows) drawRow(r, false);
  }

  note(t: string) {
    this.pageBreak(40);
    const y = this.doc.y;
    this.doc.rect(55, y, contentWidth, 3).fill("#3b82f6");
    this.doc.rect(55, y, contentWidth, 40).fillAndStroke("#eff6ff", "#3b82f6");
    this.doc.fontSize(7).font("Helvetica-Bold").fillColor("#3b82f6").text("NOTE", 65, y + 8);
    this.doc.fontSize(9).font("Helvetica").fillColor(colors.text).text(t, 65, y + 20, { width: contentWidth - 20, lineGap: 2 });
    this.doc.y = y + 44;
  }

  finish() {
    this.doc.moveDown(2);
    this.doc.moveTo(55, this.doc.y).lineTo(this.doc.page.width - 55, this.doc.y).strokeColor(colors.divider).lineWidth(0.5).stroke();
    this.doc.moveDown(0.8);
    this.doc.fontSize(10).font("Helvetica-BoldOblique").fillColor(colors.primary)
      .text("Business Club \u2014 Where entrepreneurship meets technology.", 55, undefined, { align: "center", width: contentWidth });
    this.footer();
    this.doc.end();
  }
}

function buildEventManagement() {
  const d = new DocBuilder("docs/EVENT_MANAGEMENT_SYSTEM.pdf", "Event Management System", "Technical Documentation", "Event CRUD, draft/publish workflow, custom registration forms, attendance tracking, QR codes, AI chat registration, Excel export", { Title: "Event Management System \u2014 Technical Documentation", Subject: "Event lifecycle, registration forms, attendance" });

  d.p("The event management system handles the complete lifecycle of events \u2014 from creation as drafts through publication, registration, attendance tracking, and post-event reporting. It supports custom registration forms with dynamic fields, QR code-based check-in, AI-powered chat registration via GigaChat (Sber AI), and Excel export of registration data.");

  d.section("1. Event Data Model");
  d.sub("events Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key, auto-generated via gen_random_uuid()"],
    ["name", "TEXT", "Event title (required)"],
    ["date", "TEXT", "Event date string"],
    ["time", "TEXT", "Event time string"],
    ["location", "TEXT", "Venue / room"],
    ["duration", "TEXT", "Duration description"],
    ["description", "TEXT", "Rich text description"],
    ["customImage", "TEXT", "Image URL stored in object storage"],
    ["photos", "TEXT[]", "Array of photo URLs"],
    ["status", "VARCHAR(20)", "upcoming | completed | cancelled (default: upcoming)"],
    ["isFeatured", "BOOLEAN", "Highlighted on dashboard (default: false)"],
    ["registrationOpen", "BOOLEAN", "Whether registration is accepting (default: true)"],
    ["isDraft", "BOOLEAN", "Draft/published state (default: true)"],
    ["allowGuestChatRegistration", "BOOLEAN", "Allow unauthenticated AI chat registration"],
    ["createdAt", "TIMESTAMP", "Auto-set on creation"],
  ], [130, 110, contentWidth - 240]);

  d.sub("event_registrations Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key"],
    ["event_id", "VARCHAR", "FK \u2192 events.id (CASCADE)"],
    ["user_id", "VARCHAR", "FK \u2192 users.id (CASCADE, nullable for guests)"],
    ["guest_name", "TEXT", "Name for guest registrations"],
    ["guest_email", "TEXT", "Email for guest registrations"],
    ["attendance_marked", "BOOLEAN", "Check-in status (default: false)"],
    ["attendance_time", "TIMESTAMP", "When attendance was marked"],
    ["created_at", "TIMESTAMP", "Registration timestamp"],
  ], [130, 110, contentWidth - 240]);
  d.p("Unique constraint on (event_id, user_id) prevents duplicate registrations.");

  d.section("2. Draft / Publish Workflow");
  d.p("Events start as drafts (isDraft: true). Only admins and head admins see drafts. Regular users only see published events.");
  d.bold("State transitions:");
  d.bullet("POST /api/events \u2192 creates event with isDraft: true");
  d.bullet("POST /api/events/:id/publish \u2192 sets isDraft: false (custom questions are optional)");
  d.bullet("POST /api/events/:id/unpublish \u2192 sets isDraft: true (returns to draft)");
  d.bullet("GET /api/events \u2192 admins see all; non-admins see only published events");
  d.bullet("PATCH /api/events/:id \u2192 update any event fields");
  d.bullet("DELETE /api/events/:id \u2192 cascades to registrations and form data");
  d.note("Publishing no longer requires custom form questions. Admins can publish bare events and add questions later.");

  d.section("3. Custom Registration Forms");
  d.sub("Form Fields (event_form_fields Table)");
  d.p("Each event can have dynamic custom form fields that attendees fill out during registration.");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Field primary key"],
    ["event_id", "VARCHAR", "FK \u2192 events.id"],
    ["label", "TEXT", "Question text (Russian)"],
    ["labelEn", "TEXT", "Question text (English)"],
    ["type", "VARCHAR", "text | single_choice | multiple_choice | file"],
    ["required", "BOOLEAN", "Whether the field is mandatory"],
    ["options", "TEXT[]", "Choice options (for choice types)"],
    ["orderIndex", "INTEGER", "Display order"],
    ["description", "TEXT", "Help text / description"],
  ], [100, 110, contentWidth - 210]);

  d.sub("Form Field API");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/events/:eventId/form/fields", "Public", "List all form fields for an event"],
    ["POST", "/api/events/:eventId/form/fields", "Admin", "Create a new form field"],
    ["PATCH", "/api/events/:eventId/form/fields/:fieldId", "Admin", "Update a form field"],
    ["DELETE", "/api/events/:eventId/form/fields/:fieldId", "Admin", "Delete a form field"],
    ["PATCH", "/api/events/:eventId/form/reorder", "Admin", "Reorder fields via { fieldIds: [] }"],
  ], [55, 220, 55, contentWidth - 330]);

  d.sub("Form Responses (event_form_responses & event_form_answers)");
  d.p("When a user registers with form data, a form response record is created linking the registration to individual field answers.");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["POST", "/api/events/:eventId/register-with-form", "Authenticated", "Register + submit form answers"],
    ["GET", "/api/events/:eventId/form/responses", "Admin", "List all form responses"],
    ["GET", "/api/events/:eventId/form/responses/:id", "Admin", "Get single form response"],
  ], [55, 235, 80, contentWidth - 370]);
  d.p("The register-with-form endpoint validates required fields, checks registration status, prevents duplicates, handles file-type answers (with object storage URLs), and creates both the registration and form response atomically.");

  d.section("4. Registration API");
  d.sub("Standard Registration");
  d.label("Endpoint", "POST /api/events/:id/register");
  d.label("Auth", "isAuthenticated");
  d.label("Behavior", "Idempotent \u2014 returns existing registration if already registered (200), or creates new (201)");
  d.label("Validation", "Checks registrationOpen === true, otherwise returns 400");

  d.sub("AI Chat Registration (GigaChat)");
  d.p("When allowGuestChatRegistration is enabled on an event, unauthenticated users can register through an AI-powered chat conversation. The system uses GigaChat (Sber's Russian AI) via the gigachat-node SDK.");
  d.label("Start Chat", "POST /api/chat/event/:eventId/start");
  d.label("Send Message", "POST /api/chat/:sessionId/message");
  d.label("Complete", "POST /api/chat/:sessionId/complete-registration");
  d.label("Upload File", "POST /api/chat/:sessionId/upload");
  d.p("GigaChat uses event-specific prompts (getEventRegistrationPrompt) that include the event name, description, and all form fields with their types/options. The AI asks questions one at a time in a conversational manner. The extractRegistrationData function uses GigaChat to parse the conversation history into structured JSON matching the form field labels. Files uploaded during chat are stored in object storage and linked to form answers.");
  d.label("GigaChat Model", "GigaChat:latest");
  d.label("Token Auth", "GIGACHAT_API_KEY env var, 25-minute token auto-refresh");

  d.section("5. Event Image & Photo Management");
  d.sub("Custom Event Image");
  d.label("Upload", "POST /api/upload/image (multipart/form-data, field: image)");
  d.label("Storage", "S3-compatible object storage (Google Cloud Storage backend)");
  d.label("Path", "public/ directory in the default bucket");
  d.label("Access", "GET /objects/:objectPath(*) serves files from object storage");
  d.p("The customImage field stores the object storage path. Multiple event photos can be stored in the photos TEXT[] array.");

  d.section("6. Attendance Tracking");
  d.sub("QR Code Check-In");
  d.p("See QR_ATTENDANCE_SYSTEM.pdf for complete technical documentation of the QR scanning system.");
  d.bullet("JWT tokens embedded in QR codes with {registrationId, eventId}");
  d.bullet("4-hour token expiry with HS256 signing");
  d.bullet("POST /api/registrations/mark-attendance \u2014 admin-only scanner endpoint");
  d.bullet("Idempotent \u2014 duplicate scans return alreadyMarked: true");

  d.sub("Manual Attendance Toggle");
  d.label("Endpoint", "PATCH /api/events/:eventId/registrations/:registrationId/attendance");
  d.label("Auth", "isAuthenticated + isAdmin");
  d.label("Body", '{ "attendanceMarked": true | false }');

  d.section("7. Reporting & Export");
  d.sub("Excel Export");
  d.label("Per-Event", "GET /api/events/:id/registrations/export");
  d.label("All Events", "GET /api/admin/registrations/export");
  d.label("Reports", "GET /api/admin/reports/export");
  d.p("Excel files are generated server-side using the exceljs package. Columns include registration ID, user email, first/last name, patronymic, organization type/name, faculty, attendance status, and timestamps.");

  d.sub("Statistics");
  d.label("Endpoint", "GET /api/admin/reports/statistics");
  d.p("Returns aggregate counts: total registrations, unique users, FU students vs external, attendance rates, per-event breakdowns.");

  d.sub("Email Notifications");
  d.label("Per-Event", "POST /api/events/:id/registrations/send-email");
  d.label("All Registrants", "POST /api/admin/registrations/send-email");
  d.label("All Users", "POST /api/admin/users/send-email");
  d.p("Emails are sent via SendGrid (direct API key). The admin provides subject + HTML body. Emails are sent individually with 100ms delay between each to respect rate limits.");

  d.section("8. Authorization Matrix");
  d.table(["Action", "Member", "Admin", "Head Admin"], [
    ["View published events", "Yes", "Yes", "Yes"],
    ["View draft events", "No", "Yes", "Yes"],
    ["Create / edit / delete events", "No", "Yes", "Yes"],
    ["Publish / unpublish events", "No", "Yes", "Yes"],
    ["Register for events", "Yes", "Yes", "Yes"],
    ["Manage form fields", "No", "Yes", "Yes"],
    ["View form responses", "No", "Yes", "Yes"],
    ["Mark attendance (QR scan)", "No", "Yes", "Yes"],
    ["Export registrations", "No", "Yes", "Yes"],
    ["Send emails to registrants", "No", "Yes", "Yes"],
  ], [180, 60, 60, 75]);

  d.finish();
  console.log("Generated: docs/EVENT_MANAGEMENT_SYSTEM.pdf");
}

function buildLMS() {
  const d = new DocBuilder("docs/LEARNING_MANAGEMENT_SYSTEM.pdf", "Learning Management System", "Technical Documentation", "Courses, modules, lessons, quizzes, assignments, grading, rubrics, gradebook, enrollment, progress tracking", { Title: "Learning Management System \u2014 Technical Documentation", Subject: "LMS courses, assessment, and grading" });

  d.p("The Learning Management System (LMS) provides comprehensive course delivery with hierarchical content organization (courses \u2192 modules \u2192 lessons), two assessment types (quizzes and assignments), progress tracking, a gradebook with weighted categories, rubric-based grading, discussion forums, and announcements.");

  d.section("1. Data Architecture");
  d.sub("Course Hierarchy");
  d.p("Course \u2192 Module \u2192 Lesson (content delivery) and Course \u2192 Task (assessment). Tasks can be type quiz (auto-graded) or assignment (file submission, manually graded).");

  d.sub("courses Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key via gen_random_uuid()"],
    ["title", "TEXT", "Course title"],
    ["description", "TEXT", "Course description"],
    ["modules", "INTEGER", "Expected module count"],
    ["duration", "TEXT", "Duration description"],
    ["visibility", "VARCHAR(20)", "draft | published (default: draft)"],
    ["thumbnailUrl", "TEXT", "Course thumbnail image"],
    ["instructorId", "VARCHAR", "FK \u2192 users.id"],
    ["category", "TEXT", "Course category"],
    ["level", "VARCHAR(20)", "beginner | intermediate | advanced"],
    ["enrollmentType", "VARCHAR(20)", "self | approval"],
    ["maxStudents", "INTEGER", "Maximum enrollment cap"],
    ["startDate", "TIMESTAMP", "Course start date"],
    ["endDate", "TIMESTAMP", "Course end date"],
  ], [110, 110, contentWidth - 220]);

  d.sub("course_modules Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key"],
    ["courseId", "VARCHAR", "FK \u2192 courses.id"],
    ["title", "TEXT", "Module title"],
    ["description", "TEXT", "Module description"],
    ["orderIndex", "INTEGER", "Display order within course"],
  ], [110, 110, contentWidth - 220]);

  d.sub("course_lessons Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key"],
    ["courseId", "VARCHAR", "FK \u2192 courses.id"],
    ["moduleId", "VARCHAR", "FK \u2192 course_modules.id"],
    ["title", "TEXT", "Lesson title"],
    ["content", "TEXT", "Rich text lesson content"],
    ["videoUrl", "TEXT", "Lesson video URL"],
    ["lessonType", "VARCHAR", "text | video"],
    ["orderIndex", "INTEGER", "Display order within module"],
    ["duration", "TEXT", "Estimated lesson duration"],
  ], [110, 110, contentWidth - 220]);

  d.section("2. Course API");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/courses", "Public*", "List courses (*admins see all, users see published)"],
    ["GET", "/api/courses/published", "Public", "Published courses only"],
    ["GET", "/api/courses/:id", "Public", "Single course details"],
    ["POST", "/api/courses", "Admin", "Create a course"],
    ["PATCH", "/api/courses/:id", "Admin", "Update a course"],
    ["DELETE", "/api/courses/:id", "Admin", "Delete a course (cascades)"],
  ], [50, 175, 55, contentWidth - 280]);

  d.sub("Module Management");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/courses/:id/modules", "Public", "List modules for a course"],
    ["POST", "/api/courses/:id/modules", "Admin", "Create a module"],
    ["PATCH", "/api/modules/:id", "Admin", "Update a module"],
    ["DELETE", "/api/modules/:id", "Admin", "Delete a module"],
  ], [50, 175, 55, contentWidth - 280]);

  d.sub("Lesson Management");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/courses/:id/lessons", "Public", "List lessons for a course"],
    ["POST", "/api/courses/:id/lessons", "Admin", "Create a lesson"],
    ["PATCH", "/api/lessons/:id", "Admin", "Update a lesson"],
    ["DELETE", "/api/lessons/:id", "Admin", "Delete a lesson"],
    ["POST", "/api/courses/:id/lessons/reorder", "Admin", "Reorder lessons"],
    ["POST", "/api/lessons/:id/upload-video", "Admin", "Upload lesson video to object storage"],
  ], [50, 200, 55, contentWidth - 305]);

  d.section("3. Assessment System");
  d.sub("course_tasks Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key"],
    ["courseId", "VARCHAR", "FK \u2192 courses.id"],
    ["moduleId", "VARCHAR", "FK \u2192 course_modules.id"],
    ["title", "TEXT", "Task title"],
    ["description", "TEXT", "Instructions"],
    ["type", "VARCHAR", "quiz | assignment"],
    ["maxScore", "INTEGER", "Maximum achievable score"],
    ["dueDate", "TIMESTAMP", "Submission deadline"],
    ["timeLimit", "INTEGER", "Time limit in minutes (quizzes)"],
    ["maxAttempts", "INTEGER", "Max attempts allowed (quizzes)"],
    ["orderIndex", "INTEGER", "Display order"],
  ], [100, 110, contentWidth - 210]);

  d.sub("quiz_questions Table");
  d.p("Each quiz task has ordered questions:");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key"],
    ["taskId", "VARCHAR", "FK \u2192 course_tasks.id"],
    ["questionText", "TEXT", "The question"],
    ["type", "VARCHAR", "multiple_choice | true_false | short_answer"],
    ["options", "TEXT[]", "Answer options (for choice types)"],
    ["correctAnswer", "TEXT", "Expected answer"],
    ["points", "INTEGER", "Points for correct answer"],
    ["orderIndex", "INTEGER", "Question order"],
  ], [110, 110, contentWidth - 220]);

  d.sub("Quiz Flow");
  d.bold("1. Start Quiz:");
  d.label("Endpoint", "POST /api/tasks/:id/start-quiz");
  d.p("Creates a quiz_attempts record with status active and startedAt timestamp. Checks maxAttempts and enrollment.");
  d.bold("2. Submit Quiz:");
  d.label("Endpoint", "POST /api/attempts/:id/submit");
  d.p("Receives answers as JSON string. Auto-grades objective questions (multiple_choice, true_false) by comparing to correctAnswer. Short-answer questions require manual grading. Sets status to completed with score and maxScore.");
  d.bold("3. View Results:");
  d.label("Endpoint", "GET /api/tasks/:id/latest-attempt");
  d.p("Returns the most recent attempt with score, answers, and grading details.");

  d.sub("Assignment Submissions (course_submissions Table)");
  d.label("Submit", "POST /api/tasks/:id/submit (multipart/form-data, field: file)");
  d.label("View", "GET /api/submissions/:id");
  d.label("Grade", "POST /api/submissions/:id/grade (body: { score, feedback, status })");
  d.label("List", "GET /api/tasks/:id/submissions (admin only)");
  d.label("My Submissions", "GET /api/my-submissions");

  d.section("4. Progress Tracking");
  d.sub("Lesson Progress (course_lesson_progress Table)");
  d.label("Get", "GET /api/lessons/:id/progress");
  d.label("Update", "POST /api/lessons/:id/progress");
  d.label("Complete", "POST /api/lessons/:id/complete");
  d.p("Lesson completion also triggers recalculation of overall course progress percentage.");

  d.sub("Course Progress (course_progress Table)");
  d.label("Get", "GET /api/courses/:id/my-progress");
  d.label("Update", "POST /api/courses/:id/progress");
  d.p("Stores completedLessons count and progressPercentage (0-100). Completing a lesson automatically increments completedLessons and recalculates the percentage based on total lessons in the course.");

  d.section("5. Gradebook System");
  d.sub("Grade Categories (grade_categories Table)");
  d.p("Courses can define weighted grading categories (e.g., Homework 30%, Quizzes 40%, Final 30%).");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/courses/:id/grade-categories", "Auth", "List grade categories"],
    ["POST", "/api/courses/:id/grade-categories", "Teacher/Admin", "Create category"],
    ["PATCH", "/api/grade-categories/:id", "Teacher/Admin", "Update category"],
    ["DELETE", "/api/grade-categories/:id", "Teacher/Admin", "Delete category"],
  ], [55, 220, 80, contentWidth - 355]);

  d.sub("Rubrics (rubrics, rubric_criteria, rubric_criteria_levels Tables)");
  d.p("Rubrics define multi-criteria grading with performance levels and point values. Each rubric has criteria, each criterion has levels (e.g., Excellent: 10pts, Good: 7pts, Needs Improvement: 3pts).");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/courses/:courseId/rubrics", "Auth", "List course rubrics"],
    ["POST", "/api/courses/:courseId/rubrics", "Teacher/Admin", "Create rubric with criteria + levels"],
    ["DELETE", "/api/rubrics/:id", "Teacher/Admin", "Delete rubric"],
    ["POST", "/api/submissions/:id/rubric-scores", "Teacher/Admin", "Score submission with rubric"],
  ], [55, 225, 80, contentWidth - 360]);

  d.sub("Gradebook API");
  d.label("All Grades", "GET /api/courses/:courseId/gradebook (teacher/admin)");
  d.label("My Grades", "GET /api/courses/:courseId/my-grades (student)");
  d.label("Export", "GET /api/courses/:courseId/gradebook/export (CSV)");
  d.p("The gradebook aggregates grades from all tasks in a course, organized by grade categories. It computes weighted averages based on category weights.");

  d.section("6. Enrollment");
  d.label("Enroll", "POST /api/courses/:id/enroll");
  d.label("Check", "GET /api/courses/:id/enrollment-status");
  d.p("The enrollmentType field controls whether enrollment is self-service or requires approval. maxStudents caps enrollment count. Enrolled students gain access to lessons, tasks, forums, and gradebook.");

  d.section("7. Discussion Forums");
  d.sub("Forum Structure (discussion_forums, discussion_threads, discussion_replies Tables)");
  d.p("Each course has one auto-created discussion forum. Forums contain threads, threads contain replies (including nested replies via parentReplyId).");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/courses/:courseId/forum", "Enrolled/Staff", "Get or auto-create forum"],
    ["GET", "/api/forums/:forumId/threads", "Enrolled/Staff", "List threads"],
    ["POST", "/api/forums/:forumId/threads", "Enrolled/Staff", "Create thread"],
    ["GET", "/api/threads/:threadId", "Enrolled/Staff", "Get thread with replies"],
    ["POST", "/api/threads/:threadId/replies", "Enrolled/Staff", "Post reply"],
    ["PATCH", "/api/threads/:threadId/pin", "Teacher/Admin", "Pin/unpin thread"],
    ["PATCH", "/api/threads/:threadId/lock", "Teacher/Admin", "Lock/unlock thread"],
  ], [50, 205, 85, contentWidth - 340]);

  d.section("8. Announcements (announcements Table)");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/announcements", "Auth", "List (filter by type/courseId)"],
    ["GET", "/api/announcements/:id", "Auth", "Get single announcement"],
    ["POST", "/api/announcements", "Teacher/Admin", "Create announcement"],
    ["PATCH", "/api/announcements/:id", "Teacher/Admin", "Update announcement"],
    ["DELETE", "/api/announcements/:id", "Teacher/Admin", "Delete announcement"],
  ], [50, 175, 85, contentWidth - 310]);
  d.p("Announcements can be platform-wide (type: platform) or course-specific (type: course, with courseId). They include title, content, type, priority, and optional pinned status.");

  d.section("9. Authorization Matrix");
  d.table(["Action", "Student", "Teacher", "Admin", "Head Admin"], [
    ["View published courses", "Yes", "Yes", "Yes", "Yes"],
    ["Enroll in courses", "Yes", "Yes", "Yes", "Yes"],
    ["Access lessons/tasks", "Enrolled", "Yes", "Yes", "Yes"],
    ["Submit assignments/quizzes", "Enrolled", "Yes", "Yes", "Yes"],
    ["Create/edit courses", "No", "No", "Yes", "Yes"],
    ["Create/edit tasks", "No", "Yes", "Yes", "Yes"],
    ["Grade submissions", "No", "Yes", "Yes", "Yes"],
    ["Manage gradebook", "No", "Yes", "Yes", "Yes"],
    ["Create announcements", "No", "Yes", "Yes", "Yes"],
    ["Manage forums", "No", "Yes", "Yes", "Yes"],
  ], [140, 55, 55, 55, 70]);

  d.finish();
  console.log("Generated: docs/LEARNING_MANAGEMENT_SYSTEM.pdf");
}

function buildVideoLivestream() {
  const d = new DocBuilder("docs/VIDEO_LIVESTREAM_SYSTEM.pdf", "Video & Livestream System", "Technical Documentation", "Video library, video comments, RuTube integration, livestream management, file uploads", { Title: "Video & Livestream System \u2014 Technical Documentation", Subject: "Video library and livestream hosting" });

  d.p("The video and livestream system provides a media library for hosting educational and event content. Videos are stored with metadata and support user comments. Livestreams integrate with RuTube for real-time broadcasting with scheduling support.");

  d.section("1. Video Library");
  d.sub("videos Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key via gen_random_uuid()"],
    ["title", "TEXT", "Video title (required)"],
    ["url", "TEXT", "Video URL (RuTube embed or object storage)"],
    ["thumbnailUrl", "TEXT", "Thumbnail image URL"],
    ["uploadedBy", "VARCHAR", "FK \u2192 users.id (uploader)"],
    ["createdAt", "TIMESTAMP", "Upload timestamp"],
  ], [110, 110, contentWidth - 220]);

  d.sub("Video API");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/videos", "Public", "List all videos (newest first)"],
    ["GET", "/api/videos/:id", "Public", "Get single video details"],
    ["POST", "/api/videos", "Admin", "Create video entry"],
    ["DELETE", "/api/videos/:id", "Admin", "Delete video"],
    ["POST", "/api/videos/files", "Admin", "Update/sync video files from storage"],
  ], [50, 165, 55, contentWidth - 270]);

  d.sub("video_comments Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key"],
    ["videoId", "VARCHAR", "FK \u2192 videos.id (CASCADE)"],
    ["userId", "VARCHAR", "FK \u2192 users.id (CASCADE)"],
    ["content", "TEXT", "Comment text"],
    ["createdAt", "TIMESTAMP", "Comment timestamp"],
  ], [110, 110, contentWidth - 220]);

  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/videos/:id/comments", "Auth", "List video comments"],
    ["POST", "/api/videos/:id/comments", "Auth", "Post a comment"],
  ], [50, 185, 55, contentWidth - 290]);

  d.section("2. Livestream System");
  d.sub("livestreams Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key via gen_random_uuid()"],
    ["title", "TEXT", "Livestream title (required)"],
    ["rutubeUrl", "TEXT", "RuTube embed URL (required)"],
    ["isLive", "BOOLEAN", "Currently broadcasting (default: false)"],
    ["status", "VARCHAR(20)", "upcoming | live | ended (default: upcoming)"],
    ["scheduledDate", "TEXT", "Scheduled date"],
    ["scheduledTime", "TEXT", "Scheduled time"],
    ["createdAt", "TIMESTAMP", "Creation timestamp"],
  ], [110, 110, contentWidth - 220]);

  d.sub("Livestream API");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/livestreams", "Public", "List all livestreams"],
    ["GET", "/api/livestreams/active", "Public", "List only currently live streams"],
    ["POST", "/api/livestreams", "Admin", "Create a livestream"],
    ["PATCH", "/api/livestreams/:id", "Admin", "Update livestream (toggle live, etc.)"],
    ["DELETE", "/api/livestreams/:id", "Admin", "Delete a livestream"],
  ], [50, 185, 55, contentWidth - 290]);

  d.sub("RuTube Integration");
  d.p("Livestreams use RuTube as the video platform. The rutubeUrl field stores the RuTube embed URL. The frontend renders livestreams using an iframe pointed at the RuTube player. Admins manually toggle the isLive flag and status field when a stream starts/ends.");
  d.note("There is no automated RuTube API integration for live status detection. The isLive toggle is manual.");

  d.section("3. File Upload & Storage");
  d.sub("Image Uploads");
  d.label("Endpoint", "POST /api/upload/image");
  d.label("Field", "image (multipart/form-data)");
  d.label("Storage", "S3-compatible object storage \u2192 public/ directory");
  d.label("Returns", "{ url: '/objects/public/...' }");

  d.sub("Multiple Image Upload");
  d.label("Endpoint", "POST /api/upload/images");
  d.label("Field", "images (multipart/form-data, multiple files)");

  d.sub("Lesson Video Upload");
  d.label("Endpoint", "POST /api/lessons/:id/upload-video");
  d.label("Field", "video (multipart/form-data)");
  d.label("Storage", "Object storage, path returned in response");
  d.p("Uploaded lesson videos are stored in object storage and the videoUrl field on the lesson is updated automatically.");

  d.sub("Object Storage Architecture");
  d.bullet("Backend: Google Cloud Storage via the platform's @google-cloud/storage SDK");
  d.bullet("Bucket: repl-default-bucket-{APP_ID}");
  d.bullet("Public directory: public/ (for images, thumbnails)");
  d.bullet("Private directory: .private/ (for resumes, sensitive files)");
  d.bullet("Serving: GET /objects/:objectPath(*) proxies files from object storage");

  d.section("4. Authorization Matrix");
  d.table(["Action", "Member", "Admin", "Head Admin"], [
    ["View videos", "Yes", "Yes", "Yes"],
    ["Post video comments", "Yes", "Yes", "Yes"],
    ["Create/delete videos", "No", "Yes", "Yes"],
    ["View livestreams", "Yes", "Yes", "Yes"],
    ["Create/manage livestreams", "No", "Yes", "Yes"],
    ["Upload files", "No", "Yes", "Yes"],
  ], [180, 60, 60, 75]);

  d.finish();
  console.log("Generated: docs/VIDEO_LIVESTREAM_SYSTEM.pdf");
}

function buildAIChallenges() {
  const d = new DocBuilder("docs/AI_CHALLENGE_SYSTEM.pdf", "AI Challenge & Debate System", "Technical Documentation", "GigaChat (Sber AI), AI debates, scoring, seasonal points, FIS rankings, leaderboards, challenge CRUD, DALL-E thumbnails", { Title: "AI Challenge & Debate System \u2014 Technical Documentation", Subject: "AI-powered debate challenges and scoring" });

  d.p("The AI Challenge system provides competitive debate experiences powered by GigaChat (Sber's Russian AI) via the gigachat-node SDK. Users argue for or against a topic across multiple rounds, and the AI serves as both debate opponent and judge. A FIS-style point system ranks participants across challenges and seasons. Challenge thumbnails can be AI-generated using DALL-E 3 via OpenAI.");

  d.section("1. Data Model");
  d.sub("challenges Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key via gen_random_uuid()"],
    ["title", "TEXT", "Challenge title"],
    ["description", "TEXT", "Challenge description"],
    ["topic", "TEXT", "Debate topic"],
    ["difficulty", "VARCHAR", "easy | medium | hard"],
    ["maxRounds", "INTEGER", "Maximum debate rounds"],
    ["responseTimeLimit", "INTEGER", "Time limit per response (seconds)"],
    ["status", "VARCHAR", "draft | active | completed"],
    ["thumbnailUrl", "TEXT", "AI-generated (DALL-E 3) or custom thumbnail"],
    ["createdBy", "VARCHAR", "FK \u2192 users.id"],
    ["startDate", "TIMESTAMP", "Challenge start date"],
    ["endDate", "TIMESTAMP", "Challenge end date"],
    ["createdAt", "TIMESTAMP", "Creation timestamp"],
  ], [120, 100, contentWidth - 220]);

  d.sub("challenge_attempts Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key"],
    ["challengeId", "VARCHAR", "FK \u2192 challenges.id"],
    ["userId", "VARCHAR", "FK \u2192 users.id"],
    ["status", "VARCHAR", "active | completed | abandoned"],
    ["userPosition", "VARCHAR", "for | against (user's stance)"],
    ["currentRound", "INTEGER", "Current round number"],
    ["score", "INTEGER", "Final score (0-100, set on completion)"],
    ["feedback", "TEXT", "GigaChat-generated feedback on performance"],
    ["startedAt", "TIMESTAMP", "Attempt start time"],
    ["completedAt", "TIMESTAMP", "Attempt completion time"],
  ], [110, 100, contentWidth - 210]);

  d.sub("challenge_messages Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key"],
    ["attemptId", "VARCHAR", "FK \u2192 challenge_attempts.id"],
    ["role", "VARCHAR", "user | assistant"],
    ["content", "TEXT", "Message content"],
    ["round", "INTEGER", "Debate round number"],
    ["createdAt", "TIMESTAMP", "Message timestamp"],
  ], [110, 100, contentWidth - 210]);

  d.section("2. Challenge CRUD API");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/challenges", "Auth", "List challenges (admins: all, users: active only)"],
    ["GET", "/api/challenges/:id", "Auth", "Get single challenge details"],
    ["POST", "/api/challenges", "Head Admin", "Create a challenge"],
    ["PATCH", "/api/challenges/:id", "Head Admin", "Update a challenge"],
    ["DELETE", "/api/challenges/:id", "Head Admin", "Delete a challenge"],
    ["POST", "/api/challenges/:id/thumbnail", "Head Admin", "Upload/generate AI thumbnail (DALL-E 3)"],
  ], [50, 200, 70, contentWidth - 320]);

  d.section("3. Debate Flow");
  d.sub("Step 1: Start Attempt");
  d.label("Endpoint", "POST /api/challenges/:id/start");
  d.label("Body", '{ "position": "for" | "against" }');
  d.p("Creates a challenge_attempt with status active and currentRound 1. GigaChat generates an opening statement using a debate system prompt in Russian. The AI is instructed to take the opposite position from the user.");

  d.sub("Step 2: Send Message");
  d.label("Endpoint", "POST /api/challenges/:challengeId/attempts/:attemptId/message");
  d.label("Body", '{ "content": "user argument text" }');
  d.p("The user's message is stored as a challenge_message. The full conversation history (including system prompt) is sent to GigaChat via sendChatMessage(). The AI responds with a counter-argument. The round counter increments after each exchange.");

  d.sub("Step 3: Complete Debate");
  d.label("Endpoint", "POST /api/challenges/:challengeId/attempts/:attemptId/complete");
  d.p("Triggered when maxRounds is reached or user ends early. The scoreDebate function evaluates the user's performance using GigaChat.");

  d.sub("AI System Prompt (getDebateSystemPrompt)");
  d.p("Defined inline in server/routes.ts, the debate system prompt (in Russian) instructs GigaChat to:");
  d.bullet("Take the opposite position from the user");
  d.bullet("Use logic, facts, and examples in counter-arguments");
  d.bullet("Be professional and respectful");
  d.bullet("Respond in 2-3 paragraphs per round");
  d.bullet("On the final round, provide a closing statement");

  d.section("4. Scoring System");
  d.sub("GigaChat-Based Scoring (scoreDebate)");
  d.p("The scoreDebate function (defined inline in server/routes.ts) sends all user messages to GigaChat with a scoring prompt that evaluates:");
  d.bullet("Logic and argumentation quality (0-25 points)");
  d.bullet("Use of facts and examples (0-25 points)");
  d.bullet("Persuasiveness (0-25 points)");
  d.bullet("Response to counter-arguments (0-25 points)");
  d.p("Total score: 0-100. GigaChat also provides text feedback. The response must be valid JSON: { \"score\": N, \"feedback\": \"...\" }.");

  d.sub("Fallback Scoring");
  d.p("If GigaChat scoring fails (API error, invalid JSON), a heuristic fallback assigns score based on:");
  d.bullet("Number of messages sent (more = higher base score)");
  d.bullet("Average message length (longer arguments = higher score)");
  d.bullet("Whether the debate was completed (bonus for finishing)");

  d.section("5. FIS Point System & Leaderboards");
  d.sub("Seasonal Points (FIS World Cup Model)");
  d.p("After a challenge ends, the calculateAndAwardFISPoints function (in server/storage.ts) ranks all completed attempts by score descending and awards points to the top 30 participants using the FIS World Cup distribution:");
  d.code("1st: 100, 2nd: 80, 3rd: 60, 4th: 50, 5th: 45,\n6th: 40, 7th: 36, 8th: 32, 9th: 29, 10th: 26,\n11th-15th: 24, 22, 20, 18, 16,\n16th-20th: 15, 14, 13, 12, 11,\n21st-25th: 10, 9, 8, 7, 6,\n26th-30th: 5, 4, 3, 2, 1");
  d.p("Stored in seasonal_points table. Points are recalculated from scratch each time (existing points for the challenge are deleted, then re-awarded).");

  d.sub("Leaderboard API");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/challenges/:id/leaderboard", "Auth", "Challenge-specific top scores"],
    ["GET", "/api/challenges/leaderboard/global", "Auth", "All-time global leaderboard"],
    ["GET", "/api/leaderboard/seasonal", "Auth", "Seasonal FIS point standings"],
  ], [50, 230, 50, contentWidth - 330]);

  d.section("6. AI Integration Architecture");
  d.sub("GigaChat (Sber AI) \u2014 Primary AI Provider");
  d.label("Source File", "server/gigachat.ts");
  d.label("SDK", "gigachat-node");
  d.label("API Key Env", "GIGACHAT_API_KEY");
  d.label("Default Model", "GigaChat:latest");
  d.label("Token Refresh", "Auto-refresh every 25 minutes via createToken()");
  d.label("Temperature", "0.7 for debates, 0.8 for opening statements, 0.1 for data extraction/scoring");
  d.label("Max Tokens", "1024 default, 400-500 for debate responses");
  d.p("Used for: debate conversations, debate scoring, event chat registration, onboarding chatbot, and structured data extraction from conversations.");

  d.sub("OpenAI \u2014 Secondary AI Provider (Thumbnails Only)");
  d.label("Source File", "server/ai-chat.ts");
  d.label("SDK", "openai");
  d.label("API Key Env", "AI_INTEGRATIONS_OPENAI_API_KEY");
  d.label("Base URL Env", "AI_INTEGRATIONS_OPENAI_BASE_URL");
  d.label("Model", "DALL-E 3 (image generation only)");
  d.p("Used exclusively for generateChallengeThumbnail() which creates challenge thumbnail images via DALL-E 3 (1792x1024). Not used for debates or chat.");

  d.sub("Key Functions");
  d.table(["Function", "Source File", "Purpose"], [
    ["sendChatMessage()", "gigachat.ts", "Core GigaChat API call for all conversations"],
    ["streamChatMessage()", "gigachat.ts", "Streaming GigaChat responses"],
    ["getDebateSystemPrompt()", "routes.ts (inline)", "Generates debate system prompt with topic/position"],
    ["scoreDebate()", "routes.ts (inline)", "Evaluates arguments via GigaChat, returns score + feedback"],
    ["generateChallengeThumbnail()", "ai-chat.ts", "DALL-E 3 thumbnail generation (OpenAI)"],
    ["getEventRegistrationPrompt()", "gigachat.ts", "Event-specific AI chat registration prompt"],
    ["extractRegistrationData()", "gigachat.ts", "Parses chat history into structured form data"],
    ["getOnboardingPrompt()", "gigachat.ts", "Platform onboarding chatbot prompt"],
  ], [165, 90, contentWidth - 255]);

  d.section("7. Authorization Matrix");
  d.table(["Action", "Member", "Admin", "Head Admin"], [
    ["View active challenges", "Yes", "Yes", "Yes"],
    ["Start debate attempt", "Yes", "Yes", "Yes"],
    ["View leaderboards", "Yes", "Yes", "Yes"],
    ["Create/edit/delete challenges", "No", "No", "Yes"],
    ["View all challenges (incl. drafts)", "No", "Yes", "Yes"],
  ], [180, 60, 60, 75]);

  d.finish();
  console.log("Generated: docs/AI_CHALLENGE_SYSTEM.pdf");
}

function buildCareerPortal() {
  const d = new DocBuilder("docs/CAREER_PORTAL.pdf", "Career Portal", "Technical Documentation", "Job openings, applications, candidate accounts, status tracking, messaging, resume uploads, rich text descriptions", { Title: "Career Portal \u2014 Technical Documentation", Subject: "Job postings, applications, and candidate management" });

  d.p("The Career Portal provides a job board inspired by tbank.ru/career/. It supports public job browsing, application submission with resume uploads, automatic candidate account creation, application status tracking, and two-way messaging between candidates and recruiters (head admins). Only head admins can manage job openings and review applications.");

  d.section("1. Data Model");
  d.sub("job_openings Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key via gen_random_uuid()"],
    ["title", "TEXT", "Job title"],
    ["description", "TEXT", "Rich HTML job description (Quill editor)"],
    ["department", "TEXT", "Department/team"],
    ["location", "TEXT", "Work location"],
    ["employmentType", "VARCHAR", "full-time | part-time | internship | contract"],
    ["experienceLevel", "VARCHAR", "entry | mid | senior"],
    ["salary", "TEXT", "Salary range (optional)"],
    ["requirements", "TEXT", "Job requirements"],
    ["benefits", "TEXT", "Benefits description"],
    ["status", "VARCHAR", "draft | open | closed (default: draft)"],
    ["createdBy", "VARCHAR", "FK \u2192 users.id (head admin)"],
    ["createdAt", "TIMESTAMP", "Creation timestamp"],
  ], [120, 110, contentWidth - 230]);

  d.sub("job_applications Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key via gen_random_uuid()"],
    ["openingId", "VARCHAR", "FK \u2192 job_openings.id"],
    ["candidateId", "VARCHAR", "FK \u2192 users.id (auto-created or existing)"],
    ["firstName", "TEXT", "Applicant first name"],
    ["lastName", "TEXT", "Applicant last name"],
    ["email", "TEXT", "Applicant email"],
    ["phone", "TEXT", "Phone number"],
    ["coverLetter", "TEXT", "Cover letter text"],
    ["resumeUrl", "TEXT", "PDF resume in private object storage"],
    ["status", "VARCHAR", "new | reviewing | interview | offered | rejected | hired"],
    ["createdAt", "TIMESTAMP", "Application timestamp"],
  ], [110, 110, contentWidth - 220]);

  d.sub("job_application_messages Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key"],
    ["applicationId", "VARCHAR", "FK \u2192 job_applications.id"],
    ["senderType", "VARCHAR", "admin | candidate"],
    ["senderId", "VARCHAR", "User ID of sender"],
    ["content", "TEXT", "Message text"],
    ["createdAt", "TIMESTAMP", "Sent timestamp"],
  ], [110, 110, contentWidth - 220]);

  d.section("2. Public Job Browsing");
  d.label("Page", "/careers");
  d.label("API", "GET /api/careers/openings");
  d.p("Returns only openings with status open for non-admin users. Head admins see all statuses (draft, open, closed). Users can also view their own submitted openings via GET /api/careers/openings/mine. Job descriptions are rendered as sanitized HTML (Quill editor output via sanitize-html).");
  d.label("Single Opening", "GET /api/careers/openings/:id");
  d.p("Returns opening details if status is open, or if requester is head admin.");

  d.section("3. Application Flow");
  d.sub("Step 1: Resume Upload");
  d.label("Endpoint", "POST /api/careers/upload-resume");
  d.label("Field", "resume (multipart/form-data, PDF only)");
  d.label("Storage", "Private object storage: .private/resumes/{nanoid}-{timestamp}.pdf");
  d.label("Returns", '{ "resumeUrl": "path-to-stored-file" }');

  d.sub("Step 2: Submit Application");
  d.label("Endpoint", "POST /api/careers/apply");
  d.code('{\n  "openingId": "uuid",\n  "firstName": "Ivan",\n  "lastName": "Petrov",\n  "email": "ivan@example.com",\n  "phone": "+7-900-123-4567",\n  "coverLetter": "I am interested...",\n  "resumeUrl": "path-from-step-1",\n  "password": "optional-for-account-creation"\n}', "JSON");

  d.sub("Step 3: Automatic Account Creation");
  d.p("When a candidate applies:");
  d.bullet("If the email matches an existing user with role candidate, the application is linked to that user");
  d.bullet("If the email does not exist AND a password is provided, a new user account is created with role candidate and bcrypt-hashed password (10 salt rounds)");
  d.bullet("If the email exists but is not a candidate, the application is still created and linked");
  d.note("The candidate role is separate from member. Candidate accounts can only access the candidate portal (/candidate), not the main platform features.");

  d.section("4. Application Status Tracking");
  d.sub("Status Flow");
  d.p("new \u2192 reviewing \u2192 interview \u2192 offered \u2192 hired (or rejected at any stage)");
  d.label("Update", "PATCH /api/careers/applications/:id/status");
  d.label("Auth", "Head Admin only (isHeadAdmin middleware)");
  d.label("Body", '{ "status": "reviewing" | "interview" | "offered" | "rejected" | "hired" }');

  d.section("5. Messaging System");
  d.sub("Recruiter \u2192 Candidate");
  d.label("Endpoint", "POST /api/careers/applications/:id/messages");
  d.label("Auth", "Head Admin (isHeadAdmin middleware)");
  d.label("Body", '{ "content": "message text" }');
  d.p("SenderType is automatically set to admin.");

  d.sub("Candidate \u2192 Recruiter");
  d.label("Endpoint", "POST /api/candidates/applications/:id/messages");
  d.label("Auth", "Candidate (role === 'candidate', owner of application)");
  d.label("Body", '{ "content": "message text" }');
  d.p("SenderType is automatically set to candidate. Ownership verified by checking candidateId matches the authenticated user.");

  d.sub("View Messages");
  d.label("Admin", "GET /api/careers/applications/:id/messages");
  d.label("Candidate", "GET /api/candidates/applications/:id/messages");

  d.section("6. Candidate Portal");
  d.sub("Authentication");
  d.label("Login Page", "/candidate-auth (dedicated login page)");
  d.label("Portal Page", "/candidate (shows all applications + messaging)");
  d.p("Candidates use the same local email/password authentication (passport-local strategy) as regular users but are restricted to the candidate portal. They cannot access events, courses, or other member features. Candidate auth uses the same session management (PostgreSQL, 7-day TTL).");

  d.sub("Candidate API");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/candidates/applications", "Candidate", "List own applications"],
    ["GET", "/api/candidates/applications/:id", "Candidate", "Get application details"],
    ["GET", "/api/candidates/applications/:id/messages", "Candidate", "Get messages for application"],
    ["POST", "/api/candidates/applications/:id/messages", "Candidate", "Send message to recruiter"],
  ], [50, 250, 65, contentWidth - 365]);

  d.section("7. Admin Management");
  d.label("Page", "/admin-careers");
  d.sub("Admin Career API");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["POST", "/api/careers/openings", "Head Admin", "Create job opening"],
    ["PATCH", "/api/careers/openings/:id", "Head Admin", "Update opening"],
    ["DELETE", "/api/careers/openings/:id", "Head Admin", "Delete opening"],
    ["GET", "/api/careers/applications", "Head Admin", "List all applications"],
    ["GET", "/api/careers/applications/:id", "Head Admin", "Get application details"],
    ["PATCH", "/api/careers/applications/:id/status", "Head Admin", "Update status"],
    ["POST", "/api/careers/applications/:id/messages", "Head Admin", "Send message"],
    ["GET", "/api/careers/applications/:id/messages", "Head Admin", "View messages"],
  ], [50, 240, 70, contentWidth - 360]);

  d.section("8. Authorization Matrix");
  d.table(["Action", "Public", "Candidate", "Member", "Head Admin"], [
    ["Browse open jobs", "Yes", "Yes", "Yes", "Yes"],
    ["Submit application", "Yes", "Yes*", "Yes*", "Yes"],
    ["View own applications", "No", "Yes", "No", "No"],
    ["Message recruiter", "No", "Yes", "No", "No"],
    ["Create/edit openings", "No", "No", "No", "Yes"],
    ["Review applications", "No", "No", "No", "Yes"],
    ["Update app. status", "No", "No", "No", "Yes"],
    ["Message candidates", "No", "No", "No", "Yes"],
  ], [140, 50, 65, 55, 70]);
  d.p("* Submitting an application with a password creates a candidate account automatically.");

  d.finish();
  console.log("Generated: docs/CAREER_PORTAL.pdf");
}

function buildAuth() {
  const d = new DocBuilder("docs/AUTHENTICATION_SYSTEM.pdf", "Authentication & User Management", "Technical Documentation", "OAuth, local email/password, bcrypt, passport-local, sessions, RBAC, roles, password reset, user profiles", { Title: "Authentication & User Management \u2014 Technical Documentation", Subject: "Authentication, authorization, and user management" });

  d.p("The platform supports dual authentication: OAuth (OpenID Connect) via server/auth.ts and local email/password login via server/localAuth.ts with Passport.js and bcrypt hashing. Sessions are stored in PostgreSQL with a 7-day TTL. Role-based access control provides five permission tiers: Member, Teacher, Admin, Head Admin, and Candidate, with additional display-only role flags (partner, resident, founder, speaker).");

  d.section("1. Authentication Methods");
  d.sub("OAuth (OpenID Connect) \u2014 server/auth.ts");
  d.p("Primary authentication for the platform-hosted access. Uses the openid-client library with Passport.js strategy.");
  d.label("Discovery URL", "https://the OIDC provider (or ISSUER_URL env var)");
  d.label("Client ID", "APP_ID (automatic)");
  d.label("Scopes", "openid email profile offline_access");
  d.label("Callback", "GET /api/callback");
  d.label("Login", "GET /api/login \u2192 redirects to OAuth");
  d.label("Logout", "GET /api/logout \u2192 the platform end-session URL");

  d.sub("OAuth Flow");
  d.bullet("User clicks login \u2192 /api/login redirects to OAuth");
  d.bullet("User authenticates on the host \u2192 redirects to /api/callback");
  d.bullet("Server receives tokens, extracts claims (sub, email, name, profile_image_url)");
  d.bullet("upsertUser creates or updates user in database with OAuth claims");
  d.bullet("Admin role auto-assigned if email is in ADMIN_EMAILS env var (comma-separated)");
  d.bullet("Head admin auto-assigned for specific hardcoded email in upsertUser");
  d.bullet("Session serialized with access_token, refresh_token, expires_at");

  d.sub("Local Email/Password Authentication \u2014 server/localAuth.ts");
  d.p("Uses passport-local strategy. Registration creates a user with bcrypt-hashed password (10 salt rounds). Login verifies with bcrypt.compare(). On success, req.login() establishes a session.");
  d.label("Strategy Name", "'local' (passport.use('local', new LocalStrategy(...)))");
  d.label("Username Field", "email");
  d.label("Deserialize", "Loads full user object from storage.getUser(id)");

  d.sub("Registration");
  d.label("Endpoint", "POST /api/register");
  d.code('POST /api/register\n{\n  "email": "user@example.com",\n  "password": "securePassword123",\n  "firstName": "Ivan",\n  "lastName": "Petrov"\n}', "JSON");
  d.p("Returns 201 with user object (password excluded). Returns 400 if email already exists. Email is normalized (lowercased/trimmed) via normalizeEmail() before storage.");

  d.sub("Login");
  d.label("Endpoint", "POST /api/login");
  d.p("Authenticates via passport.authenticate('local'), establishes session, returns user object.");

  d.section("2. Session Management");
  d.label("Store", "PostgreSQL via connect-pg-simple");
  d.label("Table", "sessions (sid, sess, expire)");
  d.label("TTL", "7 days (604,800,000 ms)");
  d.label("Cookie", "connect.sid");
  d.label("Cookie Flags", "httpOnly: true, secure: true (production), sameSite: lax");
  d.label("Trust Proxy", 'app.set("trust proxy", 1) for HTTPS behind the platform proxy');

  d.sub("isAuthenticated Middleware");
  d.p("Checks req.isAuthenticated(). For OAuth users (those with expires_at), it also verifies token expiry and attempts automatic refresh using the stored refresh_token via client.refreshTokenGrant(). Local auth users pass through immediately after isAuthenticated() check.");

  d.section("3. Password Reset Flow");
  d.p("Three-step flow using 6-digit codes sent via SendGrid (direct API key):");
  d.bold("Step 1: Request Reset");
  d.label("Endpoint", "POST /api/auth/forgot-password");
  d.label("Body", '{ "email": "user@example.com" }');
  d.p("Generates a random 6-digit code, stores it in password_reset_tokens table with 15-minute expiry. Sends code via SendGrid email.");
  d.bold("Step 2: Verify Code");
  d.label("Endpoint", "POST /api/auth/verify-reset-code");
  d.label("Body", '{ "email": "...", "code": "123456" }');
  d.p("Validates the code against the stored token. Returns success if code matches and is not expired.");
  d.bold("Step 3: Reset Password");
  d.label("Endpoint", "POST /api/auth/reset-password");
  d.label("Body", '{ "email": "...", "code": "123456", "newPassword": "..." }');
  d.p("Re-verifies code, hashes new password with bcrypt (10 rounds), updates user record, deletes the reset token.");

  d.section("4. Role-Based Access Control");
  d.sub("Core Roles");
  d.table(["Role", "DB Value", "Description"], [
    ["Member", "member", "Default role for all new registered users"],
    ["Teacher", "teacher", "Can grade assignments, manage course content and tasks"],
    ["Admin", "admin", "Full platform management (events, courses, videos, users)"],
    ["Head Admin", "isHeadAdmin: true", "Superuser \u2014 career portal, user roles, all admin features"],
    ["Candidate", "candidate", "Career portal only \u2014 no access to main platform features"],
  ], [100, 120, contentWidth - 220]);

  d.sub("Additional Display Flags (Head Admin Toggleable)");
  d.p("Head admins can toggle additional boolean flags on user profiles via the admin panel:");
  d.bullet("isPartner \u2014 Partner status badge");
  d.bullet("isResident \u2014 Resident status badge");
  d.bullet("isFounder \u2014 Founder status badge");
  d.bullet("isSpeaker \u2014 Speaker status badge");
  d.p("These are display-only flags shown on profiles and in the people directory. They do NOT affect authorization middleware or access control.");

  d.sub("Middleware Chain (server/auth.ts)");
  d.table(["Middleware", "Checks", "Used For"], [
    ["isAuthenticated", "req.isAuthenticated() + OAuth token expiry/refresh", "All protected routes"],
    ["isAdmin", "dbUser.role === 'admin'", "Admin panel, event/video CRUD"],
    ["isHeadAdmin", "dbUser.isHeadAdmin === true", "Career portal, user role changes"],
    ["isTeacher", "role is teacher, admin, or head admin", "Course grading, content management"],
    ["isTeacherOrAdmin", "role is teacher or admin or head admin", "Tasks, gradebook, rubrics"],
  ], [110, 180, contentWidth - 290]);
  d.p("All middleware functions get userId from either OAuth claims (req.user.claims.sub) or local auth (req.user.id), then look up the user in the database to check their role.");

  d.section("5. User Profile");
  d.sub("users Table (Key Fields)");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR", "PK (gen_random_uuid() for local, OAuth sub for OAuth)"],
    ["email", "VARCHAR", "Unique, normalized (lowercased/trimmed)"],
    ["password", "VARCHAR", "Bcrypt hash (null for OAuth-only users)"],
    ["firstName / lastName", "VARCHAR", "Name fields"],
    ["patronymic", "VARCHAR", "Russian patronymic name"],
    ["tag", "VARCHAR", "Unique @tag (e.g., @cat123)"],
    ["profileImageUrl", "VARCHAR", "Avatar image URL"],
    ["organizationType", "VARCHAR", "Type of organization"],
    ["organizationName", "TEXT", "Organization name"],
    ["faculty", "VARCHAR", "Faculty (Financial University users)"],
    ["role", "VARCHAR(20)", "member | teacher | admin | candidate"],
    ["isHeadAdmin", "BOOLEAN", "Superuser flag (default: false)"],
    ["city", "VARCHAR", "User's city"],
    ["company", "VARCHAR", "User's company"],
    ["position", "VARCHAR", "Job position"],
    ["bio", "TEXT", "User biography"],
    ["interests", "TEXT[]", "Array of interest tags"],
  ], [140, 100, contentWidth - 240]);

  d.sub("Profile API");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/auth/user", "Auth", "Get current authenticated user"],
    ["PATCH", "/api/user/profile", "Auth", "Update own profile"],
    ["POST", "/api/update-password", "Auth", "Change password (requires current password)"],
  ], [50, 180, 50, contentWidth - 280]);

  d.section("6. Admin User Management");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/admin/users", "Admin", "List all users (with search query)"],
    ["POST", "/api/admin/users", "Admin", "Create a new user account"],
    ["PATCH", "/api/admin/users/:id/role", "Head Admin", "Change user role"],
    ["PATCH", "/api/admin/users/:id/password", "Admin", "Reset user's password"],
  ], [50, 200, 70, contentWidth - 320]);
  d.p("User search supports filtering by name, email, or @tag. Password hashes are excluded from all API responses.");

  d.section("7. Security Considerations");
  d.table(["Concern", "Implementation"], [
    ["Password hashing", "bcrypt with 10 salt rounds"],
    ["Session storage", "PostgreSQL (server-side via connect-pg-simple)"],
    ["Token refresh", "OAuth tokens auto-refreshed on expiry via refresh_token grant"],
    ["HTTPS", "Enforced in production (secure: true cookie, trust proxy)"],
    ["Email normalization", "normalizeEmail() lowercases and trims before storage"],
    ["CSRF", "sameSite: lax cookie attribute"],
    ["Reset code expiry", "15-minute window for password reset codes"],
    ["Reset code format", "6 random digits (not sequential, not predictable)"],
    ["OAuth accounts", "Cannot login via local password (checked in LocalStrategy)"],
  ], [130, contentWidth - 130]);

  d.finish();
  console.log("Generated: docs/AUTHENTICATION_SYSTEM.pdf");
}

function buildMessaging() {
  const d = new DocBuilder("docs/MESSAGING_NOTIFICATIONS.pdf", "Messaging & Notifications", "Technical Documentation", "People directory, real-time chat (conversations), legacy private messages, notifications, lesson comments, user search", { Title: "Messaging & Notifications \u2014 Technical Documentation", Subject: "Communication and notification systems" });

  d.p("The platform provides multiple communication channels: a WhatsApp-style real-time chat system (conversations \u2014 the current primary system), a legacy private messaging system (subject-based messages), a people directory with user search, platform and course announcements, course discussion forums, lesson comments, and a notification system for tracking activity across all channels.");

  d.section("1. People Directory");
  d.label("Page", "/messages (People tab)");
  d.label("Search API", "GET /api/users/search?q=query");
  d.p("Search is case-insensitive and matches against first name, last name, email, and @tag. Supports @tag search (e.g., searching '@cat' strips the @ prefix). Results exclude the current user and return profile data including avatar, name, tag, organization, and online indicators.");

  d.sub("User Directory Fields");
  d.table(["Field", "Searchable", "Displayed"], [
    ["firstName + lastName", "Yes", "Full name"],
    ["email", "Yes", "Email address"],
    ["tag", "Yes (@-prefix stripped)", "@tag badge"],
    ["profileImageUrl", "No", "Avatar image"],
    ["organizationName", "No", "Organization"],
    ["position", "No", "Job position"],
  ], [150, 120, contentWidth - 270]);

  d.section("2. Real-Time Chat System (Primary)");
  d.sub("conversations Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key via gen_random_uuid()"],
    ["participant1Id", "VARCHAR", "FK \u2192 users.id"],
    ["participant2Id", "VARCHAR", "FK \u2192 users.id"],
    ["lastMessageAt", "TIMESTAMP", "Last message timestamp (for sorting)"],
    ["createdAt", "TIMESTAMP", "Conversation creation time"],
  ], [120, 100, contentWidth - 220]);

  d.sub("chat_messages_private Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key"],
    ["conversationId", "VARCHAR", "FK \u2192 conversations.id"],
    ["senderId", "VARCHAR", "FK \u2192 users.id"],
    ["content", "TEXT", "Message content"],
    ["isRead", "BOOLEAN", "Read status (default: false)"],
    ["createdAt", "TIMESTAMP", "Sent timestamp"],
  ], [120, 100, contentWidth - 220]);

  d.sub("Chat API");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/chat/conversations", "Auth", "List user's conversations (sorted by recent)"],
    ["POST", "/api/chat/conversations", "Auth", "Get or create conversation with recipient"],
    ["GET", "/api/chat/conversations/:id/messages", "Auth", "Get messages in conversation"],
    ["POST", "/api/chat/conversations/:id/messages", "Auth", "Send a message (supports @mentions)"],
    ["POST", "/api/chat/conversations/:id/read", "Auth", "Mark messages as read"],
    ["GET", "/api/chat/unread-count", "Auth", "Get total unread message count"],
  ], [50, 235, 45, contentWidth - 330]);
  d.p("Creating a conversation is idempotent \u2014 POST /api/chat/conversations with { recipientId } returns existing conversation if one already exists between the two users, or creates a new one.");

  d.section("3. Legacy Private Messages System");
  d.p("An older subject-based messaging system that operates independently from the chat system.");
  d.sub("private_messages Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key"],
    ["senderId", "VARCHAR", "FK \u2192 users.id"],
    ["recipientId", "VARCHAR", "FK \u2192 users.id"],
    ["subject", "TEXT", "Message subject line"],
    ["content", "TEXT", "Message body"],
    ["isRead", "BOOLEAN", "Read status"],
    ["readAt", "TIMESTAMP", "When the message was read"],
    ["createdAt", "TIMESTAMP", "Sent timestamp"],
  ], [110, 100, contentWidth - 210]);

  d.sub("Private Messages API");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/messages?folder=inbox|sent", "Auth", "List messages in folder"],
    ["GET", "/api/messages/:id", "Auth", "Get single message (sender or recipient only)"],
    ["POST", "/api/messages", "Auth", "Send a new message"],
    ["POST", "/api/messages/:id/read", "Auth", "Mark message as read"],
    ["DELETE", "/api/messages/:id", "Auth", "Delete a message"],
    ["GET", "/api/messages/unread-count", "Auth", "Get unread count"],
  ], [50, 210, 45, contentWidth - 305]);
  d.note("The legacy private message system and the chat system are independent. The chat system (conversations) is the primary messaging interface. Private messages operate as a separate inbox/sent-style mailbox.");

  d.section("4. Lesson Comments");
  d.sub("lesson_comments Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key"],
    ["lessonId", "VARCHAR", "FK \u2192 course_lessons.id"],
    ["userId", "VARCHAR", "FK \u2192 users.id"],
    ["content", "TEXT", "Comment text"],
    ["createdAt", "TIMESTAMP", "Posted timestamp"],
  ], [110, 100, contentWidth - 210]);
  d.label("List", "GET /api/lessons/:id/comments");
  d.label("Post", "POST /api/lessons/:id/comments");
  d.p("Comments are visible to all enrolled students and staff. They provide a per-lesson discussion area directly below the lesson content.");

  d.section("5. Notification System");
  d.sub("notifications Table");
  d.table(["Column", "Type", "Description"], [
    ["id", "VARCHAR (UUID)", "Primary key via gen_random_uuid()"],
    ["userId", "VARCHAR", "FK \u2192 users.id (recipient)"],
    ["type", "VARCHAR", "message | mention | grade | course | system"],
    ["title", "TEXT", "Notification title"],
    ["content", "TEXT", "Notification body"],
    ["link", "TEXT", "URL to navigate to on click"],
    ["isRead", "BOOLEAN", "Read status (default: false)"],
    ["createdAt", "TIMESTAMP", "Notification timestamp"],
  ], [100, 100, contentWidth - 200]);

  d.sub("Notification API");
  d.table(["Method", "Endpoint", "Auth", "Description"], [
    ["GET", "/api/notifications?unreadOnly=true", "Auth", "List notifications"],
    ["PATCH", "/api/notifications/:id/read", "Auth", "Mark single as read"],
    ["POST", "/api/notifications/read-all", "Auth", "Mark all as read"],
    ["DELETE", "/api/notifications/:id", "Auth", "Delete a notification"],
    ["GET", "/api/notifications/unread-count", "Auth", "Get unread count"],
  ], [50, 225, 45, contentWidth - 320]);
  d.p("Notifications are scoped by userId \u2014 users can only read/modify their own notifications. The link field enables deep-linking to the relevant content (e.g., a new message, a graded submission, a course update).");

  d.section("6. Authorization Summary");
  d.table(["Feature", "Member", "Teacher", "Admin"], [
    ["People directory search", "Yes", "Yes", "Yes"],
    ["Send/receive chat messages", "Yes", "Yes", "Yes"],
    ["Send/receive private messages", "Yes", "Yes", "Yes"],
    ["Post lesson comments", "Enrolled", "Yes", "Yes"],
    ["View notifications", "Yes", "Yes", "Yes"],
    ["Post announcements", "No", "Yes", "Yes"],
    ["Manage forum threads", "No", "Yes", "Yes"],
  ], [160, 65, 65, 65]);

  d.finish();
  console.log("Generated: docs/MESSAGING_NOTIFICATIONS.pdf");
}

function buildAdminTools() {
  const d = new DocBuilder("docs/ADMIN_TOOLS_REPORTING.pdf", "Admin Tools & Reporting", "Technical Documentation", "SendGrid (direct API key), Excel export, statistics, user management, registration reporting, SEO", { Title: "Admin Tools & Reporting \u2014 Technical Documentation", Subject: "Administration, email, and reporting" });

  d.p("The admin tools provide comprehensive platform management capabilities including a rich-text email service via SendGrid (direct API key), detailed registration and attendance reporting with Excel export, user management with role assignment, and platform-wide statistics. All admin functions require authentication and appropriate role-based authorization.");

  d.section("1. Email Service (SendGrid via the platform Connector)");
  d.sub("Architecture \u2014 server/emailService.ts");
  d.p("Emails are sent via SendGrid using the direct API key. The API key and sender email are fetched dynamically from the direct API key API at runtime \u2014 not stored as static environment variables. This enables automatic key rotation.");

  d.sub("Credential Flow");
  d.bullet("Server calls direct API key API: GET https://{CONNECTORS_HOSTNAME}/api/v2/connection?include_secrets=true&connector_names=sendgrid");
  d.bullet("Authentication: X_AUTH_TOKEN header using IDENTITY_TOKEN (dev) or RENEWAL_TOKEN (deployed)");
  d.bullet("Response provides api_key and from_email dynamically");
  d.bullet("sgMail.setApiKey() called with the retrieved key before each send batch");

  d.sub("Send Functions");
  d.bold("sendEmail(options: EmailOptions):");
  d.code('interface EmailOptions {\n  to: string[];       // Array of recipient emails\n  subject: string;    // Email subject\n  html: string;       // HTML body\n  text?: string;      // Plain text fallback (auto-stripped from HTML)\n}', "TypeScript");
  d.p("Sends to each recipient individually with 100ms delay between sends. Returns { successful, failed, failedEmails } counts. Does not throw on partial failure \u2014 only throws if ALL sends fail.");

  d.bold("sendPersonalizedEmail(options: PersonalizedEmailOptions):");
  d.code('interface PersonalizedEmailOptions {\n  recipients: EmailRecipient[];  // { email, firstName?, lastName? }\n  subject: string;\n  contentGenerator: (recipient) => { html, text };\n}', "TypeScript");
  d.p("Generates unique email content per recipient using the contentGenerator function. Supports personalization with recipient name and details.");

  d.sub("Admin Email Endpoints");
  d.table(["Method", "Endpoint", "Auth", "Purpose"], [
    ["POST", "/api/events/:id/registrations/send-email", "Admin", "Email all registrants of a specific event"],
    ["POST", "/api/admin/registrations/send-email", "Admin", "Email registrants across all events"],
    ["POST", "/api/admin/users/send-email", "Admin", "Email all platform users"],
  ], [50, 250, 50, contentWidth - 350]);
  d.p("All email endpoints accept { subject, htmlContent } in the body. The admin composes rich-text emails using a React Quill editor in the frontend. HTML is sanitized with sanitize-html before sending.");

  d.section("2. Registration Reporting");
  d.sub("Per-Event Export");
  d.label("Endpoint", "GET /api/events/:id/registrations/export");
  d.label("Format", "Excel (.xlsx) via exceljs");
  d.label("Columns", "Registration ID, Email, First Name, Last Name, Patronymic, Organization Type, Organization Name, Faculty, Attendance Status, Registration Date");
  d.p("The Excel file is generated in-memory and streamed as a download response with content-disposition header.");

  d.sub("All-Events Export");
  d.label("Endpoint", "GET /api/admin/registrations/export");
  d.p("Exports registrations across all events in a single Excel file, with additional Event Name and Event Date columns.");

  d.sub("Reports & Statistics");
  d.label("Statistics", "GET /api/admin/reports/statistics");
  d.label("Export", "GET /api/admin/reports/export");
  d.p("Statistics endpoint returns aggregate data:");
  d.bullet("Total registrations across all events");
  d.bullet("Unique user count");
  d.bullet("Financial University students vs. external participants");
  d.bullet("Attendance rates (marked vs. total)");
  d.bullet("Per-event breakdown with registration counts and attendance percentages");
  d.bullet("Organization type distribution");

  d.section("3. User Management");
  d.sub("User Search");
  d.label("Endpoint", "GET /api/admin/users?search=query");
  d.label("Auth", "Admin (isAdmin middleware)");
  d.p("Real-time search across name, email, and @tag fields. Returns user profiles with role, status flags, and registration metadata. Password hashes are excluded from responses.");

  d.sub("User CRUD");
  d.table(["Method", "Endpoint", "Auth", "Purpose"], [
    ["GET", "/api/admin/users", "Admin", "List/search all users"],
    ["POST", "/api/admin/users", "Admin", "Create new user account"],
    ["PATCH", "/api/admin/users/:id/role", "Head Admin", "Change user role"],
    ["PATCH", "/api/admin/users/:id/password", "Admin", "Reset user password"],
  ], [50, 220, 70, contentWidth - 340]);
  d.p("Role changes are restricted to Head Admins (isHeadAdmin middleware). Available roles: member, teacher, admin, candidate. The isHeadAdmin flag is set in the upsertUser function based on a hardcoded email check, not through the admin API.");

  d.sub("Display Role Flags (Head Admin Only)");
  d.p("Head admins can toggle additional status badges on users via profile updates:");
  d.bullet("isPartner, isResident, isFounder, isSpeaker");
  d.p("These are boolean flags displayed as badges on user profiles and in the people directory. They do not affect authorization or access control.");

  d.section("4. SEO & Sitemap");
  d.sub("Sitemap Generation");
  d.label("Endpoint", "GET /sitemap.xml");
  d.p("Dynamically generates an XML sitemap including all published events, published courses, active livestreams, videos, and static pages. Follows the sitemap.org protocol with lastmod, changefreq, and priority attributes.");

  d.sub("Robots.txt");
  d.label("Endpoint", "GET /robots.txt");
  d.p("Serves a robots.txt file allowing all crawlers, with a link to the sitemap.");

  d.section("5. File & Object Storage");
  d.sub("Upload Endpoints");
  d.table(["Method", "Endpoint", "Auth", "Purpose"], [
    ["POST", "/api/upload/image", "Admin", "Upload single image (public/)"],
    ["POST", "/api/upload/images", "Admin", "Upload multiple images (public/)"],
    ["POST", "/api/upload/form-file", "Auth", "Upload file for event form answer"],
    ["POST", "/api/objects/upload", "Admin", "Generic object upload"],
    ["POST", "/api/careers/upload-resume", "Public", "Upload PDF resume (.private/)"],
    ["GET", "/objects/:objectPath(*)", "Public", "Serve objects from storage"],
  ], [50, 190, 50, contentWidth - 290]);
  d.p("All uploads use Multer for multipart handling with memory storage. Files are stored in S3-compatible object storage (Google Cloud Storage backend). The public/ directory serves publicly accessible assets (images, thumbnails). The .private/ directory stores sensitive files (resumes). Object paths are configured via PUBLIC_OBJECT_SEARCH_PATHS and PRIVATE_OBJECT_DIR environment variables.");

  d.section("6. Platform Pages");
  d.sub("Admin Pages");
  d.table(["Page", "Route", "Purpose"], [
    ["Admin Panel", "/admin", "User management, role assignment, email composition"],
    ["Admin Careers", "/admin-careers", "Job opening and application management"],
    ["Admin Reports", "/admin-reports", "Registration statistics and Excel export"],
    ["Admin Grading", "/admin-grading", "Submission review and grading interface"],
    ["Scan Attendance", "/scan-attendance", "QR code scanner (admin)"],
  ], [120, 120, contentWidth - 240]);

  d.sub("Public/User Pages");
  d.table(["Page", "Route", "Purpose"], [
    ["Landing", "/", "Platform homepage with hero section"],
    ["Dashboard", "/dashboard", "User dashboard with activity summary"],
    ["Events", "/events", "Event listing and registration"],
    ["Courses", "/courses", "Course catalog and enrollment"],
    ["Videos", "/videos", "Video library with comments"],
    ["Livestreams", "/livestreams", "Live and scheduled RuTube streams"],
    ["Challenges", "/challenges", "AI debate challenges"],
    ["Careers", "/careers", "Public job board"],
    ["Messages", "/messages", "Chat, private messages, people directory"],
    ["Profile", "/profile", "User profile management"],
    ["My Tickets", "/my-tickets", "Event tickets with QR codes"],
    ["Candidate Auth", "/candidate-auth", "Candidate login page"],
    ["Candidate Portal", "/candidate", "Candidate application tracking"],
  ], [120, 130, contentWidth - 250]);

  d.finish();
  console.log("Generated: docs/ADMIN_TOOLS_REPORTING.pdf");
}

buildEventManagement();
buildLMS();
buildVideoLivestream();
buildAIChallenges();
buildCareerPortal();
buildAuth();
buildMessaging();
buildAdminTools();

console.log("\nAll 8 documentation PDFs generated successfully!");
