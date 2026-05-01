import re

def parse_events(events_str):
    # Regex to extract time, impact, name, and the parenthetical data
    # Example format: '07:00 [medium] - MBA 30-Year Mortgage Rate (Act: 6.97%, Prev: 6.75%)'
    event_pattern = re.compile(r'(\d{2}:\d{2})\s+\[(.*?)\]\s+-\s+(.*?)\s+\((.*?)\)')
    
    parsed_events = []
    lines = events_str.strip().split('\n')
    
    for line in lines:
        match = event_pattern.search(line)
        if match:
            time, impact, name, data_str = match.groups()
            
            # Parse data segment
            data_dict = {}
            parts = data_str.split(',')
            for part in parts:
                if ':' in part:
                    key, val = part.split(':', 1)
                    data_dict[key.strip().lower()] = val.strip()
            
            parsed_events.append({
                'time': time,
                'impact': impact,
                'name': name,
                'data': data_dict
            })
    return parsed_events

def get_premarket_data(events_str, market_open_time="09:30"):
    events = parse_events(events_str)
    
    pre_market = []
    rest_of_day = []
    
    for event in events:
        if event['time'] < market_open_time:
            # Include everything (Actual, Expected, Previous)
            pre_market.append(event)
        else:
            # Only include Expected and Previous, omit Actual
            filtered_data = {k: v for k, v in event['data'].items() if k in ['exp', 'prev']}
            rest_of_day.append({
                'time': event['time'],
                'name': event['name'],
                'data': filtered_data
            })
            
    return pre_market, rest_of_day

# Test with the data we saw earlier
raw_data = """07:00 [medium] - MBA 30-Year Mortgage Rate (Act: 6.97%, Prev: 6.75%)
08:30 [medium] - Initial Jobless Claims (Act: 211, Exp: 222, Prev: 219)
09:45 [medium] - S&P Global Manufacturing PMI Final (Act: 49.4, Exp: 48.3, Prev: 49.7)
11:00 [medium] - EIA Crude Oil Stocks Change (Act: -1.178, Exp: -2.75, Prev: -4.237)"""

pre, rest = get_premarket_data(raw_data)

print("--- PRE-MARKET DATA ---")
for e in pre:
    print(f"{e['time']} - {e['name']} | {e['data']}")

print("\n--- REST OF DAY ---")
for e in rest:
    print(f"{e['time']} - {e['name']} | {e['data']}")
