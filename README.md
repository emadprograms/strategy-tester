# Strategy Tester Terminal

A professional-grade, Vercel-ready Next.js application designed to log, stress-test, and analyze trading strategies. 

## Overview
This application is completely serverless. It utilizes Turso as the database backend to store your trade logs securely in the cloud, while performing all heavy market data calculations entirely in the browser using WebAssembly.

- **Frontend:** Next.js (App Router), TailwindCSS, React.
- **Backend:** Next.js Server Actions connecting to Turso.
- **Client-Side Processing:** `sql.js` (WebAssembly SQLite) parses heavy historical databases directly in your browser.
- **Data Harvesting:** A GitHub Action automatically fetches the US Economic Calendar via `investpy` every week and stores it in Turso.

## How to Use the App

1. **Open the Website:** Navigate to your deployed Vercel URL.
2. **Load Archive Data:** 
   - The application relies on 1-minute historical data to calculate specific market setups (like 45-minute SMMA statistics).
   - In the left sidebar, click the upload zone and select your massive `archive_data.db` file.
   - *Note: Because this file is loaded securely into your browser's local memory (RAM) via WebAssembly, your 400MB+ file is **never uploaded** to the internet. It is parsed instantly and locally.*
3. **Log a Trade:**
   - Select a Date and a Ticker Symbol.
   - Click **"Auto-Fill Context"**. The app will immediately calculate the SPY and specific ticker setups from your local `archive_data.db` and fetch the daily economic events from Turso.
   - Fill in your manual observations (e.g., Presumed Plan, 1-Day Setup, Risk/Reward).
   - Click **Save Trade**.
4. **Analyze Patterns:**
   - Switch to the "Pattern Analyzer" tab to view all historical trades, filtering by ticker to see your Win Rate and total R-Multiple PnL.

## Deployment to Vercel

This application is designed to be deployed directly to Vercel without requiring local Node.js installation.

1. **Push to GitHub:** Commit all files and push this repository to GitHub.
2. **Import to Vercel:** Log into Vercel, click **Add New > Project**, and select this repository.
3. **Configure Project:** 
   - **Important:** Set the **Root Directory** to `web` (since we moved the frontend code into its own folder).
4. **Set Environment Variables:** During the Vercel setup process, you must provide your Turso credentials (which you can fetch from Infisical). Add the following variables:
   - `TURSO_DB_URL`: Your Turso database URL.
   - `TURSO_AUTH_TOKEN`: Your Turso authentication token.
5. **Deploy:** Vercel will automatically install the Next.js dependencies and deploy the application.

## Automatic Data Harvesting

The United States Economic Calendar is fetched weekly to ensure the Vercel app doesn't have to rely on sluggish Python endpoints.

- This repository contains a `.github/workflows/harvest.yml` file.
- It will automatically trigger every Sunday at Midnight to run `scripts/fetch_economy.py` and populate the `economic_calendar` table in Turso.
- *You must also add `TURSO_DB_URL` and `TURSO_AUTH_TOKEN` as GitHub Repository Secrets for this action to work!*
