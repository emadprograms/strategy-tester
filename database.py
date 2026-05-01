import sqlite3
import pandas as pd
from datetime import datetime
import os

DB_NAME = "strategy_log.db"
ARCHIVE_DB_NAME = "archive_data.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Create market_context table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS market_context (
            date TEXT PRIMARY KEY,
            spy_setup TEXT,
            economic_events TEXT,
            market_sentiment TEXT
        )
    ''')
    
    # Create trades table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            ticker TEXT,
            strategy_name TEXT,
            stock_setup_1d TEXT,
            previous_day_setup TEXT,
            presumed_plan TEXT,
            actual_movement TEXT,
            risk_reward REAL,
            pnl_r REAL,
            result TEXT,
            additional_comments TEXT,
            FOREIGN KEY (date) REFERENCES market_context(date)
        )
    ''')
    
    conn.commit()
    conn.close()

def get_economic_events(date_str):
    """
    Fetches economic events for the US for the given date using investpy.
    """
    try:
        import investpy
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        formatted_date = dt.strftime('%d/%m/%Y')
        df = investpy.economic_calendar(time_zone='GMT -4:00', time_filter='time_only', countries=['united states'], from_date=formatted_date, to_date=formatted_date)
        if df is not None and not df.empty:
            events = df[['time', 'importance', 'event']].to_dict('records')
            summary = "\n".join([f"{e['time']} [{e['importance']}] - {e['event']}" for e in events])
            return summary
        return "No significant events."
    except ImportError:
        return "investpy not available (requires setuptools<70). Run: pip install setuptools==69.5.1"
    except Exception as e:
        return f"Error fetching events from investpy: {e}"

def calculate_smma(df, column, period):
    """
    Calculates Smoothed Moving Average (SMMA).
    """
    return df[column].ewm(alpha=1/period, adjust=False).mean()

def get_archive_data(ticker, date_str):
    """
    Connects to archive_data.db and returns data for the ticker on the given date.
    It reads from the 'market_data' table or falls back to legacy table names.
    """
    if not os.path.exists(ARCHIVE_DB_NAME):
        return None
        
    try:
        conn = sqlite3.connect(ARCHIVE_DB_NAME)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [t[0] for t in cursor.fetchall()]
        
        if 'market_data' in tables:
            query = f"SELECT * FROM market_data WHERE symbol='{ticker}' AND timestamp LIKE '{date_str}%'"
        else:
            target_table = None
            if ticker in tables:
                target_table = ticker
            elif ticker.upper() in tables:
                target_table = ticker.upper()
            elif f"{ticker}_1m" in tables:
                target_table = f"{ticker}_1m"
            elif 'stock_data' in tables:
                target_table = 'stock_data'
            elif 'historical_data' in tables:
                target_table = 'historical_data'
            
            if not target_table:
                conn.close()
                return None
                
            if target_table in ['stock_data', 'historical_data']:
                 query = f"SELECT * FROM {target_table} WHERE ticker='{ticker}' AND (date LIKE '{date_str}%' OR datetime LIKE '{date_str}%')"
            else:
                 query = f"SELECT * FROM {target_table} WHERE date LIKE '{date_str}%' OR datetime LIKE '{date_str}%'"
             
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        if not df.empty:
            if 'timestamp' in df.columns:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df = df.sort_values('timestamp')
            elif 'date' in df.columns:
                df['date'] = pd.to_datetime(df['date'])
                df = df.sort_values('date')
            elif 'datetime' in df.columns:
                df['datetime'] = pd.to_datetime(df['datetime'])
                df = df.sort_values('datetime')
                
        return df
    except Exception as e:
        print(f"Error accessing archive_data.db: {e}")
        return None

def analyze_setup_from_archive(ticker, date_str):
    """
    Analyzes the data and returns auto-generated movement description based on SMMAs.
    """
    df = get_archive_data(ticker, date_str)
    if df is None or df.empty:
        return "No data found in archive_data.db for this date/ticker."
        
    # Standardize column names
    col_map = {c.lower(): c for c in df.columns}
    close_col = col_map.get('close')
    high_col = col_map.get('high')
    low_col = col_map.get('low')
    
    if close_col:
        df['smma_9'] = calculate_smma(df, close_col, 9)
        df['smma_50'] = calculate_smma(df, close_col, 50)
        df['smma_200'] = calculate_smma(df, close_col, 200)
        
        # Analyze first 45 mins assuming 1 minute data
        first_45 = df.head(45)
        if not first_45.empty:
            start_price = first_45[close_col].iloc[0]
            end_price = first_45[close_col].iloc[-1]
            
            high_price = first_45[high_col].max() if high_col else first_45[close_col].max()
            low_price = first_45[low_col].min() if low_col else first_45[close_col].min()
            
            trend = "up" if end_price > start_price else "down"
            pct_change = ((end_price - start_price) / start_price) * 100
            
            smma_9_val = df['smma_9'].iloc[-1]
            smma_50_val = df['smma_50'].iloc[-1]
            smma_200_val = df['smma_200'].iloc[-1]
            
            desc = f"Stock opened at {start_price:.2f} and moved {trend} by {abs(pct_change):.2f}% to {end_price:.2f} in the first 45 mins. \n"
            desc += f"High: {high_price:.2f}, Low: {low_price:.2f}. \n"
            desc += f"At 45m -> SMMA(9): {smma_9_val:.2f}, SMMA(50): {smma_50_val:.2f}, SMMA(200): {smma_200_val:.2f}."
            return desc
            
    return "Data format in archive_data.db missing standard OHLC columns."

def save_market_context(data_dict):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO market_context (date, spy_setup, economic_events, market_sentiment)
        VALUES (?, ?, ?, ?)
    ''', (data_dict['date'], data_dict['spy_setup'], data_dict['economic_events'], data_dict['market_sentiment']))
    conn.commit()
    conn.close()

def save_trade(data_dict):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO trades (
            date, ticker, strategy_name, stock_setup_1d, previous_day_setup,
            presumed_plan, actual_movement, risk_reward, pnl_r, result, additional_comments
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data_dict['date'], data_dict['ticker'], data_dict['strategy_name'],
        data_dict['stock_setup_1d'], data_dict['previous_day_setup'], data_dict['presumed_plan'],
        data_dict['actual_movement'], data_dict.get('risk_reward', 0.0), data_dict.get('pnl_r', 0.0),
        data_dict['result'], data_dict['additional_comments']
    ))
    conn.commit()
    conn.close()

def get_all_trades():
    conn = sqlite3.connect(DB_NAME)
    query = '''
        SELECT t.*, m.spy_setup, m.economic_events, m.market_sentiment
        FROM trades t
        LEFT JOIN market_context m ON t.date = m.date
    '''
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df
