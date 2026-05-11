# mySunshine

A private music streaming web app — upload songs, tag them, stream them, and keep a history of what you've played. Built with React, Vite, TypeScript, Tailwind CSS, and Supabase.

---

## Features

- **Stream music** with a persistent bottom player (play/pause, seek, next/previous)
- **Polaroid & list views** on the home feed
- **Tag-based filtering** — filter songs by one or multiple tags simultaneously
- **Scoped feeds** — All, New (unplayed), and Liked tabs
- **Search** across titles and artists
- **Liked songs** — heart any track to save it
- **Play history** tracking per user
- **Lyrics display** with auto-sync via an edge function
- **AI recommendations** powered by an OpenAI-backed edge function
- **Admin panel** (`/admin`) for managing songs, tags, users, and analytics
  - Upload audio files and cover images to Supabase Storage
  - Edit song metadata, trim play range (play_from / end_at), and manage status
  - Create / delete user accounts
- **Role-based access** — `admin` and `user` roles enforced via Postgres RLS

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| Routing | React Router v6 |
| Data fetching | Supabase JS client, TanStack Query |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Edge Functions | Deno (TypeScript) |
| Package manager | npm (or bun) |

---

## Prerequisites

- Node.js 18+ (or Bun)
- A [Supabase](https://supabase.com) project with the schema applied (see below)

---

## Running Locally

### 1. Clone the repo

```bash
git clone https://github.com/devvratmsolanki/aural_v3.git
cd aural_v3
```

### 2. Install dependencies

```bash
npm install
# or
bun install
```

### 3. Configure environment variables

Create a `.env` file in the project root (or update the existing one):

```env
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-anon-key>"
VITE_SUPABASE_PROJECT_ID="<your-project-ref>"
```

Find these values in your Supabase dashboard under **Project Settings → API**.

### 4. Apply the database schema

Run the migrations against your Supabase project using the Supabase CLI:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Or apply them manually in the Supabase SQL editor — files are in [`supabase/migrations/`](supabase/migrations/) and should be run in filename order.

### 5. Create storage buckets

In your Supabase dashboard go to **Storage** and create three buckets:

| Bucket | Public |
|--------|--------|
| `audio` | No |
| `covers` | Yes |
| `avatars` | Yes |

### 6. Seed the admin account

Call the bootstrap edge function once to create the default accounts. You need your **service role key** (Supabase dashboard → Project Settings → API → `service_role`):

```bash
curl -X POST "https://<your-project-ref>.supabase.co/functions/v1/bootstrap-admin" \
  -H "Authorization: Bearer <service-role-key>"
```

This creates:

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `Sunshine@2026` |
| User | `sunshine` | `Sunshine@2026` |

> The login form takes a **username** (not an email). The app appends `@mysunshine.local` internally.

### 7. Start the dev server

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser (falls back to 8081 if the port is taken).

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the test suite (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

---

## Project Structure

```
src/
├── assets/           # Static images (logo)
├── components/
│   ├── layout/       # AppShell, Sidebar, Topbar
│   ├── music/        # SongCard, TagFilter, SongExtras
│   ├── player/       # Persistent audio player
│   └── ui/           # shadcn/ui primitives
├── contexts/         # AuthContext, PlayerContext
├── hooks/            # Shared React hooks
├── integrations/
│   └── supabase/     # Auto-generated client + types
├── lib/              # auth helpers, storage helpers, utils
├── pages/
│   ├── admin/        # AdminDashboard, AdminSongs, AdminTags, AdminUsers, AdminAnalytics
│   ├── Auth.tsx
│   ├── Home.tsx
│   ├── Search.tsx
│   ├── Liked.tsx
│   └── Profile.tsx
└── types/            # Shared TypeScript types (music.ts)

supabase/
├── functions/        # Edge functions (bootstrap-admin, recommend, sync-lyrics, …)
└── migrations/       # Ordered SQL migrations
```

---

## Deploying to Production

See [deploy.md](deploy.md) for a full guide covering:

- Building and serving the frontend behind Nginx with HTTPS
- Self-hosting the Supabase backend on Ubuntu with Docker
- Migrating schema, data, storage, and auth users
- Deploying edge functions
- Daily backup configuration

---

## Roles & Access

| Role | Access |
|------|--------|
| `admin` | Full access including the `/admin` panel, song/user management, storage writes |
| `user` | Stream songs, like tracks, manage own playlists and play history |

Admin role is granted automatically to any account with `is_admin: true` in their user metadata, or to any user signed up with `admin@mysunshine.local`.
