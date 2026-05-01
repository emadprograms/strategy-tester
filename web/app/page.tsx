"use client"

import { useState, useEffect } from "react";
import initSqlJs from "sql.js";
import { getTrades, saveTradeAndContext, getEconomicEvents } from "./actions";
import { Database, UploadCloud, TrendingUp, Search, Calendar, ChevronRight, Activity, Zap, CheckCircle2, AlertCircle, BarChart3, LineChart, FileTerminal, ChevronLeft, LayoutDashboard, PlusCircle } from "lucide-react";

export default function StrategyTester() {
  const [activeTab, setActiveTab] = useState("logger");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [dbStatus, setDbStatus] = useState("No DB");
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

    setDbStatus("Loading...");
    
    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
    });

    const reader = new FileReader();
    reader.onload = function() {
      const Uints = new Uint8Array(reader.result as ArrayBuffer);
      const db = new SQL.Database(Uints);
      setDbInstance(db);
      setIsDbLoaded(true);
      setDbStatus("Ready");
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
    <div className="flex flex-col md:flex-row h-[100dvh] overflow-hidden selection:bg-indigo-500/30">
      
      {/* Expandable Sidebar (Desktop Only) */}
      <aside 
        className={`hidden md:flex flex-col justify-between bg-black/60 backdrop-blur-2xl border-r border-white/[0.08] transition-all duration-300 ease-in-out relative ${isSidebarOpen ? 'w-72' : 'w-20'} z-50 shrink-0`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="h-24 flex items-center px-6 border-b border-white/[0.05]">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`w-10 h-10 min-w-[40px] rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95 cursor-pointer transition-all ${!isSidebarOpen && 'ml-[-4px]'}`}
              title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <TrendingUp size={22} className="text-white" />
            </button>
            <div className={`ml-4 whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0'}`}>
              <h1 className="font-bold text-lg tracking-tight text-white">Strategy Tester</h1>
              <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-semibold">Terminal V2</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-8 space-y-2">
            <button 
              onClick={() => setActiveTab("logger")} 
              className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-200 group ${activeTab === 'logger' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03] border border-transparent'}`}
            >
              <PlusCircle size={20} className={`min-w-[20px] transition-colors ${activeTab === 'logger' ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
              <span className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>Data Logger</span>
            </button>
            <button 
              onClick={() => setActiveTab("analyzer")} 
              className={`w-full flex items-center px-3 py-3 rounded-xl transition-all duration-200 group ${activeTab === 'analyzer' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03] border border-transparent'}`}
            >
              <LayoutDashboard size={20} className={`min-w-[20px] transition-colors ${activeTab === 'analyzer' ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
              <span className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>Pattern Analyzer</span>
            </button>
          </nav>

          {/* Bottom Area: Database Loader */}
          <div className={`p-4 border-t border-white/[0.05] transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'}`}>
             <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-3 ml-2 flex items-center gap-2">
               <Database size={12} className={isDbLoaded ? "text-emerald-400" : "text-amber-400"} /> 
               Local Archive
             </h3>
             
             {!isDbLoaded ? (
               <label className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/[0.1] rounded-xl hover:border-indigo-500/50 hover:bg-indigo-500/[0.02] transition-all cursor-pointer">
                 <UploadCloud size={24} className="text-gray-500 group-hover:text-indigo-400 mb-2 transition-colors" />
                 <span className="text-xs font-medium text-gray-400 group-hover:text-gray-300 text-center leading-relaxed">
                   Drop archive_data.db <br/> to connect
                 </span>
                 <input type="file" className="hidden" accept=".db" onChange={handleFileUpload} />
               </label>
             ) : (
               <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                 <CheckCircle2 size={20} className="text-emerald-400" />
                 <div>
                   <p className="text-xs font-medium text-emerald-400">{dbStatus}</p>
                   <p className="text-[10px] text-emerald-500/70 mt-0.5">Ready for auto-fill</p>
                 </div>
               </div>
             )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative bg-transparent scroll-smooth">
        
        {/* Mobile Header (Only visible on small screens) */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/[0.05] bg-black/40 backdrop-blur-md sticky top-0 z-40">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                <TrendingUp size={16} className="text-white" />
              </div>
              <h1 className="font-bold text-base tracking-tight text-white">Strategy Tester</h1>
           </div>
           <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium transition-colors ${isDbLoaded ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
              <Database size={10} />
              {isDbLoaded ? 'DB Active' : 'No DB'}
           </div>
        </div>

        <div className="max-w-5xl mx-auto p-4 md:p-10 pb-32 md:pb-24">
          
          {/* Mobile Database Loader */}
          {!isDbLoaded && (
            <div className="md:hidden mb-8 animate-in fade-in duration-500">
               <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/[0.15] rounded-2xl bg-white/[0.02] active:bg-white/[0.05] transition-all cursor-pointer">
                 <UploadCloud size={28} className="text-indigo-400 mb-3" />
                 <span className="text-sm font-medium text-white mb-1">Load Archive Database</span>
                 <span className="text-xs text-gray-500 text-center">Tap to select archive_data.db</span>
                 <input type="file" className="hidden" accept=".db" onChange={handleFileUpload} />
               </label>
            </div>
          )}

          {activeTab === "logger" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 md:space-y-8">
              
              {/* Header & Main Control */}
              <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-end">
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-1 md:mb-2">Log a New Trade</h1>
                  <p className="text-xs md:text-sm text-gray-400">Record your setup and outcomes. Use auto-fill to pull context from your local archive.</p>
                </div>
                <button 
                  onClick={handleAutoFill} 
                  disabled={!isDbLoaded}
                  className="flex items-center justify-center gap-2 w-full md:w-auto bg-white text-black hover:bg-gray-200 px-5 py-3 md:py-2.5 rounded-xl text-sm font-semibold transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <Zap size={16} className={isDbLoaded ? "text-amber-500" : "text-gray-400"} />
                  Auto-Fill Context
                </button>
              </div>

              {/* Core Identifiers Card */}
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 md:p-6 backdrop-blur-xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                
                {/* Left Column: Context */}
                <div className="space-y-6 md:space-y-8">
                  <div className="space-y-4 md:space-y-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-2 border-b border-white/10 pb-3">
                      <FileTerminal size={16} className="text-indigo-400" /> 
                      Market Context
                    </h3>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">Economic Events</label>
                      <textarea value={ecoEvents} onChange={(e)=>setEcoEvents(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 h-28 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all leading-relaxed resize-none" placeholder="Events will auto-populate here..."/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">SPY Setup & Analysis</label>
                      <textarea value={spySetup} onChange={(e)=>setSpySetup(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 h-28 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all leading-relaxed resize-none" placeholder="SPY 45m stats will appear here..."/>
                    </div>
                    <div>
                       <label className="block text-xs font-medium text-gray-400 mb-2">Market Sentiment</label>
                       <select value={sentiment} onChange={(e)=>setSentiment(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all">
                         <option>Bullish</option>
                         <option>Bearish</option>
                         <option>Choppy</option>
                       </select>
                    </div>
                  </div>
                </div>

                {/* Right Column: Setup */}
                <div className="space-y-6 md:space-y-8">
                  <div className="space-y-4 md:space-y-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-2 border-b border-white/10 pb-3">
                      <LineChart size={16} className="text-purple-400" /> 
                      Trade Setup
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">Previous Day</label>
                        <textarea value={prevDay} onChange={(e)=>setPrevDay(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 h-24 md:h-28 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">1-Day Setup</label>
                        <textarea value={oneDaySetup} onChange={(e)=>setOneDaySetup(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 h-24 md:h-28 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">Presumed Plan</label>
                      <textarea value={plan} onChange={(e)=>setPlan(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 h-20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none" />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2 flex justify-between">
                        <span>Actual Movement (First 45 mins)</span>
                        <span className="text-indigo-400 text-[10px] bg-indigo-500/10 px-2 py-0.5 rounded uppercase tracking-wider hidden md:inline-block">Auto-Filled</span>
                      </label>
                      <textarea value={actualMovement} onChange={(e)=>setActualMovement(e.target.value)} className="w-full bg-indigo-500/[0.02] border border-indigo-500/20 rounded-xl px-4 py-3 text-sm text-indigo-100 h-24 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none" placeholder="Stock stats..." />
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Card */}
              <div className="bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05] rounded-2xl p-4 md:p-6 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4 md:mb-6">Outcome</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-400 mb-2">Risk:Reward</label>
                    <input type="number" step="0.1" value={rr} onChange={(e) => setRr(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all" />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-400 mb-2">PnL (R)</label>
                    <input type="number" step="0.1" value={pnl} onChange={(e) => setPnl(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all" />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-400 mb-2">Result</label>
                    <select value={result} onChange={(e)=>setResult(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer">
                      <option>Win</option>
                      <option>Loss</option>
                      <option>Breakeven</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3 md:col-span-4">
                    <label className="block text-xs font-medium text-gray-400 mb-2">Reflections & Comments</label>
                    <textarea value={comments} onChange={(e)=>setComments(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 h-24 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 pb-6">
                <button 
                  disabled={isSaving} 
                  onClick={handleSave} 
                  className="w-full md:w-auto group relative flex items-center justify-center gap-2 bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-medium px-8 py-3.5 rounded-xl transition-all shadow-[0_0_25px_rgba(99,102,241,0.3)] md:hover:shadow-[0_0_35px_rgba(99,102,241,0.5)] disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
                >
                  {isSaving ? "Saving..." : "Log Trade"}
                  <ChevronRight size={18} className="hidden md:block group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {activeTab === "analyzer" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-end mb-6 md:mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-1">Pattern Analyzer</h2>
                  <p className="text-xs md:text-sm text-gray-400">Review your historical edge and PnL distribution.</p>
                </div>
              </div>
              
              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
                <div className="col-span-2 md:col-span-1 bg-white/[0.02] border border-white/[0.05] p-5 md:p-6 rounded-2xl flex flex-col justify-center items-start backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><BarChart3 size={48} /></div>
                  <span className="text-gray-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1 md:mb-2">Total Trades</span>
                  <span className="text-3xl md:text-4xl font-medium tracking-tight text-white">{trades.length}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.05] p-5 md:p-6 rounded-2xl flex flex-col justify-center items-start backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle2 size={48} className="text-emerald-500" /></div>
                  <span className="text-gray-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1 md:mb-2">Win Rate</span>
                  <span className="text-3xl md:text-4xl font-medium tracking-tight text-emerald-400">
                    {trades.length > 0 ? ((trades.filter(t => t.result === 'Win').length / trades.length) * 100).toFixed(1) : "0"}%
                  </span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.05] p-5 md:p-6 rounded-2xl flex flex-col justify-center items-start backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={48} className={trades.reduce((sum, t) => sum + t.pnl_r, 0) >= 0 ? 'text-indigo-500' : 'text-rose-500'} /></div>
                  <span className="text-gray-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1 md:mb-2">Total PnL</span>
                  <span className={`text-3xl md:text-4xl font-medium tracking-tight ${trades.reduce((sum, t) => sum + t.pnl_r, 0) >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                    {trades.reduce((sum, t) => sum + t.pnl_r, 0).toFixed(2)}R
                  </span>
                </div>
              </div>

              {/* Data Grid */}
              <div className="bg-black/40 border border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider bg-white/[0.02] border-b border-white/[0.08]">
                      <tr>
                        <th className="px-4 md:px-6 py-4 font-medium">Date</th>
                        <th className="px-4 md:px-6 py-4 font-medium">Ticker</th>
                        <th className="px-4 md:px-6 py-4 font-medium">Strategy</th>
                        <th className="px-4 md:px-6 py-4 font-medium">Result</th>
                        <th className="px-4 md:px-6 py-4 font-medium">PnL (R)</th>
                        <th className="px-4 md:px-6 py-4 font-medium hidden sm:table-cell">Sentiment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {trades.map((t, i) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors group text-xs md:text-sm">
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-gray-400 group-hover:text-gray-300">{t.date}</td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap font-semibold text-white">{t.ticker}</td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-gray-300">{t.strategy_name}</td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium border ${t.result==='Win' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : t.result==='Loss' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                              {t.result}
                            </span>
                          </td>
                          <td className={`px-4 md:px-6 py-4 whitespace-nowrap font-medium ${t.pnl_r > 0 ? 'text-emerald-400' : t.pnl_r < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                            {t.pnl_r > 0 ? '+' : ''}{t.pnl_r}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-gray-400 hidden sm:table-cell">{t.market_sentiment}</td>
                        </tr>
                      ))}
                      {trades.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 md:py-16 text-center">
                            <AlertCircle size={24} className="mx-auto text-gray-600 mb-2 md:mb-3" />
                            <p className="text-xs md:text-sm text-gray-400">No trades logged yet.</p>
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
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur-2xl border-t border-white/[0.08] px-6 py-3 pb-safe z-50">
        <div className="flex justify-between items-center max-w-sm mx-auto">
          <button 
            onClick={() => setActiveTab("logger")} 
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'logger' ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'logger' ? 'bg-indigo-500/10' : 'bg-transparent'}`}>
              <PlusCircle size={22} />
            </div>
            <span className="text-[10px] font-medium tracking-wide">Logger</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("analyzer")} 
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'analyzer' ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'analyzer' ? 'bg-indigo-500/10' : 'bg-transparent'}`}>
              <LayoutDashboard size={22} />
            </div>
            <span className="text-[10px] font-medium tracking-wide">Analyzer</span>
          </button>
        </div>
      </nav>

    </div>
  );
}
