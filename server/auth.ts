import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, UserRole, users, passwordResetTokens, tenants } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, isNull, gt } from "drizzle-orm";
import { z } from "zod";
import { sendPasswordResetEmail, sendCompanyWelcomeEmail } from "./email-service";

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

        // Build tenant condition safely: avoid eq(col, "") which never matches
        const tenantCondition = tenantId
          ? eq(users.tenantId, tenantId)
          : isNull(users.tenantId);
        
        const [user] = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.username, username),
              or(
                tenantCondition,
                eq(users.isSuperAdmin, true)
              )
            )
          )
          .limit(1);
        
        if (!user) {
          console.warn(`[auth] Login failed — user not found: username="${username}" tenantId="${tenantId}"`);
          return done(null, false, { message: "Usuario o contraseña incorrectos" });
        }
        
        if (!user.active) {
          console.warn(`[auth] Login failed — inactive user: username="${username}"`);
          return done(null, false, { message: "Usuario inactivo. Contacta al administrador." });
        }

        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          console.warn(`[auth] Login failed — wrong password: username="${username}" tenantId="${tenantId}"`);
          return done(null, false, { message: "Usuario o contraseña incorrectos" });
        }

        return done(null, user);
      } catch (error) {
        console.error(`[auth] Login error:`, error);
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
        receiveEmailNotifications: z.boolean().optional(),
        empresaId: z.string().nullable().optional(),
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

      // Get tenant context - users must belong to a tenant (except superadmin)
      const tenantId = req.tenant?.id || null;

      // Validate username doesn't exist within this tenant
      const existingUser = await storage.getUserByUsername(userData.username, tenantId);
      if (existingUser) {
        return res.status(400).json({ error: "El usuario ya existe" });
      }
      
      // Create user with hashed password (using validated data)
      const user = await storage.createUser({
        username: userData.username,
        password: await hashPassword(userData.password),
        fullName: userData.fullName,
        email: userData.email,
        role: userData.role,
        active: userData.active ?? true,
        receiveEmailNotifications: userData.receiveEmailNotifications ?? true,
        tenantId: tenantId,
        empresaId: userData.empresaId ?? null,
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

  // Public company self-registration - creates a tenant + admin user, emails credentials
  app.post("/api/register-company", async (req, res) => {
    try {
      const schema = z.object({
        companyName: z.string().trim().min(2, "El nombre de la empresa es requerido").max(100),
        phone: z.string().trim().min(7, "El teléfono es requerido").max(50),
        contactEmail: z.string().trim().email("Correo de contacto inválido"),
      });

      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Datos inválidos",
          details: validationResult.error.errors,
        });
      }

      const { companyName, phone, contactEmail } = validationResult.data;

      // Duplicate company name check (case-insensitive)
      const existingTenants = await db.select().from(tenants);
      const nameTaken = existingTenants.some(
        (t) => t.name.trim().toLowerCase() === companyName.toLowerCase()
      );
      if (nameTaken) {
        return res.status(409).json({
          error: "La empresa ya fue registrada. Si necesitas acceso, contacta a tu administrador.",
        });
      }

      // Generate a unique subdomain slug from the company name
      const baseSlug =
        companyName
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "")
          .slice(0, 30) || "empresa";

      // Pre-pick a candidate that avoids known collisions; the retry loop below
      // is the real safeguard against concurrent inserts.
      const usedSubdomains = new Set(existingTenants.map((t) => t.subdomain));
      let suffix = 0;
      let subdomain = baseSlug;
      while (usedSubdomains.has(subdomain)) {
        suffix++;
        subdomain = `${baseSlug}${suffix}`;
      }

      const generatedPassword = randomBytes(6).toString("base64url").slice(0, 10);
      const hashedPassword = await hashPassword(generatedPassword);

      // Create tenant + admin user atomically. Usernames are globally unique, so
      // the admin username is namespaced with the (unique) subdomain. On a unique
      // collision (concurrent signup of the same slug), regenerate and retry.
      const MAX_ATTEMPTS = 6;
      let newTenant: typeof tenants.$inferSelect | undefined;
      let username = "";
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        username = `admin_${subdomain}`;
        try {
          newTenant = await db.transaction(async (tx) => {
            const [tenant] = await tx
              .insert(tenants)
              .values({
                name: companyName,
                subdomain,
                email: contactEmail,
                phone,
                active: false,
              })
              .returning();

            await tx.insert(users).values({
              username,
              password: hashedPassword,
              fullName: "Administrador",
              email: contactEmail,
              role: UserRole.ADMIN,
              active: true,
              tenantId: tenant.id,
            });

            return tenant;
          });
          break;
        } catch (err: any) {
          // Retry only on unique-constraint collisions (subdomain/username races)
          if (err?.code === "23505" && attempt < MAX_ATTEMPTS - 1) {
            suffix++;
            subdomain = `${baseSlug}${suffix}`;
            continue;
          }
          throw err;
        }
      }

      if (!newTenant) {
        return res.status(500).json({ error: "Error al registrar la empresa" });
      }

      // Build portal URL
      const baseDomain = "nexxo.com.mx";
      const portalUrl = `https://${subdomain}.${baseDomain}`;

      // Send welcome email (fire-and-forget, don't fail registration if email fails)
      sendCompanyWelcomeEmail({
        to: contactEmail,
        companyName,
        portalUrl,
        username,
        password: generatedPassword,
        pendingApproval: true,
      }).catch((err) => {
        console.error("Failed to send company welcome email:", err);
      });

      res.status(201).json({
        message: "Empresa registrada. Está en revisión y será activada por Nexxo.",
        companyName,
        subdomain,
        portalUrl,
        emailSentTo: contactEmail,
        pendingApproval: true,
      });
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(409).json({
          error: "La empresa ya fue registrada. Si necesitas acceso, contacta a tu administrador.",
        });
      }
      console.error("Error in register-company:", error);
      res.status(500).json({ error: "Error al registrar la empresa" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ 
          error: info?.message || "Credenciales incorrectas" 
        });
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        res.status(200).json(user);
      });
    })(req, res, next);
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

  // Request password reset - public endpoint
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "El correo es requerido" });
      }

      // Find user by email (check tenant context if available)
      const tenantId = req.tenant?.id || null;
      
      let user;
      if (tenantId) {
        // Search within tenant
        [user] = await db
          .select()
          .from(users)
          .where(and(eq(users.email, email), eq(users.tenantId, tenantId)))
          .limit(1);
      } else {
        // Search across all users (for main domain)
        [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
      }

      // Always return success to prevent email enumeration
      if (!user) {
        console.log(`Password reset requested for non-existent email: ${email}`);
        return res.json({ message: "Si el correo existe, recibirás un enlace de recuperación" });
      }

      // Generate secure token
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store token in database
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });

      // Build reset link
      const host = req.get("host") || "nexxo.com.mx";
      const protocol = req.secure || process.env.NODE_ENV === "production" ? "https" : "http";
      const resetLink = `${protocol}://${host}/reset-password?token=${token}`;

      // Get tenant name for email
      let tenantName = "Nexxo";
      if (user.tenantId) {
        const [tenant] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, user.tenantId))
          .limit(1);
        if (tenant) {
          tenantName = tenant.name;
        }
      }

      // Send email
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.fullName,
        resetLink,
        tenantName,
      });

      res.json({ message: "Si el correo existe, recibirás un enlace de recuperación" });
    } catch (error) {
      console.error("Error in forgot-password:", error);
      res.status(500).json({ error: "Error al procesar la solicitud" });
    }
  });

  // Reset password with token - public endpoint
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token y nueva contraseña son requeridos" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      }

      // Find valid token
      const [resetToken] = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            eq(passwordResetTokens.used, false),
            gt(passwordResetTokens.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!resetToken) {
        return res.status(400).json({ error: "El enlace ha expirado o no es válido" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user password
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, resetToken.userId));

      // Mark token as used
      await db
        .update(passwordResetTokens)
        .set({ used: true })
        .where(eq(passwordResetTokens.id, resetToken.id));

      res.json({ message: "Contraseña actualizada exitosamente" });
    } catch (error) {
      console.error("Error in reset-password:", error);
      res.status(500).json({ error: "Error al restablecer la contraseña" });
    }
  });

  // Verify reset token - public endpoint
  app.get("/api/verify-reset-token", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== "string") {
        return res.status(400).json({ valid: false, error: "Token requerido" });
      }

      const [resetToken] = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            eq(passwordResetTokens.used, false),
            gt(passwordResetTokens.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!resetToken) {
        return res.json({ valid: false, error: "El enlace ha expirado o no es válido" });
      }

      res.json({ valid: true });
    } catch (error) {
      console.error("Error verifying reset token:", error);
      res.status(500).json({ valid: false, error: "Error al verificar el token" });
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
