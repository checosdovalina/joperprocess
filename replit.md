# Nexxo - Sistema Comercial

## Overview

Nexxo is an enterprise-grade commercial management platform designed for comprehensive sales, credit, production, shipping, and invoicing workflows. It supports various organizational roles and manages the entire commercial process from customer interactions and quotations to payment collection. The application is optimized for mobile field operations while providing full desktop functionality.

**Brand**: Nexxo - Sistema Comercial de Nueva Generación
**Domain**: nexxo.com.mx
**Logo**: Modern tech logo with interconnected hexagonal shapes in blue gradient

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript, using Vite for development and bundling. Wouter handles routing, and TanStack Query manages server state, providing caching and automatic refetching. UI components are built with Shadcn/ui and Radix UI primitives, allowing for full control and accessibility. Styling is managed with Tailwind CSS, following a custom design system based on Material Design and Ant Design principles, optimized for data-heavy enterprise applications with dark mode support. React Hook Form with Zod is used for type-safe form handling and validation.

### Backend Architecture

The backend runs on Node.js with Express.js in ESM module mode, exposing a RESTful API. Authentication is session-based using Passport.js with a LocalStrategy and scrypt-hashed passwords, with sessions stored server-side using `connect-pg-simple`. Authorization is role-based (RBAC) with seven distinct roles. Custom middleware handles request logging, and centralized error handling provides consistent HTTP status codes.

**Security Features:**
- **Secure User Registration**: Public registration is only allowed for the first user (initial admin setup). After that, only authenticated admins can create new users via the Users page.
- **Zod Schema Validation**: All registration requests are validated server-side to prevent injection of unauthorized fields and ensure data integrity.
- **Race Condition Mitigation**: Post-creation verification with rollback protection minimizes (but does not fully eliminate) the theoretical risk of concurrent first-user registrations.
- **Production Cookie Configuration**: Session cookies use secure=true, httpOnly=true, and sameSite='none' for HTTPS deployments.
- **Known Limitation**: A theoretical race condition exists during the first ~milliseconds of initial deployment where two simultaneous unauthenticated registration requests could both succeed. This is acceptable for an internal enterprise system with controlled deployment procedures.

**Deployment Procedure:**
1. Deploy the application to production
2. Immediately create the first admin user via the registration form
3. All subsequent users must be created by admins via the Users page

### Data Layer

Drizzle ORM provides type-safe SQL querying with PostgreSQL (via Neon serverless) as the database. The schema is centrally defined in `shared/schema.ts` and managed with Drizzle Kit for migrations. Drizzle-Zod integration ensures data validation matches database constraints. Key tables include `tenants`, `users`, `customers`, `checkins`, `quotations`, `creditAuthorizations`, `orders`, `shipments`, `invoices`, and `payments`.

### Multi-Tenancy Architecture

The system implements subdomain-based multi-tenancy, allowing each company (tenant) to have its own isolated environment:

**Key Components:**
- **Tenants Table**: Stores company configuration including subdomain, logo URL, primary/secondary colors, timezone, plan, and max users.
- **Tenant Detection Middleware** (`server/tenant.ts`): Resolves tenant from request hostname (e.g., `joper.nexxo.com.mx` → "joper" subdomain). In development, uses `?tenant=` query param or `X-Tenant-Subdomain` header.
- **Data Isolation**: All major tables have `tenantId` foreign keys with NOT NULL constraints for complete data segregation:
  - Core tables: `users` (optional), `customers` (required), `products` (required), `productCategories` (required)
  - Transaction tables: `checkins`, `scheduledVisits`, `quotations`, `orders`, `shipments`, `invoices`, `payments`, `incidents` (all required)
  - **Database-level enforcement**: All tenant-scoped tables have `tenantId NOT NULL` constraints, preventing orphaned data
- **TenantScopedStorage** (`server/storage.ts`): Wrapper class that automatically filters all data access by the authenticated user's tenant. Used via `createTenantScopedStorage(req)` in API routes. All ~45 route operations use scoped storage; only 4 platform-level operations (user management, superadmin product category fallback) use global storage.
- **SuperAdmin Role**: Users with `isSuperAdmin: true` can access the platform-level tenant management panel at `/tenants` and see data across all tenants when on the main domain.

