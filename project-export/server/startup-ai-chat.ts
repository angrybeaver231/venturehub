import OpenAI from "openai";
import type { ExtractedTraction, Startup } from "@shared/schema";
import { storage } from "./storage";
import {
  insertStartupSchema,
  insertStartupMetricSchema,
  insertTeamMemberSchema,
  STARTUP_STAGES,
} from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MODEL = "gpt-4o-mini";
const MAX_TEXT_CHARS = 18_000;

export type FileExtractResult = {
  text: string;
  pages?: number;
  warning?: string;
};

export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<FileExtractResult> {
  const lower = (filename || "").toLowerCase();
  const isPdf = mimeType === "application/pdf" || lower.endsWith(".pdf");
  const isXlsx =
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls");
  const isPptx =
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    lower.endsWith(".pptx");
  const isDocx =
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx");
  const isCsv = mimeType === "text/csv" || lower.endsWith(".csv");
  const isText = mimeType?.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md");

  try {
    if (isPdf) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      return { text: (result?.text || "").slice(0, MAX_TEXT_CHARS) };
    }
    if (isXlsx) {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buffer, { type: "buffer" });
      const parts: string[] = [];
      for (const name of wb.SheetNames) {
        const sheet = wb.Sheets[name];
        if (!sheet) continue;
        parts.push(`# Sheet: ${name}`);
        parts.push(XLSX.utils.sheet_to_csv(sheet));
      }
      return { text: parts.join("\n").slice(0, MAX_TEXT_CHARS) };
    }
    if (isPptx || isDocx) {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(buffer);
      const parts: string[] = [];
      const files = Object.keys(zip.files).filter((n) => {
        if (isPptx) return n.startsWith("ppt/slides/slide") && n.endsWith(".xml");
        return n === "word/document.xml" || n.startsWith("word/header") || n.startsWith("word/footer");
      });
      files.sort();
      let pageIdx = 0;
      for (const name of files) {
        const f = zip.file(name);
        if (!f) continue;
        pageIdx += 1;
        const xml = await f.async("string");
        const re = /<(?:a|w):t[^>]*>([\s\S]*?)<\/(?:a|w):t>/g;
        const slideTexts: string[] = [];
        let m: RegExpExecArray | null;
        while ((m = re.exec(xml)) !== null) {
          const piece = m[1].replace(/<[^>]+>/g, "").trim();
          if (piece) slideTexts.push(piece);
        }
        if (slideTexts.length) {
          if (isPptx) parts.push(`# Slide ${pageIdx}`);
          parts.push(slideTexts.join(" "));
        }
      }
      return {
        text: parts.join("\n").slice(0, MAX_TEXT_CHARS),
        pages: isPptx ? files.length : undefined,
      };
    }
    if (isCsv || isText) {
      return { text: buffer.toString("utf8").slice(0, MAX_TEXT_CHARS) };
    }
  } catch (err) {
    return {
      text: "",
      warning: `Could not parse ${filename}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  return { text: "", warning: `Unsupported file type: ${mimeType || filename}` };
}

const TRACTION_SYSTEM = [
  "You are an investment analyst extracting traction metrics from a startup's uploaded document.",
  "Read the provided text and return a JSON object describing any verifiable traction signals.",
  "Only fill a field when the document explicitly states it. Use null for unknown numeric fields.",
  "Numbers must be plain numbers (no commas, no currency suffixes). Convert percentages to plain numbers (e.g. 12 for 12%).",
  "If the document expresses revenue in 'thousand' or 'M', expand to the full integer.",
  "`confidence` is a 0..1 score reflecting how clearly the metrics were stated.",
  "Be concise and never invent data.",
].join(" ");

const TRACTION_SCHEMA_HINT = `{
  "summary": "1-3 sentence plain-text summary of what this document is and the strongest traction signal.",
  "traction": {
    "mrr": number|null,
    "arr": number|null,
    "revenue": number|null,
    "revenuePeriod": "monthly"|"quarterly"|"annual"|"ttm"|null,
    "users": number|null,
    "activeUsers": number|null,
    "paidCustomers": number|null,
    "pilots": number|null,
    "growthRatePct": number|null,
    "churnPct": number|null,
    "fundingRaisedUsd": number|null,
    "partnerships": string[],
    "highlights": string[],
    "currency": "USD"|"RUB"|"EUR"|null,
    "asOf": "YYYY-MM-DD"|null,
    "confidence": number
  }
}`;

export async function extractTractionFromText(
  text: string,
  ctx: { startupName?: string; vertical?: string | null; filename?: string },
): Promise<{ summary: string; traction: ExtractedTraction }> {
  if (!text || text.trim().length < 20) {
    return { summary: "", traction: { confidence: 0 } };
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const resp = await openai.chat.completions.create(
      {
        model: MODEL,
        temperature: 0.1,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${TRACTION_SYSTEM}\n\nReturn JSON shaped like:\n${TRACTION_SCHEMA_HINT}` },
          {
            role: "user",
            content:
              `Startup: ${ctx.startupName ?? "unknown"}${ctx.vertical ? ` (vertical: ${ctx.vertical})` : ""}\n` +
              `File: ${ctx.filename ?? "document"}\n\nDOCUMENT TEXT (truncated):\n${text.slice(0, MAX_TEXT_CHARS)}`,
          },
        ],
      },
      { signal: ctrl.signal },
    );
    const raw = resp.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    const traction = parsed.traction || {};
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
      traction: {
        mrr: numOrNull(traction.mrr),
        arr: numOrNull(traction.arr),
        revenue: numOrNull(traction.revenue),
        revenuePeriod: strOrNull(traction.revenuePeriod),
        users: numOrNull(traction.users),
        activeUsers: numOrNull(traction.activeUsers),
        paidCustomers: numOrNull(traction.paidCustomers),
        pilots: numOrNull(traction.pilots),
        growthRatePct: numOrNull(traction.growthRatePct),
        churnPct: numOrNull(traction.churnPct),
        fundingRaisedUsd: numOrNull(traction.fundingRaisedUsd),
        partnerships: Array.isArray(traction.partnerships)
          ? traction.partnerships.filter((s: any) => typeof s === "string").slice(0, 12)
          : [],
        highlights: Array.isArray(traction.highlights)
          ? traction.highlights.filter((s: any) => typeof s === "string").slice(0, 12)
          : [],
        currency: strOrNull(traction.currency),
        asOf: strOrNull(traction.asOf),
        confidence: typeof traction.confidence === "number" ? Math.max(0, Math.min(1, traction.confidence)) : 0,
      },
    };
  } catch (err) {
    return { summary: "", traction: { confidence: 0 } };
  } finally {
    clearTimeout(t);
  }
}

