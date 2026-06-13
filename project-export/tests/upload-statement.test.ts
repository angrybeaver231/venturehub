import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// ── Mock auth modules: pass-through middlewares that attach a configurable
//    test user so the real downstream handlers can run.
const currentUser: { value: any } = { value: { id: "u1", claims: { sub: "u1" } } };
const attachUser = (req: any, _res: any, next: any) => {
  if (currentUser.value) {
    req.user = currentUser.value;
    req.isAuthenticated = () => true;
  } else {
    req.isAuthenticated = () => false;
  }
  next();
};
vi.mock("../server/auth", () => ({
  setupAuth: vi.fn(async () => {}),
  isAuthenticated: attachUser,
  isNotFrozen: attachUser,
  isAdmin: attachUser,
  isHeadAdmin: attachUser,
  isTeacher: attachUser,
  isTeacherOrAdmin: attachUser,
  isPlatformAdminMiddleware: attachUser,
  isLmsAdmin: attachUser,
  isEventAdmin: attachUser,
  isInnoLabsAdmin: attachUser,
}));
vi.mock("../server/localAuth", () => ({
  setupLocalAuth: vi.fn(() => {}),
  isAuthenticatedLocal: attachUser,
  isAdminLocal: attachUser,
}));

// ── Mock storage: only methods touched at registration time + by the upload route.
const upsertCredentialMock = vi.fn().mockResolvedValue({ id: "cred-1" });
const getUserMock = vi.fn().mockResolvedValue({ id: "u1", role: "headAdmin", isFrozen: false });
const getStartupMock = vi.fn().mockResolvedValue({ id: "startup-1", createdBy: "u1" });
const getStartupMembersMock = vi.fn().mockResolvedValue([]);
vi.mock("../server/storage", () => ({
  storage: {
    getSystemSetting: vi.fn().mockResolvedValue(null),
    setSystemSetting: vi.fn().mockResolvedValue(undefined),
    getClubs: vi.fn().mockResolvedValue([]),
    updateClub: vi.fn().mockResolvedValue(undefined),
    getUser: getUserMock,
    getStartup: getStartupMock,
    getStartupMembers: getStartupMembersMock,
    upsertIntegrationCredential: upsertCredentialMock,
    getIntegrationCredentialsForStartup: vi.fn().mockResolvedValue([]),
    getActiveIntegrationCredentialsByKind: vi.fn().mockResolvedValue([]),
    deleteIntegrationCredential: vi.fn().mockResolvedValue(undefined),
    markSignalSourceStatus: vi.fn().mockResolvedValue(undefined),
    getAllSignalSources: vi.fn().mockResolvedValue([]),
    upsertSignalSource: vi.fn().mockResolvedValue(undefined),
    getScoreWeightPresets: vi.fn().mockResolvedValue([]),
    createScoreWeightPreset: vi.fn().mockResolvedValue(undefined),
    getCronJobs: vi.fn().mockResolvedValue([]),
    upsertCronJob: vi.fn().mockResolvedValue(undefined),
    getCronJobByName: vi.fn().mockResolvedValue(null),
    createCronJob: vi.fn().mockResolvedValue(undefined),
    updateCronJob: vi.fn().mockResolvedValue(undefined),
  },
}));

// ── Mock pipeline collaborators so the test stays hermetic.
const upsertSnapshotMock = vi.fn().mockResolvedValue({ previousMrrMinor: null });
const parseStatementMock = vi.fn().mockResolvedValue({
  mrrMinor: 42_000,
  revenueMinor: 168_000,
  currency: "RUB",
  activeCustomers: 3,
  rawText: "stub",
  txCount: 7,
});
const getVerifiedMrrMock = vi.fn();

vi.mock("../server/signals/sources/group4/shared", async () => {
  const actual = await vi.importActual<any>("../server/signals/sources/group4/shared");
  return { ...actual, upsertFinancialSnapshot: upsertSnapshotMock };
});
vi.mock("../server/signals/ocr", () => ({
  parseStatementBuffer: parseStatementMock,
  ocrBuffer: vi.fn(),
}));
vi.mock("../server/signals/sources/group4", async () => {
  const actual = await vi.importActual<any>("../server/signals/sources/group4");
  return {
    ...actual,
    getVerifiedMrrForStartup: (id: string) => getVerifiedMrrMock(id),
  };
});

// ── Stop signal scheduler from kicking off cron during route registration.
vi.mock("../server/signals/scheduler", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, startScheduler: vi.fn() };
});

