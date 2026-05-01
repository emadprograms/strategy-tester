"use client"

import { useState, useEffect, useRef } from "react";
import initSqlJs from "sql.js";
import { getTrades, saveTradeAndContext, getEconomicEvents } from "./actions";
import { Database, UploadCloud, TrendingUp, Search, Calendar, Info } from "lucide-react";

export default function StrategyTester() {
  const [activeTab, setActiveTab] = useState("logger");
  const [dbStatus, setDbStatus] = useState("No Database Loaded");
  const [dbInstance, setDbInstance] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);

  // Form State
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [ticker, setTicker] = useState("SPY");
  const [ecoEvents, setEcoEvents] = useState("");
  const [spySetup, setSpySetup] = useState("");
  const [actualMovement, setActualMovement] = useState("");
  const [sentiment, setSentiment] = useState("Bullish");
  const [strategy, setStrategy] = useState("My Strategy");
  const [prevDay, setPrevDay] = useState("");
  const [oneDaySetup, setOneDaySetup] = useState("");
  const [plan, setPlan] = useState("");
  const [rr, setRr] = useState("2.0");
  const [pnl, setPnl] = useState("0.0");
  const [result, setResult] = useState("Win");
  const [comments, setComments] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTrades();
  }, []);

  async function fetchTrades() {
    const data = await getTrades();
    setTrades(data);
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDbStatus("Loading database... (this may take a few seconds)");
    
    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
    });

    const reader = new FileReader();
    reader.onload = function() {
      const Uints = new Uint8Array(reader.result as ArrayBuffer);
      const db = new SQL.Database(Uints);
      setDbInstance(db);
      setDbStatus(`Loaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    };
    reader.readAsArrayBuffer(file);
  };

  const calculateSMMA = (prices: number[], period: number): number[] => {
    if (prices.length === 0) return [];
    let smma = [prices[0]];
    for (let i = 1; i < prices.length; i++) {
      smma.push((smma[i - 1] * (period - 1) + prices[i]) / period);
    }
    return smma;
  };

  const analyzeTicker = (targetTicker: string) => {
    if (!dbInstance) return "No database loaded to analyze.";
    
    try {
      const stmt = dbInstance.prepare(`SELECT open, high, low, close FROM market_data WHERE symbol = ? AND timestamp LIKE ? ORDER BY timestamp ASC LIMIT 45`);
      stmt.bind([targetTicker, `${dateStr}%`]);
      
      const closes = [];
      const highs = [];
      const lows = [];
      let firstOpen = null;
      
      while (stmt.step()) {
        const row = stmt.getAsObject();
        if (firstOpen === null) firstOpen = row.open;
        closes.push(row.close);
        highs.push(row.high);
        lows.push(row.low);
      }
      
      if (closes.length === 0) return `No 1m data found for ${targetTicker} on ${dateStr} in archive.`;

      const endPrice = closes[closes.length - 1];
      const maxHigh = Math.max(...highs);
      const minLow = Math.min(...lows);
      const trend = endPrice > firstOpen ? "up" : "down";
      const pctChange = ((endPrice - firstOpen) / firstOpen) * 100;
      
      // Calculate full SMMA sequence to get accurate end value
      const smma9 = calculateSMMA(closes, 9).pop();
      const smma50 = calculateSMMA(closes, 50).pop();
      const smma200 = calculateSMMA(closes, 200).pop();

      return `Stock opened at ${firstOpen.toFixed(2)} and moved ${trend} by ${Math.abs(pctChange).toFixed(2)}% to ${endPrice.toFixed(2)} in the first 45 mins.\nHigh: ${maxHigh.toFixed(2)}, Low: ${minLow.toFixed(2)}.\nAt 45m -> SMMA(9): ${smma9?.toFixed(2)}, SMMA(50): ${smma50?.toFixed(2)}, SMMA(200): ${smma200?.toFixed(2)}.`;

    } catch (err) {
      return `Error analyzing data: ${err}`;
    }
  };

  const handleAutoFill = async () => {
    // 1. Fetch Economy from Turso backend
    setEcoEvents("Fetching events from Turso...");
    const events = await getEconomicEvents(dateStr);
    setEcoEvents(events as string);

    // 2. Parse SPY locally
    setSpySetup("Analyzing SPY...");
    setSpySetup(analyzeTicker("SPY"));

    // 3. Parse Ticker locally
    setActualMovement(`Analyzing ${ticker}...`);
    setActualMovement(analyzeTicker(ticker.toUpperCase()));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const context = { date: dateStr, spy_setup: spySetup, economic_events: ecoEvents, market_sentiment: sentiment };
    const trade = { date: dateStr, ticker: ticker.toUpperCase(), strategy_name: strategy, stock_setup_1d: oneDaySetup, previous_day_setup: prevDay, presumed_plan: plan, actual_movement: actualMovement, risk_reward: parseFloat(rr), pnl_r: parseFloat(pnl), result, additional_comments: comments };
    
    const res = await saveTradeAndContext(trade, context);
    if (res.success) {
      alert("Trade Saved Successfully!");
      fetchTrades();
    } else {
      alert("Error saving trade.");
    }
    setIsSaving(false);
  };

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-gray-200 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[#111] border-r border-white/10 p-6 flex flex-col justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white mb-8 flex items-center gap-2">
            <TrendingUp className="text-blue-500" />
            Strategy Tester
          </h1>

          <div className="space-y-2 mb-10">
            <button onClick={() => setActiveTab("logger")} className={`w-full text-left px-4 py-2 rounded-lg transition-all ${activeTab === 'logger' ? 'bg-blue-500/10 text-blue-400 font-medium' : 'hover:bg-white/5 text-gray-400'}`}>Data Logger</button>
            <button onClick={() => setActiveTab("analyzer")} className={`w-full text-left px-4 py-2 rounded-lg transition-all ${activeTab === 'analyzer' ? 'bg-blue-500/10 text-blue-400 font-medium' : 'hover:bg-white/5 text-gray-400'}`}>Pattern Analyzer</button>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2"><Database size={14} /> Local Archive</h3>
            
            <label className="cursor-pointer group flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/10 rounded-lg hover:border-blue-500/50 hover:bg-blue-500/5 transition-all">
              <UploadCloud size={24} className="text-gray-400 group-hover:text-blue-400 mb-2 transition-colors" />
              <span className="text-xs text-center text-gray-400 group-hover:text-gray-300">Drop archive_data.db here</span>
              <input type="file" className="hidden" accept=".db" onChange={handleFileUpload} />
            </label>
            <p className="text-[10px] text-gray-500 mt-3 text-center">{dbStatus}</p>
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center">
          Need the latest archive? <br/>
          <a href="https://github.com/emadprograms/market-rewind/releases/tag/latest-archive" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Download it here</a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-10 relative">
        <div className="max-w-5xl mx-auto">
          
          {activeTab === "logger" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-light text-white mb-8">Log a New Trade</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#111] border border-white/5 p-5 rounded-2xl">
                  <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2"><Calendar size={16}/> Trade Date</label>
                  <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div className="bg-[#111] border border-white/5 p-5 rounded-2xl">
                  <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2"><Search size={16}/> Ticker Symbol</label>
                  <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 uppercase" placeholder="e.g. AAPL" />
                </div>
                <div className="flex items-end pb-5">
                  <button onClick={handleAutoFill} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                    Auto-Fill Context
                  </button>
                </div>
              </div>

              {/* Context Section */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-white mb-4 border-b border-white/10 pb-2">1. Market Context</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Economic Events (Turso)</label>
                    <textarea value={ecoEvents} onChange={(e)=>setEcoEvents(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white h-32 text-sm focus:outline-none focus:border-blue-500" placeholder="Events will auto-populate here..."/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">SPY Setup & Auto-Analysis</label>
                    <textarea value={spySetup} onChange={(e)=>setSpySetup(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white h-32 text-sm focus:outline-none focus:border-blue-500" placeholder="SPY 45m stats will appear here. Add your manual qualitative notes!"/>
                  </div>
                </div>
                <div className="mt-4 w-64">
                   <label className="block text-sm font-medium text-gray-400 mb-2">Market Sentiment</label>
                   <select value={sentiment} onChange={(e)=>setSentiment(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                     <option>Bullish</option>
                     <option>Bearish</option>
                     <option>Choppy</option>
                   </select>
                </div>
              </div>

              {/* Trade Details Section */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-white mb-4 border-b border-white/10 pb-2">2. Trade Details & Setup</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">Strategy Name</label>
                  <input type="text" value={strategy} onChange={(e) => setStrategy(e.target.value)} className="w-full md:w-1/3 bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Previous Day's Setup</label>
                      <textarea value={prevDay} onChange={(e)=>setPrevDay(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white h-24 text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">1-Day Stock Setup</label>
                      <textarea value={oneDaySetup} onChange={(e)=>setOneDaySetup(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white h-24 text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Presumed Plan</label>
                      <textarea value={plan} onChange={(e)=>setPlan(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white h-24 text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Actual Movement (First 30-45 mins)</label>
                      <textarea value={actualMovement} onChange={(e)=>setActualMovement(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white h-32 text-sm focus:outline-none focus:border-blue-500" placeholder="Auto-filled stats will appear here..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Additional Comments</label>
                      <textarea value={comments} onChange={(e)=>setComments(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white h-40 text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 bg-[#111] p-6 rounded-2xl border border-white/5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Risk:Reward Ratio</label>
                    <input type="number" step="0.1" value={rr} onChange={(e) => setRr(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">PnL (in R)</label>
                    <input type="number" step="0.1" value={pnl} onChange={(e) => setPnl(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Result</label>
                    <select value={result} onChange={(e)=>setResult(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500">
                      <option>Win</option>
                      <option>Loss</option>
                      <option>Breakeven</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pb-10">
                <button disabled={isSaving} onClick={handleSave} className="bg-white hover:bg-gray-200 text-black font-semibold px-8 py-3 rounded-lg transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50">
                  {isSaving ? "Saving to Turso..." : "Save Trade to Database"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "analyzer" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-light text-white mb-8">Pattern Analyzer</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#111] border border-white/5 p-6 rounded-2xl flex flex-col justify-center items-center">
                  <span className="text-gray-400 text-sm font-medium mb-1">Total Trades</span>
                  <span className="text-4xl font-light text-white">{trades.length}</span>
                </div>
                <div className="bg-[#111] border border-white/5 p-6 rounded-2xl flex flex-col justify-center items-center">
                  <span className="text-gray-400 text-sm font-medium mb-1">Win Rate</span>
                  <span className="text-4xl font-light text-blue-400">
                    {trades.length > 0 ? ((trades.filter(t => t.result === 'Win').length / trades.length) * 100).toFixed(1) : "0"}%
                  </span>
                </div>
                <div className="bg-[#111] border border-white/5 p-6 rounded-2xl flex flex-col justify-center items-center">
                  <span className="text-gray-400 text-sm font-medium mb-1">Total PnL (R)</span>
                  <span className={`text-4xl font-light ${trades.reduce((sum, t) => sum + t.pnl_r, 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trades.reduce((sum, t) => sum + t.pnl_r, 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-500 uppercase bg-white/5 border-b border-white/5">
                      <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Ticker</th>
                        <th className="px-6 py-4">Strategy</th>
                        <th className="px-6 py-4">Result</th>
                        <th className="px-6 py-4">PnL (R)</th>
                        <th className="px-6 py-4">Sentiment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((t, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">{t.date}</td>
                          <td className="px-6 py-4 font-medium text-white">{t.ticker}</td>
                          <td className="px-6 py-4">{t.strategy_name}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.result==='Win' ? 'bg-green-500/10 text-green-400' : t.result==='Loss' ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400'}`}>
                              {t.result}
                            </span>
                          </td>
                          <td className="px-6 py-4">{t.pnl_r}</td>
                          <td className="px-6 py-4">{t.market_sentiment}</td>
                        </tr>
                      ))}
                      {trades.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                            No trades logged yet. Start testing your strategies!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
