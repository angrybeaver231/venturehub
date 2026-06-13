import PDFDocument from "pdfkit";
import fs from "fs";

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 60, bottom: 60, left: 55, right: 55 },
  info: {
    Title: "QR Attendance System — Technical Documentation",
    Author: "Business Club — Financial University",
    Subject: "QR scanning and attendance check-in technical specification",
  },
});

const output = fs.createWriteStream("docs/QR_ATTENDANCE_SYSTEM.pdf");
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
  codeBg: "#f8fafc",
  codeBorder: "#e2e8f0",
  warnBg: "#fef3c7",
  warnBorder: "#f59e0b",
  greenBg: "#ecfdf5",
  greenBorder: "#10b981",
};

let pageNum = 1;
const contentWidth = 595.28 - 110;

function addPageFooter() {
  const savedY = doc.y;
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor("#94a3b8")
    .text(
      `QR Attendance System — Technical Documentation  |  Page ${pageNum}`,
      55,
      doc.page.height - 40,
      { align: "center", width: contentWidth }
    );
  doc.y = savedY;
}

function checkPageBreak(needed: number) {
  if (doc.y + needed > doc.page.height - 80) {
    addPageFooter();
    doc.addPage();
    pageNum++;
    doc.y = 50;
  }
}

function drawHeader() {
  doc.rect(0, 0, doc.page.width, 150).fill(colors.dark);

  const grad = doc.linearGradient(0, 140, doc.page.width, 150);
  grad.stop(0, colors.primary).stop(1, colors.accent);
  doc.rect(0, 140, doc.page.width, 10).fill(grad);

  doc
    .fontSize(24)
    .font("Helvetica-Bold")
    .fillColor(colors.white)
    .text("QR ATTENDANCE SYSTEM", 55, 35, { align: "left" });

  doc
    .fontSize(14)
    .font("Helvetica")
    .fillColor(colors.accent)
    .text("TECHNICAL DOCUMENTATION", 55, 68, { align: "left" });

  doc
    .fontSize(10)
    .fillColor("#94a3b8")
    .text("Business Club — Financial University Platform", 55, 95, { align: "left" });

  doc
    .fontSize(9)
    .fillColor("#64748b")
    .text("QR data format, API contracts, frontend logic, mobile implementation, authorization", 55, 115, { align: "left" });
}

function sectionTitle(title: string) {
  checkPageBreak(60);
  doc.moveDown(1.2);

  const y = doc.y;
  doc.rect(55, y, 4, 22).fill(colors.primary);

  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(colors.dark)
    .text(title.toUpperCase(), 68, y + 3);

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
  doc.moveDown(0.5);
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor(colors.primary)
    .text(title, 55);
  doc.moveDown(0.3);
}

function paragraph(text: string) {
  checkPageBreak(25);
  doc
    .fontSize(9.5)
    .font("Helvetica")
    .fillColor(colors.text)
    .text(text, 55, undefined, {
      width: contentWidth,
      lineGap: 3,
    });
  doc.moveDown(0.3);
}

function boldParagraph(text: string) {
  checkPageBreak(25);
  doc
    .fontSize(9.5)
    .font("Helvetica-Bold")
    .fillColor(colors.dark)
    .text(text, 55, undefined, {
      width: contentWidth,
      lineGap: 3,
    });
  doc.moveDown(0.3);
}

function bulletPoint(text: string, indent = 0) {
  checkPageBreak(22);
  const x = 65 + indent;
  const bulletChar = indent > 0 ? "\u2013" : "\u2022";
  doc
    .fontSize(9.5)
    .font("Helvetica")
    .fillColor(colors.secondary)
    .text(bulletChar, x, doc.y, { continued: true })
    .fillColor(colors.text)
    .text(`  ${text}`, { width: doc.page.width - x - 65, lineGap: 2 });
  doc.moveDown(0.1);
}

