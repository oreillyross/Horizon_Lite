# replit.md

## Overview

This is a full-stack TypeScript starter application built with React, Express, tRPC, and PostgreSQL. It provides a modern developer experience with type-safe API communication, a comprehensive UI component library, and database integration using Drizzle ORM. The application follows a monorepo structure with client, server, and shared code organized in separate directories.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **API Communication**: tRPC client with SuperJSON transformer for type-safe RPC calls
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **UI Components**: shadcn/ui component library (Radix UI primitives with custom styling)
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Runtime**: Node.js with Express
- **API Layer**: tRPC for type-safe API endpoints exposed at `/api/trpc`
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Session Storage**: connect-pg-simple for PostgreSQL-backed sessions
- **Development**: tsx for TypeScript execution, Vite middleware for HMR

### Data Storage
- **Database**: PostgreSQL (connection via DATABASE_URL environment variable)
- **Schema Definition**: Drizzle schema in `shared/schema.ts`
- **Migrations**: Drizzle Kit with migrations output to `./migrations`
- **Current Schema**: Users table with id (UUID), username, and password fields

### Code Organization
```
├── client/           # React frontend application
│   └── src/
│       ├── components/ui/  # shadcn/ui components
│       ├── hooks/          # Custom React hooks
│       ├── lib/            # Utilities and tRPC client
│       └── pages/          # Route components
├── server/           # Express backend
│   ├── routers/      # tRPC router definitions
│   ├── db.ts         # Database connection
│   ├── storage.ts    # Data access layer
│   └── trpc.ts       # tRPC initialization
├── shared/           # Shared code between client/server
│   └── schema.ts     # Drizzle database schema
└── script/           # Build scripts
```

### Design Patterns
- **Storage Pattern**: `IStorage` interface with `DatabaseStorage` implementation for data access abstraction
- **Type Safety**: Shared schema types between frontend and backend via `@shared/*` path alias
- **Validation**: Zod schemas generated from Drizzle schema using drizzle-zod

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection configured via `DATABASE_URL` environment variable
- **Drizzle ORM**: Database toolkit for schema definition, migrations, and queries

### UI/Component Libraries
- **Radix UI**: Headless UI primitives (dialog, dropdown, popover, tabs, etc.)
- **shadcn/ui**: Pre-built component library built on Radix primitives
- **Lucide React**: Icon library
- **Embla Carousel**: Carousel component
- **Vaul**: Drawer component
- **cmdk**: Command palette component

### API/Communication
- **tRPC**: End-to-end typesafe API layer (client, server, and React Query integration)
- **SuperJSON**: JSON serializer supporting dates, maps, sets, etc.

### Build/Development
- **Vite**: Frontend build tool and dev server
- **esbuild**: Server bundling for production
- **tsx**: TypeScript execution for development

### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **tailwind-merge**: Tailwind class merging utility