// Many other heavy modules are imported transitively. We mock just enough to
// load `registerRoutes` without binding ports, opening sockets, or hitting DBs.
vi.mock("../server/db", () => ({ db: { select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [] }) }) }) }) } }));

async function buildApp() {
  const { registerRoutes } = await import("../server/routes");
  const app = express();
  app.use(express.json());
  await registerRoutes(app);
  return app;
}

describe("POST /api/startups/:id/financials/upload-statement (real route)", () => {
  beforeEach(() => {
    upsertSnapshotMock.mockClear();
    upsertCredentialMock.mockClear();
    parseStatementMock.mockClear();
    getVerifiedMrrMock.mockReset();
    getUserMock.mockResolvedValue({ id: "u1", role: "headAdmin", isFrozen: false });
    currentUser.value = { id: "u1", claims: { sub: "u1" } };
  });

  it("returns 400 when no file is attached", async () => {
    const app = await buildApp();
    const res = await request(app)
      .post("/api/startups/startup-1/financials/upload-statement")
      .expect(400);
    expect(res.body.message).toMatch(/No file/i);
  });

  it("rejects callers who cannot edit the startup's financials with 403", async () => {
    currentUser.value = { id: "u-other", claims: { sub: "u-other" } };
    getUserMock.mockResolvedValueOnce({ id: "u-other", role: "member", isFrozen: false });
    getStartupMock.mockResolvedValueOnce({ id: "startup-1", createdBy: "someone-else" });
    getStartupMembersMock.mockResolvedValueOnce([]);
    const app = await buildApp();
    await request(app)
      .post("/api/startups/startup-1/financials/upload-statement")
      .attach("statement", Buffer.from("x"), { filename: "a.pdf", contentType: "application/pdf" })
      .expect(403);
    expect(upsertSnapshotMock).not.toHaveBeenCalled();
    expect(upsertCredentialMock).not.toHaveBeenCalled();
  });

  it("rejects non-PDF/image uploads with the multer file filter", async () => {
    const app = await buildApp();
    await request(app)
      .post("/api/startups/startup-1/financials/upload-statement")
      .attach("statement", Buffer.from("nope"), { filename: "a.txt", contentType: "text/plain" })
      .expect(500); // multer surfaces the filter error
    expect(upsertSnapshotMock).not.toHaveBeenCalled();
  });

  it("parses the upload, writes a snapshot, registers credentials, and verified-mrr returns isVerified:true", async () => {
    const app = await buildApp();

    const uploadRes = await request(app)
      .post("/api/startups/startup-1/financials/upload-statement")
      .attach("statement", Buffer.from("fake-statement"), {
        filename: "march.pdf",
        contentType: "application/pdf",
      })
      .expect(200);

    expect(uploadRes.body).toMatchObject({
      ok: true,
      mrrMinor: 42_000,
      revenueMinor: 168_000,
      currency: "RUB",
      txCount: 7,
    });

    expect(parseStatementMock).toHaveBeenCalledOnce();
    expect(upsertSnapshotMock).toHaveBeenCalledOnce();
    const [sourceKey, snap] = upsertSnapshotMock.mock.calls[0];
    expect(sourceKey).toBe("fin-bank-ocr");
    expect(snap).toMatchObject({
      startupId: "startup-1",
      mrrMinor: 42_000,
      revenueMinor: 168_000,
      currency: "RUB",
      activeCustomers: 3,
    });
    expect(snap.payload).toMatchObject({ fileName: "march.pdf", txCount: 7 });

    expect(upsertCredentialMock).toHaveBeenCalledOnce();
    expect(upsertCredentialMock.mock.calls[0][0]).toMatchObject({
      startupId: "startup-1",
      kind: "bank-ocr",
      status: "active",
    });

    getVerifiedMrrMock.mockResolvedValueOnce({
      startupId: "startup-1",
      mrrMinor: 42_000,
      arrMinor: 504_000,
      revenueMinor: 168_000,
      revenueLast30dMinor: 168_000,
      burnLast30dMinor: 0,
      runwayMonths: null,
      currency: "RUB",
      sourceKey: "fin-bank-ocr",
      sourceLabel: "Bank statement OCR",
      capturedAt: new Date().toISOString(),
      isVerified: true,
      hasLiveConnector: true,
    });
    const vRes = await request(app).get("/api/startups/startup-1/verified-mrr").expect(200);
    expect(vRes.body.isVerified).toBe(true);
    expect(vRes.body.mrrMinor).toBe(42_000);
    expect(getVerifiedMrrMock).toHaveBeenCalledWith("startup-1");
  });
});
