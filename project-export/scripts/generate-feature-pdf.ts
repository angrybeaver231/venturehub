import PDFDocument from "pdfkit";
import fs from "fs";

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 60, bottom: 60, left: 55, right: 55 },
  info: {
    Title: "Ventorix Platform — Feature Overview",
    Author: "Ventorix",
    Subject: "Platform capabilities, feature overview, and corporation levels",
  },
});

const output = fs.createWriteStream("FEATURE_OVERVIEW.pdf");
doc.pipe(output);

const colors = {
  primary: "#0ea5e9",
  dark: "#0f172a",
  text: "#1e293b",
  secondary: "#475569",
  light: "#f1f5f9",
  accent: "#06b6d4",
  white: "#ffffff",
  divider: "#cbd5e1",
  level1: "#22c55e",
  level2: "#3b82f6",
  level3: "#a855f7",
};

function drawHeader() {
  doc.rect(0, 0, doc.page.width, 140).fill(colors.dark);

  const grad = doc.linearGradient(0, 130, doc.page.width, 140);
  grad.stop(0, colors.primary).stop(1, colors.accent);
  doc.rect(0, 130, doc.page.width, 10).fill(grad);

  doc
    .fontSize(28)
    .font("Helvetica-Bold")
    .fillColor(colors.white)
    .text("VENTORIX", 55, 45, { align: "left" });

  doc
    .fontSize(12)
    .font("Helvetica")
    .fillColor(colors.accent)
    .text("INNOVATION & EDUCATION PLATFORM", 55, 80, { align: "left" });

  doc
    .fontSize(10)
    .fillColor("#94a3b8")
    .text("Feature Overview & Corporation Levels", 55, 100, { align: "left" });
}

function sectionTitle(title: string) {
  checkPageBreak(60);
  doc.moveDown(1.2);

  const y = doc.y;
  doc.rect(55, y, 4, 22).fill(colors.primary);

  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .fillColor(colors.dark)
    .text(title.toUpperCase(), 68, y + 2);

  doc.moveDown(0.6);
  doc
    .moveTo(55, doc.y)
    .lineTo(doc.page.width - 55, doc.y)
    .strokeColor(colors.divider)
    .lineWidth(0.5)
    .stroke();
  doc.moveDown(0.5);
}

function subSection(title: string) {
  checkPageBreak(40);
  doc.moveDown(0.6);
  doc
    .fontSize(13)
    .font("Helvetica-Bold")
    .fillColor(colors.primary)
    .text(title, 55);
  doc.moveDown(0.3);
}

function paragraph(text: string) {
  checkPageBreak(30);
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.text)
    .text(text, 55, undefined, {
      width: doc.page.width - 110,
      lineGap: 3,
    });
  doc.moveDown(0.3);
}

function bulletPoint(text: string, indent = 0) {
  checkPageBreak(25);
  const x = 65 + indent;
  const bulletChar = indent > 0 ? "\u2013" : "\u2022";
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.secondary)
    .text(bulletChar, x, doc.y, { continued: true })
    .fillColor(colors.text)
    .text(`  ${text}`, { width: doc.page.width - x - 65, lineGap: 2 });
  doc.moveDown(0.15);
}

function boldBullet(label: string, description: string, indent = 0) {
  checkPageBreak(25);
  const x = 65 + indent;
  const bulletChar = indent > 0 ? "\u2013" : "\u2022";
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.secondary)
    .text(bulletChar, x, doc.y, { continued: true })
    .font("Helvetica-Bold")
    .fillColor(colors.dark)
    .text(`  ${label}`, { continued: true })
    .font("Helvetica")
    .fillColor(colors.text)
    .text(` — ${description}`, { width: doc.page.width - x - 65, lineGap: 2 });
  doc.moveDown(0.15);
}

function checkPageBreak(needed: number) {
  if (doc.y + needed > doc.page.height - 80) {
    addPageFooter();
    doc.addPage();
    pageNum++;
    doc.y = 50;
  }
}

let pageNum = 1;
function addPageFooter() {
  const savedY = doc.y;
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor("#94a3b8")
    .text(
      `Ventorix — Feature Overview  |  Page ${pageNum}`,
      55,
      doc.page.height - 40,
      { align: "center", width: doc.page.width - 110 }
    );
  doc.y = savedY;
}

