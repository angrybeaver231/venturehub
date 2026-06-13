import { z } from "zod";

/**
 * Plain TypeScript + Zod data model.
 *
 * This standalone project intentionally avoids a database. All data lives in
 * memory (see server/storage.ts) and is seeded with sample content on startup.
 * Zod schemas validate incoming request bodies.
 */

/* ----------------------------------- Events ---------------------------------- */

export const eventTypes = [
  "conference",
  "workshop",
  "pitch_day",
  "demo_day",
  "networking",
] as const;
export type EventType = (typeof eventTypes)[number];

export interface Event {
  id: string;
  name: string;
  date: string; // ISO date, e.g. "2026-09-12"
  time: string; // e.g. "18:00"
  location: string;
  duration: string; // e.g. "2h"
  eventType: EventType;
  description: string;
  status: "upcoming" | "past";
  isFeatured: boolean;
  registrationOpen: boolean;
}

export const insertEventSchema = z.object({
  name: z.string().min(2).max(160),
  date: z.string().min(4),
  time: z.string().min(1),
  location: z.string().min(1),
  duration: z.string().min(1),
  eventType: z.enum(eventTypes),
  description: z.string().max(4000).default(""),
  isFeatured: z.boolean().default(false),
  registrationOpen: z.boolean().default(true),
});
export type InsertEvent = z.infer<typeof insertEventSchema>;

export interface Registration {
  id: string;
  eventId: string;
  guestName: string;
  guestEmail: string;
  attendanceMarked: boolean;
  createdAt: string;
}

export const insertRegistrationSchema = z.object({
  eventId: z.string().min(1),
  guestName: z.string().min(2).max(120),
  guestEmail: z.string().email(),
});
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;

/* ---------------------------------- Startups --------------------------------- */

export const startupStages = [
  "idea",
  "mvp",
  "pre_seed",
  "seed",
  "series_a",
] as const;
export type StartupStage = (typeof startupStages)[number];

export interface StartupMember {
  id: string;
  name: string;
  role: "founder" | "cofounder" | "team_member" | "advisor";
  title: string;
}

export interface Startup {
  id: string;
  name: string;
  description: string;
  website: string;
  vertical: string;
  stage: StartupStage;
  techStack: string;
  hqCity: string;
  teamSize: number;
  logo: string; // emoji-free: a short text label / initials placeholder
  members: StartupMember[];
}

export const insertStartupSchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(4000).default(""),
  website: z.string().default(""),
  vertical: z.string().min(1),
  stage: z.enum(startupStages),
  techStack: z.string().default(""),
  hqCity: z.string().default(""),
  teamSize: z.coerce.number().int().min(1).max(10000).default(1),
});
export type InsertStartup = z.infer<typeof insertStartupSchema>;

/* --------------------------------- Investors --------------------------------- */

export const investorKinds = [
  "vc_fund",
  "angel",
  "corporate_vc",
  "accelerator",
] as const;
export type InvestorKind = (typeof investorKinds)[number];

export interface InvestorMember {
  id: string;
  name: string;
  role: "partner" | "principal" | "analyst";
}

export interface Investor {
  id: string;
  name: string;
  kind: InvestorKind;
  thesis: string;
  description: string;
  hqCity: string;
  checkSizeMin: number; // in USD
  checkSizeMax: number; // in USD
  stageFocus: StartupStage[];
  verticals: string[];
  members: InvestorMember[];
}

export const insertInvestorSchema = z.object({
  name: z.string().min(2).max(160),
  kind: z.enum(investorKinds),
  thesis: z.string().max(2000).default(""),
  description: z.string().max(4000).default(""),
  hqCity: z.string().default(""),
  checkSizeMin: z.coerce.number().int().min(0).default(0),
  checkSizeMax: z.coerce.number().int().min(0).default(0),
  stageFocus: z.array(z.enum(startupStages)).default([]),
  verticals: z.array(z.string()).default([]),
});
export type InsertInvestor = z.infer<typeof insertInvestorSchema>;

/* ------------------------------- Thesis matching ----------------------------- */

export interface ThesisMatch {
  startup: Startup;
  score: number; // 0–100
  rationale: string;
}
