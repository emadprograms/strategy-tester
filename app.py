import streamlit as st
import pandas as pd
from database import init_db, get_economic_events, analyze_setup_from_archive, save_market_context, save_trade, get_all_trades
import datetime

# Initialize the database
init_db()

st.set_page_config(page_title="Strategy Tester Database", layout="wide")
st.title("Trading Strategy Database & Analyzer")

tab1, tab2 = st.tabs(["Data Logger", "Pattern Analyzer"])

with tab1:
    st.header("Log a New Trade")
    
    col1, col2 = st.columns(2)
    with col1:
        date_input = st.date_input("Trade Date", datetime.date.today())
        ticker_input = st.text_input("Ticker Symbol", value="SPY").upper()
    
    if st.button("Auto-Fill Context from Archive & Investpy"):
        date_str = date_input.strftime('%Y-%m-%d')
        
        with st.spinner("Fetching economic events..."):
            st.session_state.eco_events = get_economic_events(date_str)
            
        with st.spinner("Analyzing SPY setup..."):
            st.session_state.spy_setup = analyze_setup_from_archive("SPY", date_str)
            
        with st.spinner(f"Analyzing {ticker_input} setup..."):
            st.session_state.actual_movement = analyze_setup_from_archive(ticker_input, date_str)
            
        st.success("Auto-fill complete!")

    st.subheader("1. Market Context")
    eco_events_val = st.session_state.get('eco_events', '')
    spy_setup_val = st.session_state.get('spy_setup', '')
    
    col3, col4 = st.columns(2)
    with col3:
        economic_events = st.text_area("Economic Events", value=eco_events_val, height=150)
    with col4:
        spy_setup = st.text_area("SPY Setup (Auto-filled + Manual Notes)", value=spy_setup_val, height=150)
    
    market_sentiment = st.selectbox("Market Sentiment", ["Bullish", "Bearish", "Choppy", "Unknown"])
    
    st.subheader("2. Trade Details & Setup")
    strategy_name = st.text_input("Strategy Name", "My Strategy")
    
    col5, col6 = st.columns(2)
    with col5:
        previous_day_setup = st.text_area("Previous Day's Setup")
        stock_setup_1d = st.text_area("1-Day Stock Setup")
        presumed_plan = st.text_area("Presumed Plan")
    with col6:
        actual_move_val = st.session_state.get('actual_movement', '')
        actual_movement = st.text_area("Actual Movement (First 30-45 mins)", value=actual_move_val, height=150)
        additional_comments = st.text_area("Additional Comments")

    col7, col8, col9 = st.columns(3)
    with col7:
        risk_reward = st.number_input("Risk:Reward Ratio", value=2.0, step=0.1)
    with col8:
        pnl_r = st.number_input("PnL (in R)", value=0.0, step=0.1)
    with col9:
        result = st.selectbox("Result", ["Win", "Loss", "Breakeven"])
        
    if st.button("Save Trade & Context"):
        date_str = date_input.strftime('%Y-%m-%d')
        
        market_data = {
            'date': date_str,
            'spy_setup': spy_setup,
            'economic_events': economic_events,
            'market_sentiment': market_sentiment
        }
        
        trade_data = {
            'date': date_str,
            'ticker': ticker_input,
            'strategy_name': strategy_name,
            'stock_setup_1d': stock_setup_1d,
            'previous_day_setup': previous_day_setup,
            'presumed_plan': presumed_plan,
            'actual_movement': actual_movement,
            'risk_reward': risk_reward,
            'pnl_r': pnl_r,
            'result': result,
            'additional_comments': additional_comments
        }
        
        save_market_context(market_data)
        save_trade(trade_data)
        st.success("Trade and market context saved successfully!")

with tab2:
    st.header("Pattern Analyzer")
    
    df = get_all_trades()
    
    if not df.empty:
        st.dataframe(df)
        
        st.subheader("Summary Statistics")
        col1, col2, col3 = st.columns(3)
        
        wins = len(df[df['result'] == 'Win'])
        total = len(df)
        win_rate = (wins / total) * 100 if total > 0 else 0
        total_r = df['pnl_r'].sum()
        
        col1.metric("Total Trades", total)
        col2.metric("Win Rate", f"{win_rate:.1f}%")
        col3.metric("Total PnL (R)", f"{total_r:.1f}")
        
        st.subheader("Filter Data")
        filter_ticker = st.text_input("Filter by Ticker")
        if filter_ticker:
            st.dataframe(df[df['ticker'].str.contains(filter_ticker.upper())])
    else:
        st.info("No trades logged yet. Go to the Data Logger to add your first trade!")
