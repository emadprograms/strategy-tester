import os
import asyncio
from dotenv import load_dotenv
from libsql_client import create_client
import google.generativeai as genai

load_dotenv()

async def get_premarket_data(date):
    client = create_client(
        url=os.environ["TURSO_DB_URL"],
        auth_token=os.environ["TURSO_AUTH_TOKEN"]
    )
    
    # Assuming the table structure is market_context(date, spy_setup, economic_events, market_sentiment)
    query = f"SELECT economic_events FROM market_context WHERE date = '{date}'"
    result = await client.execute(query)
    
    if result.rows:
        return result.rows[0][0]
    return "No events found."

async def summarize_market_condition(events):
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel('gemma-3-27b-it')
    
    prompt = f"""
    You are a financial analyst assistant. 
    Analyze the following economic events for the day and summarize the pre-market economic condition 
    and the overall market sentiment impact.
    
    Economic Events: {events}
    
    Summarize in a concise paragraph suitable for a trading journal.
    """
    
    response = model.generate_content(prompt)
    return response.text

async def main():
    date = "2025-01-02"
    print(f"Fetching data for {date}...")
    events = await get_premarket_data(date)
    print(f"Events found: {events}")
    
    print("Summarizing with Gemma...")
    summary = await summarize_market_condition(events)
    print("\n--- Summary ---")
    print(summary)

if __name__ == "__main__":
    asyncio.run(main())
