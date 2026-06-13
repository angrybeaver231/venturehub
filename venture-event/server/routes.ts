import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { matchStartupsToInvestor } from "./thesis-match";
import {
  insertEventSchema,
  insertRegistrationSchema,
  insertStartupSchema,
  insertInvestorSchema,
} from "@shared/schema";
import { ZodError } from "zod";

function handle(res: Response, fn: () => unknown) {
  try {
    const result = fn();
    // A handler may have already sent a 404/409 response itself (returning
    // undefined). Don't send a second response in that case.
    if (res.headersSent) return;
    res.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ message: "Validation failed", errors: err.errors });
      return;
    }
    res.status(500).json({ message: (err as Error).message });
  }
}

export function registerRoutes(app: Express) {
  /* -------------------------------- Events ------------------------------- */
  app.get("/api/events", (_req, res) => handle(res, () => storage.listEvents()));

  app.get("/api/events/:id", (req, res) =>
    handle(res, () => {
      const event = storage.getEvent(req.params.id);
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return undefined;
      }
      return {
        ...event,
        registrations: storage.listRegistrations(event.id),
      };
    }),
  );

  app.post("/api/events", (req, res) =>
    handle(res, () => storage.createEvent(insertEventSchema.parse(req.body))),
  );

  app.post("/api/events/:id/register", (req: Request, res: Response) =>
    handle(res, () => {
      const event = storage.getEvent(req.params.id);
      if (!event) {
        res.status(404).json({ message: "Event not found" });
        return undefined;
      }
      if (!event.registrationOpen) {
        res.status(409).json({ message: "Registration is closed" });
        return undefined;
      }
      const data = insertRegistrationSchema.parse({
        ...req.body,
        eventId: event.id,
      });
      return storage.createRegistration(data);
    }),
  );

  app.post("/api/registrations/:id/attendance", (req, res) =>
    handle(res, () => {
      const reg = storage.markAttendance(req.params.id);
      if (!reg) {
        res.status(404).json({ message: "Registration not found" });
        return undefined;
      }
      return reg;
    }),
  );

  /* ------------------------------- Startups ------------------------------ */
  app.get("/api/startups", (_req, res) =>
    handle(res, () => storage.listStartups()),
  );

  app.get("/api/startups/:id", (req, res) =>
    handle(res, () => {
      const startup = storage.getStartup(req.params.id);
      if (!startup) {
        res.status(404).json({ message: "Startup not found" });
        return undefined;
      }
      return startup;
    }),
  );

  app.post("/api/startups", (req, res) =>
    handle(res, () => storage.createStartup(insertStartupSchema.parse(req.body))),
  );

  /* ------------------------------ Investors ------------------------------ */
  app.get("/api/investors", (_req, res) =>
    handle(res, () => storage.listInvestors()),
  );

  app.get("/api/investors/:id", (req, res) =>
    handle(res, () => {
      const investor = storage.getInvestor(req.params.id);
      if (!investor) {
        res.status(404).json({ message: "Investor not found" });
        return undefined;
      }
      return investor;
    }),
  );

  app.post("/api/investors", (req, res) =>
    handle(res, () =>
      storage.createInvestor(insertInvestorSchema.parse(req.body)),
    ),
  );

  /* ----------------------------- Thesis match ---------------------------- */
  app.get("/api/investors/:id/matches", (req, res) =>
    handle(res, () => {
      const investor = storage.getInvestor(req.params.id);
      if (!investor) {
        res.status(404).json({ message: "Investor not found" });
        return undefined;
      }
      return matchStartupsToInvestor(investor, storage.listStartups());
    }),
  );
}
