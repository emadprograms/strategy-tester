import investpy
import datetime
import os
import sqlite3

TURSO_URL = os.environ.get("TURSO_DB_URL")
TURSO_TOKEN = os.environ.get("TURSO_AUTH_TOKEN")

def get_economic_events(date_str):
    try:
        dt = datetime.datetime.strptime(date_str, '%Y-%m-%d')
        formatted_date = dt.strftime('%d/%m/%Y')
        df = investpy.economic_calendar(
            time_zone='GMT -4:00',
            time_filter='time_only',
            countries=['united states'],
            from_date=formatted_date,
            to_date=formatted_date
        )
        if df is not None and not df.empty:
            events = df[['time', 'importance', 'event']].to_dict('records')
            summary = "\n".join([f"{e['time']} [{e['importance']}] - {e['event']}" for e in events])
            return summary
        return "No significant events."
    except Exception as e:
        print(f"Error fetching for {date_str}: {e}")
        return "Error fetching events."

def main():
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

    # Backfill for the current month (or adjust range as needed)
    today = datetime.date.today()
    start_date = today.replace(day=1)
    
    # Example: run for the next 30 days
    for i in range(30):
        target_date = start_date + datetime.timedelta(days=i)
        date_str = target_date.strftime('%Y-%m-%d')
        print(f"Fetching data for {date_str}...")
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
