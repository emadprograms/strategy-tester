# Strategy Tester Project Log

## Architecture & Goals
This repository contains a Vercel-ready Next.js application designed to log, stress-test, and analyze a trading strategy. It uses Turso as the cloud database backend and GitHub Actions to automatically harvest historical economic calendar data. The codebase is organized to decouple the web application from background scripts.

## Directory Structure

### 1. `web/` (Next.js Application)
Contains the entirety of the Next.js React frontend and API routes.
- **In-Browser Database Parsing:** The application loads user-uploaded `archive_data.db` into browser memory using `sql.js` (WebAssembly) for high-performance querying and local indicator calculation (SMMA).
- **Turso Serverless Backend:** Next.js Server Actions use `@libsql/client` to read/write `market_context` and `trades` to the Turso cloud database.

### 2. `scripts/` & `.github/` (Data Harvester)
- **`scripts/fetch_economy.py`:** A Python script that uses the **Finnhub API** to retrieve US economic events. 
  - **Filtering:** Only Medium and High impact events are stored.
  - **Timezone:** All events are converted from UTC to **Eastern Time (ET)** before storage.
  - **Schema:** Events are stored in year-specific tables (e.g., `economic_calendar_2025`) to optimize query performance and organization.
  - **Arguments:** Supports custom `--start` and `--end` dates (YYYY-MM-DD).
- **`.github/workflows/harvest.yml`:** Automates the harvester to run every Sunday. Supports manual triggers with custom date ranges. Requires `FINNHUB_API_KEY`, `TURSO_DB_URL`, and `TURSO_AUTH_TOKEN` secrets.

### 3. Root Configuration
- **`requirements.txt`:** Python dependencies for the harvester (`finnhub-python`, `libsql-client`, `pandas`, `pytz`, `python-dotenv`).
- **`.gitignore`:** Configured to ignore local environments (`.venv`, `.env`), build artifacts (`.next/`, `node_modules/`), and temporary database files.

## Recent Updates
- **API Migration:** Transitioned from `investpy` (scraping-based) to **Finnhub API** to bypass aggressive Cloudflare bot protection on Investing.com.
- **Schema Refactor:** Implemented year-based tables (`economic_calendar_YYYY`) instead of a single massive table.
- **Improved Data Accuracy:** Included `Actual`, `Estimate`, and `Previous` values in the stored event strings, ensuring all timestamps are in Eastern Time.
