# Strategy Tester Project Log

## Architecture & Goals
This repository contains a Vercel-ready Next.js application designed to log, stress-test, and analyze a trading strategy. It uses Turso as the cloud database backend and GitHub Actions to automatically harvest historical economic calendar data.

## Components Created

### 1. Next.js Frontend (`app/page.tsx`)
A modern, glassmorphic UI built with React and TailwindCSS.
- **In-Browser Database Parsing:** The application accepts a massive `archive_data.db` upload from the user, loading it directly into browser memory using `sql.js` (WebAssembly). This allows the app to query 1-minute historical data and calculate 45-minute SMMA statistics (9, 50, 200) without relying on a server.
- **Data Logger & Pattern Analyzer:** Forms and dashboards for logging qualitative trade data and viewing aggregated statistics.

### 2. Turso Serverless Backend (`app/actions.ts` & `lib/turso.ts`)
Next.js Server Actions encapsulate the `@libsql/client` logic to securely read and write `market_context` and `trades` directly to the Turso cloud database without exposing credentials to the client.

### 3. GitHub Actions Data Harvester
- **`scripts/fetch_economy.py`:** A standalone Python script that uses `investpy` to retrieve the United States economic calendar.
- **`.github/workflows/harvest.yml`:** Automates the Python script to run every Sunday, injecting the upcoming economic events into the `economic_calendar` table in Turso.

### 4. Configuration & Environment
- **`.gitignore`**: Configured to ignore local databases, `.env` files, `.next/` builds, and `node_modules/`.
- **`package.json`**: Contains dependencies for Next.js, `sql.js`, `@libsql/client`, Recharts, and Tailwind utilities. (Modules remain uninstalled locally to prevent pollution, deferring installation to the Vercel deployment pipeline).