**Branding:**
- Each tenant can customize `logoUrl`, `primaryColor`, and `secondaryColor`
- Frontend `TenantProvider` (`client/src/hooks/use-tenant.tsx`) fetches `/api/tenant-config` and dynamically applies CSS variables

**Endpoints:**
- `GET /api/tenant-config`: Returns current tenant's branding (public, based on subdomain)
- `GET /api/tenants`: List all tenants (superadmin only)
- `POST /api/tenants`: Create new tenant (superadmin only)
- `PATCH /api/tenants/:id`: Update tenant (superadmin only)

**DNS Configuration Required:**
- Wildcard SSL certificate for `*.nexxo.com.mx`
- Nginx configured to route all subdomains to the application

### Key Features

- **Customer Summary Endpoint**: Aggregates comprehensive customer data for sales visits, including credit calculations, overdue invoices, pending orders, and check-in history.
- **Check-in/Checkout Functionality**: Supports field visit tracking, including GPS coordinates, photo uploads, PDF generation of visit minutes, and secure checkout processes.
- **Secure Photo Uploads**: Implements a robust system for handling photo uploads to object storage, including presigned URLs, issuance tracking, two-phase commit for atomicity, and strict ACL policies.
- **Streaming PDF Generation**: Generates PDF documents for check-in minutes using a streaming architecture to prevent memory issues, including image processing and secure upload to object storage.
- **Corporate PDF Design**: All 4 PDF generators (quotation, check-in minutes, credit authorization, invoice) share the same corporate design: colored header band with logo + company info/RFC/address, title band with document type, 2-column styled info boxes, professional totals section, and corporate footer. All generators are async and receive full tenant branding data.

## External Dependencies

- **Database**: PostgreSQL (via Neon serverless) for ACID compliance and robust transaction handling.
- **Object Storage**: Google Cloud Storage (GCS) for storing check-in photos and generated PDF minutes, leveraging Replit's integration for credentials and `@google-cloud/storage` client.
- **Email Service**: Resend for transactional email delivery. Automatically sends PDF minutes to customers, salespeople, and administrators upon check-in completion. Uses `RESEND_API_KEY` environment secret.
- **Session Store**: `connect-pg-simple` for PostgreSQL-backed server-side session storage.
- **Font Delivery**: Google Fonts CDN for the Inter font family.
- **Date Handling**: `date-fns` library for date manipulation and formatting.
- **Build Tools**: Vite (frontend) and esbuild (backend) for optimized production builds.
- **Image Processing**: Sharp for resizing and optimizing images during PDF generation.

### Microsip ERP Integration

The system includes integration with Microsip ERP (Firebird database) for synchronizing master data and transactions:

**Configuration:**
- Each tenant can configure their own Microsip connection in the admin panel (`/microsip`)
- Connection parameters: host, port, database path, username, password
- Configurable sync intervals for master data (customers, products, categories) and transactional data (invoices, payments)
- Individual entity sync can be enabled/disabled per tenant

**Sync Behavior:**
- **Automatic sync**: When enabled, runs on configured intervals (default: 120 min for master data, 60 min for transactions)
- **Manual sync**: Can be triggered anytime via admin UI, regardless of auto-sync setting
- **Entity tracking**: Uses `microsipId` fields on customers, products, categories, invoices, and payments tables
- **Sync logs**: Full history of sync operations with status, timing, and record counts

**Key Files:**
- `server/microsip-sync.ts`: Sync service with Firebird connectivity
- `shared/schema.ts`: `microsipConfigs` and `microsipSyncLogs` tables
- `client/src/pages/microsip-settings-page.tsx`: Admin configuration UI

**Security Note:**
- Firebird credentials are currently stored in the database (plaintext). Future enhancement should implement encryption or secrets manager integration.

**API Endpoints:**
- `GET /api/microsip/config`: Get tenant's Microsip configuration
- `POST /api/microsip/config`: Create/update Microsip configuration
- `PATCH /api/microsip/toggle`: Enable/disable automatic sync
- `POST /api/microsip/sync`: Trigger manual sync for specific entity type
- `POST /api/microsip/test`: Test Firebird connection
- `GET /api/microsip/logs`: Get sync history