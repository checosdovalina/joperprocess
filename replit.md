# GRUPO JOPER - Sistema Comercial

## Overview

GRUPO JOPER Sistema Comercial is an enterprise-grade platform designed for comprehensive commercial management, encompassing sales, credit, production, shipping, and invoicing. It supports various organizational roles and manages the entire commercial workflow from customer interactions and quotations to payment collection. The application is optimized for mobile field operations while providing full desktop functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript, using Vite for development and bundling. Wouter handles routing, and TanStack Query manages server state, providing caching and automatic refetching. UI components are built with Shadcn/ui and Radix UI primitives, allowing for full control and accessibility. Styling is managed with Tailwind CSS, following a custom design system based on Material Design and Ant Design principles, optimized for data-heavy enterprise applications with dark mode support. React Hook Form with Zod is used for type-safe form handling and validation.

### Backend Architecture

The backend runs on Node.js with Express.js in ESM module mode, exposing a RESTful API. Authentication is session-based using Passport.js with a LocalStrategy and scrypt-hashed passwords, with sessions stored server-side using `connect-pg-simple`. Authorization is role-based (RBAC) with seven distinct roles. Custom middleware handles request logging, and centralized error handling provides consistent HTTP status codes.

### Data Layer

Drizzle ORM provides type-safe SQL querying with PostgreSQL (via Neon serverless) as the database. The schema is centrally defined in `shared/schema.ts` and managed with Drizzle Kit for migrations. Drizzle-Zod integration ensures data validation matches database constraints. Key tables include `users`, `customers`, `checkins`, `quotations`, `creditAuthorizations`, `orders`, `shipments`, `invoices`, and `payments`.

### Key Features

- **Customer Summary Endpoint**: Aggregates comprehensive customer data for sales visits, including credit calculations, overdue invoices, pending orders, and check-in history.
- **Check-in/Checkout Functionality**: Supports field visit tracking, including GPS coordinates, photo uploads, PDF generation of visit minutes, and secure checkout processes.
- **Secure Photo Uploads**: Implements a robust system for handling photo uploads to object storage, including presigned URLs, issuance tracking, two-phase commit for atomicity, and strict ACL policies.
- **Streaming PDF Generation**: Generates PDF documents for check-in minutes using a streaming architecture to prevent memory issues, including image processing and secure upload to object storage.

## External Dependencies

- **Database**: PostgreSQL (via Neon serverless) for ACID compliance and robust transaction handling.
- **Object Storage**: Google Cloud Storage (GCS) for storing check-in photos and generated PDF minutes, leveraging Replit's integration for credentials and `@google-cloud/storage` client.
- **Session Store**: `connect-pg-simple` for PostgreSQL-backed server-side session storage.
- **Font Delivery**: Google Fonts CDN for the Inter font family.
- **Date Handling**: `date-fns` library for date manipulation and formatting.
- **Build Tools**: Vite (frontend) and esbuild (backend) for optimized production builds.
- **Image Processing**: Sharp for resizing and optimizing images during PDF generation.