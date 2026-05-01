# Strategy Tester Project Log

## Architecture & Goals
This repository contains a Vercel-ready Next.js application designed to log, stress-test, and analyze a trading strategy. It uses Turso as the cloud database backend and GitHub Actions to automatically harvest historical economic calendar data. The codebase has been strictly organized to decouple the web application from background scripts, leaving a clean repository root.

## Directory Structure

### 1. `web/` (Next.js Application)
Contains the entirety of the Next.js React frontend and API routes.
- **In-Browser Database Parsing (`web/app/page.tsx`):** The application accepts a massive `archive_data.db` upload from the user, loading it directly into browser memory using `sql.js` (WebAssembly). This allows the app to query 1-minute historical data and calculate 45-minute SMMA statistics (9, 50, 200) locally.
- **Turso Serverless Backend (`web/app/actions.ts` & `web/lib/turso.ts`):** Next.js Server Actions encapsulate the `@libsql/client` logic to securely read and write `market_context` and `trades` directly to the Turso cloud database without exposing credentials to the client.

### 2. `scripts/` & `.github/` (Data Harvester)
- **`scripts/fetch_economy.py`:** A standalone Python script that uses `investpy` to retrieve the United States economic calendar. It accepts an optional `--year` argument to fetch data for an entire year; otherwise, it defaults to the current month.
- **`.github/workflows/harvest.yml`:** Automates the Python script to run every Sunday. It also supports manual triggers (`workflow_dispatch`) with an optional `year` input, allowing users to backfill historical economic data for a specific year into Turso.

### 3. Root Configuration
- **`README.md`:** Detailed instructions on usage and Vercel deployment (specifying the root directory as `web`).
- **`.gitignore`:** Configured to ignore local databases, `.env` files, `.next/` builds, and `node_modules/`.

## Cleanup Notes
- Legacy Streamlit files (`app.py`, `database.py`, `requirements.txt`) were permanently removed to prevent repository pollution, completely transitioning the project to a pure Next.js Serverless architecture.