function boldBullet(label: string, description: string, indent = 0) {
  checkPageBreak(22);
  const x = 65 + indent;
  const bulletChar = indent > 0 ? "\u2013" : "\u2022";
  doc
    .fontSize(9.5)
    .font("Helvetica")
    .fillColor(colors.secondary)
    .text(bulletChar, x, doc.y, { continued: true })
    .font("Helvetica-Bold")
    .fillColor(colors.dark)
    .text(`  ${label}`, { continued: true })
    .font("Helvetica")
    .fillColor(colors.text)
    .text(` — ${description}`, { width: doc.page.width - x - 65, lineGap: 2 });
  doc.moveDown(0.1);
}

function codeBlock(code: string, language?: string) {
  const lines = code.split("\n");
  const lineHeight = 11;
  const blockHeight = lines.length * lineHeight + 16;
  checkPageBreak(blockHeight + 10);

  const y = doc.y;
  doc
    .roundedRect(55, y, contentWidth, blockHeight, 4)
    .fillAndStroke(colors.codeBg, colors.codeBorder);

  if (language) {
    doc
      .fontSize(7)
      .font("Helvetica-Bold")
      .fillColor(colors.secondary)
      .text(language.toUpperCase(), contentWidth - 10, y + 4, { align: "right", width: 60 });
  }

  doc
    .fontSize(8.5)
    .font("Courier")
    .fillColor(colors.dark);

  let textY = y + 8;
  for (const line of lines) {
    doc.text(line, 65, textY, { width: contentWidth - 20 });
    textY += lineHeight;
  }

  doc.y = y + blockHeight + 6;
}

function tableRow(cells: string[], widths: number[], isHeader = false) {
  checkPageBreak(22);
  const rowY = doc.y;
  const font = isHeader ? "Helvetica-Bold" : "Helvetica";
  const bgColor = isHeader ? colors.light : colors.white;
  const textColor = isHeader ? colors.dark : colors.text;

  const totalWidth = widths.reduce((a, b) => a + b, 0);
  doc.rect(55, rowY, totalWidth, 18).fill(bgColor);
  doc.rect(55, rowY, totalWidth, 18).stroke(colors.divider);

  let x = 55;
  for (let i = 0; i < cells.length; i++) {
    doc
      .fontSize(8)
      .font(font)
      .fillColor(textColor)
      .text(cells[i], x + 4, rowY + 5, { width: widths[i] - 8, lineGap: 0 });
    x += widths[i];
  }

  doc.y = rowY + 18;
}

function noteBox(text: string, type: "info" | "warning" | "success" = "info") {
  checkPageBreak(40);
  const bgMap = { info: "#eff6ff", warning: colors.warnBg, success: colors.greenBg };
  const borderMap = { info: "#3b82f6", warning: colors.warnBorder, success: colors.greenBorder };
  const labelMap = { info: "NOTE", warning: "IMPORTANT", success: "OK" };

  const y = doc.y;
  doc.rect(55, y, contentWidth, 3).fill(borderMap[type]);

  doc
    .fontSize(7)
    .font("Helvetica-Bold")
    .fillColor(borderMap[type])
    .text(labelMap[type], 65, y + 8);

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor(colors.text)
    .text(text, 65, y + 20, { width: contentWidth - 20, lineGap: 2 });

  const endY = doc.y + 6;
  doc.rect(55, y, contentWidth, endY - y).fillAndStroke(bgMap[type], borderMap[type]);

  doc
    .fontSize(7)
    .font("Helvetica-Bold")
    .fillColor(borderMap[type])
    .text(labelMap[type], 65, y + 8);

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor(colors.text)
    .text(text, 65, y + 20, { width: contentWidth - 20, lineGap: 2 });

  doc.y = endY + 4;
}

function labelValue(label: string, value: string) {
  checkPageBreak(20);
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(colors.secondary)
    .text(`${label}: `, 65, doc.y, { continued: true })
    .font("Helvetica")
    .fillColor(colors.text)
    .text(value, { width: contentWidth - 20 });
  doc.moveDown(0.1);
}

drawHeader();
doc.y = 170;

paragraph(
  "The QR attendance system allows admins to check in event attendees by scanning a QR code displayed on the attendee's ticket. The system uses signed JWT tokens embedded in QR codes, verified server-side before marking attendance in the database."
);

sectionTitle("1. QR Code Data Format");

subSection("What is Encoded");
paragraph(
  "The QR code contains a raw JWT string \u2014 no URL wrapper, no prefix, no encryption layer. The scanner reads the JWT directly from the QR image."
);

