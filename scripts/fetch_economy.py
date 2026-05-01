import finnhub
import datetime
import os
import argparse
import asyncio
import time
import pytz
from collections import defaultdict
from libsql_client import create_client
from dotenv import load_dotenv

load_dotenv()

FINNHUB_API_KEY = os.environ.get("FINNHUB_API_KEY")
TURSO_URL = os.environ.get("TURSO_DB_URL")
TURSO_TOKEN = os.environ.get("TURSO_AUTH_TOKEN")

if TURSO_URL and TURSO_URL.startswith("libsql://"):
    TURSO_URL = TURSO_URL.replace("libsql://", "https://")

async def store_data_by_year(events_by_date):
    if not TURSO_URL or not TURSO_TOKEN:
        print("Missing Turso credentials. Skipping storage.")
        return

    # Group events by year
    year_groups = defaultdict(dict)
    for date_str, events in events_by_date.items():
        year = date_str.split('-')[0]
        year_groups[year][date_str] = events

    print(f"Connecting to Turso at {TURSO_URL}...")
    try:
        async with create_client(TURSO_URL, auth_token=TURSO_TOKEN) as client:
            for year, year_events in year_groups.items():
                table_name = f"economic_calendar_{year}"
                print(f"Storing data for year {year} in table {table_name}...")
                
                await client.execute(f'''
                    CREATE TABLE IF NOT EXISTS {table_name} (
                        date TEXT PRIMARY KEY,
                        events TEXT
                    )
                ''')
                
                for date_str, events in sorted(year_events.items()):
                    events_text = "\n".join(events)
                    await client.execute(
                        f"INSERT OR REPLACE INTO {table_name} (date, events) VALUES (?, ?)",
                        (date_str, events_text)
                    )
                print(f"Successfully updated {len(year_events)} days in {table_name}")
    except Exception as e:
        print(f"Database error: {e}")

def fetch_range(finnhub_client, start_date, end_date):
    start_str = start_date.strftime("%Y-%m-%d")
    end_str = end_date.strftime("%Y-%m-%d")
    
    print(f"Requesting Finnhub data from {start_str} to {end_str}...")
    try:
        response = finnhub_client.calendar_economic(_from=start_str, to=end_str)
        all_events = response.get('economicCalendar', [])
    except Exception as e:
        print(f"Finnhub API error: {e}")
        return {}
    
    events_by_date = {}
    importance_map = {1: "low", 2: "medium", 3: "high"}
    utc_tz = pytz.utc
    et_tz = pytz.timezone('US/Eastern')
    
    match_count = 0
    for event in all_events:
        if event.get('country') != 'US':
            continue

        event_time_raw = event.get('time')
        if not event_time_raw:
            continue
            
        try:
            dt_utc = datetime.datetime.strptime(event_time_raw, "%Y-%m-%d %H:%M:%S")
            dt_utc = utc_tz.localize(dt_utc)
            dt_et = dt_utc.astimezone(et_tz)
            event_date_et = dt_et.date()
            
            if not (start_date <= event_date_et <= end_date):
                continue

            impact = event.get('impact', 'unknown').lower()
            if impact not in ['medium', 'high']:
                continue
            
            actual = event.get('actual', '')
            estimate = event.get('estimate', '')
            prev = event.get('prev', '')
            unit = event.get('unit', '')

            time_str = dt_et.strftime("%H:%M")
            event_name = event.get('event', 'Unknown Event')
            
            details = []
            if actual is not None and actual != '': details.append(f"Act: {actual}{unit}")
            if estimate is not None and estimate != '': details.append(f"Exp: {estimate}{unit}")
            if prev is not None and prev != '': details.append(f"Prev: {prev}{unit}")
            
            details_str = f" ({', '.join(details)})" if details else ""
            event_entry = f"{time_str} [{impact}] - {event_name}{details_str}"
            
            match_count += 1
            date_str = event_date_et.strftime("%Y-%m-%d")
            
            if date_str not in events_by_date:
                events_by_date[date_str] = []
            events_by_date[date_str].append(event_entry)
        except Exception:
            continue
            
    return events_by_date

def main():
    parser = argparse.ArgumentParser(description='Harvest Economic Calendar using Finnhub')
    parser.add_argument('--start', type=str, help='Start date in YYYY-MM-DD format')
    parser.add_argument('--end', type=str, help='End date in YYYY-MM-DD format')
    args = parser.parse_args()

    if not FINNHUB_API_KEY:
        print("Error: FINNHUB_API_KEY not found in .env file.")
        return

    finnhub_client = finnhub.Client(api_key=FINNHUB_API_KEY)

    if args.start and args.end:
        start_date = datetime.datetime.strptime(args.start, "%Y-%m-%d").date()
        end_date = datetime.datetime.strptime(args.end, "%Y-%m-%d").date()
    else:
        # Default: Two weeks (Current + Next)
        start_date = datetime.date.today()
        end_date = start_date + datetime.timedelta(days=14)

    # Process in 30-day chunks to respect API/stability
    ranges = []
    temp_start = start_date
    while temp_start <= end_date:
        temp_end = min(temp_start + datetime.timedelta(days=30), end_date)
        ranges.append((temp_start, temp_end))
        temp_start = temp_end + datetime.timedelta(days=1)

    all_fetched_events = {}
    for i, (start, end) in enumerate(ranges):
        if i > 0:
            time.sleep(2)
        events = fetch_range(finnhub_client, start, end)
        all_fetched_events.update(events)

    print(f"Total US Med/High events found: {sum(len(v) for v in all_fetched_events.values())}")
    asyncio.run(store_data_by_year(all_fetched_events))
    print("Data harvesting complete!")

if __name__ == "__main__":
    main()
