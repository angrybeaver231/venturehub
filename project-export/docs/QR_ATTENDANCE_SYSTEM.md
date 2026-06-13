# QR Attendance System — Technical Documentation

## Overview

The QR attendance system allows admins to check in event attendees by scanning a QR code displayed on the attendee's ticket. The system uses signed JWT tokens embedded in QR codes, verified server-side before marking attendance in the database.

---

## 1. QR Code Data Format

### What is encoded

The QR code contains a **raw JWT string** — no URL wrapper, no prefix, no encryption layer. The scanner reads the JWT directly from the QR image.

**Example decoded QR content (before JWT verification):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZWdpc3RyYXRpb25JZCI6ImE3YjNjNGQ1LWU2ZjctNDg5MC1hYjEyLTM0NTY3ODkwYWJjZCIsImV2ZW50SWQiOiI5OGZlZGNiYS03NjU0LTMyMTAtZmVkYy1iYTk4NzY1NDMyMTAiLCJpYXQiOjE3MDcwMDAwMDAsImV4cCI6MTcwNzAxNDQwMH0.SIGNATURE
```

### JWT Payload Structure

```json
{
  "registrationId": "a7b3c4d5-e6f7-4890-ab12-34567890abcd",
  "eventId": "98fedcba-7654-3210-fedc-ba9876543210",
  "iat": 1707000000,
  "exp": 1707014400
}
```

| Field | Type | Description |
|---|---|---|
| `registrationId` | `string` (UUID) | Primary key of the `event_registrations` table row |
| `eventId` | `string` (UUID) | Primary key of the `events` table row |
| `iat` | `number` | Unix timestamp — when the token was issued |
| `exp` | `number` | Unix timestamp — when the token expires |

### Signing & Expiration

| Property | Value |
|---|---|
| Algorithm | HS256 (HMAC-SHA256) — default `jsonwebtoken` algorithm |
| Secret | `process.env.SESSION_SECRET` (falls back to `'default-secret'` if unset) |
| TTL | **4 hours** (`{ expiresIn: '4h' }`) |
| Encryption | None — the JWT is signed but **not encrypted** |

The 4-hour window is designed to cover a typical event duration. If the attendee opens the ticket page again after the token expires, a fresh QR code with a new JWT is generated on demand.

### QR Image Generation

The QR code is rendered server-side using the `qrcode` npm package:

```typescript
const qrCodeDataURL = await QRCode.toDataURL(token, {
  errorCorrectionLevel: 'H',   // Highest error correction (30% recovery)
  margin: 2,                   // 2-module quiet zone
  width: 300,                  // 300×300 px
});
```

The result is a **base64 data URL** (`data:image/png;base64,...`) returned to the frontend and displayed as an `<img>` element.

---

## 2. API Contract

### 2.1 Generate QR Code

**Endpoint:** `GET /api/registrations/:id/qr-code`

**Auth:** `isAuthenticated` — the registration owner or any admin can request it.

**Request:**
```
GET /api/registrations/a7b3c4d5-e6f7-4890-ab12-34567890abcd/qr-code
Cookie: connect.sid=<session_cookie>
```

**Success Response (200):**
```json
{
  "qrCode": "data:image/png;base64,iVBORw0KGgo...",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "attendanceMarked": false,
  "attendanceTime": null
}
```

**Error Responses:**

| Status | Condition | Body |
|---|---|---|
| 401 | Not authenticated | `{ "message": "Unauthorized" }` |
| 403 | Not owner and not admin | `{ "message": "Access denied" }` |
| 404 | Registration ID not found | `{ "message": "Registration not found" }` |
| 500 | Server error | `{ "message": "Failed to generate QR code" }` |

### 2.2 Generate Ticket (includes QR + event/user details)

**Endpoint:** `GET /api/registrations/:id/ticket`

**Auth:** `isAuthenticated` — owner or admin.

**Success Response (200):**
```json
{
  "qrCode": "data:image/png;base64,...",
  "registration": {
    "id": "a7b3c4d5-...",
    "eventId": "98fedcba-...",
    "userId": "user-uuid-...",
    "attendanceMarked": false,
    "attendanceTime": null
  },
  "event": {
    "name": "FinTech Conference 2025",
    "date": "2025-03-15",
    "time": "14:00",
    "location": "Financial University, Room 301",
    "duration": "2 hours"
  },
  "user": {
    "firstName": "Ivan",
    "lastName": "Petrov",
    "patronymic": "Sergeevich"
  }
}
```

### 2.3 QR Scan Check-In (primary scanner endpoint)

**Endpoint:** `POST /api/registrations/mark-attendance`

**Auth:** `isAuthenticated` + `isAdmin` — **only admins and head admins** can scan.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

The `token` field contains the **raw JWT string** decoded from the QR code. No additional parameters (no `deviceId`, no `operatorId`, no event context).

**Response Scenarios:**

#### Success — first scan (200):
```json
{
  "message": "Attendance marked successfully",
  "userName": "Ivan Petrov",
  "eventName": "FinTech Conference 2025",
  "alreadyMarked": false
}
```

#### Success — duplicate scan (200):
```json
{
  "message": "Attendance already marked",
  "userName": "Ivan Petrov",
  "eventName": "FinTech Conference 2025",
  "alreadyMarked": true
}
```

> **Note:** Duplicate scans return HTTP 200 (not an error). The `alreadyMarked: true` flag lets the frontend display a different UI message.

#### Error — no token (400):
```json
{
  "message": "Token is required"
}
```

#### Error — expired JWT (401):
```json
{
  "message": "QR code has expired. Please generate a new one."
}
```

#### Error — invalid/tampered JWT (401):
```json
{
  "message": "Invalid QR code token"
}
```

#### Error — registration not found (404):
```json
{
  "message": "Registration not found"
}
```

#### Error — server failure (500):
```json
{
  "message": "Failed to mark attendance: <error details>"
}
```

### 2.4 Manual Attendance Toggle (admin UI, no QR)

**Endpoint:** `PATCH /api/events/:eventId/registrations/:registrationId/attendance`

**Auth:** `isAuthenticated` + `isAdmin`

**Request Body:**
```json
{
  "attendanceMarked": true
}
```

**Success Response (200):**
```json
{
  "message": "Attendance marked successfully",
  "registration": { /* full registration object */ }
}
```

This endpoint is used by the admin registrations management page to manually toggle attendance without a QR code.

---

## 3. Frontend Scanner Logic (`scan-attendance.tsx`)

### Component: `ScanAttendance`

**Route:** `/scan-attendance` (registered in `App.tsx`)

**Access:** Any authenticated user can navigate to the page, but the `POST /api/registrations/mark-attendance` API call will fail with 403 if the user is not an admin. There is no client-side role gate on the route itself.

### State Machine

```
┌──────────┐  QR detected   ┌────────────┐  API responds   ┌────────────┐
│ SCANNING │ ─────────────> │ PROCESSING │ ──────────────> │  RESULT    │
│          │                │            │                 │ (3s timer) │
└──────────┘                └────────────┘                 └─────┬──────┘
     ^                                                           │
     └───────────────── auto-reset after 3 seconds ──────────────┘