function levelBadge(level: number, label: string, color: string) {
  checkPageBreak(30);
  const y = doc.y;
  doc.rect(65, y, 6, 18).fill(color);
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor(colors.dark)
    .text(`Level ${level}: ${label}`, 78, y + 2);
  doc.moveDown(0.5);
}

function tableRow(feature: string, l1: string, l2: string, l3: string, isHeader = false) {
  checkPageBreak(22);
  const y = doc.y;
  const colW = [200, 90, 90, 90];
  const colX = [55, 260, 352, 444];

  if (isHeader) {
    doc.rect(55, y - 2, doc.page.width - 110, 20).fill(colors.dark);
    doc.fontSize(9).font("Helvetica-Bold").fillColor(colors.white);
  } else {
    const stripe = Math.floor((y - 200) / 18) % 2 === 0;
    if (stripe) {
      doc.rect(55, y - 2, doc.page.width - 110, 18).fill(colors.light);
    }
    doc.fontSize(9).font("Helvetica").fillColor(colors.text);
  }

  doc.text(feature, colX[0] + 4, y + 2, { width: colW[0] - 8, lineBreak: false });
  doc.text(l1, colX[1] + 4, y + 2, { width: colW[1] - 8, align: "center", lineBreak: false });
  doc.text(l2, colX[2] + 4, y + 2, { width: colW[2] - 8, align: "center", lineBreak: false });
  doc.text(l3, colX[3] + 4, y + 2, { width: colW[3] - 8, align: "center", lineBreak: false });

  doc.y = y + 18;
}

drawHeader();
doc.y = 165;

paragraph(
  "Ventorix is a powerful innovation and education platform connecting universities, startups, corporations, and professionals. It brings together event management, online learning, live broadcasts, AI-powered challenges, a career portal, a startup & innovation ecosystem, corporate partnership tools, and real-time messaging — all under one roof, available in both English and Russian."
);

// ===== MEMBER FEATURES =====
sectionTitle("For Members");

subSection("Dashboard");
paragraph(
  "Your personal command center. See upcoming events at a glance, track your active courses, and stay connected with the latest platform activity. Key stats — total members, events, and courses — are always front and center."
);

subSection("Events");
paragraph(
  "Never miss a moment. Browse upcoming and past events, view featured highlights, and register in seconds through smart custom registration forms. Every event comes with detailed descriptions, dates, locations, and capacity information."
);
boldBullet("AI-Powered Registration Chat", "Register for events through a natural conversation with GigaChat AI. It guides you through the process, extracts your information, and supports file uploads.");
boldBullet("Custom Registration Forms", "Each event can have tailored registration questions including text fields, dropdowns, checkboxes, and file uploads.");
boldBullet("Event Tickets", "Receive digital tickets with unique QR codes for seamless check-in.");
boldBullet("Certificates", "Download professionally generated certificates of participation after attending events.");

subSection("Learning Management System (LMS)");
paragraph("A full-featured online education platform built right into the club.");
boldBullet("Courses & Enrollment", "Browse available courses, read descriptions, and enroll with one click.");
boldBullet("Modules & Lessons", "Structured content organized into modules with text and embedded video lessons.");
boldBullet("Quizzes & Assignments", "Interactive quizzes and assignments with teacher feedback and grading.");
boldBullet("Progress Tracking", "Watch your completion percentage grow as you work through content.");
boldBullet("Downloadable Materials", "Access supplementary files and resources attached to lessons.");
boldBullet("Course Forums & Comments", "Engage in threaded discussions and leave comments on lessons.");
boldBullet("Announcements", "Stay informed with course-specific announcements from instructors.");
boldBullet("Gradebook", "View grades, rubric scores, and overall course performance in one place.");

subSection("AI Debate Challenges");
paragraph("Sharpen your argumentation skills in AI-powered debate battles.");
boldBullet("Pick a Topic & Take a Side", "Choose from curated debate topics and argue your position against GigaChat AI.");
boldBullet("Real-Time Scoring", "Arguments evaluated on logic, evidence, persuasiveness, and coherence.");
boldBullet("Leaderboards", "Compete for top spots on per-challenge and global leaderboards.");
boldBullet("Seasonal Points (FIS System)", "Earn points across a season, climb the rankings, and prove your mastery.");
boldBullet("Team Championship", "Compete as part of a team for collective glory.");
boldBullet("Attachments & History", "Study reference materials and review past debate attempts with AI feedback.");

