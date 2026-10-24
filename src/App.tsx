import React, { useState } from "react";
import { 
  Trophy, 
  Activity, 
  Cpu, 
  MessageSquare, 
  BarChart3, 
  Calendar, 
  ShieldAlert, 
  Search, 
  ChevronRight, 
  TrendingUp, 
  Play, 
  Send, 
  Sparkles, 
  RefreshCw, 
  Zap, 
  Award,
  Filter,
  CheckCircle2,
  Clock,
  Sliders,
  GitCompare
} from "lucide-react";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  stadium: string;
  homeLogo: string;
  awayLogo: string;
  odds: { home: number; draw: number; away: number };
  form: { home: string; away: string };
  status: string;
  aiPrediction?: {
    winProb: { home: number; draw: number; away: number };
    expectedScore: string;
    confidence: string;
    valuePick: string;
    summary: string;
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"matches" | "predictor" | "comparator" | "simulator" | "standings" | "assistant">("matches");
  const [leagueFilter, setLeagueFilter] = useState<string>("All");

  // Initial Matches data
  const initialMatches: Match[] = [
    {
      id: "m-1",
      homeTeam: "Real Madrid",
      awayTeam: "Barcelona",
      league: "La Liga",
      date: "2026-10-25 21:00",
      stadium: "Santiago Bernabéu",
      homeLogo: "👑",
      awayLogo: "🔵🔴",
      odds: { home: 2.10, draw: 3.40, away: 3.20 },
      form: { home: "WWWDW", away: "WWWWL" },
      status: "Upcoming",
      aiPrediction: {
        winProb: { home: 48, draw: 26, away: 26 },
        expectedScore: "2 - 1",
        confidence: "High",
        valuePick: "Home Win & Both Teams to Score",
        summary: "El Clásico promises high intensity. Real Madrid's formidable home record and counter-attacking pace give them the edge."
      }
    },
    {
      id: "m-2",
      homeTeam: "Arsenal",
      awayTeam: "Manchester City",
      league: "Premier League",
      date: "2026-10-26 17:30",
      stadium: "Emirates Stadium",
      homeLogo: "🔴⚪",
      awayLogo: "🩵🛡️",
      odds: { home: 2.45, draw: 3.30, away: 2.85 },
      form: { home: "WWWDW", away: "WDWWW" },
      status: "Upcoming",
      aiPrediction: {
        winProb: { home: 40, draw: 30, away: 30 },
        expectedScore: "1 - 1",
        confidence: "Medium",
        valuePick: "Under 2.5 Goals",
        summary: "A tactical masterclass expected between Arteta and Guardiola. Set-pieces and defensive solidity will likely decide a tight encounter."
      }
    },
    {
      id: "m-3",
      homeTeam: "Bayern Munich",
      awayTeam: "Borussia Dortmund",
      league: "Bundesliga",
      date: "2026-10-25 18:30",
      stadium: "Allianz Arena",
      homeLogo: "🔴⚪",
      awayLogo: "🟡⚫",
      odds: { home: 1.55, draw: 4.20, away: 5.50 },
      form: { home: "WWWWW", away: "WDWLW" },
      status: "Upcoming",
      aiPrediction: {
        winProb: { home: 68, draw: 20, away: 12 },
        expectedScore: "3 - 1",
        confidence: "High",
        valuePick: "Bayern Munich -1.5 Handicap",
        summary: "Der Klassiker heavily favors Bayern at the Allianz Arena given their blistering offensive form."
      }
    },
    {
      id: "m-4",
      homeTeam: "Inter Milan",
      awayTeam: "AC Milan",
      league: "Serie A",
      date: "2026-10-27 20:45",
      stadium: "San Siro",
      homeLogo: "🖤💙",
      awayLogo: "❤️🖤",
      odds: { home: 1.95, draw: 3.40, away: 3.90 },
      form: { home: "WDWWV", away: "WWDWW" },
      status: "Upcoming",
      aiPrediction: {
        winProb: { home: 52, draw: 28, away: 20 },
        expectedScore: "2 - 0",
        confidence: "Medium",
        valuePick: "Inter Milan Clean Sheet",
        summary: "Inter's tactical discipline in the 3-5-2 formation suffocates Milan's wing play."
      }
    },
    {
      id: "m-5",
      homeTeam: "PSG",
      awayTeam: "Marseille",
      league: "Ligue 1",
      date: "2026-10-26 21:00",
      stadium: "Parc des Princes",
      homeLogo: "🔵🔴",
      awayLogo: "⚪🔵",
      odds: { home: 1.48, draw: 4.50, away: 6.20 },
      form: { home: "WWWWW", away: "DWWWL" },
      status: "Upcoming",
      aiPrediction: {
        winProb: { home: 72, draw: 18, away: 10 },
        expectedScore: "3 - 0",
        confidence: "High",
        valuePick: "PSG Over 2.5 Team Goals",
        summary: "Le Classique. PSG's attacking depth overwhelms most domestic opponents at home."
      }
    }
  ];

  // Predictor state
  const [customHome, setCustomHome] = useState("Real Madrid");
  const [customAway, setCustomAway] = useState("Barcelona");
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  // Comparator state
  const [compTeamA, setCompTeamA] = useState("Real Madrid");
  const [compTeamB, setCompTeamB] = useState("Barcelona");
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [isComparing, setIsComparing] = useState(false);

  // Simulator state
  const [simHome, setSimHome] = useState("Arsenal");
  const [simAway, setSimAway] = useState("Manchester City");
  const [homeAdvantage, setHomeAdvantage] = useState("Standard (+10%)");
  const [weather, setWeather] = useState("Clear & Dry (18°C)");
  const [simResult, setSimResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Chat Assistant state
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([
    { role: "model", content: "Hello! I'm your FB Analytics Pro AI Coach. Ask me about any fixture, tactical matchups, expected goals (xG), or value bets for today's matches." }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isChatting, setIsChatting] = useState(false);

  // Client-side Predictor generator
  const handleRunPrediction = (home = customHome, away = customAway) => {
    setIsPredicting(true);
    setTimeout(() => {
      setPredictionResult({
        winProb: { home: 47, draw: 28, away: 25 },
        expectedScore: "2 - 1",
        confidence: "High",
        valuePick: `${home} Win & Over 1.5 Goals`,
        summary: `${home} and ${away} clash in a high-stakes tactical battle. Recent xG metrics and home/away pressing intensities point towards a narrow victory for the hosts.`,
        keyFactors: ["Midfield control and transition speed", "Set-piece defensive vulnerability", "Home crowd tactical momentum"],
        tacticalPreview: `Both managers are expected to deploy high-press formations. ${home} will rely heavily on quick transitions through the flanks, while ${away} aims to dominate possession in central areas.`,
        keyPlayers: [
          { name: "Star Forward #9", team: home, role: "Striker", impact: "High xG involvement" },
          { name: "Playmaker #10", team: away, role: "Midfielder", impact: "Key chance creator" }
        ],
        goalsTimeline: "Heavy action expected between minutes 30 and 75 as stamina levels dip."
      });
      setIsPredicting(false);
      setActiveTab("predictor");
    }, 600);
  };

  // Client-side Comparator generator
  const handleRunComparison = (teamA = compTeamA, teamB = compTeamB) => {
    setIsComparing(true);
    setTimeout(() => {
      setComparisonResult({
        teamAStanding: { position: 1, played: 10, won: 8, drawn: 2, lost: 0, gf: 28, ga: 9, gd: 19, points: 26 },
        teamBStanding: { position: 2, played: 10, won: 8, drawn: 1, lost: 1, gf: 31, ga: 9, gd: 22, points: 25 },
        teamAForm: ["W", "W", "W", "D", "W"],
        teamBForm: ["W", "W", "W", "W", "L"],
        h2hMatches: [
          { date: "2025-04-15", competition: "League", score: "2 - 1", winner: teamA },
          { date: "2024-11-20", competition: "League", score: "1 - 1", winner: "Draw" },
          { date: "2024-05-10", competition: "Cup", score: "0 - 2", winner: teamB }
        ],
        h2hStats: { teamAWins: 2, draws: 1, teamBWins: 1 },
        comparisonVerdict: `${teamA} holds a slight historical edge at home, but ${teamB}'s offensive output (31 goals) makes this one of the most explosive fixtures in European football.`
      });
      setIsComparing(false);
      setActiveTab("comparator");
    }, 600);
  };

  // Client-side Simulator
  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setSimResult({
        simulatedScore: "2 - 2",
        possession: { home: 54, away: 46 },
        shots: { home: 16, away: 14 },
        shotsOnTarget: { home: 7, away: 6 },
        expectedGoals: { home: 2.1, away: 1.9 },
        matchNarrative: `Under ${weather.toLowerCase()} conditions, both ${simHome} and ${simAway} traded blows in a thrilling encounter filled with high-intensity counter-attacks and late drama.`
      });
      setIsSimulating(false);
    }, 600);
  };

  // Client-side Chat Assistant
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isChatting) return;

    const userMsg = inputMessage.trim();
    setInputMessage("");
    const newMessages = [...chatMessages, { role: "user", content: userMsg }];
    setChatMessages(newMessages);
    setIsChatting(true);

    setTimeout(() => {
      let reply = "Based on current xG metrics, recent form, and tactical setups, this fixture leans towards a tightly contested affair with both teams finding the back of the net.";
      const lower = userMsg.toLowerCase();
      if (lower.includes("madrid") || lower.includes("barcelona")) {
        reply = "El Clásico is always unpredictable, but Real Madrid's defensive solidity combined with home advantage gives them a 48% win probability according to our neural model.";
      } else if (lower.includes("arsenal") || lower.includes("city")) {
        reply = "Arsenal vs Manchester City is a tactical chess match. Expect low scoring (< 2.5 goals) with heavy midfield congestion.";
      } else if (lower.includes("value") || lower.includes("bet")) {
        reply = "Top value bets for this weekend include Real Madrid Win & Both Teams to Score, and Bayern Munich -1.5 handicap.";
      }

      setChatMessages([...newMessages, { role: "model", content: reply }]);
      setIsChatting(false);
    }, 700);
  };

  const leagues = ["All", "Premier League", "La Liga", "Bundesliga", "Serie A", "Ligue 1"];
  const filteredMatches = leagueFilter === "All" ? initialMatches : initialMatches.filter(m => m.league === leagueFilter);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-50 flex items-center justify-between gap-8 px-6 py-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Trophy className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
            FB Analytics <span className="text-emerald-400 font-extrabold">PRO</span>
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden xl:flex items-center gap-5 text-sm font-medium text-slate-400">
          <button 
            onClick={() => setActiveTab("matches")}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${activeTab === "matches" ? "text-emerald-400 font-semibold" : ""}`}
          >
            Matches & Odds
          </button>
          <button 
            onClick={() => setActiveTab("predictor")}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${activeTab === "predictor" ? "text-emerald-400 font-semibold" : ""}`}
          >
            AI Predictor
          </button>
          <button 
            onClick={() => {
              setActiveTab("comparator");
              if (!comparisonResult) handleRunComparison("Real Madrid", "Barcelona");
            }}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${activeTab === "comparator" ? "text-emerald-400 font-semibold" : ""}`}
          >
            H2H Comparison
          </button>
          <button 
            onClick={() => setActiveTab("simulator")}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${activeTab === "simulator" ? "text-emerald-400 font-semibold" : ""}`}
          >
            Match Lab Simulator
          </button>
          <button 
            onClick={() => setActiveTab("standings")}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${activeTab === "standings" ? "text-emerald-400 font-semibold" : ""}`}
          >
            Standings & Form
          </button>
          <button 
            onClick={() => setActiveTab("assistant")}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white ${activeTab === "assistant" ? "text-emerald-400 font-semibold" : ""}`}
          >
            AI Betting Coach
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => {
              setActiveTab("comparator");
              handleRunComparison("Real Madrid", "Barcelona");
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shadow-md shadow-emerald-400/20"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Compare Teams</span>
          </button>
        </div>
      </header>

      {/* Mobile Nav Bar */}
      <div className="flex xl:hidden overflow-x-auto gap-2 px-4 py-3 bg-slate-900 border-b border-slate-800 text-xs font-medium">
        {[
          { id: "matches", label: "Matches" },
          { id: "predictor", label: "Predictor" },
          { id: "comparator", label: "H2H Compare" },
          { id: "simulator", label: "Simulator" },
          { id: "standings", label: "Standings" },
          { id: "assistant", label: "AI Coach" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              if (tab.id === "comparator" && !comparisonResult) {
                handleRunComparison("Real Madrid", "Barcelona");
              }
            }}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${activeTab === tab.id ? "bg-emerald-500 text-slate-950 font-semibold" : "bg-slate-800 text-slate-300"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* MATCHES VIEW */}
        {activeTab === "matches" && (
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/20 p-8 shadow-2xl">
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold mb-4">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Client-Side Algorithmic Intelligence</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
                  Match Intelligence & Value Bets
                </h1>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                  Algorithmic match projections, xG analysis, probability distributions, and AI value picks for top European fixtures. Optimized for GitHub Pages.
                </p>
                <div className="flex flex-wrap gap-3">
                  {leagues.map(lg => (
                    <button
                      key={lg}
                      onClick={() => setLeagueFilter(lg)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${leagueFilter === lg ? "bg-emerald-500 text-slate-950 font-semibold" : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50"}`}
                    >
                      {lg}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMatches.map(match => (
                <div 
                  key={match.id}
                  className="group rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 p-5 flex flex-col justify-between shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-4 pb-3 border-b border-slate-800">
                      <span className="font-semibold text-emerald-400">{match.league}</span>
                      <span>{match.date}</span>
                    </div>

                    <div className="space-y-3 mb-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{match.homeLogo}</span>
                          <span className="font-bold text-white">{match.homeTeam}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">Form: {match.form.home}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{match.awayLogo}</span>
                          <span className="font-bold text-white">{match.awayTeam}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">Form: {match.form.away}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-950/60 rounded-lg p-2.5 text-center mb-4 border border-slate-800/80">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">1</div>
                        <div className="text-sm font-bold font-mono text-emerald-400">{match.odds.home}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">X</div>
                        <div className="text-sm font-bold font-mono text-slate-300">{match.odds.draw}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">2</div>
                        <div className="text-sm font-bold font-mono text-cyan-400">{match.odds.away}</div>
                      </div>
                    </div>

                    {match.aiPrediction && (
                      <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-3 text-xs mb-4">
                        <div className="flex items-center justify-between font-semibold text-emerald-400 mb-1">
                          <span>AI Value Pick:</span>
                          <span className="font-mono bg-emerald-500/10 px-2 py-0.5 rounded text-[11px]">{match.aiPrediction.expectedScore}</span>
                        </div>
                        <p className="text-slate-300 line-clamp-2">{match.aiPrediction.valuePick}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => {
                        setCustomHome(match.homeTeam);
                        setCustomAway(match.awayTeam);
                        handleRunPrediction(match.homeTeam, match.awayTeam);
                      }}
                      className="py-2.5 px-3 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Predict</span>
                    </button>
                    <button
                      onClick={() => {
                        setCompTeamA(match.homeTeam);
                        setCompTeamB(match.awayTeam);
                        handleRunComparison(match.homeTeam, match.awayTeam);
                      }}
                      className="py-2.5 px-3 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-200 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                      <span>Compare</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* H2H COMPARISON VIEW */}
        {activeTab === "comparator" && (
          <div className="space-y-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <GitCompare className="w-6 h-6 text-emerald-400" />
                  <span>Side-by-Side Team Comparison & H2H</span>
                </h1>
                <p className="text-slate-400 text-sm mt-1">Compare league standings, head-to-head match history, and combined form statistics.</p>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <select 
                  value={compTeamA} 
                  onChange={(e) => setCompTeamA(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Real Madrid">Real Madrid</option>
                  <option value="Barcelona">Barcelona</option>
                  <option value="Arsenal">Arsenal</option>
                  <option value="Manchester City">Manchester City</option>
                  <option value="Bayern Munich">Bayern Munich</option>
                  <option value="Inter Milan">Inter Milan</option>
                </select>
                <span className="text-slate-500 text-xs font-bold">VS</span>
                <select 
                  value={compTeamB} 
                  onChange={(e) => setCompTeamB(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Barcelona">Barcelona</option>
                  <option value="Real Madrid">Real Madrid</option>
                  <option value="Manchester City">Manchester City</option>
                  <option value="Arsenal">Arsenal</option>
                  <option value="Bayern Munich">Bayern Munich</option>
                  <option value="Inter Milan">Inter Milan</option>
                </select>
                <button
                  onClick={() => handleRunComparison()}
                  disabled={isComparing}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isComparing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{isComparing ? "Comparing..." : "Compare"}</span>
                </button>
              </div>
            </div>

            {isComparing ? (
              <div className="py-24 text-center space-y-4">
                <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
                <p className="text-slate-300 font-medium">Analyzing league standings and H2H records...</p>
              </div>
            ) : comparisonResult ? (
              <div className="space-y-8">
                <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Tactical Verdict</span>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed">{comparisonResult.comparisonVerdict}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Team A */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                      <div>
                        <span className="text-xs text-slate-400 uppercase">Club A</span>
                        <h2 className="text-xl font-bold text-white mt-0.5">{compTeamA}</h2>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Position</div>
                        <div className="text-2xl font-mono font-extrabold text-emerald-400">#{comparisonResult.teamAStanding.position}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-400">Recent Form (Last 5)</div>
                      <div className="flex gap-2">
                        {comparisonResult.teamAForm.map((res: string, i: number) => (
                          <span key={i} className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            {res}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                        <div className="text-[10px] text-slate-400 uppercase">Points</div>
                        <div className="text-lg font-mono font-bold text-white mt-0.5">{comparisonResult.teamAStanding.points}</div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                        <div className="text-[10px] text-slate-400 uppercase">Played</div>
                        <div className="text-lg font-mono font-bold text-white mt-0.5">{comparisonResult.teamAStanding.played}</div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                        <div className="text-[10px] text-slate-400 uppercase">Goal Diff</div>
                        <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">+{comparisonResult.teamAStanding.gd}</div>
                      </div>
                    </div>
                  </div>

                  {/* Team B */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                      <div>
                        <span className="text-xs text-slate-400 uppercase">Club B</span>
                        <h2 className="text-xl font-bold text-white mt-0.5">{compTeamB}</h2>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Position</div>
                        <div className="text-2xl font-mono font-extrabold text-cyan-400">#{comparisonResult.teamBStanding.position}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-400">Recent Form (Last 5)</div>
                      <div className="flex gap-2">
                        {comparisonResult.teamBForm.map((res: string, i: number) => (
                          <span key={i} className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                            {res}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                        <div className="text-[10px] text-slate-400 uppercase">Points</div>
                        <div className="text-lg font-mono font-bold text-white mt-0.5">{comparisonResult.teamBStanding.points}</div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                        <div className="text-[10px] text-slate-400 uppercase">Played</div>
                        <div className="text-lg font-mono font-bold text-white mt-0.5">{comparisonResult.teamBStanding.played}</div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                        <div className="text-[10px] text-slate-400 uppercase">Goal Diff</div>
                        <div className="text-lg font-mono font-bold text-cyan-400 mt-0.5">+{comparisonResult.teamBStanding.gd}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* H2H Matches */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <h3 className="text-lg font-bold text-white">Head-to-Head History</h3>
                    <div className="flex gap-3 text-xs font-mono">
                      <span className="text-emerald-400">{compTeamA} Wins: {comparisonResult.h2hStats.teamAWins}</span>
                      <span className="text-amber-400">Draws: {comparisonResult.h2hStats.draws}</span>
                      <span className="text-cyan-400">{compTeamB} Wins: {comparisonResult.h2hStats.teamBWins}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {comparisonResult.h2hMatches.map((m: any, idx: number) => (
                      <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-400">{m.date} ({m.competition})</span>
                        <span className="font-mono font-bold text-white">{m.score}</span>
                        <span className="text-xs text-slate-300">Winner: <strong className="text-emerald-400">{m.winner}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* PREDICTOR VIEW */}
        {activeTab === "predictor" && (
          <div className="space-y-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Cpu className="w-6 h-6 text-emerald-400" />
                  <span>AI Match Predictor & Tactical Lab</span>
                </h1>
                <p className="text-slate-400 text-sm mt-1">Configure custom fixtures and run match forecasts.</p>
              </div>

              <div className="flex gap-2 items-center">
                <input 
                  type="text" 
                  value={customHome} 
                  onChange={(e) => setCustomHome(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white w-32"
                />
                <span className="text-slate-500 text-xs font-bold">VS</span>
                <input 
                  type="text" 
                  value={customAway} 
                  onChange={(e) => setCustomAway(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white w-32"
                />
                <button
                  onClick={() => handleRunPrediction()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Predict</span>
                </button>
              </div>
            </div>

            {isPredicting ? (
              <div className="py-24 text-center">
                <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
              </div>
            ) : predictionResult ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                      <h2 className="text-xl font-bold text-white">{customHome} vs {customAway}</h2>
                      <div className="text-2xl font-mono font-extrabold text-emerald-400">{predictionResult.expectedScore}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>{customHome} ({predictionResult.winProb.home}%)</span>
                        <span>Draw ({predictionResult.winProb.draw}%)</span>
                        <span>{customAway} ({predictionResult.winProb.away}%)</span>
                      </div>
                      <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex">
                        <div style={{ width: `${predictionResult.winProb.home}%` }} className="bg-emerald-500" />
                        <div style={{ width: `${predictionResult.winProb.draw}%` }} className="bg-amber-500" />
                        <div style={{ width: `${predictionResult.winProb.away}%` }} className="bg-cyan-500" />
                      </div>
                    </div>
                    <p className="text-sm text-slate-200">{predictionResult.summary}</p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-lg font-bold text-white">Value Pick</h3>
                  <div className="p-4 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-emerald-400 font-bold">
                    {predictionResult.valuePick}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* SIMULATOR VIEW */}
        {activeTab === "simulator" && (
          <div className="space-y-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Activity className="w-6 h-6 text-emerald-400" />
                <span>Match Lab Simulator</span>
              </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Home Team</label>
                  <input type="text" value={simHome} onChange={(e) => setSimHome(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Away Team</label>
                  <input type="text" value={simAway} onChange={(e) => setSimAway(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Weather</label>
                  <select value={weather} onChange={(e) => setWeather(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option>Clear & Dry (18°C)</option>
                    <option>Heavy Rain & Slick Pitch</option>
                  </select>
                </div>
                <button onClick={handleRunSimulation} disabled={isSimulating} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl">
                  {isSimulating ? "Simulating..." : "Run Simulation"}
                </button>
              </div>

              <div className="lg:col-span-2">
                {simResult ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
                    <div className="text-5xl font-mono font-black text-white">{simResult.simulatedScore}</div>
                    <p className="text-sm text-slate-300 italic">{simResult.matchNarrative}</p>
                  </div>
                ) : (
                  <div className="h-64 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                    Configure parameters and run simulation.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STANDINGS VIEW */}
        {activeTab === "standings" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 text-xs uppercase border-b border-slate-800">
                  <th className="py-4 px-6">Pos</th>
                  <th className="py-4 px-6">Team</th>
                  <th className="py-4 px-6 text-center">Pl</th>
                  <th className="py-4 px-6 text-center">GD</th>
                  <th className="py-4 px-6 text-center">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm font-mono">
                {[
                  { pos: 1, team: "Real Madrid", pl: 10, gd: 19, pts: 26 },
                  { pos: 2, team: "Barcelona", pl: 10, gd: 22, pts: 25 },
                  { pos: 3, team: "Arsenal", pl: 10, gd: 16, pts: 24 },
                  { pos: 4, team: "Manchester City", pl: 10, gd: 17, pts: 23 },
                ].map((row) => (
                  <tr key={row.pos} className="hover:bg-slate-800/40">
                    <td className="py-4 px-6 font-bold text-emerald-400">{row.pos}</td>
                    <td className="py-4 px-6 font-semibold text-white font-sans">{row.team}</td>
                    <td className="py-4 px-6 text-center text-slate-300">{row.pl}</td>
                    <td className="py-4 px-6 text-center text-emerald-400">+{row.gd}</td>
                    <td className="py-4 px-6 text-center font-bold text-white">{row.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ASSISTANT VIEW */}
        {activeTab === "assistant" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[500px]">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xl rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-emerald-500 text-slate-950 font-medium" : "bg-slate-950 border border-slate-800 text-slate-200"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="p-4 bg-slate-950 border-t border-slate-800 flex gap-3">
              <input 
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about match odds or tactics..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
              />
              <button type="submit" className="px-6 bg-emerald-500 text-slate-950 font-bold rounded-xl">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