```

### Step-by-Step Flow

1. **Camera activation:** The `react-qr-scanner` component is mounted with `delay={300}` (scans every 300ms) and `facingMode: "environment"` (rear camera on mobile).

2. **QR decode:** When a QR code is detected, `handleScan(data)` fires. The raw text is extracted via `data.text || data`.

3. **Debounce/guard:** If `processing` is `true`, the callback returns immediately — this prevents duplicate API calls while a scan is in flight.

4. **API call:** The raw JWT string is sent as-is to the server:
   ```typescript
   const response = await apiRequest("/api/registrations/mark-attendance", {
     method: "POST",
     body: JSON.stringify({ token }),
   });
   ```
   No client-side parsing, validation, or transformation of the token is performed.

5. **Success handling:** The response is parsed. If `alreadyMarked` is `true`, the UI shows "Attendance already marked"; otherwise "Attendance marked successfully". Both cases display `userName` and `eventName`.

6. **Error handling:** On API error (non-2xx or network failure), the error message is shown in a red destructive alert and toast notification.

7. **Auto-reset:** After 3 seconds (`setTimeout`), the result is cleared and the camera resumes scanning:
   ```typescript
   setTimeout(() => {
     setLastResult(null);
     setScanning(true);
   }, 3000);
   ```

### Camera Error Handling

If the browser denies camera access or the device has no camera:
- `NotAllowedError` → shows "Camera permission denied" message
- Other errors → shows the raw error message
- A "Try Again" button resets the scanner state

### UI Components

| State | Display |
|---|---|
| Scanning | Live camera feed in a square black container |
| Processing | Spinner overlay on top of the camera feed |
| Success | Green alert with check icon, user name, event name |
| Already Marked | Same green alert, different message text |
| Error | Red destructive alert with error message |
| Camera Error | Red alert with permission instructions + retry button |

---

## 4. Mobile Implementation

### Architecture

The mobile scanner is **not a separate app or native build**. It is the same web page (`/scan-attendance`) opened in the mobile device's browser. The platform is a Progressive Web App (PWA), so the user can:

1. Open the URL directly in a mobile browser (Chrome, Safari, etc.)
2. Or install the PWA to the home screen and open it from there

### Camera Access

The `react-qr-scanner` component uses the browser's `MediaDevices.getUserMedia()` API with the constraint `{ video: { facingMode: "environment" } }` to request the rear camera. The mobile browser will prompt the user for camera permission on first use.

### Responsive Layout

The scanner page uses `max-w-2xl mx-auto` (max-width 672px, centered). The camera preview is rendered in a square `aspect-square` container that scales to the available width. On mobile screens, this fills most of the viewport width.

### No Special Mobile-Only Features

There is no:
- Separate mobile-specific layout or responsive breakpoints for the scanner
- Native camera API usage (everything is web-standard `getUserMedia`)
- Offline scan capability (the API call to mark attendance requires network)
- Device ID or operator ID tracking

---

## 5. Authorization Requirements

### Who Can Generate QR Codes

| Role | Can Generate | Condition |
|---|---|---|
| Member | Yes | Only for their own registrations |
| Admin | Yes | For any registration |
| Head Admin | Yes | For any registration |

The `GET /api/registrations/:id/qr-code` endpoint checks:
```typescript
const isOwner = registration.userId === userId;
const isAdminUser = req.user.role === 'admin' || req.user.is_head_admin;
if (!isOwner && !isAdminUser) → 403
```

### Who Can Scan QR Codes (Mark Attendance)

| Role | Can Scan |
|---|---|
| Member | No (403 Forbidden) |
| Teacher | No (403 Forbidden) |
| Admin | Yes |
| Head Admin | Yes |

The `POST /api/registrations/mark-attendance` endpoint uses the `isAdmin` middleware, which checks:
```typescript
const dbUser = await storage.getUser(userId);
if (dbUser?.role !== "admin") → 403
```

> **Important:** The `isAdmin` middleware only checks for `role === "admin"`. Head Admins pass this check because their role is also set to `"admin"` in the database — the `isHeadAdmin` flag is a separate boolean column, not a distinct role value.

### Session Requirements

The scanner page requires a valid session cookie (`connect.sid`). The session is established through either:
- **OAuth** (OpenID Connect flow)
- **Local email/password login** (Passport.js local strategy with bcrypt)

There is no separate "scan account" or special scanner-only authentication. The admin uses their regular platform credentials.

---

## 6. Database Schema

### `event_registrations` Table

```sql
CREATE TABLE event_registrations (
  id            VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      VARCHAR NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id       VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  guest_name    TEXT,
  guest_email   TEXT,
  attendance_marked BOOLEAN NOT NULL DEFAULT false,
  attendance_time   TIMESTAMP,
  created_at    TIMESTAMP DEFAULT now(),
  UNIQUE (event_id, user_id)
);
```

### Fields Modified by Check-In

| Field | Before Scan | After Scan |
|---|---|---|
| `attendance_marked` | `false` | `true` |
| `attendance_time` | `null` | Current timestamp (`new Date()`) |

### Unmark Behavior (Manual Toggle)

When an admin manually unmarks attendance via the PATCH endpoint:

| Field | Value |
|---|---|
| `attendance_marked` | `false` |
| `attendance_time` | `null` |

---

## 7. Complete Data Flow Diagram

```
┌─────────────────┐     GET /api/registrations/:id/qr-code
│  ATTENDEE        │ ──────────────────────────────────────────┐
│  (Member)        │                                            │
│                  │                                            v
│  Opens ticket    │                                  ┌──────────────────┐
│  page in browser │                                  │  SERVER           │
└─────────────────┘                                  │                  │
                                                      │ 1. Fetch regis-  │
                                                      │    tration from  │
                                                      │    DB            │
                                                      │ 2. Verify owner  │
                                                      │    or admin      │
                                                      │ 3. Sign JWT:     │
                                                      │    {regId, evtId}│
                                                      │    secret=       │
                                                      │    SESSION_SECRET│
                                                      │    TTL=4h        │
                                                      │ 4. Generate QR   │
                                                      │    from JWT via  │
                                                      │    qrcode lib    │
                                                      │ 5. Return base64 │
                                                      │    data URL      │
                                                      └────────┬─────────┘
                                                               │
                                                               v
                                                      ┌──────────────────┐
                                                      │  ATTENDEE'S      │
                                                      │  SCREEN          │
                                                      │                  │
                                                      │  Displays QR     │
                                                      │  code image      │
                                                      │  (300×300 px)    │
                                                      └────────┬─────────┘
                                                               │
                                             Admin points phone │
                                             camera at screen   │
                                                               v