subSection("Video Library");
paragraph("Access a growing collection of educational and platform-related videos.");
boldBullet("Browse & Watch", "View videos with titles, upload dates, and view counts.");
boldBullet("Comments", "Engage with the community by commenting on videos.");
boldBullet("RuTube Integration", "Reliable Russian-friendly video hosting and playback.");

subSection("Livestreams");
paragraph("Tune into live broadcasts without leaving the platform.");
boldBullet("Upcoming & Live Now", "See scheduled streams and jump into active broadcasts.");
boldBullet("RuTube-Powered", "Seamless livestream playback via RuTube integration.");

subSection("Messaging & People Directory");
paragraph("Stay connected with your community.");
boldBullet("Direct Messages", "Private 1:1 messaging with any platform member.");
boldBullet("People Directory", "Search and discover members, view profiles, and start conversations.");
boldBullet("Real-Time Chat", "Instant messaging with a clean, modern interface and unread counts.");

subSection("Career Portal");
paragraph("Discover professional opportunities through the job board.");
boldBullet("Browse Job Openings", "View available positions with rich descriptions and requirements.");
boldBullet("Apply Directly", "Submit applications and upload PDF resumes.");
boldBullet("Candidate Account", "Track all your applications in a dedicated candidate portal.");
boldBullet("Status Tracking", "Follow your application: new, reviewing, interview, offered, rejected, or hired.");
boldBullet("Recruiter Chat", "Communicate directly with recruiters about your application.");

subSection("Profile Management");
paragraph("Update your name, patronymic, organization type, faculty affiliation, and contact information. Your avatar is displayed across chats, leaderboards, and directories.");

subSection("Additional Platform Features");
boldBullet("Progressive Web App", "Install on your phone or desktop like a native app with offline support and auto-updates.");
boldBullet("Bilingual Interface", "Switch seamlessly between English and Russian — every element is fully translated.");
boldBullet("Dark & Light Mode", "Choose your preferred visual theme with consistent styling throughout.");
boldBullet("Interactive Tour", "First-time users get a guided walkthrough of every feature.");
boldBullet("Circular Navigation Menu", "A unique radial menu provides intuitive quick-access to all major sections.");

// ===== ADMIN FEATURES =====
sectionTitle("Platform Administration");

subSection("Role-Based Access Control (RBAC)");
paragraph("Ventorix uses subsystem-specific admin roles for fine-grained access control. There is no generic 'admin' role — each subsystem has its own administrator.");
boldBullet("Head Admin (isHeadAdmin)", "Full superuser access across the entire platform. Can manage all entities, users, and settings.");
boldBullet("Event Admin (eventAdmin)", "Manages event creation, registration forms, attendance tracking, QR scanning, and event reporting.");
boldBullet("LMS Admin (lmsAdmin)", "Manages courses, modules, lessons, quizzes, assignments, and the learning management system.");
boldBullet("InnoLabs Admin (innoLabsAdmin)", "Manages the startup & innovation platform, corporate workspaces, and scouting tools.");
boldBullet("Teacher", "Grades assignments, manages course content, and moderates course forums within the LMS.");

subSection("Account Freeze System");
paragraph("A security mechanism to protect the platform from compromised accounts.");
boldBullet("Freeze Accounts", "Event Admins and Head Admins can freeze university head admin accounts to prevent damage.");
boldBullet("Global Enforcement", "Frozen users are blocked from all mutation API requests (POST, PUT, PATCH, DELETE).");
boldBullet("Freeze Details", "Every freeze records who froze the account, when, and why.");
boldBullet("Head Admin Protection", "Only a Head Admin can freeze another Head Admin.");

subSection("User Management");
paragraph("Full control over your community.");
boldBullet("User Directory", "Search and browse all registered members with real-time filtering.");
boldBullet("Role Assignment", "Assign platform roles: Member, Teacher, Expert, Event Admin, LMS Admin, InnoLabs Admin.");
boldBullet("Additional Roles", "Toggle special designations: Partner, Resident, Founder, Speaker.");
boldBullet("Password Management", "Reset user passwords when needed.");
boldBullet("Create Users", "Manually create accounts for new members.");

