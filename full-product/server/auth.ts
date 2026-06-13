import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};

export const isNotFrozen: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = req.user as any;
  if (user?.id) {
    const dbUser = await storage.getUser(user.id);
    if (dbUser?.isFrozen) {
      return res.status(403).json({ 
        message: "Account frozen",
        frozen: true,
        frozenReason: dbUser.frozenReason || "Your account has been frozen by an administrator. Contact support for assistance."
      });
    }
  }
  return next();
};

async function getAuthenticatedUser(req: any, res: any): Promise<any | null> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  const user = req.user as any;
  const userId = user.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  return await storage.getUser(userId);
}

function isPlatformAdmin(dbUser: any): boolean {
  if (!dbUser) return false;
  if (dbUser.isHeadAdmin) return true;
  return ["lmsAdmin", "eventAdmin", "innoLabsAdmin"].includes(dbUser.role);
}

export const isAdmin: RequestHandler = async (req, res, next) => {
  const dbUser = await getAuthenticatedUser(req, res);
  if (!dbUser) return;
  if (!dbUser.isHeadAdmin) {
    return res.status(403).json({ message: "Forbidden: Head Admin access required" });
  }
  next();
};

export const isPlatformAdminMiddleware: RequestHandler = async (req, res, next) => {
  const dbUser = await getAuthenticatedUser(req, res);
  if (!dbUser) return;
  if (!isPlatformAdmin(dbUser)) {
    return res.status(403).json({ message: "Forbidden: Platform admin access required" });
  }
  next();
};

export const isHeadAdmin: RequestHandler = async (req, res, next) => {
  const dbUser = await getAuthenticatedUser(req, res);
  if (!dbUser) return;
  if (!dbUser.isHeadAdmin) {
    return res.status(403).json({ message: "Forbidden: Head Admin access required" });
  }
  next();
};

export const isLmsAdmin: RequestHandler = async (req, res, next) => {
  const dbUser = await getAuthenticatedUser(req, res);
  if (!dbUser) return;
  if (dbUser.role !== "lmsAdmin" && !dbUser.isHeadAdmin) {
    return res.status(403).json({ message: "Forbidden: LMS Admin access required" });
  }
  next();
};

export const isEventAdmin: RequestHandler = async (req, res, next) => {
  const dbUser = await getAuthenticatedUser(req, res);
  if (!dbUser) return;
  if (dbUser.role !== "eventAdmin" && !dbUser.isHeadAdmin) {
    return res.status(403).json({ message: "Forbidden: Event Admin access required" });
  }
  next();
};

export const isInnoLabsAdmin: RequestHandler = async (req, res, next) => {
  const dbUser = await getAuthenticatedUser(req, res);
  if (!dbUser) return;
  if (dbUser.role !== "innoLabsAdmin" && !dbUser.isHeadAdmin) {
    return res.status(403).json({ message: "Forbidden: InnoLabs Admin access required" });
  }
  next();
};

export const isTeacher: RequestHandler = async (req, res, next) => {
  const dbUser = await getAuthenticatedUser(req, res);
  if (!dbUser) return;
  if (dbUser.role !== "teacher" && dbUser.role !== "lmsAdmin" && !dbUser.isHeadAdmin) {
    return res.status(403).json({ message: "Forbidden: Teacher access required" });
  }
  next();
};

export const isTeacherOrAdmin: RequestHandler = async (req, res, next) => {
  const dbUser = await getAuthenticatedUser(req, res);
  if (!dbUser) return;
  if (dbUser.role !== "teacher" && dbUser.role !== "lmsAdmin" && !dbUser.isHeadAdmin) {
    return res.status(403).json({ message: "Forbidden: Teacher or Admin access required" });
  }
  next();
};
