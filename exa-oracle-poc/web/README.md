This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

To stop the development server, press `Ctrl+C` in the terminal where it's running. If it was started in the background, find and stop it with:

```bash
lsof -ti:3000 | xargs kill
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Testing

Frontend unit tests (Vitest — `lib/` and the `app/api/**` route handlers), run from `web/` (this directory):

```bash
npm test
```

Backend tests (pytest, from the repo root `EXA/`, not `web/`):

```bash
cd ..
python3 -m venv .venv && source .venv/bin/activate  # first time only
pip install -r requirements.txt -r requirements-dev.txt
python3 -m pytest
```

## Architecture notes

- **Pending search results are in-process memory only** (`lib/pendingStore.ts`). A staged (not-yet-approved) result lives in a `Map` inside the single Node process running the dev/prod server. This is fine for one instance, but it does not survive a process restart and is not shared across instances — running this app with multiple instances or on serverless/edge (separate process per request) will intermittently drop pending results (the client sees "This pending result has expired — please search again."). Swap in a shared store (Redis, a database table, etc.) with the same TTL-eviction shape before deploying that way.
- **Dark mode needs JavaScript to toggle or persist a choice** (it's driven by `next-themes` adding a class to `<html>`). Visitors with JS disabled always get the OS-preference palette via a `prefers-color-scheme` CSS fallback in `app/globals.css`, but can't switch away from it — the toggle itself requires JS.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