subSection("Event Management (Event Admin)");
paragraph("Create and manage professional events with ease.");
boldBullet("Create & Edit Events", "Build events with titles, descriptions, dates, locations, capacity limits, and cover images.");
boldBullet("Draft/Publish Workflow", "Prepare events in draft mode and publish when ready.");
boldBullet("Form Builder", "Design event-specific registration forms with drag-and-drop. Add text fields, dropdowns, checkboxes, file uploads, and more.");
boldBullet("Registration Management", "View registrations, filter by status, and manage attendee lists.");
boldBullet("Attendance Tracking", "Mark attendance manually or use the built-in QR code scanner.");
boldBullet("QR Code Scanner", "Scan attendee ticket QR codes from mobile for instant check-in.");
boldBullet("Featured Events", "Highlight key events on the dashboard and landing page.");
boldBullet("Email Attendees", "Send rich-text emails to event registrants with a built-in composer.");
boldBullet("Excel Export", "Download registration data, attendance records, and statistics as Excel files.");

subSection("Reporting & Analytics");
paragraph("Data-driven insights into platform activity.");
boldBullet("Event Statistics", "View registration counts, attendance rates, and student breakdowns.");
boldBullet("Comprehensive Reports", "Generate detailed reports across all events with filters and date ranges.");
boldBullet("Excel Export", "Export any report as a professionally formatted Excel spreadsheet.");

subSection("Course Management (LMS Admin / Teacher)");
paragraph("Build and deliver online education.");
boldBullet("Course Creation", "Set up courses with descriptions, module counts, and duration estimates.");
boldBullet("Module & Lesson Editor", "Organize content into modules and create rich text/video lessons.");
boldBullet("Quiz & Assignment Builder", "Create assessments with multiple question types and grading rubrics.");
boldBullet("Grading System", "Grade assignments using customizable rubrics and grade categories.");
boldBullet("Gradebook Export", "View and export comprehensive grade reports for any course.");
boldBullet("Announcements & Forum Moderation", "Post announcements and manage course discussion forums.");

subSection("Video & Livestream Management");
boldBullet("Upload Videos", "Add videos with titles and thumbnails, stored securely in cloud storage.");
boldBullet("Manage Livestreams", "Create, schedule, and manage live broadcasts with RuTube.");

subSection("Challenge Management");
boldBullet("Create Challenges", "Design debate topics with descriptions, difficulty levels, and time limits.");
boldBullet("Attach Materials", "Upload reference documents and images for challengers.");
boldBullet("Monitor Results", "Track participant performance and leaderboard standings.");

subSection("Email Service");
boldBullet("Rich-Text Composer", "Write beautifully formatted emails with a built-in editor.");
boldBullet("Targeted Sending", "Email specific groups: event registrants, all members, or selected individuals.");
boldBullet("SendGrid Integration", "Reliable delivery powered by SendGrid's infrastructure.");

subSection("Career Portal Administration");
boldBullet("Create Job Openings", "Post positions with rich-text descriptions and requirements.");
boldBullet("Draft/Open/Closed Workflow", "Control when job postings are visible to the public.");
boldBullet("Application Review", "Manage applications with full status tracking and candidate messaging.");
boldBullet("Resume Access", "View uploaded PDF resumes from applicants.");

// ===== MULTI-INSTITUTION LAYER =====
sectionTitle("Multi-Institution & Community Layer");

paragraph(
  "Ventorix supports multiple organizations with independent management, membership, and role hierarchies."
);

subSection("Universities");
paragraph("Register universities with slug-based public pages. Each university has its own tiered role hierarchy:");
boldBullet("Role Tiers (0-6)", "member (0) < staff/mentor (1) < teacher (2) < adminClub/adminProgram (3) < headAdminClub/headAdminProgram/headAdminCourses (4) < admin (5) < headAdmin (6).");
boldBullet("Cross-Entity Equivalence", "A university admin (tier 5) automatically receives club admin access for all clubs belonging to that university.");
boldBullet("Role Assignment Rules", "Users can only assign roles below their own tier level.");

