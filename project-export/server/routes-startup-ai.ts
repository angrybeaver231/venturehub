import type { Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { z } from "zod";
import { storage } from "./storage";
import { isAuthenticated, isNotFrozen } from "./auth";
import { ObjectStorageService, objectStorageClient, parseObjectPath } from "./objectStorage";
import {
  extractTextFromFile,
  extractTractionFromText,
  chatWithStartupAssistant,
} from "./startup-ai-chat";
import type { ExtractedTraction, StartupDocument } from "@shared/schema";

const ALLOWED_DOC_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const ALLOWED_DOC_EXTS = /\.(pdf|xlsx|xls|pptx|docx|doc|csv|txt|png|jpe?g|webp)$/i;

const uploadStartupDoc = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    const okMime = ALLOWED_DOC_MIMES.has(file.mimetype);
    const okExt = ALLOWED_DOC_EXTS.test(file.originalname);
    if (okMime || okExt) return cb(null, true);
    cb(new Error("Unsupported file type. Allowed: PDF, Excel, PowerPoint, Word, CSV, images."));
  },
});

async function isFounderOrAdmin(userId: string, startupId: string): Promise<boolean> {
  const dbUser = await storage.getUser(userId);
  if (!dbUser) return false;
  if (dbUser.isHeadAdmin || dbUser.role === "innoLabsAdmin") return true;
  const userStartups = await storage.getUserStartups(userId);
  return userStartups.some(
    (us) =>
      us.startupId === startupId &&
      ["founder", "cofounder", "teamMember", "advisor"].includes(us.role),
  );
}

async function canViewStartup(userId: string | undefined): Promise<boolean> {
  // Public startups page is broadly visible to authenticated users; we use the
  // same loose check so that any logged-in viewer (investor / corp / member)
  // can see public documents on a startup card. Non-public docs are gated.
  return Boolean(userId);
}

function publicDocShape(d: StartupDocument) {
  return {
    id: d.id,
    startupId: d.startupId,
    filename: d.filename,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    title: d.title,
    description: d.description,
    isPublic: d.isPublic,
    aiSummary: d.aiSummary,
    extractedTraction: d.extractedTraction as ExtractedTraction | null,
    createdAt: d.createdAt,
  };
}

