"use server"

import { turso } from "@/lib/turso"

export async function getTrades() {
  try {
    const result = await turso.execute(`
      SELECT t.*, m.spy_setup, m.economic_events, m.market_sentiment
      FROM trades t
      LEFT JOIN market_context m ON t.date = m.date
      ORDER BY t.date DESC
    `);
    return result.rows;
  } catch (error) {
    console.error("Failed to fetch trades", error);
    return [];
  }
}

export async function saveTradeAndContext(trade: any, context: any) {
  try {
    // 1. Save Market Context
    await turso.execute({
      sql: `INSERT OR REPLACE INTO market_context (date, spy_setup, economic_events, market_sentiment) VALUES (?, ?, ?, ?)`,
      args: [context.date, context.spy_setup, context.economic_events, context.market_sentiment]
    });

    // 2. Save Trade
    await turso.execute({
      sql: `INSERT INTO trades (
        date, ticker, strategy_name, stock_setup_1d, previous_day_setup,
        presumed_plan, actual_movement, risk_reward, pnl_r, result, additional_comments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        trade.date, trade.ticker, trade.strategy_name, trade.stock_setup_1d, trade.previous_day_setup,
        trade.presumed_plan, trade.actual_movement, trade.risk_reward, trade.pnl_r, trade.result, trade.additional_comments
      ]
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to save trade", error);
    return { success: false, error: "Failed to save trade" };
  }
}

export async function getEconomicEvents(dateStr: string) {
  try {
    const result = await turso.execute({
      sql: `SELECT events FROM economic_calendar WHERE date = ?`,
      args: [dateStr]
    });
    if (result.rows.length > 0) {
      return result.rows[0].events;
    }
    return "No pre-populated economic events found for this date. Run the GitHub Action harvester.";
  } catch (error) {
    console.error("Failed to fetch events", error);
    return "Error fetching events.";
  }
}