boldParagraph("Example QR content (raw JWT):");
codeBlock(
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZWdpc3\n" +
  "RyYXRpb25JZCI6ImE3YjNjNGQ1LWU2ZjctNDg5MC1hYjEyLT\n" +
  "M0NTY3ODkwYWJjZCIsImV2ZW50SWQiOiI5OGZlZGNiYS03MDU\n" +
  "0LTMyMTAtZmVkYy1iYTk4NzY1NDMyMTAiLCJpYXQiOjE3MDcw\n" +
  "MDAwMDAsImV4cCI6MTcwNzAxNDQwMH0.SIGNATURE"
);

subSection("JWT Payload Structure");
codeBlock(
  '{\n  "registrationId": "a7b3c4d5-e6f7-4890-ab12-34567890abcd",\n  "eventId": "98fedcba-7654-3210-fedc-ba9876543210",\n  "iat": 1707000000,\n  "exp": 1707014400\n}',
  "JSON"
);

const colW3 = [130, 100, contentWidth - 230];
tableRow(["Field", "Type", "Description"], colW3, true);
tableRow(["registrationId", "string (UUID)", "Primary key of the event_registrations table"], colW3);
tableRow(["eventId", "string (UUID)", "Primary key of the events table"], colW3);
tableRow(["iat", "number", "Unix timestamp \u2014 when the token was issued"], colW3);
tableRow(["exp", "number", "Unix timestamp \u2014 when the token expires"], colW3);

subSection("Signing & Expiration");

const colW2 = [160, contentWidth - 160];
tableRow(["Property", "Value"], colW2, true);
tableRow(["Algorithm", "HS256 (HMAC-SHA256) \u2014 default jsonwebtoken algorithm"], colW2);
tableRow(["Secret", "process.env.SESSION_SECRET (fallback: 'default-secret')"], colW2);
tableRow(["TTL", "4 hours ({ expiresIn: '4h' })"], colW2);
tableRow(["Encryption", "None \u2014 signed but not encrypted"], colW2);

doc.moveDown(0.3);
paragraph(
  "The 4-hour window covers a typical event duration. If the attendee opens the ticket page after expiry, a fresh QR code with a new JWT is generated on demand."
);

subSection("QR Image Generation");
paragraph("Server-side generation using the qrcode npm package:");
codeBlock(
  'const qrCodeDataURL = await QRCode.toDataURL(token, {\n  errorCorrectionLevel: "H",   // 30% recovery\n  margin: 2,                   // 2-module quiet zone\n  width: 300,                  // 300x300 px\n});',
  "TypeScript"
);
paragraph("Returns a base64 data URL (data:image/png;base64,...) displayed as an <img> element.");

sectionTitle("2. API Contract");

subSection("2.1 Generate QR Code");
labelValue("Endpoint", "GET /api/registrations/:id/qr-code");
labelValue("Auth", "isAuthenticated \u2014 registration owner or any admin");
labelValue("Returns", "QR image (base64), raw JWT token, attendance status");

doc.moveDown(0.2);
boldParagraph("Success Response (200):");
codeBlock(
  '{\n  "qrCode": "data:image/png;base64,iVBORw0KGgo...",\n  "token": "eyJhbGciOiJIUzI1NiIs...",\n  "attendanceMarked": false,\n  "attendanceTime": null\n}',
  "JSON"
);

boldParagraph("Error Responses:");
const errW = [60, 180, contentWidth - 240];
tableRow(["Status", "Condition", "Body"], errW, true);
tableRow(["401", "Not authenticated", '{ "message": "Unauthorized" }'], errW);
tableRow(["403", "Not owner and not admin", '{ "message": "Access denied" }'], errW);
tableRow(["404", "Registration not found", '{ "message": "Registration not found" }'], errW);
tableRow(["500", "Server error", '{ "message": "Failed to generate QR code" }'], errW);

subSection("2.2 Generate Ticket (QR + event/user details)");
labelValue("Endpoint", "GET /api/registrations/:id/ticket");
labelValue("Auth", "isAuthenticated \u2014 owner or admin");