// ---------------- Tool-calling chat ----------------

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "update_startup_profile",
      description:
        "Update the startup's profile fields (description, vertical, stage, website, HQ city, team size, tech stack). Only pass fields you actually want to change.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Public 1-3 paragraph description of what the startup does." },
          vertical: { type: "string", description: "Industry vertical (e.g. 'HealthTech', 'FinTech')." },
          stage: { type: "string", enum: [...STARTUP_STAGES] as string[] },
          website: { type: "string" },
          hqCity: { type: "string" },
          teamSize: { type: "integer", minimum: 0 },
          techStack: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_or_update_metric",
      description:
        "Add a monthly metric snapshot to the startup's traction history. Use ISO month 'YYYY-MM'. If a snapshot for that month already exists it will be updated.",
      parameters: {
        type: "object",
        required: ["month"],
        properties: {
          month: { type: "string", pattern: "^\\d{4}-\\d{2}$" },
          users: { type: "integer", minimum: 0 },
          revenue: { type: "integer", minimum: 0, description: "Period revenue in major currency units (no decimals)." },
          mrr: { type: "integer", minimum: 0 },
          pilots: { type: "integer", minimum: 0 },
          customMetrics: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "value"],
              properties: {
                name: { type: "string" },
                value: { type: "string" },
                unit: { type: "string" },
              },
            },
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_team_member",
      description:
        "Add a team member / cofounder / advisor to the startup. Use this when the founder mentions someone or when their name appears in an uploaded document.",
      parameters: {
        type: "object",
        required: ["fullName"],
        properties: {
          fullName: { type: "string" },
          role: { type: "string", description: "e.g. CTO, COO, Advisor, Cofounder." },
          isFounder: { type: "boolean" },
          linkedinUrl: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "publish_document",
      description: "Mark an uploaded document as public so investors can see it on the startup page.",
      parameters: {
        type: "object",
        required: ["documentId"],
        properties: {
          documentId: { type: "string", description: "The id of one of the attached documents." },
          isPublic: { type: "boolean", default: true },
        },
        additionalProperties: false,
      },
    },
  },
];

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };
type AttachedDoc = {
  id?: string;
  filename: string;
  summary: string;
  traction?: ExtractedTraction | null;
};

