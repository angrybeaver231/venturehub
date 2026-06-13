import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { isAuthenticated } from "./auth";

// Head-admin "View as" (impersonation). The real session user is always the
// head admin; we just swap `req.user` to the target user for the duration of
// each request when `req.session.impersonatedUserId` is set. The original
// head admin is preserved as `req.realUser` so audit logging and the
// "Stop viewing" UI still work.

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      realUser?: any;
      isImpersonating?: boolean;
    }
  }
}

const ROLE_TEMPLATES: Record<string, { role: string; isHeadAdmin?: boolean }> = {
  member: { role: "member" },
  teacher: { role: "teacher" },
  expert: { role: "expert" },
  lmsAdmin: { role: "lmsAdmin" },
  eventAdmin: { role: "eventAdmin" },
  innoLabsAdmin: { role: "innoLabsAdmin" },
};

export function impersonationMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (!req.isAuthenticated || !req.isAuthenticated()) return next();
  const sess: any = req.session as any;
  const realUser: any = req.user as any;

  // Only the real session user being a head admin grants impersonation power.
  if (!realUser?.isHeadAdmin) {
    if (sess?.impersonatedUserId || sess?.impersonatedRoleTemplate) {
      // Defensive cleanup if anyone tampered with the session.
      delete sess.impersonatedUserId;
      delete sess.impersonatedRoleTemplate;
    }
    return next();
  }

  const targetUserId: string | undefined = sess?.impersonatedUserId;
  const roleTemplate: string | undefined = sess?.impersonatedRoleTemplate;

  if (!targetUserId && !roleTemplate) return next();

  if (roleTemplate && ROLE_TEMPLATES[roleTemplate]) {
    const tpl = ROLE_TEMPLATES[roleTemplate];
    req.realUser = realUser;
    req.isImpersonating = true;
    // Build a synthetic user that LOOKS like a normal user with the chosen
    // role, but cannot escalate (isHeadAdmin forced false).
    req.user = {
      ...realUser,
      role: tpl.role,
      isHeadAdmin: false,
      // Mark so downstream code can identify a synthetic actor if needed.
      __synthetic: true,
    };
    return next();
  }

  if (targetUserId) {
    storage
      .getUser(targetUserId)
      .then((target) => {
        if (target) {
          req.realUser = realUser;
          req.isImpersonating = true;
          // Force isHeadAdmin off — even if the target is also a head admin,
          // the impersonator should never accidentally inherit *their*
          // privileges; keep it safe and use the target's role/flags.
          req.user = { ...target, isHeadAdmin: false };
        }
        next();
      })
      .catch(() => next());
    return;
  }
  next();
}

export function registerImpersonationRoutes(app: Express) {
  // Search users to pick someone to view as (head admin only).
  app.get("/api/admin/impersonate/users", isAuthenticated, async (req: any, res) => {
    const realUser = req.realUser || req.user;
    if (!realUser?.isHeadAdmin) {
      return res.status(403).json({ message: "Head admin only" });
    }
    const q = String(req.query.q || "").trim().toLowerCase();
    try {
      const all = await storage.getAllUsers();
      let filtered = all;
      if (q) {
        filtered = all.filter((u) => {
          const hay = [
            u.email,
            u.firstName,
            u.lastName,
            u.role,
            (u as any).tag,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        });
      }
      const trimmed = filtered.slice(0, 25).map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        isHeadAdmin: u.isHeadAdmin,
        profileImageUrl: u.profileImageUrl,
      }));
      res.json(trimmed);
    } catch (err) {
      console.error("[impersonate] users search error", err);
      res.status(500).json({ message: "Search failed" });
    }
  });

  const startSchema = z.object({
    userId: z.string().optional(),
    roleTemplate: z.enum([
      "member",
      "teacher",
      "expert",
      "lmsAdmin",
      "eventAdmin",
      "innoLabsAdmin",
    ]).optional(),
  });

  app.post("/api/admin/impersonate", isAuthenticated, async (req: any, res) => {
    const realUser = req.realUser || req.user;
    if (!realUser?.isHeadAdmin) {
      return res.status(403).json({ message: "Head admin only" });
    }
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success || (!parsed.data.userId && !parsed.data.roleTemplate)) {
      return res.status(400).json({ message: "userId or roleTemplate required" });
    }
    const sess: any = req.session as any;

    if (parsed.data.userId) {
      if (parsed.data.userId === realUser.id) {
        return res.status(400).json({ message: "Cannot impersonate yourself" });
      }
      const target = await storage.getUser(parsed.data.userId);
      if (!target) return res.status(404).json({ message: "User not found" });
      sess.impersonatedUserId = target.id;
      delete sess.impersonatedRoleTemplate;
    } else if (parsed.data.roleTemplate) {
      sess.impersonatedRoleTemplate = parsed.data.roleTemplate;
      delete sess.impersonatedUserId;
    }
    req.session.save((err: any) => {
      if (err) {
        console.error("[impersonate] session save failed", err);
        return res.status(500).json({ message: "Failed to start impersonation" });
      }
      res.json({ ok: true });
    });
  });

  app.post("/api/admin/stop-impersonating", isAuthenticated, (req: any, res) => {
    const sess: any = req.session as any;
    delete sess.impersonatedUserId;
    delete sess.impersonatedRoleTemplate;
    req.session.save((err: any) => {
      if (err) {
        console.error("[impersonate] session save failed", err);
        return res.status(500).json({ message: "Failed to stop impersonation" });
      }
      res.json({ ok: true });
    });
  });
}