doc.moveDown(0.2);
boldParagraph("Success Response (200):");
codeBlock(
  '{\n  "qrCode": "data:image/png;base64,...",\n  "registration": {\n    "id": "a7b3c4d5-...",\n    "eventId": "98fedcba-...",\n    "attendanceMarked": false,\n    "attendanceTime": null\n  },\n  "event": {\n    "name": "FinTech Conference 2025",\n    "date": "2025-03-15",\n    "time": "14:00",\n    "location": "Financial University, Room 301"\n  },\n  "user": {\n    "firstName": "Ivan",\n    "lastName": "Petrov",\n    "patronymic": "Sergeevich"\n  }\n}',
  "JSON"
);

subSection("2.3 QR Scan Check-In (primary endpoint)");
labelValue("Endpoint", "POST /api/registrations/mark-attendance");
labelValue("Auth", "isAuthenticated + isAdmin \u2014 only admins and head admins");

doc.moveDown(0.2);
boldParagraph("Request Body:");
codeBlock('{\n  "token": "eyJhbGciOiJIUzI1NiIs..."\n}', "JSON");
paragraph("The token field is the raw JWT string from the QR code. No additional parameters (no deviceId, operatorId, or event context).");

boldParagraph("Response Scenarios:");

doc.moveDown(0.2);
paragraph("Success \u2014 first scan (200):");
codeBlock(
  '{\n  "message": "Attendance marked successfully",\n  "userName": "Ivan Petrov",\n  "eventName": "FinTech Conference 2025",\n  "alreadyMarked": false\n}',
  "JSON"
);

paragraph("Success \u2014 duplicate scan (200):");
codeBlock(
  '{\n  "message": "Attendance already marked",\n  "userName": "Ivan Petrov",\n  "eventName": "FinTech Conference 2025",\n  "alreadyMarked": true\n}',
  "JSON"
);

noteBox("Duplicate scans return HTTP 200 (not an error). The alreadyMarked: true flag lets the frontend display a different UI message.");

boldParagraph("Error Responses:");
const errW2 = [60, 175, contentWidth - 235];
tableRow(["Status", "Condition", "Body"], errW2, true);
tableRow(["400", "No token provided", '"Token is required"'], errW2);
tableRow(["401", "Expired JWT", '"QR code has expired. Please generate a new one."'], errW2);
tableRow(["401", "Invalid/tampered JWT", '"Invalid QR code token"'], errW2);
tableRow(["404", "Registration not found", '"Registration not found"'], errW2);
tableRow(["500", "Server failure", '"Failed to mark attendance: <error>"'], errW2);

subSection("2.4 Manual Attendance Toggle (no QR)");
labelValue("Endpoint", "PATCH /api/events/:eventId/registrations/:registrationId/attendance");
labelValue("Auth", "isAuthenticated + isAdmin");
labelValue("Body", '{ "attendanceMarked": true | false }');
paragraph("Used by the admin registrations management page to manually toggle attendance without a QR code.");

sectionTitle("3. Frontend Scanner Logic");

subSection("Component: ScanAttendance");
labelValue("Route", "/scan-attendance (registered in App.tsx)");
labelValue("File", "client/src/pages/scan-attendance.tsx");
labelValue("Access", "Any authenticated user can navigate; API returns 403 for non-admins");

subSection("State Machine");
paragraph("SCANNING \u2192 PROCESSING \u2192 RESULT (3s timer) \u2192 back to SCANNING");
doc.moveDown(0.2);

const smW = [120, contentWidth - 120];
tableRow(["State", "Behavior"], smW, true);
tableRow(["SCANNING", "Camera feed active, react-qr-scanner polls every 300ms"], smW);
tableRow(["PROCESSING", "Spinner overlay, API call in flight, new scans blocked"], smW);
tableRow(["RESULT", "Success/error alert shown for 3 seconds, then auto-resets"], smW);

subSection("Step-by-Step Flow");
bulletPoint("Camera activates with facingMode: \"environment\" (rear camera on mobile) and 300ms scan delay.");
bulletPoint("QR detected: handleScan(data) extracts raw text via data.text || data.");
bulletPoint("Debounce guard: if processing === true, callback returns immediately (prevents duplicate API calls).");
bulletPoint("API call: raw JWT string sent as-is to POST /api/registrations/mark-attendance, body: { token }.");
bulletPoint("No client-side parsing, validation, or transformation of the token.");
bulletPoint("Success: shows user name + event name. Differentiates first scan vs. already-marked.");
bulletPoint("Error: red destructive alert + toast notification with error message.");
bulletPoint("Auto-reset: after 3 seconds via setTimeout, camera resumes scanning.");