export type ChatToolCall = {
  name: string;
  args: any;
  result: { ok: boolean; message: string; data?: any };
};

export type ChatRunResult = {
  text: string;
  toolCalls: ChatToolCall[];
};

export async function chatWithStartupAssistant(opts: {
  startup: Pick<Startup, "id" | "name" | "vertical" | "stage" | "description">;
  history: ChatMessage[];
  attachedDocs?: AttachedDoc[];
  language?: "en" | "ru";
  actorUserId: string;
}): Promise<ChatRunResult> {
  const lang = opts.language === "ru" ? "Russian" : "English";
  const sys = [
    `You are an AI co-pilot for the founders of "${opts.startup.name}" on the Ventorix platform.`,
    `Reply in ${lang}. Be concise, friendly, and proactive.`,
    `IMPORTANT: When the founder asks you to publish, save, add, or "хочу опубликовать" / "добавь" / "сохрани" data, you MUST call the appropriate tool to actually persist it — do not just describe what to do.`,
    `Available actions: update_startup_profile, add_or_update_metric, add_team_member, publish_document.`,
    `When you call a tool, after the tool result arrives, briefly confirm to the founder what was saved (numbers, names) in plain language.`,
    `Use uploaded documents (listed below) as the source of truth for metrics, partnerships, team members. If a fact isn't in the docs or chat, ask first instead of inventing.`,
    `For revenue / MRR — store the integer in major currency units (e.g. "200 миллионов рублей" = 200000000). Pick a recent month (e.g. current month) for forecasts unless the document gives a date.`,
    `Startup vertical: ${opts.startup.vertical || "n/a"}. Stage: ${opts.startup.stage || "n/a"}.`,
  ].join("\n");

  const docContext =
    opts.attachedDocs && opts.attachedDocs.length
      ? "\n\nATTACHED DOCUMENTS (refer to these by id when calling publish_document):\n" +
        opts.attachedDocs
          .map(
            (d) =>
              `- id=${d.id || "(unknown)"} filename="${d.filename}" → ${d.summary || "(no summary)"}` +
              (d.traction ? `\n  Extracted: ${JSON.stringify(d.traction)}` : ""),
          )
          .join("\n")
      : "";

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: sys + docContext },
    ...opts.history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
  ];

  const toolCalls: ChatToolCall[] = [];
  const MAX_LOOPS = 5;

  for (let loop = 0; loop < MAX_LOOPS; loop++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);
    let resp: OpenAI.Chat.Completions.ChatCompletion;
    try {
      resp = await openai.chat.completions.create(
        {
          model: MODEL,
          temperature: 0.3,
          max_tokens: 800,
          messages,
          tools: TOOLS,
          tool_choice: "auto",
        },
        { signal: ctrl.signal },
      );
    } finally {
      clearTimeout(timer);
    }
    const choice = resp.choices[0];
    const msg = choice?.message;
    if (!msg) break;

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return { text: (msg.content || "").trim(), toolCalls };
    }

    // Push the assistant turn (with tool_calls) so OpenAI can correlate
    // tool messages back to it.
    messages.push({
      role: "assistant",
      content: msg.content || "",
      tool_calls: msg.tool_calls,
    });

    for (const call of msg.tool_calls) {
      if (call.type !== "function") continue;
      let args: any = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }
      const result = await runTool(call.function.name, args, {
        startupId: opts.startup.id,
        actorUserId: opts.actorUserId,
        attachedDocs: opts.attachedDocs || [],
      });
      toolCalls.push({ name: call.function.name, args, result });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    text:
      opts.language === "ru"
        ? "Готово, проверьте раздел метрик и команды."
        : "Done — check the metrics and team sections.",
    toolCalls,
  };
}

