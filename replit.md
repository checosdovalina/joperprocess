# GRUPO JOPER - Sistema Comercial

## Overview

GRUPO JOPER Sistema Comercial is an enterprise-grade commercial management platform designed for sales, credit, production, shipping, and invoicing operations. The application serves multiple organizational roles including salespeople, credit/collections teams, logistics, factory operations, shipping departments, and accounting/invoicing teams. It's optimized for field operations with a mobile-first approach while maintaining full desktop functionality.

The system manages the complete commercial workflow from customer check-ins and quotations through credit authorization, production orders, shipments, invoicing, and payment collection.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React 18 with TypeScript, using Vite as the build tool and development server.

**Routing:** Wouter - A lightweight routing solution chosen for minimal bundle size while providing essential routing capabilities.

**State Management:** TanStack Query (React Query v5) for server state management, eliminating the need for additional global state libraries. This provides built-in caching, automatic refetching, and optimistic updates.

**UI Component System:** Shadcn/ui with Radix UI primitives - A collection of unstyled, accessible components that are copied into the project rather than installed as dependencies. This approach provides full control over styling and behavior while ensuring accessibility compliance.

**Styling:** Tailwind CSS with a custom design system based on Material Design and Ant Design principles, optimized for data-heavy enterprise applications. Uses CSS variables for theming with dark mode support.

**Form Management:** React Hook Form with Zod schema validation for type-safe form handling and validation.

**Design System Philosophy:** Enterprise-focused with clarity-first approach, optimized for quick data scanning and mobile efficiency. Typography uses Inter font family with systematic scale. Spacing follows Tailwind unit primitives (2, 4, 6, 8, 12, 16).

### Backend Architecture

**Runtime:** Node.js with Express.js framework running in ESM module mode.

**API Pattern:** RESTful API with session-based authentication. All endpoints follow `/api/*` convention.

**Authentication:** Passport.js with LocalStrategy for username/password authentication. Passwords are hashed using Node's native scrypt algorithm with random salts. Sessions are stored server-side using connect-pg-simple.

**Authorization:** Role-based access control (RBAC) with 7 distinct roles:
- Admin (full system access)
- Vendedor (salespeople - customer management, check-ins, quotations)
- Crédito y Cobranza (credit/collections)
- Ventas/Logística (sales logistics)
- Fábrica (factory/production)
- Embarques (shipping)
- Facturación (invoicing)

**Middleware Strategy:** Custom request logging middleware captures API performance metrics. Body parsing supports both JSON and URL-encoded data with raw body preservation for webhook processing.

**Error Handling:** Centralized error responses with HTTP status codes. Authentication failures return 401, authorization failures return 403.

### Data Layer

**ORM:** Drizzle ORM - Type-safe SQL query builder chosen for its lightweight footprint and excellent TypeScript integration. Provides compile-time type checking for database queries.

**Database Driver:** @neondatabase/serverless with WebSocket support for serverless-compatible PostgreSQL connections.

**Schema Definition:** Centralized in `shared/schema.ts` for type sharing between client and server. Utilizes Drizzle's relational queries for efficient joins.

**Migration Strategy:** Drizzle Kit manages schema migrations with push-based workflow for rapid development.

**Data Validation:** Drizzle-Zod integration generates Zod schemas from database schema definitions, ensuring validation rules match database constraints.

**Key Tables:**
- users (authentication and role management)
- customers (client information and credit limits)
- checkins (field visit tracking with geolocation)
- quotations (sales quotes with line items)
- creditAuthorizations (approval workflow for credit limits)
- orders (production orders linked to quotations)
- shipments (delivery tracking with digital signatures)
- invoices (CFDI invoicing)
- payments (collections and payment promises)

### External Dependencies

**Database:** PostgreSQL (via Neon serverless) - Enterprise-grade relational database chosen for ACID compliance, complex query support, and robust transaction handling required for financial operations.

**Session Store:** PostgreSQL-backed sessions via connect-pg-simple, ensuring session persistence across server restarts and enabling horizontal scaling.

**Font Delivery:** Google Fonts CDN for Inter font family (400, 500, 600, 700 weights).

**Development Tools:**
- Replit-specific plugins for development banner and cartographer (visual debugging)
- Runtime error modal overlay for development

**Date Handling:** date-fns library with Spanish locale support for date formatting and manipulation.

**Build Process:** 
- Client: Vite builds to `dist/public`
- Server: esbuild bundles to `dist/index.js` with ESM output and external package references
- Production deployment uses compiled artifacts with NODE_ENV=production

### API Architecture

**Route Organization:** Centralized in `server/routes.ts` with logical grouping by resource type.

**Data Flow Pattern:**
1. Client makes authenticated API request
2. Session middleware validates user session
3. Route handler checks role-based permissions
4. Drizzle ORM executes type-safe database queries
5. Response returns JSON with appropriate HTTP status
6. React Query caches response and updates UI

**Query Optimization:** Uses Drizzle's relational queries to minimize N+1 problems. Dashboard stats endpoint uses raw SQL for aggregation performance.

**Real-time Updates:** Polling-based updates via React Query's refetch mechanisms. No WebSocket implementation currently (opportunity for future enhancement).

### Security Architecture

**Password Security:** Scrypt-based hashing with per-user random salts. Timing-safe comparison prevents timing attacks.

**Session Management:** 
- HTTP-only cookies prevent XSS attacks
- 7-day session expiration
- Server-side session storage prevents client tampering
- Trust proxy enabled for proper IP detection behind reverse proxies

**CSRF Protection:** Session-based authentication provides built-in CSRF protection through SameSite cookie attributes.

**Input Validation:** Zod schemas validate all user inputs on both client and server, preventing injection attacks and ensuring data integrity.

**File Upload Strategy:** Currently supports photo metadata storage (URLs/paths) rather than direct file uploads - actual file storage solution to be determined based on deployment environment.