subSection("Camera Error Handling");
bulletPoint("NotAllowedError \u2192 shows \"Camera permission denied\" message.");
bulletPoint("Other errors \u2192 displays raw error message.");
bulletPoint("\"Try Again\" button resets the scanner state.");

subSection("UI States");
const uiW = [120, contentWidth - 120];
tableRow(["State", "Display"], uiW, true);
tableRow(["Scanning", "Live camera feed in square black container"], uiW);
tableRow(["Processing", "Spinner overlay on camera feed"], uiW);
tableRow(["Success", "Green alert with check icon, user name, event name"], uiW);
tableRow(["Already Marked", "Same green alert, different message text"], uiW);
tableRow(["Error", "Red destructive alert with error message"], uiW);
tableRow(["Camera Error", "Red alert with permission instructions + retry button"], uiW);

sectionTitle("4. Mobile Implementation");

subSection("Architecture");
paragraph(
  "The mobile scanner is NOT a separate app or native build. It is the same web page (/scan-attendance) opened in the mobile device's browser. The platform is a Progressive Web App (PWA), so the user can:"
);
bulletPoint("Open the URL directly in a mobile browser (Chrome, Safari, etc.)");
bulletPoint("Or install the PWA to the home screen and open it from there");

subSection("Camera Access");
paragraph(
  "The react-qr-scanner component uses the browser's MediaDevices.getUserMedia() API with the constraint { video: { facingMode: \"environment\" } } to request the rear camera. The mobile browser prompts for camera permission on first use."
);

subSection("Responsive Layout");
paragraph(
  "The scanner page uses max-w-2xl mx-auto (max-width 672px, centered). The camera preview is rendered in a square aspect-square container that scales to the available width. On mobile screens, this fills most of the viewport width."
);

subSection("No Special Mobile-Only Features");
bulletPoint("No separate mobile-specific layout or responsive breakpoints for the scanner");
bulletPoint("No native camera API usage (everything is web-standard getUserMedia)");
bulletPoint("No offline scan capability (API call requires network)");
bulletPoint("No device ID or operator ID tracking");

sectionTitle("5. Authorization Requirements");

subSection("Who Can Generate QR Codes");
const authW = [100, 80, contentWidth - 180];
tableRow(["Role", "Can Generate", "Condition"], authW, true);
tableRow(["Member", "Yes", "Only for their own registrations"], authW);
tableRow(["Admin", "Yes", "For any registration"], authW);
tableRow(["Head Admin", "Yes", "For any registration"], authW);

subSection("Who Can Scan QR Codes (Mark Attendance)");
const scanW = [140, contentWidth - 140];
tableRow(["Role", "Can Scan"], scanW, true);
tableRow(["Member", "No (403 Forbidden)"], scanW);
tableRow(["Teacher", "No (403 Forbidden)"], scanW);
tableRow(["Admin", "Yes"], scanW);
tableRow(["Head Admin", "Yes"], scanW);

doc.moveDown(0.3);
noteBox(
  "The isAdmin middleware checks role === \"admin\". Head Admins pass because their role is also set to \"admin\" in the database \u2014 isHeadAdmin is a separate boolean column, not a distinct role value.",
  "warning"
);

subSection("Session Requirements");
paragraph("The scanner page requires a valid session cookie (connect.sid). The session is established through either:");
bulletPoint("OAuth (OpenID Connect flow)");
bulletPoint("Local email/password login (Passport.js local strategy with bcrypt)");
paragraph("There is no separate \"scan account\" or special scanner-only authentication. The admin uses their regular platform credentials.");

sectionTitle("6. Database Schema");

