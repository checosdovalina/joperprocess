import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, UserRole, users } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, isNull } from "drizzle-orm";
import { z } from "zod";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  const isProduction = process.env.NODE_ENV === "production";
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      secure: isProduction, // Require HTTPS in production
      httpOnly: true, // Prevent XSS attacks
      sameSite: isProduction ? 'none' : 'lax', // Allow cross-origin in production
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ passReqToCallback: true }, async (req: Request, username, password, done) => {
      try {
        const tenantId = req.tenant?.id || null;
        
        const [user] = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.username, username),
              or(
                eq(users.tenantId, tenantId || ""),
                eq(users.isSuperAdmin, true)
              )
            )
          )
          .limit(1);
        
        if (!user) {
          return done(null, false, { message: "Usuario no encontrado" });
        }
        
        if (!user.active) {
          return done(null, false, { message: "Usuario inactivo" });
        }

        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Contraseña incorrecta" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register endpoint - only for admin use (or manual first setup)
  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate request body with Zod schema
      const registerSchema = z.object({
        username: z.string().min(3).max(50),
        password: z.string().min(6),
        fullName: z.string().min(1).max(100),
        email: z.string().email(),
        role: z.enum([
          UserRole.ADMIN,
          UserRole.VENDEDOR,
          UserRole.CREDITO_COBRANZA,
          UserRole.VENTAS_LOGISTICA,
          UserRole.FABRICA,
          UserRole.EMBARQUES,
          UserRole.FACTURACION,
        ]),
        active: z.boolean().optional(),
      });

      const validationResult = registerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Datos inválidos",
          details: validationResult.error.errors,
        });
      }

      const userData = validationResult.data;

      // Always require authentication except for first user
      // This prevents race condition by checking auth BEFORE counting users
      const isAuthenticated = req.isAuthenticated();
      const isAdmin = isAuthenticated && req.user?.role === UserRole.ADMIN;
      
      // Check user count
      const allUsers = await storage.getAllUsers();
      const isFirstUser = allUsers.length === 0;
      
      // Security: Only allow if (first user) OR (authenticated admin)
      if (!isFirstUser && !isAdmin) {
        return res.status(403).json({ 
          error: isAuthenticated 
            ? "Solo administradores pueden crear usuarios"
            : "No autorizado. El registro público está deshabilitado."
        });
      }

      // Validate username doesn't exist
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "El usuario ya existe" });
      }

      // Get tenant context - users must belong to a tenant (except superadmin)
      const tenantId = req.tenant?.id || null;
      
      // Create user with hashed password (using validated data)
      const user = await storage.createUser({
        username: userData.username,
        password: await hashPassword(userData.password),
        fullName: userData.fullName,
        email: userData.email,
        role: userData.role,
        active: userData.active ?? true,
        tenantId: tenantId,
      });

      // RACE CONDITION PROTECTION:
      // Re-check user count after creation to detect concurrent registrations
      if (isFirstUser && !isAuthenticated) {
        const usersAfterCreate = await storage.getAllUsers();
        
        // If more than one user now exists, we had a race condition
        if (usersAfterCreate.length > 1) {
          // Delete the user we just created (rollback)
          // Note: We keep the first one that was written to DB
          await db.delete(users).where(eq(users.id, user.id));
          
          return res.status(409).json({ 
            error: "El registro público ya no está disponible. Por favor contacta al administrador."
          });
        }
        
        // Safe to auto-login - this is the genuine first user
        req.login(user, (err) => {
          if (err) return next(err);
          res.status(201).json(user);
        });
      } else {
        // Admin created the user, return without login
        res.status(201).json(user);
      }
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Check if public registration is allowed (only for first user)
  app.get("/api/allow-registration", async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json({ allowed: allUsers.length === 0 });
    } catch (error) {
      res.status(500).json({ allowed: false });
    }
  });
}

export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.sendStatus(401);
}

export function hasRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    if (!roles.includes(req.user.role)) {
      return res.sendStatus(403);
    }
    next();
  };
}