┌─────────────────┐     POST /api/registrations/mark-attendance
│  ADMIN           │ ──────────────────────────────────────────┐
│  (Scanner)       │   body: { token: "<raw JWT>" }            │
│                  │                                            v
│  /scan-attendance│                                  ┌──────────────────┐
│  page in mobile  │                                  │  SERVER           │
│  browser / PWA   │                                  │                  │
└─────────────────┘                                  │ 1. jwt.verify()  │
                                                      │    → decode      │
                                                      │    regId, evtId  │
                                                      │ 2. Lookup        │
                                                      │    registration  │
                                                      │ 3. If already    │
                                                      │    marked →      │
                                                      │    200 + flag    │
                                                      │ 4. Else: UPDATE  │
                                                      │    attendance_   │
                                                      │    marked=true,  │
                                                      │    attendance_   │
                                                      │    time=now()    │
                                                      │ 5. Return user   │
                                                      │    name + event  │
                                                      │    name          │
                                                      └──────────────────┘
```

---

## 8. Security Considerations

| Concern | Current State |
|---|---|
| Token forgery | Protected by HMAC-SHA256 signature using `SESSION_SECRET` |
| Token replay | Not prevented — same token can be scanned again but it's idempotent (returns `alreadyMarked: true`) |
| Token expiry | 4-hour window; expired tokens return 401 |
| Cross-event scanning | The JWT contains `eventId` but the check-in endpoint **does not verify** the event matches — it only uses `registrationId` to mark attendance. The `eventId` in the token is currently unused during verification. |
| Secret strength | Falls back to `'default-secret'` if `SESSION_SECRET` is unset — should always be configured in production |
| Brute force | No rate limiting on the mark-attendance endpoint specifically |
| HTTPS | Enforced by the deployment infrastructure |

---

## 9. npm Dependencies

| Package | Version | Purpose |
|---|---|---|
| `qrcode` | ^1.5.x | Server-side QR code generation (toDataURL) |
| `jsonwebtoken` | ^9.x | JWT sign & verify |
| `react-qr-scanner` | ^1.x | Client-side camera QR reader (wraps `getUserMedia`) |