subSection("event_registrations Table");
codeBlock(
  "CREATE TABLE event_registrations (\n  id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),\n  event_id        VARCHAR NOT NULL REFERENCES events(id),\n  user_id         VARCHAR REFERENCES users(id),\n  guest_name      TEXT,\n  guest_email     TEXT,\n  attendance_marked BOOLEAN NOT NULL DEFAULT false,\n  attendance_time   TIMESTAMP,\n  created_at      TIMESTAMP DEFAULT now(),\n  UNIQUE (event_id, user_id)\n);",
  "SQL"
);

subSection("Fields Modified by Check-In");
const dbW = [160, 120, contentWidth - 280];
tableRow(["Field", "Before Scan", "After Scan"], dbW, true);
tableRow(["attendance_marked", "false", "true"], dbW);
tableRow(["attendance_time", "null", "Current timestamp"], dbW);

doc.moveDown(0.3);
subSection("Unmark Behavior (Manual Toggle)");
paragraph("When an admin manually unmarks attendance via the PATCH endpoint:");
const unmW = [160, contentWidth - 160];
tableRow(["Field", "Value"], unmW, true);
tableRow(["attendance_marked", "false"], unmW);
tableRow(["attendance_time", "null"], unmW);

sectionTitle("7. Data Flow Overview");

paragraph("1. Attendee opens their ticket page in the browser.");
paragraph("2. Frontend calls GET /api/registrations/:id/qr-code.");
paragraph("3. Server fetches the registration, verifies ownership, signs a JWT with {registrationId, eventId}, generates a QR code image from the JWT, and returns the base64 data URL.");
paragraph("4. Attendee's screen displays the 300x300px QR code.");
paragraph("5. Admin opens /scan-attendance on their mobile phone (PWA or browser).");
paragraph("6. Admin points the rear camera at the attendee's QR code.");
paragraph("7. react-qr-scanner decodes the JWT string from the QR image.");
paragraph("8. Frontend sends POST /api/registrations/mark-attendance with body { token: \"<JWT>\" }.");
paragraph("9. Server calls jwt.verify() to decode registrationId and eventId.");
paragraph("10. Server looks up the registration. If already marked, returns 200 + alreadyMarked: true.");
paragraph("11. Otherwise, sets attendance_marked = true and attendance_time = now() in the database.");
paragraph("12. Returns user name and event name. Frontend shows success/already-marked for 3 seconds, then resets.");

sectionTitle("8. Security Considerations");

const secW = [140, contentWidth - 140];
tableRow(["Concern", "Current State"], secW, true);
tableRow(["Token forgery", "Protected by HMAC-SHA256 signature using SESSION_SECRET"], secW);
tableRow(["Token replay", "Idempotent \u2014 same token returns alreadyMarked: true"], secW);
tableRow(["Token expiry", "4-hour window; expired tokens return 401"], secW);
tableRow(["Cross-event scan", "eventId in JWT is NOT verified; only registrationId used"], secW);
tableRow(["Secret strength", "Falls back to 'default-secret' if SESSION_SECRET unset"], secW);
tableRow(["Brute force", "No rate limiting on mark-attendance endpoint"], secW);
tableRow(["HTTPS", "Enforced by the platform deployment infrastructure"], secW);

sectionTitle("9. npm Dependencies");

const depW = [130, 80, contentWidth - 210];
tableRow(["Package", "Version", "Purpose"], depW, true);
tableRow(["qrcode", "^1.5.x", "Server-side QR code generation (toDataURL)"], depW);
tableRow(["jsonwebtoken", "^9.x", "JWT sign & verify"], depW);
tableRow(["react-qr-scanner", "^1.x", "Client-side camera QR reader (getUserMedia)"], depW);

doc.moveDown(2);
doc
  .moveTo(55, doc.y)
  .lineTo(doc.page.width - 55, doc.y)
  .strokeColor(colors.divider)
  .lineWidth(0.5)
  .stroke();
doc.moveDown(0.8);

doc
  .fontSize(11)
  .font("Helvetica-BoldOblique")
  .fillColor(colors.primary)
  .text("Business Club \u2014 Where entrepreneurship meets technology.", 55, undefined, {
    align: "center",
    width: contentWidth,
  });

addPageFooter();
doc.end();

output.on("finish", () => {
  console.log("PDF generated successfully: docs/QR_ATTENDANCE_SYSTEM.pdf");
});