subSection("Clubs");
paragraph("Create and manage clubs within or outside universities.");
boldBullet("Role Tiers (0-3)", "member (0) < leader/organizer/mentor (1) < admin (2) < headAdmin (3).");
boldBullet("Cross-Entity Equivalence", "A club headAdmin (tier 3) equals a university admin (tier 5) when the club belongs to that university.");

subSection("Entity Approval Workflow");
paragraph("Non-admin users can register new universities, clubs, and corporations. These registrations enter a 'pending review' state and require Head Admin approval before becoming active on the platform.");

// ===== STARTUP & INNOVATION PLATFORM =====
sectionTitle("Startup & Innovation Platform");

paragraph(
  "A comprehensive innovation ecosystem connecting founders, startups, corporations, and investors. Eight integrated feature areas cover the full journey from idea to scale."
);

subSection("Startup Profiles");
paragraph("Create and manage your startup's presence on the platform.");
boldBullet("Create a Startup", "Register your venture with name, description, stage, vertical, and founding year.");
boldBullet("Team Management", "Invite team members with specific roles: Founder, Co-Founder, Team Member, or Advisor.");
boldBullet("Metrics Tracking", "Log key business metrics over time: MRR, active users, revenue, and pilot counts.");
boldBullet("Stage & Vertical", "Classify startups by stage (idea, MVP, growth, scale) and vertical (fintech, edtech, healthtech, etc.).");
boldBullet("Public Profiles", "Each startup has a browsable public profile with team, description, and key stats.");
boldBullet("Startup Readiness Signals", "B2B signals: live pilots, fintech experience, security review. Problem statement, target units, integration model, data requirements. Auto-calculated completeness score.");

subSection("Corporate Innovation");
paragraph("Dedicated workspace for corporations to manage their innovation activities.");
boldBullet("Company Workspace", "Dashboard with KPIs, scouting activity, and pipeline overview.");
boldBullet("Company Profiles", "Create and manage corporate accounts with industry, size, and description.");
boldBullet("Team Roles", "Invite corporate users as Admin, Scout, or Viewer.");
boldBullet("Internal Notes", "Keep private notes on scouting progress, meetings, and strategy.");
boldBullet("Activity Audit Log", "Track key workspace actions: brief creation, pipeline changes, evaluations, reviewer assignments.");
boldBullet("Public Employer Branding", "Public company profiles linking programs and job openings for talent attraction.");

subSection("Scouting Briefs");
paragraph("Corporations publish structured requests to discover and engage startups.");
boldBullet("Create Briefs", "Define scouting requirements with title, description, verticals, budget range, and deadlines.");
boldBullet("Brief Applications", "Startups apply to briefs with fit descriptions and use cases.");
boldBullet("Application Status", "Track applications through stages: pending, shortlisted, interviewing, selected, or rejected.");
boldBullet("Reviewer Assignments", "Assign reviewers to brief applications with status tracking (assigned, in review, done).");
boldBullet("Brief Management", "Corporations review, shortlist, and manage all applications from a central dashboard.");

subSection("Accelerator Programs");
paragraph("Manage multi-format innovation programs with participant tracking.");
boldBullet("Program Types", "Support for accelerators, incubators, hackathons, workshops, and mentorship programs.");
boldBullet("Participant Management", "Enroll startups, track status (applied, accepted, active, graduated, dropped), and manage cohorts.");
boldBullet("Program Details", "Define start/end dates, capacity limits, descriptions, and application criteria.");
boldBullet("Status Tracking", "Monitor participant progress from application through graduation.");

subSection("Evaluation & Scoring");
paragraph("Structured multi-criteria evaluation system for assessing startups.");
boldBullet("Six Evaluation Criteria", "Score startups on Team, Product, Market, Traction, Strategic Fit, and Risk (0-10 scale).");
boldBullet("Weighted Scoring", "Each criterion contributes to a calculated overall score.");
boldBullet("Recommendations", "Evaluators assign a recommendation: Strong Pass, Pass, Consider, or Strong Consider.");
boldBullet("Detailed Notes", "Add free-text notes for each evaluation for deeper context.");
boldBullet("History", "Track all evaluations over time for each startup.");

