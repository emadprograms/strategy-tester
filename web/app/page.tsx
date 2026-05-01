"use client"

import { useState, useEffect } from "react";
import initSqlJs from "sql.js";
import { getTrades, saveTradeAndContext, getEconomicEvents } from "./actions";
import { Database, UploadCloud, TrendingUp, Search, Calendar, ChevronRight, Activity, Zap, CheckCircle2, AlertCircle, BarChart3, LineChart, FileTerminal } from "lucide-react";

export default function StrategyTester() {
  const [activeTab, setActiveTab] = useState("logger");
  const [dbStatus, setDbStatus] = useState("Waiting for archive_data.db...");
  const [isDbLoaded, setIsDbLoaded] = useState(false);
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

    setDbStatus("Loading into memory...");
    
    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
    });

    const reader = new FileReader();
    reader.onload = function() {
      const Uints = new Uint8Array(reader.result as ArrayBuffer);
      const db = new SQL.Database(Uints);
      setDbInstance(db);
      setIsDbLoaded(true);
      setDbStatus(`Connected: ${file.name}`);
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
      
      const smma9 = calculateSMMA(closes, 9).pop();
      const smma50 = calculateSMMA(closes, 50).pop();
      const smma200 = calculateSMMA(closes, 200).pop();

      return `Opened at ${firstOpen.toFixed(2)} and moved ${trend} by ${Math.abs(pctChange).toFixed(2)}% to ${endPrice.toFixed(2)} in the first 45 mins.\nHigh: ${maxHigh.toFixed(2)}, Low: ${minLow.toFixed(2)}.\nAt 45m -> SMMA(9): ${smma9?.toFixed(2)}, SMMA(50): ${smma50?.toFixed(2)}, SMMA(200): ${smma200?.toFixed(2)}.`;

    } catch (err) {
      return `Error analyzing data: ${err}`;
    }
  };

  const handleAutoFill = async () => {
    setEcoEvents("Fetching from Turso Edge...");
    const events = await getEconomicEvents(dateStr);
    setEcoEvents(events as string);

    setSpySetup("Computing locally...");
    setSpySetup(analyzeTicker("SPY"));

    setActualMovement(`Computing locally...`);
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
    <div className="min-h-screen pb-20 selection:bg-indigo-500/30">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                <TrendingUp size={18} className="text-white" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-white">Strategy Tester</span>
            </div>
            
            <div className="hidden md:flex items-center gap-1 bg-white/[0.03] p-1 rounded-lg border border-white/[0.05]">
              <button onClick={() => setActiveTab("logger")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'logger' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]'}`}>Data Logger</button>
              <button onClick={() => setActiveTab("analyzer")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === 'analyzer' ? 'bg-white/[0.08] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]'}`}>Pattern Analyzer</button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${isDbLoaded ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
              <Database size={12} />
              {isDbLoaded ? 'Local DB Active' : 'No Local DB'}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 mt-10">
        
        {/* Universal Archive Upload (Only shows prominently if not loaded) */}
        {!isDbLoaded && (
          <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
            <label className="group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/[0.15] rounded-2xl hover:border-indigo-500/50 hover:bg-indigo-500/[0.02] transition-all cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
              <UploadCloud size={28} className="text-gray-400 group-hover:text-indigo-400 mb-3 transition-colors" />
              <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{dbStatus}</span>
              <span className="text-xs text-gray-500 mt-1">Drag & Drop or Click to Browse</span>
              <input type="file" className="hidden" accept=".db" onChange={handleFileUpload} />
            </label>
            <p className="text-xs text-center text-gray-500 mt-3 flex items-center justify-center gap-1">
               Requires <code className="bg-white/5 px-1 py-0.5 rounded text-gray-400">archive_data.db</code>. 
               <a href="https://github.com/emadprograms/market-rewind/releases/tag/latest-archive" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">Download Latest</a>
            </p>
          </div>
        )}

        {activeTab === "logger" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            
            {/* Header & Main Control */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-end">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white mb-1">Log a New Trade</h1>
                <p className="text-sm text-gray-400">Fill in the details below. Connect the archive to auto-fill context.</p>
              </div>
              <button 
                onClick={handleAutoFill} 
                disabled={!isDbLoaded}
                className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap size={16} className={isDbLoaded ? "text-amber-500" : "text-gray-400"} />
                Auto-Fill Context
              </button>
            </div>

            {/* Core Identifiers Card */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 backdrop-blur-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Trade Date</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Ticker Symbol</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white uppercase focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all" placeholder="e.g. AAPL" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Strategy Name</label>
                  <div className="relative">
                    <Activity size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={strategy} onChange={(e) => setStrategy(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all" placeholder="ORB, Breakout, etc." />
                  </div>
                </div>
              </div>
            </div>

            {/* Context & Details Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Context */}
              <div className="space-y-8">
                <div className="space-y-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-2 border-b border-white/10 pb-3">
                    <FileTerminal size={16} className="text-indigo-400" /> 
                    Market Context
                  </h3>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Economic Events (Auto-fetched from Turso)</label>
                    <textarea value={ecoEvents} onChange={(e)=>setEcoEvents(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 h-28 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all leading-relaxed resize-none" placeholder="Events will auto-populate here..."/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">SPY Setup & Auto-Analysis</label>
                    <textarea value={spySetup} onChange={(e)=>setSpySetup(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 h-28 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all leading-relaxed resize-none" placeholder="SPY 45m stats will appear here..."/>
                  </div>
                  <div>
                     <label className="block text-xs font-medium text-gray-400 mb-2">Overall Market Sentiment</label>
                     <select value={sentiment} onChange={(e)=>setSentiment(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all">
                       <option>Bullish</option>
                       <option>Bearish</option>
                       <option>Choppy</option>
                     </select>
                  </div>
                </div>
              </div>

              {/* Right Column: Setup */}
              <div className="space-y-8">
                <div className="space-y-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-2 border-b border-white/10 pb-3">
                    <LineChart size={16} className="text-purple-400" /> 
                    Trade Setup
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">Previous Day</label>
                      <textarea value={prevDay} onChange={(e)=>setPrevDay(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 h-28 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">1-Day Setup</label>
                      <textarea value={oneDaySetup} onChange={(e)=>setOneDaySetup(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 h-28 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Presumed Plan</label>
                    <textarea value={plan} onChange={(e)=>setPlan(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 h-20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 flex justify-between">
                      <span>Actual Movement (First 45 mins)</span>
                      <span className="text-indigo-400 text-[10px] bg-indigo-500/10 px-2 py-0.5 rounded uppercase tracking-wider">Auto-Filled</span>
                    </label>
                    <textarea value={actualMovement} onChange={(e)=>setActualMovement(e.target.value)} className="w-full bg-indigo-500/[0.02] border border-indigo-500/20 rounded-xl px-4 py-3 text-sm text-indigo-100 h-24 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none" placeholder="Stock 45m stats will appear here..." />
                  </div>
                </div>
              </div>
            </div>

            {/* Results Card */}
            <div className="bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05] rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-6">Outcome</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-gray-400 mb-2">Risk:Reward</label>
                  <input type="number" step="0.1" value={rr} onChange={(e) => setRr(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all" />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-gray-400 mb-2">PnL (R)</label>
                  <input type="number" step="0.1" value={pnl} onChange={(e) => setPnl(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all" />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-gray-400 mb-2">Result</label>
                  <select value={result} onChange={(e)=>setResult(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer">
                    <option>Win</option>
                    <option>Loss</option>
                    <option>Breakeven</option>
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-gray-400 mb-2">Reflections & Comments</label>
                  <textarea value={comments} onChange={(e)=>setComments(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 h-20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                disabled={isSaving} 
                onClick={handleSave} 
                className="group relative flex items-center gap-2 bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-medium px-8 py-3.5 rounded-xl transition-all shadow-[0_0_25px_rgba(99,102,241,0.3)] hover:shadow-[0_0_35px_rgba(99,102,241,0.5)] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Log Trade"}
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {activeTab === "analyzer" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-white mb-1">Pattern Analyzer</h2>
                <p className="text-sm text-gray-400">Review your historical edge and PnL distribution.</p>
              </div>
            </div>
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl flex flex-col justify-center items-start backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><BarChart3 size={48} /></div>
                <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Trades</span>
                <span className="text-4xl font-medium tracking-tight text-white">{trades.length}</span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl flex flex-col justify-center items-start backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle2 size={48} className="text-emerald-500" /></div>
                <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Win Rate</span>
                <span className="text-4xl font-medium tracking-tight text-emerald-400">
                  {trades.length > 0 ? ((trades.filter(t => t.result === 'Win').length / trades.length) * 100).toFixed(1) : "0"}%
                </span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-2xl flex flex-col justify-center items-start backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={48} className={trades.reduce((sum, t) => sum + t.pnl_r, 0) >= 0 ? 'text-indigo-500' : 'text-rose-500'} /></div>
                <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Total PnL (R)</span>
                <span className={`text-4xl font-medium tracking-tight ${trades.reduce((sum, t) => sum + t.pnl_r, 0) >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                  {trades.reduce((sum, t) => sum + t.pnl_r, 0).toFixed(2)}R
                </span>
              </div>
            </div>

            {/* Data Grid */}
            <div className="bg-black/40 border border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase tracking-wider bg-white/[0.02] border-b border-white/[0.08]">
                    <tr>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Ticker</th>
                      <th className="px-6 py-4 font-medium">Strategy</th>
                      <th className="px-6 py-4 font-medium">Result</th>
                      <th className="px-6 py-4 font-medium">PnL (R)</th>
                      <th className="px-6 py-4 font-medium">Sentiment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {trades.map((t, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-400 group-hover:text-gray-300">{t.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-white">{t.ticker}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300">{t.strategy_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${t.result==='Win' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : t.result==='Loss' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                            {t.result}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap font-medium ${t.pnl_r > 0 ? 'text-emerald-400' : t.pnl_r < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                          {t.pnl_r > 0 ? '+' : ''}{t.pnl_r}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-400">{t.market_sentiment}</td>
                      </tr>
                    ))}
                    {trades.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
                          <AlertCircle size={32} className="mx-auto text-gray-600 mb-3" />
                          <p className="text-gray-400">No trades logged yet.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
