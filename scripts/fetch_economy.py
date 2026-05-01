import investpy
import datetime
import os
import argparse

TURSO_URL = os.environ.get("TURSO_DB_URL")
TURSO_TOKEN = os.environ.get("TURSO_AUTH_TOKEN")

def fetch_and_store_range(conn, start_date, end_date):
    formatted_start = start_date.strftime('%d/%m/%Y')
    formatted_end = end_date.strftime('%d/%m/%Y')
    
    print(f"Fetching data from {formatted_start} to {formatted_end}...")
    
    try:
        df = investpy.economic_calendar(
            time_zone='GMT -4:00',
            time_filter='time_only',
            countries=['united states'],
            from_date=formatted_start,
            to_date=formatted_end
        )
        
        if df is None or df.empty:
            print("No data found for this range.")
            return

        # Group by the date column
        grouped = df.groupby('date')
        
        for date_val, group in grouped:
            # Parse the date back to '%Y-%m-%d' to store in DB
            try:
                dt = datetime.datetime.strptime(date_val, '%d/%m/%Y')
                db_date_str = dt.strftime('%Y-%m-%d')
            except ValueError:
                # Fallback if format is different
                print(f"Warning: Unexpected date format from investpy: {date_val}")
                continue
                
            events = group[['time', 'importance', 'event']].to_dict('records')
            events_str = "\n".join([f"{e['time']} [{e['importance']}] - {e['event']}" for e in events])
            
            try:
                conn.execute(
                    "INSERT OR REPLACE INTO economic_calendar (date, events) VALUES (?, ?)",
                    (db_date_str, events_str)
                )
            except Exception as e:
                print(f"Failed to insert for {db_date_str}: {e}")
                
        conn.commit()
        print(f"Successfully processed {len(grouped)} days with events.")
        
    except Exception as e:
        print(f"Error fetching range: {e}")

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
        end_date = datetime.date(args.year, 12, 31)
    else:
        # Default behavior: run for the next 30 days starting from the first of the current month
        today = datetime.date.today()
        start_date = today.replace(day=1)
        end_date = start_date + datetime.timedelta(days=30)
        print(f"No year specified. Harvesting data for 30 days starting from {start_date}")
    
    fetch_and_store_range(conn, start_date, end_date)
    print("Data harvesting complete!")

if __name__ == "__main__":
    main()