subSection("Corporate Pipeline CRM");
paragraph("Kanban-style pipeline for tracking startup-corporate relationships.");
boldBullet("Pipeline Stages", "Move startups through stages: Discovered, In Evaluation, In Pilot, In Scale-Up, or Archived.");
boldBullet("Relationship Tracking", "Record how and when a corporate first engaged with a startup.");
boldBullet("Stage Management", "Drag or move startups between pipeline stages as the relationship evolves.");
boldBullet("Notes & Context", "Attach notes and context to each pipeline relationship.");

subSection("Corporate Reporting");
paragraph("Aggregated KPI dashboards for corporate innovation activity.");
boldBullet("Dashboard KPIs", "At-a-glance metrics: total briefs, applications received, program counts, pipeline breakdown.");
boldBullet("Application Analytics", "Track application trends, conversion rates, and sourcing effectiveness.");
boldBullet("Evaluation Summaries", "Average scores across criteria, recommendation distributions, and evaluator activity.");
boldBullet("Program Metrics", "Participant counts, graduation rates, and program performance over time.");

subSection("Talent Layer");
paragraph("Integration between the innovation ecosystem and the career portal.");
boldBullet("Startup Hiring", "Startups can post job openings and attract candidates through the career portal.");
boldBullet("Corporate Jobs", "Corporate partners link their job openings to their company profiles.");
boldBullet("Employer Branding Pages", "Public company profiles showcase open positions, active programs, and company culture.");

// ===== CORPORATION LEVELS =====
sectionTitle("Corporation Level System");

paragraph(
  "Ventorix offers a 3-tier corporation level system that determines the capabilities and limits available to each corporate workspace. Each level unlocks progressively more features and higher quotas."
);

// Level comparison table
doc.moveDown(0.5);

tableRow("Feature", "Level 1", "Level 2", "Level 3", true);
tableRow("Highlighted Events / Month", "1", "Unlimited", "Unlimited");
tableRow("Recommended Events / Month", "0", "4", "8");
tableRow("Special Branding Events", "0", "1", "Unlimited");
tableRow("Can Highlight All Events", "No", "Yes", "Yes");
tableRow("Unlimited Vacancies", "Yes", "Yes", "Yes");
tableRow("Can Highlight Vacancies", "No", "Yes", "Yes");
tableRow("Special Branding Vacancies", "0", "1", "Unlimited");
tableRow("Max Active Programs", "1", "2", "Unlimited");
tableRow("Max Program Participants", "100", "500", "Unlimited");
tableRow("Max Business Tasks", "1", "5", "Unlimited");
tableRow("Max Pending Applications", "30", "150", "Unlimited");

doc.moveDown(1);

// Detailed level descriptions
levelBadge(1, "Starter", colors.level1);
paragraph(
  "The entry-level tier for corporations joining the platform. Ideal for organizations exploring innovation partnerships with limited initial commitment. Includes basic access to scouting briefs, a single active program, and essential pipeline tools. Companies can post unlimited vacancies and receive up to 30 pending applications."
);
bulletPoint("1 highlighted event per month");
bulletPoint("1 active program with up to 100 participants");
bulletPoint("1 business task at a time");
bulletPoint("Basic pipeline access with up to 30 pending applications");
bulletPoint("No recommended events or special branding");

doc.moveDown(0.3);

levelBadge(2, "Business", colors.level2);
paragraph(
  "Designed for corporations actively engaged in innovation scouting and partnership building. Unlocks event recommendations, vacancy highlighting, special branding, and significantly higher quotas for programs and applications."
);
bulletPoint("Unlimited highlighted events with 4 recommended events per month");
bulletPoint("1 special branding event and 1 special branding vacancy");
bulletPoint("2 active programs with up to 500 participants each");
bulletPoint("5 concurrent business tasks");
bulletPoint("Up to 150 pending applications");
bulletPoint("Ability to highlight vacancies for increased visibility");

doc.moveDown(0.3);

levelBadge(3, "Enterprise", colors.level3);
paragraph(
  "The most comprehensive tier for corporations seeking full-scale innovation operations on the platform. All limits are removed — unlimited programs, participants, branding, business tasks, and applications. Ideal for large enterprises running multiple innovation programs simultaneously."
);
bulletPoint("Unlimited highlighted and recommended events (8/month recommended slots)");
bulletPoint("Unlimited special branding for events and vacancies");
bulletPoint("Unlimited active programs with unlimited participants");
bulletPoint("Unlimited business tasks and pending applications");
bulletPoint("Full access to all platform innovation tools without restrictions");