export function registerStartupAiRoutes(app: Express) {
  // -------- Documents --------

  // List documents. Founders/admins see everything; everyone else sees only
  // documents the founders explicitly marked public.
  app.get("/api/startups/:id/documents", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const startup = await storage.getStartup(req.params.id);
      if (!startup) return res.status(404).json({ message: "Startup not found" });
      const canManage = await isFounderOrAdmin(userId, startup.id);
      const docs = await storage.getStartupDocuments(startup.id, {
        publicOnly: !canManage,
      });
      res.json(docs.map(publicDocShape));
    } catch (err) {
      console.error("[startup-ai] list documents error", err);
      res.status(500).json({ message: "Failed to load documents" });
    }
  });

  // Upload a document. Stored privately in object storage; AI extraction runs
  // synchronously so the founder gets immediate feedback.
  app.post(
    "/api/startups/:id/documents",
    isAuthenticated,
    isNotFrozen,
    uploadStartupDoc.single("file"),
    async (req: any, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });
        const startup = await storage.getStartup(req.params.id);
        if (!startup) return res.status(404).json({ message: "Startup not found" });
        if (!(await isFounderOrAdmin(userId, startup.id))) {
          return res.status(403).json({ message: "Founders only" });
        }

        const isPublic = String(req.body.isPublic ?? "false") === "true";
        const title = typeof req.body.title === "string" ? req.body.title.trim() || null : null;
        const description =
          typeof req.body.description === "string" ? req.body.description.trim() || null : null;

        // Persist file in private object-storage bucket under
        // `<privateDir>/uploads/startup-docs/<startupId>/<uuid>.<ext>`.
        const objectStorage = new ObjectStorageService();
        const privateDir = objectStorage.getPrivateObjectDir();
        const ext = path.extname(req.file.originalname || "").toLowerCase() || "";
        const objectId = `${randomUUID()}${ext}`;
        const fullPath = `${privateDir}/uploads/startup-docs/${startup.id}/${objectId}`;
        const { bucketName, objectName } = parseObjectPath(fullPath);
        const bucket = objectStorageClient.bucket(bucketName);
        const file = bucket.file(objectName);
        await file.save(req.file.buffer, { metadata: { contentType: req.file.mimetype } });

        // Run extraction (best-effort). Failure is non-fatal: the document is
        // still saved so the founder can manage it.
        let aiSummary: string | null = null;
        let extractedTraction: ExtractedTraction | null = null;
        let extractedTextPreview: string | null = null;
        try {
          const parsed = await extractTextFromFile(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname,
          );
          if (parsed.text) {
            extractedTextPreview = parsed.text.slice(0, 2000);
            const ext = await extractTractionFromText(parsed.text, {
              startupName: startup.name,
              vertical: startup.vertical,
              filename: req.file.originalname,
            });
            aiSummary = ext.summary || null;
            extractedTraction = ext.traction;
          } else if (parsed.warning) {
            aiSummary = parsed.warning;
          }
        } catch (err) {
          console.warn("[startup-ai] extraction failed", err);
        }

        const doc = await storage.createStartupDocument({
          startupId: startup.id,
          uploaderUserId: userId,
          filename: req.file.originalname,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          storageKey: objectName,
          bucketName,
          title,
          description,
          isPublic,
          aiSummary,
          extractedTraction: extractedTraction as any,
          extractedTextPreview,
        });

        res.status(201).json(publicDocShape(doc));
      } catch (err: any) {
        console.error("[startup-ai] upload error", err);
        res.status(500).json({ message: err?.message || "Upload failed" });
      }
    },
  );

  // Update visibility / title / description.
  const patchSchema = z.object({
    title: z.string().max(200).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    isPublic: z.boolean().optional(),
  });
  app.patch(
    "/api/startups/:id/documents/:docId",
    isAuthenticated,
    isNotFrozen,
    async (req: any, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const startup = await storage.getStartup(req.params.id);
        if (!startup) return res.status(404).json({ message: "Startup not found" });
        if (!(await isFounderOrAdmin(userId, startup.id))) {
          return res.status(403).json({ message: "Founders only" });
        }
        const doc = await storage.getStartupDocument(req.params.docId);
        if (!doc || doc.startupId !== startup.id) {
          return res.status(404).json({ message: "Document not found" });
        }
        const patch = patchSchema.parse(req.body);
        const updated = await storage.updateStartupDocument(doc.id, patch);
        res.json(updated ? publicDocShape(updated) : null);
      } catch (err: any) {
        if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid payload" });
        console.error("[startup-ai] patch doc error", err);
        res.status(500).json({ message: "Failed to update document" });
      }
    },
  );

  app.delete(
    "/api/startups/:id/documents/:docId",
    isAuthenticated,
    isNotFrozen,
    async (req: any, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const startup = await storage.getStartup(req.params.id);
        if (!startup) return res.status(404).json({ message: "Startup not found" });
        if (!(await isFounderOrAdmin(userId, startup.id))) {
          return res.status(403).json({ message: "Founders only" });
        }
        const doc = await storage.getStartupDocument(req.params.docId);
        if (!doc || doc.startupId !== startup.id) {
          return res.status(404).json({ message: "Document not found" });
        }
        // Best-effort blob delete; row delete is the source of truth.
        try {
          await objectStorageClient.bucket(doc.bucketName).file(doc.storageKey).delete();
        } catch (err) {
          console.warn("[startup-ai] blob delete failed", err);
        }
        await storage.deleteStartupDocument(doc.id);
        res.json({ ok: true });
      } catch (err) {
        console.error("[startup-ai] delete error", err);
        res.status(500).json({ message: "Failed to delete document" });
      }
    },
  );

  // Stream a document. Public docs are accessible to any authenticated user;
  // private docs only to founders/admins.
  app.get(
    "/api/startups/:id/documents/:docId/file",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const startup = await storage.getStartup(req.params.id);
        if (!startup) return res.status(404).json({ message: "Startup not found" });
        const doc = await storage.getStartupDocument(req.params.docId);
        if (!doc || doc.startupId !== startup.id) {
          return res.status(404).json({ message: "Not found" });
        }
        if (!doc.isPublic) {
          if (!(await isFounderOrAdmin(userId, startup.id))) {
            return res.status(403).json({ message: "Forbidden" });
          }
        } else if (!(await canViewStartup(userId))) {
          return res.status(403).json({ message: "Forbidden" });
        }
        const file = objectStorageClient.bucket(doc.bucketName).file(doc.storageKey);
        const [exists] = await file.exists();
        if (!exists) return res.status(404).json({ message: "File missing" });
        const [metadata] = await file.getMetadata();
        res.setHeader("Content-Type", metadata.contentType || doc.mimeType || "application/octet-stream");
        res.setHeader("Content-Length", String(metadata.size ?? doc.sizeBytes));
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${encodeURIComponent(doc.filename)}"`,
        );
        file.createReadStream().on("error", (err) => {
          console.error("[startup-ai] stream error", err);
          if (!res.headersSent) res.status(500).end();
        }).pipe(res);
      } catch (err) {
        console.error("[startup-ai] download error", err);
        if (!res.headersSent) res.status(500).json({ message: "Download failed" });
      }
    },
  );

  // -------- AI chat --------

  app.get(
    "/api/startups/:id/ai-chat/messages",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const startup = await storage.getStartup(req.params.id);
        if (!startup) return res.status(404).json({ message: "Startup not found" });
        if (!(await isFounderOrAdmin(userId, startup.id))) {
          return res.status(403).json({ message: "Founders only" });
        }
        const messages = await storage.getStartupAiChatMessages(startup.id, 200);
        res.json(messages);
      } catch (err) {
        console.error("[startup-ai] list messages error", err);
        res.status(500).json({ message: "Failed to load messages" });
      }
    },
  );

  const sendSchema = z.object({
    content: z.string().min(1).max(4000),
    documentId: z.string().optional().nullable(),
    language: z.enum(["en", "ru"]).optional(),
  });

  app.post(
    "/api/startups/:id/ai-chat/messages",
    isAuthenticated,
    isNotFrozen,
    async (req: any, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const startup = await storage.getStartup(req.params.id);
        if (!startup) return res.status(404).json({ message: "Startup not found" });
        if (!(await isFounderOrAdmin(userId, startup.id))) {
          return res.status(403).json({ message: "Founders only" });
        }
        const body = sendSchema.parse(req.body);

        // Persist the user turn first so it shows up even if AI fails.
        const userMsg = await storage.createStartupAiChatMessage({
          startupId: startup.id,
          userId,
          role: "user",
          content: body.content,
          documentId: body.documentId || null,
          metadata: null,
        });

        // Build context: latest 12 messages + all documents this startup has
        // (we send only summaries + extracted traction, not the raw text, to
        // keep prompt size bounded).
        const history = (await storage.getStartupAiChatMessages(startup.id, 24)).map((m) => ({
          role: (m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user") as
            | "user"
            | "assistant"
            | "system",
          content: m.content,
        }));
        const docs = await storage.getStartupDocuments(startup.id);
        const attachedDocs = docs.slice(0, 8).map((d) => ({
          id: d.id,
          filename: d.filename,
          summary: d.aiSummary || "",
          traction: (d.extractedTraction as ExtractedTraction | null) || null,
        }));

        let assistantText = "";
        let toolCalls: any[] = [];
        try {
          const run = await chatWithStartupAssistant({
            startup,
            history,
            attachedDocs,
            language: body.language || "en",
            actorUserId: userId,
          });
          assistantText = run.text;
          toolCalls = run.toolCalls;
        } catch (err) {
          console.error("[startup-ai] chat error", err);
          assistantText =
            body.language === "ru"
              ? "Извините, я сейчас недоступен. Попробуйте позже."
              : "Sorry, I'm not available right now. Please try again later.";
        }
        const assistantMsg = await storage.createStartupAiChatMessage({
          startupId: startup.id,
          userId: null,
          role: "assistant",
          content: assistantText || "(empty response)",
          documentId: null,
          metadata: toolCalls.length ? ({ toolCalls } as any) : null,
        });

        res.status(201).json({ user: userMsg, assistant: assistantMsg, toolCalls });
      } catch (err: any) {
        if (err?.name === "ZodError") return res.status(400).json({ message: "Invalid payload" });
        console.error("[startup-ai] send error", err);
        res.status(500).json({ message: "Failed to send message" });
      }
    },
  );

  app.delete(
    "/api/startups/:id/ai-chat/messages",
    isAuthenticated,
    isNotFrozen,
    async (req: any, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        const startup = await storage.getStartup(req.params.id);
        if (!startup) return res.status(404).json({ message: "Startup not found" });
        if (!(await isFounderOrAdmin(userId, startup.id))) {
          return res.status(403).json({ message: "Founders only" });
        }
        await storage.clearStartupAiChat(startup.id);
        res.json({ ok: true });
      } catch (err) {
        console.error("[startup-ai] clear chat error", err);
        res.status(500).json({ message: "Failed to clear chat" });
      }
    },
  );
}