async function runTool(
  name: string,
  args: any,
  ctx: { startupId: string; actorUserId: string; attachedDocs: AttachedDoc[] },
): Promise<{ ok: boolean; message: string; data?: any }> {
  try {
    switch (name) {
      case "update_startup_profile": {
        const allowed: any = {};
        for (const k of ["description", "vertical", "stage", "website", "hqCity", "teamSize", "techStack"]) {
          if (args[k] !== undefined && args[k] !== null && args[k] !== "") allowed[k] = args[k];
        }
        if (Object.keys(allowed).length === 0) {
          return { ok: false, message: "No fields provided." };
        }
        const partial = insertStartupSchema.partial().safeParse(allowed);
        if (!partial.success) {
          return { ok: false, message: `Invalid fields: ${partial.error.message}` };
        }
        const updated = await storage.updateStartup(ctx.startupId, partial.data);
        return { ok: true, message: `Profile updated.`, data: { fields: Object.keys(allowed), startupName: updated.name } };
      }

      case "add_or_update_metric": {
        const monthRe = /^\d{4}-\d{2}$/;
        if (!monthRe.test(args.month || "")) {
          return { ok: false, message: "month must be 'YYYY-MM'." };
        }
        const payload: any = { startupId: ctx.startupId, month: args.month };
        for (const k of ["users", "revenue", "mrr", "pilots"]) {
          if (typeof args[k] === "number" && Number.isFinite(args[k])) payload[k] = Math.round(args[k]);
        }
        if (Array.isArray(args.customMetrics) && args.customMetrics.length) {
          payload.customMetrics = args.customMetrics.slice(0, 20);
        }
        const parsed = insertStartupMetricSchema.safeParse(payload);
        if (!parsed.success) {
          return { ok: false, message: `Invalid metric: ${parsed.error.message}` };
        }
        // Upsert by month: if a snapshot for this month exists, update it.
        const existing = (await storage.getStartupMetrics(ctx.startupId)).find(
          (m) => m.month === args.month,
        );
        let row;
        if (existing) {
          row = await storage.updateStartupMetric(existing.id, parsed.data);
        } else {
          row = await storage.createStartupMetric(parsed.data);
        }
        return { ok: true, message: `Metric saved for ${args.month}.`, data: row };
      }

      case "add_team_member": {
        if (!args.fullName || typeof args.fullName !== "string") {
          return { ok: false, message: "fullName required." };
        }
        // Idempotency: skip if a team member with the same name already exists.
        const existing = await storage.getTeamMembers(ctx.startupId);
        const dup = existing.find(
          (m) => m.fullName.trim().toLowerCase() === args.fullName.trim().toLowerCase(),
        );
        if (dup) {
          return { ok: true, message: `Already on the team: ${args.fullName}.`, data: dup };
        }
        const payload = {
          startupId: ctx.startupId,
          fullName: args.fullName.trim().slice(0, 200),
          role: typeof args.role === "string" ? args.role.trim().slice(0, 100) : null,
          isFounder: !!args.isFounder,
          linkedinUrl:
            typeof args.linkedinUrl === "string" && args.linkedinUrl.startsWith("http")
              ? args.linkedinUrl.slice(0, 500)
              : null,
        };
        const parsed = insertTeamMemberSchema.safeParse(payload);
        if (!parsed.success) {
          return { ok: false, message: `Invalid member: ${parsed.error.message}` };
        }
        const row = await storage.createTeamMember(parsed.data);
        return { ok: true, message: `Added ${args.fullName} to the team.`, data: row };
      }

      case "publish_document": {
        const docId: string | undefined = args.documentId;
        if (!docId) return { ok: false, message: "documentId required." };
        const doc = await storage.getStartupDocument(docId);
        if (!doc || doc.startupId !== ctx.startupId) {
          return { ok: false, message: "Document not found." };
        }
        const isPublic = args.isPublic === false ? false : true;
        const updated = await storage.updateStartupDocument(doc.id, { isPublic });
        return {
          ok: true,
          message: isPublic ? `Marked "${doc.filename}" as public.` : `Marked "${doc.filename}" as private.`,
          data: { id: doc.id, filename: doc.filename, isPublic },
        };
      }

      default:
        return { ok: false, message: `Unknown tool: ${name}` };
    }
  } catch (err: any) {
    return { ok: false, message: err?.message || "Tool execution failed." };
  }
}

function numOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function strOrNull(v: any): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}
