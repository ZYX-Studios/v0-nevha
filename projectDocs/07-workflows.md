# Development Workflows

Common tasks and commands for developing and maintaining the application.

## Setup & Running
*   **Install Dependencies**: `npm install`
*   **Start Local Dev Server**: `npm run dev` (Runs on `http://localhost:3000`)
*   **Production Build**: `npm run build` && `npm start`

## Database Management (Supabase)
*   **Local Development**: If using Supabase locally:
    *   Start: `npx supabase start`
    *   Stop: `npx supabase stop`
*   **Migrations**:
    *   Generate: `npx supabase db diff -f <migration_name>`
    *   Apply Local: `npx supabase db reset` (Caution: wipes data) or `npx supabase migration up`
*   **Type Generation**:
    *   Update TypeScript types from DB: `npx supabase gen types typescript --project-id <id> > lib/database.types.ts` (Check `package.json` for exact script).

## Deployment
The project is set up for deployment on Vercel or similar platforms.
1.  Push verified code to `main`.
2.  Ensure all Environment Variables (`.env.example`) are set in the deployment dashboard.
3.  Vercel automatically builds and deploys.

## Common Tasks

### Adding a New Admin Feature
1.  Create a new page in `app/admin/<feature>/page.tsx`.
2.  Create an API route in `app/api/admin/<feature>/route.ts`.
3.  Add a link to the sidebar in `components/admin/sidebar.tsx` (or equivalent).

### Modifying the Database
1.  Create a migration (SQL) files in `supabase/migrations` or use the Supabase Dashboard (for prototyping).
2.  If using Dashboard, run `supabase db pull` to sync schema changes to local `migrations`.
3.  Update types in `lib/types.ts` or regenerate `database.types.ts`.