// ===== ENTITY-LEVEL ROLE HIERARCHIES =====
sectionTitle("Entity-Level Role Hierarchies");

paragraph(
  "Each entity type (university, club, corporation) has its own role hierarchy with numbered tiers. Higher tier numbers grant more authority. Users can only assign roles below their own tier."
);

subSection("Corporation Roles");
paragraph("Corporations use a 7-tier role hierarchy:");
boldBullet("Tier 0 — member", "Basic access to the corporate workspace.");
boldBullet("Tier 1 — participant", "Active participation in corporate programs.");
boldBullet("Tier 2 — analyst / mentor / companyReviewer", "Evaluation, mentoring, and review capabilities.");
boldBullet("Tier 3 — adminProgram / innovationLead", "Program management and innovation leadership.");
boldBullet("Tier 4 — headAdminProgram", "Senior program administration.");
boldBullet("Tier 5 — companyAdmin", "Full company workspace administration.");
boldBullet("Tier 6 — headAdmin", "Complete control over the corporate entity.");

subSection("University Roles");
paragraph("Universities use a 7-tier role hierarchy:");
boldBullet("Tier 0 — member", "Basic university membership.");
boldBullet("Tier 1 — staff / mentor", "Staff access and mentoring capabilities.");
boldBullet("Tier 2 — teacher", "Teaching and course management.");
boldBullet("Tier 3 — adminClub / adminProgram", "Club and program administration.");
boldBullet("Tier 4 — headAdminClub / headAdminProgram / headAdminCourses", "Senior sub-unit administration.");
boldBullet("Tier 5 — admin", "Full university administration.");
boldBullet("Tier 6 — headAdmin", "Complete control over the university entity.");

subSection("Club Roles");
paragraph("Clubs use a 4-tier role hierarchy:");
boldBullet("Tier 0 — member", "Basic club membership.");
boldBullet("Tier 1 — leader / organizer / mentor", "Active leadership and organizing roles.");
boldBullet("Tier 2 — admin", "Club administration.");
boldBullet("Tier 3 — headAdmin", "Complete control over the club entity.");

// ===== TECHNICAL HIGHLIGHTS =====
sectionTitle("Technical Highlights");

boldBullet("Secure Authentication", "Dual login: OAuth or email/password with bcrypt encryption.");
boldBullet("Subsystem-Specific RBAC", "headAdmin, eventAdmin, lmsAdmin, innoLabsAdmin, teacher — each with dedicated middleware guards.");
boldBullet("Entity-Level Role Hierarchies", "Tier-based permission systems for universities, clubs, and corporations with cross-entity equivalence.");
boldBullet("Account Freeze System", "Global mutation blocking for compromised accounts with audit trail.");
boldBullet("Cloud Storage", "All files stored in Google Cloud Storage via S3-compatible object storage.");
boldBullet("Responsive Design", "Fully responsive across desktop, tablet, and mobile devices.");
boldBullet("SEO Optimized", "Every page includes meta tags, Open Graph tags, and structured data.");
boldBullet("Real-Time Updates", "TanStack Query powers instant data synchronization.");
boldBullet("Smooth Animations", "Framer Motion delivers polished transitions and micro-interactions.");
boldBullet("GigaChat AI", "Sber's Russian AI powers debate challenges and conversational registration.");
boldBullet("3-Tier Corporation Levels", "Scalable corporate capabilities with usage tracking and plan management.");

// ===== FOOTER =====
doc.moveDown(2);
doc
  .moveTo(55, doc.y)
  .lineTo(doc.page.width - 55, doc.y)
  .strokeColor(colors.divider)
  .lineWidth(0.5)
  .stroke();
doc.moveDown(0.8);

doc
  .fontSize(12)
  .font("Helvetica-BoldOblique")
  .fillColor(colors.primary)
  .text("Ventorix — Where innovation meets technology.", 55, undefined, {
    align: "center",
    width: doc.page.width - 110,
  });

addPageFooter();
doc.end();

output.on("finish", () => {
  console.log("PDF generated successfully: FEATURE_OVERVIEW.pdf");
});
