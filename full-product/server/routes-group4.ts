import type { Express, Request, Response } from "express";
import express from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "./db";
import { startupFinancials } from "@shared/schema";
import {
  applySubscriptionEvent,
  getStartupWebhookSecret,
  parseLemonSqueezyEvent,
  parsePaddleEvent,
  parseStripeEvent,
  verifyLemonSqueezySignature,
  verifyPaddleSignature,
  verifyStripeSignature,
  COHORT_SOURCE_KEY,
} from "./signals/sources/group4/stripe-webhook";

type CanEditFinancials = (req: any, startupId: string) => Promise<boolean>;

function rawJson() {
  // Webhooks need the unparsed bytes for signature verification, so we use a
  // local express.raw() middleware (the global JSON parser still applies to
  // every other route).
  return express.raw({ type: "*/*", limit: "1mb" });
}

function readRaw(req: Request): string {
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  if (typeof req.body === "string") return req.body;
  return "";
}

/**
 * Group 4 webhook + CSV-export routes.
 * Mounted from `server/routes.ts` after Group 3 routes.
 */
export function registerGroup4Routes(
  app: Express,
  isAuthenticated: any,
  canEditStartupFinancials: CanEditFinancials,
): void {
  // ── Stripe / LemonSqueezy / Paddle subscription webhooks ─────────────────
  app.post(
    "/api/webhooks/stripe/:startupId",
    rawJson(),
    async (req: Request, res: Response) => {
      try {
        const startupId = req.params.startupId;
        const secret = await getStartupWebhookSecret(startupId, "stripe");
        if (!secret) {
          return res
            .status(400)
            .json({ message: "Stripe webhook secret not configured for this startup" });
        }
        const raw = readRaw(req);
        const sig = req.header("Stripe-Signature") ?? undefined;
        if (!verifyStripeSignature(raw, sig, secret)) {
          return res.status(400).json({ message: "Invalid signature" });
        }
        const body = JSON.parse(raw);
        const evt = parseStripeEvent(body);
        if (!evt) return res.json({ ok: true, ignored: true });
        const result = await applySubscriptionEvent(startupId, evt);
        return res.json({ ok: true, ...result });
      } catch (err: any) {
        return res.status(500).json({ message: err?.message ?? "stripe webhook error" });
      }
    },
  );

  app.post(
    "/api/webhooks/lemonsqueezy/:startupId",
    rawJson(),
    async (req: Request, res: Response) => {
      try {
        const startupId = req.params.startupId;
        const secret = await getStartupWebhookSecret(startupId, "lemonsqueezy");
        if (!secret) {
          return res
            .status(400)
            .json({ message: "LemonSqueezy webhook secret not configured for this startup" });
        }
        const raw = readRaw(req);
        const sig = req.header("X-Signature") ?? undefined;
        if (!verifyLemonSqueezySignature(raw, sig, secret)) {
          return res.status(400).json({ message: "Invalid signature" });
        }
        const body = JSON.parse(raw);
        const evt = parseLemonSqueezyEvent(body);
        if (!evt) return res.json({ ok: true, ignored: true });
        const result = await applySubscriptionEvent(startupId, evt);
        return res.json({ ok: true, ...result });
      } catch (err: any) {
        return res.status(500).json({ message: err?.message ?? "lemonsqueezy webhook error" });
      }
    },
  );

  app.post(
    "/api/webhooks/paddle/:startupId",
    rawJson(),
    async (req: Request, res: Response) => {
      try {
        const startupId = req.params.startupId;
        const secret = await getStartupWebhookSecret(startupId, "paddle");
        if (!secret) {
          return res
            .status(400)
            .json({ message: "Paddle webhook secret not configured for this startup" });
        }
        const raw = readRaw(req);
        const sig = req.header("Paddle-Signature") ?? undefined;
        if (!verifyPaddleSignature(raw, sig, secret)) {
          return res.status(400).json({ message: "Invalid signature" });
        }
        const body = JSON.parse(raw);
        const evt = parsePaddleEvent(body);
        if (!evt) return res.json({ ok: true, ignored: true });
        const result = await applySubscriptionEvent(startupId, evt);
        return res.json({ ok: true, ...result });
      } catch (err: any) {
        return res.status(500).json({ message: err?.message ?? "paddle webhook error" });
      }
    },
  );

  // ── Cohort retention summary (used by FinancialStoryCard cohort bars) ────
  app.get(
    "/api/startups/:id/financials/cohorts",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const [row] = await db
          .select()
          .from(startupFinancials)
          .where(and(
            eq(startupFinancials.startupId, req.params.id),
            eq(startupFinancials.sourceKey, COHORT_SOURCE_KEY),
          ))
          .orderBy(desc(startupFinancials.snapshotDate))
          .limit(1);
        const payload = (row?.payload ?? {}) as any;
        return res.json({
          cohorts: Array.isArray(payload.cohorts) ? payload.cohorts : [],
          lastEventAt: payload.lastEventAt ?? null,
          lastProvider: payload.lastProvider ?? null,
          totalCustomers: payload.byCustomer ? Object.keys(payload.byCustomer).length : 0,
          currency: row?.currency ?? "USD",
        });
      } catch (err: any) {
        return res.status(500).json({ message: err?.message ?? "cohorts error" });
      }
    },
  );

  // ── CSV export of a parsed bank-statement upload ─────────────────────────
  app.get(
    "/api/startups/:id/financials/statement-csv",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        if (!(await canEditStartupFinancials(req, req.params.id))) {
          return res.status(403).json({ message: "Forbidden" });
        }
        const uploadId = String(req.query.uploadId ?? "").trim();
        if (!uploadId) return res.status(400).json({ message: "uploadId required" });
        const [row] = await db
          .select()
          .from(startupFinancials)
          .where(and(
            eq(startupFinancials.id, uploadId),
            eq(startupFinancials.startupId, req.params.id),
          ))
          .limit(1);
        if (!row) return res.status(404).json({ message: "Upload not found" });
        const payload = (row.payload ?? {}) as any;
        const txs: Array<{
          date: string;
          counterparty: string;
          amountMinor: number;
          direction: string;
        }> = Array.isArray(payload.transactions) ? payload.transactions : [];
        const header = "date,counterparty,amount_minor,direction,currency";
        const escape = (v: string): string => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const lines = txs.map((t) => [
          t.date,
          escape(t.counterparty ?? ""),
          t.amountMinor,
          t.direction,
          row.currency,
        ].join(","));
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="statement-${uploadId}.csv"`,
        );
        return res.send([header, ...lines].join("\n"));
      } catch (err: any) {
        return res.status(500).json({ message: err?.message ?? "csv error" });
      }
    },
  );
}
