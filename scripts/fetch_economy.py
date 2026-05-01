import investpy
import datetime
import os
import sqlite3
import argparse

TURSO_URL = os.environ.get("TURSO_DB_URL")
TURSO_TOKEN = os.environ.get("TURSO_AUTH_TOKEN")

def get_economic_events(date_str):
    try:
        dt = datetime.datetime.strptime(date_str, '%Y-%m-%d')
        formatted_date = dt.strftime('%d/%m/%Y')
        
        # investpy requires to_date > from_date
        next_dt = dt + datetime.timedelta(days=1)
        formatted_next_date = next_dt.strftime('%d/%m/%Y')
        
        df = investpy.economic_calendar(
            time_zone='GMT -4:00',
            time_filter='time_only',
            countries=['united states'],
            from_date=formatted_date,
            to_date=formatted_next_date
        )
        
        if df is not None and not df.empty:
            # Filter to only keep the target date since we fetched 2 days
            df_filtered = df[df['date'] == formatted_date]
            if not df_filtered.empty:
                events = df_filtered[['time', 'importance', 'event']].to_dict('records')
                summary = "\n".join([f"{e['time']} [{e['importance']}] - {e['event']}" for e in events])
                return summary
        return "No significant events."
    except Exception as e:
        print(f"Error fetching for {date_str}: {e}")
        return "Error fetching events."

def main():
    parser = argparse.ArgumentParser(description='Harvest Economic Calendar')
    parser.add_argument('--year', type=int, help='The year to fetch data for (e.g. 2024)')
    args = parser.parse_args()

    if not TURSO_URL or not TURSO_TOKEN:
        print("Missing Turso credentials. Exiting.")
        return

    # Use libsql-experimental for Turso connection in Python
    import libsql_experimental as libsql
    conn = libsql.connect(TURSO_URL, auth_token=TURSO_TOKEN)
    
    # Create table if it doesn't exist
    conn.execute('''
        CREATE TABLE IF NOT EXISTS economic_calendar (
            date TEXT PRIMARY KEY,
            events TEXT
        )
    ''')
    conn.commit()

    if args.year:
        print(f"Harvesting data for the entire year: {args.year}")
        start_date = datetime.date(args.year, 1, 1)
        # Determine number of days in that year
        num_days = 366 if (args.year % 4 == 0 and (args.year % 100 != 0 or args.year % 400 == 0)) else 365
    else:
        # Default behavior: run for the next 30 days starting from the first of the current month
        today = datetime.date.today()
        start_date = today.replace(day=1)
        num_days = 30
        print(f"No year specified. Harvesting data for 30 days starting from {start_date}")
    
    for i in range(num_days):
        target_date = start_date + datetime.timedelta(days=i)
        date_str = target_date.strftime('%Y-%m-%d')
        
        # Don't fetch future dates if we're in the current year
        if target_date > datetime.date.today() and not args.year:
             # If we are in the default mode, we only fetch up to today + some buffer or just 30 days
             # The original code did 30 days regardless of future.
             pass

        print(f"[{i+1}/{num_days}] Fetching data for {date_str}...")
        events_str = get_economic_events(date_str)
        
        try:
            conn.execute(
                "INSERT OR REPLACE INTO economic_calendar (date, events) VALUES (?, ?)",
                (date_str, events_str)
            )
            conn.commit()
        except Exception as e:
            print(f"Failed to insert for {date_str}: {e}")

    print("Data harvesting complete!")

if __name__ == "__main__":
    main()
