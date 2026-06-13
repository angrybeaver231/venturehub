import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { Express, RequestHandler } from "express";

export function setupLocalAuth(app: Express) {
  // Configure passport-local strategy
  passport.use(
    "local",
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          // Find user by email
          const user = await storage.getUserByEmail(email);
          
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          if (!user.password) {
            return done(null, false, { message: "This account uses OAuth login" });
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(password, user.password);
          
          if (!isValidPassword) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(null, false);
    }
  });
}

// Middleware to check if user is authenticated (for local auth)
export const isAuthenticatedLocal: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check if user is head admin (for local auth)
export const isAdminLocal: RequestHandler = async (req: any, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user;
  
  if (!user.isHeadAdmin && !user.is_head_admin) {
    return res.status(403).json({ message: "Forbidden: Head Admin access required" });
  }

  next();
};
