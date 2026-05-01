# Strategy Tester Project Log

## Architecture & Goals
This repository contains a local application designed to log, stress-test, and analyze a trading strategy. The application relies on `archive_data.db` to pull historical 1-minute data for calculating Smoothed Moving Averages (SMMAs) and uses `investpy` to load historical economic calendar events.

## Components Created

### 1. `app.py`
A Streamlit web interface with two primary tabs:
- **Data Logger:** A unified form to log the trade context (SPY setup, economic events, market sentiment) and specific trade data (strategy name, risk:reward, actual movement, 1-day setup, PnL, result). Features an "Auto-Fill" button that intelligently pulls and analyzes historical data.
- **Pattern Analyzer:** A dashboard displaying logged trades in a DataFrame, with summary statistics (Win Rate, Total Trades, Total PnL in R) and ticker filtering capabilities.

### 2. `database.py`
The data access layer responsible for:
- Initializing the local `strategy_log.db` SQLite database with the `market_context` and `trades` tables.
- Connecting to the user's `archive_data.db` to fetch historical 1-minute stock data.
- Calculating **SMMA 9, SMMA 50, and SMMA 200** to dynamically describe the stock's first 45 minutes of movement.
- Fetching historical US economic events using `investpy`.
- Saving new trades and querying all trades via pandas DataFrames.

### 3. `requirements.txt`
Project dependencies:
- `streamlit`
- `pandas`
- `investpy`
- `ta`
- `sqlalchemy`

### 4. Configuration & Environment
- **`.venv/`**: A virtual environment initialized with Python 3.12.
- **`.gitignore`**: Configured to ignore local databases (`archive_data.db`, `strategy_log.db`), python caches (`__pycache__`), and the `.venv/` directory to keep the repository clean.
