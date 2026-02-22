# Architecture & Tech Stack

## Technology Stack
The project is built using a modern web development stack suitable for scalable, interactive applications:

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
    - Server Components for performance.
    - Client Components for interactivity.
- **Language**: [TypeScript](https://www.typescriptlang.org/) for type safety.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with utility-first classes.
- **UI Library**: [Shadcn UI](https://ui.shadcn.com/) (based on Radix UI) for accessible, reusable components.
- **Backend / Database**: [Supabase](https://supabase.com/).
    - PostgreSQL database.
    - Supabase Auth for user management.
- **State Management**: React Hooks & Context API.
- **Animations**: [Framer Motion](https://www.framer.com/motion/).
- **PWA**: Custom service worker implementation for offline capabilities to function as a Progressive Web App.

## Directory Structure

```
v0-nevha/
├── app/                  # Next.js App Router pages and layouts
│   ├── admin/            # Admin dashboard routes
│   ├── api/              # API endpoints (Next.js Route Handlers)
│   ├── auth/             # Authentication pages (Login, Register)
│   ├── (public)/         # Public facing pages (Home, Report, etc.)
├── components/           # Reusable React components
│   ├── ui/               # Shadcn UI primitives (Button, Card, etc.)
│   ├── auth/             # Auth-specific forms
│   └── ...
├── hooks/                # Custom React hooks (e.g., use-auth)
├── lib/                  # Utility functions and shared logic
│   ├── supabase/         # Supabase client configurations
│   └── utils.ts          # Helper functions (cn, formatting)
├── public/               # Static assets (images, icons)
├── scripts/              # Maintenance and migration scripts
├── styles/               # Global styles
└── projectDocs/          # Project documentation (You are here)
```

## Key Architectural Decisions

### App Router
We utilize the Next.js App Router for:
- **Nested Layouts**: Efficiently sharing UI (like headers/sidebars) across routes.
- **Server Components**: Fetching data directly on the server for better performance and SEO (where applicable).
- **Route Handlers**: Creating API endpoints within the same framework (`app/api`).

### Progressive Web App (PWA)
The app is configured as a PWA, meaning it can be installed on mobile devices and works offline.
- **Manifest**: `public/manifest.json` defines the app's appearance.
- **Service Worker**: Handles caching strategies.
- **PWAWrapper**: A component (`components/pwa/pwa-wrapper.tsx`) that manages PWA-specific lifecycle events.

### Supabase Integration
Supabase is used as the Backend-as-a-Service (BaaS).
- **Client**: We use `@supabase/ssr` to handle authentication across Server Components, Client Components, and Middleware.
- **Middleware**: `middleware.ts` handles session refreshing and route protection.
