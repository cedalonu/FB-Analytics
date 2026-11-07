import React, { useState, useEffect } from 'react';
import { FixtureMatch, FinishedMatch } from '../types/football';
import * as XLSX from 'xlsx';
import { Sparkles, Trophy, Filter, Check, X, Clock, History, ArrowUpDown, FileSpreadsheet } from 'lucide-react';

interface ScreenerFixture extends FixtureMatch {
  leagueName: string;
  confidenceScore: number;
}

type SortField = 'date' | 'league' | 'confidence' | 'totalXG' | 'teams' | 'btts' | 'overUnder';
type ResultSortField = 'date' | 'league' | 'teams' | 'score' | 'btts' | 'overUnder' | 'confidence';
type ScreenerMode = 'fixtures' | 'results';

export const ScreenerView: React.FC = () => {
  const [mode, setMode] = useState<ScreenerMode>('fixtures');
  const [fixtures, setFixtures] = useState<ScreenerFixture[]>([]);
  const [results, setResults] = useState<FinishedMatch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState<boolean>(false);
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'BTTS_SI' | 'BTTS_NO' | 'OVER_2_5' | 'UNDER_2_5'>('ALL');
  const [filterMode, setFilterMode] = useState<'ALL' | 'HITS_ONLY' | 'BOTH_HITS' | 'MISSES_ONLY'>('ALL');
  const [minConfidence, setMinConfidence] = useState<number>(50);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Sorting for fixtures
  const [sortField, setSortField] = useState<SortField>('confidence');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Sorting for results
  const [resultSortField, setResultSortField] = useState<ResultSortField>('date');
  const [resultSortAsc, setResultSortAsc] = useState<boolean>(false);

  useEffect(() => {
    setIsLoading(true);
    const baseUrl = import.meta.env.BASE_URL || '/';
    const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';

    if (mode === 'fixtures') {
      fetch(`${base}screener.json?t=${Date.now()}`)
        .then(async (r) => {
          if (!r.ok) throw new Error('Not static');
          const text = await r.text();
          if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html') || !text.trim().startsWith('{')) {
            throw new Error('Not JSON');
          }
          return JSON.parse(text);
        })
        .then((res) => {
          if (res.success && Array.isArray(res.fixtures)) {
            setFixtures(res.fixtures);
          } else {
            throw new Error();
          }
        })
        .catch(async () => {
          // Fallback to API
          try {
            const apiResp = await fetch('/api/screener?daysAhead=7');
            const apiText = await apiResp.text();
            const apiJson = JSON.parse(apiText);
            if (apiJson.success && Array.isArray(apiJson.fixtures)) {
              setFixtures(apiJson.fixtures);
              return;
            }
          } catch {}

          // Final fallback to individual league files
          try {
            const leagueIds = ['1', '2', '3', '4', '31', '32', '33', '34', '10', '17', '18', '30'];
            const allFixtures: ScreenerFixture[] = [];
            for (const lid of leagueIds) {
              try {
                const resp = await fetch(`${base}data_league_${lid}.json?t=${Date.now()}`);
                const text = await resp.text();
                if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html') || !text.trim().startsWith('{')) {
                  continue;
                }
                const json = JSON.parse(text);
                if (json && Array.isArray(json.fixtures)) {
                  json.fixtures.forEach((f: any) => {
                    const p = f.prediction || f.pred;
                    const conf = p ? Math.round(Math.max(p.bttsProbability, p.bttsNoProbability, p.over25Probability, p.under25Probability) * 100) : 50;
                    allFixtures.push({ ...f, prediction: p, leagueName: json.leagueName || lid, confidenceScore: conf });
                  });
                }
              } catch {}
            }
            setFixtures(allFixtures);
          } catch (e) {
            console.error('Error in static screener fallback:', e);
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      fetch(`${base}screener-results.json?t=${Date.now()}`)
        .then(async (r) => {
          if (!r.ok) throw new Error('Not static');
          const text = await r.text();
          if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html') || !text.trim().startsWith('{')) {
            throw new Error('Not JSON');
          }
          return JSON.parse(text);
        })
        .then((res) => {
          if (res.success && Array.isArray(res.results)) {
            setResults(res.results);
          } else {
            throw new Error();
          }
        })
        .catch(async () => {
          // Fallback to API
          try {
            const apiResp = await fetch('/api/screener-results?daysBehind=14');
            const apiText = await apiResp.text();
            const apiJson = JSON.parse(apiText);
            if (apiJson.success && Array.isArray(apiJson.results)) {
              setResults(apiJson.results);
              return;
            }
          } catch {}

          // Final fallback to individual league files
          try {
            const leagueIds = ['1', '2', '3', '4', '31', '32', '33', '34', '10', '17', '18', '30'];
            const allResults: FinishedMatch[] = [];
            for (const lid of leagueIds) {
              try {
                const resp = await fetch(`${base}data_league_${lid}.json?t=${Date.now()}`);
                const text = await resp.text();
                if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html') || !text.trim().startsWith('{')) {
                  continue;
                }
                const json = JSON.parse(text);
                if (json && Array.isArray(json.results)) {
                  json.results.forEach((r: any) => {
                    const p = r.prediction || r.pred;
                    allResults.push({ ...r, prediction: p, leagueName: json.leagueName || lid });
                  });
                }
              } catch {}
            }
            setResults(allResults);
          } catch (e) {
            console.error('Error in static screener results fallback:', e);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [mode]);

  const handleDownloadExcelGlobal = async () => {
    setIsDownloadingExcel(true);
    try {
      const [resFixtures, resResults] = await Promise.all([
        fetch('/api/screener?daysAhead=7').then((r) => r.json()),
        fetch('/api/screener-results?daysBehind=14').then((r) => r.json()),
      ]);

      const fixturesList = resFixtures.success && Array.isArray(resFixtures.fixtures) ? resFixtures.fixtures : [];
      const resultsList = resResults.success && Array.isArray(resResults.results) ? resResults.results : [];

      const fixturesData = fixturesList.map((f: any) => ({
        Liga: f.leagueName,
        Fecha: f.dateRaw,
        Hora: f.time,
        Local: f.homeTeam,
        Visitante: f.awayTeam,
        'Pronóstico BTTS': f.prediction?.bttsPick === 'BTTS_SI' ? 'BTTS SÍ' : 'BTTS NO',
        'Probabilidad BTTS %': f.prediction ? (f.prediction.bttsProbability * 100).toFixed(1) : 0,
        'Pronóstico Over/Under': f.prediction?.overUnderPick === 'OVER_2_5' ? 'OVER 2.5' : 'UNDER 2.5',
        'Probabilidad Over 2.5 %': f.prediction ? (f.prediction.over25Probability * 100).toFixed(1) : 0,
        'xG Local': f.prediction?.homeExpectedGoals ?? 0,
        'xG Visitante': f.prediction?.awayExpectedGoals ?? 0,
        'Confianza %': f.confidenceScore ?? 0,
      }));

      const resultsData = resultsList.map((r: any) => ({
        Liga: r.leagueName,
        Fecha: r.dateRaw,
        Hora: r.time,
        Local: r.homeTeam,
        Visitante: r.awayTeam,
        'Marcador Real': r.score,
        'Pronóstico BTTS': r.prediction?.bttsPick === 'BTTS_SI' ? 'BTTS SÍ' : 'BTTS NO',
        'Probabilidad BTTS %': r.prediction ? (r.prediction.bttsProbability * 100).toFixed(1) : 0,
        'Resultado BTTS': r.evaluation?.bttsHit ? 'ACERTÓ' : 'FALLÓ',
        'Pronóstico Over/Under': r.prediction?.overUnderPick === 'OVER_2_5' ? 'OVER 2.5' : 'UNDER 2.5',
        'Probabilidad Over 2.5 %': r.prediction ? (r.prediction.over25Probability * 100).toFixed(1) : 0,
        'Resultado Over/Under': r.evaluation?.overUnderHit ? 'ACERTÓ' : 'FALLÓ',
        'Confianza %': r.prediction ? Math.round(Math.max(r.prediction.bttsProbability, r.prediction.bttsNoProbability, r.prediction.over25Probability, r.prediction.under25Probability) * 100) : 0,
      }));

      const wb = XLSX.utils.book_new();
      const wsFixtures = XLSX.utils.json_to_sheet(fixturesData);
      const wsResults = XLSX.utils.json_to_sheet(resultsData);

      XLSX.utils.book_append_sheet(wb, wsFixtures, 'Próximos Global');
      XLSX.utils.book_append_sheet(wb, wsResults, 'Backtesting Global');

      XLSX.writeFile(wb, `FishyFootball_Screener_Global_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Error generating Excel:', err);
      alert('Error al generar el archivo Excel global.');
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  const filteredFixtures = fixtures.filter((f) => {
    if (f.confidenceScore < minConfidence) return false;
    if (marketFilter === 'BTTS_SI' && f.prediction?.bttsPick !== 'BTTS_SI') return false;
    if (marketFilter === 'BTTS_NO' && f.prediction?.bttsPick !== 'BTTS_NO') return false;
    if (marketFilter === 'OVER_2_5' && f.prediction?.overUnderPick !== 'OVER_2_5') return false;
    if (marketFilter === 'UNDER_2_5' && f.prediction?.overUnderPick !== 'UNDER_2_5') return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTeam = f.homeTeam.toLowerCase().includes(term) || f.awayTeam.toLowerCase().includes(term);
      const matchLeague = f.leagueName.toLowerCase().includes(term);
      if (!matchTeam && !matchLeague) return false;
    }

    return true;
  }).sort((a, b) => {
    let valA: any = 0;
    let valB: any = 0;

    switch (sortField) {
      case 'confidence':
        valA = a.confidenceScore;
        valB = b.confidenceScore;
        break;
      case 'totalXG':
        valA = a.prediction?.totalExpectedGoals || 0;
        valB = b.prediction?.totalExpectedGoals || 0;
        break;
      case 'btts':
        valA = a.prediction?.bttsProbability || 0;
        valB = b.prediction?.bttsProbability || 0;
        break;
      case 'overUnder':
        valA = a.prediction?.over25Probability || 0;
        valB = b.prediction?.over25Probability || 0;
        break;
      case 'league':
        return sortAsc
          ? a.leagueName.localeCompare(b.leagueName)
          : b.leagueName.localeCompare(a.leagueName);
      case 'teams':
        return sortAsc
          ? a.homeTeam.localeCompare(b.homeTeam)
          : b.homeTeam.localeCompare(a.homeTeam);
      case 'date':
        valA = new Date(a.dateIso).getTime();
        valB = new Date(b.dateIso).getTime();
        break;
    }

    return sortAsc ? valA - valB : valB - valA;
  });

  const filteredResults = results.filter((r) => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTeam = r.homeTeam.toLowerCase().includes(term) || r.awayTeam.toLowerCase().includes(term);
      const matchLeague = r.leagueName.toLowerCase().includes(term);
      if (!matchTeam && !matchLeague) return false;
    }

    if (filterMode === 'HITS_ONLY') {
      const hasHit = r.evaluation?.bttsHit || r.evaluation?.overUnderHit;
      if (!hasHit) return false;
    } else if (filterMode === 'BOTH_HITS') {
      if (!r.evaluation?.bothHit) return false;
    } else if (filterMode === 'MISSES_ONLY') {
      const hasMiss = !r.evaluation?.bttsHit || !r.evaluation?.overUnderHit;
      if (!hasMiss) return false;
    }

    return true;
  }).sort((a, b) => {
    let valA: any = 0;
    let valB: any = 0;

    switch (resultSortField) {
      case 'league':
        return resultSortAsc
          ? a.leagueName.localeCompare(b.leagueName)
          : b.leagueName.localeCompare(a.leagueName);
      case 'teams':
        return resultSortAsc
          ? a.homeTeam.localeCompare(b.homeTeam)
          : b.homeTeam.localeCompare(a.homeTeam);
      case 'score':
        valA = a.totalGoals;
        valB = b.totalGoals;
        break;
      case 'btts':
        valA = a.prediction?.bttsProbability || 0;
        valB = b.prediction?.bttsProbability || 0;
        break;
      case 'overUnder':
        valA = a.prediction?.over25Probability || 0;
        valB = b.prediction?.over25Probability || 0;
        break;
      case 'confidence':
        valA = a.prediction ? Math.max(a.prediction.bttsProbability, a.prediction.bttsNoProbability, a.prediction.over25Probability, a.prediction.under25Probability) : 0;
        valB = b.prediction ? Math.max(b.prediction.bttsProbability, b.prediction.bttsNoProbability, b.prediction.over25Probability, b.prediction.under25Probability) : 0;
        break;
      case 'date':
      default:
        valA = new Date(a.dateIso).getTime();
        valB = new Date(b.dateIso).getTime();
        break;
    }

    return resultSortAsc ? valA - valB : valB - valA;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const toggleResultSort = (field: ResultSortField) => {
    if (resultSortField === field) {
      setResultSortAsc(!resultSortAsc);
    } else {
      setResultSortField(field);
      setResultSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
            <span>FILTRADOR GLOBAL DE OPORTUNIDADES</span>
            <span aria-hidden="true">·</span>
            <span>MODO LISTA (TODAS LAS LIGAS)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-400" />
            Screener Global: {mode === 'fixtures' ? 'Próximos Partidos' : 'Backtesting & Finalizados'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            {mode === 'fixtures'
              ? 'Escanea próximos partidos en ligas de todo el mundo con predicciones de Poisson, Elo y tácticas.'
              : 'Verifica el rendimiento histórico del modelo en los partidos finalizados recientes de todas las ligas.'}
          </p>
        </div>

        {/* Excel Export Button */}
        <button
          onClick={handleDownloadExcelGlobal}
          disabled={isDownloadingExcel}
          className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
          title="Descargar Excel global con 2 hojas: Próximos y Backtesting"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>{isDownloadingExcel ? 'Generando Excel...' : 'Descargar Excel Global (2 Hojas)'}</span>
        </button>
      </div>

      {/* Filter Toolbar with Mode Toggle Buttons on Left */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-900 p-3 rounded-lg border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Toggle Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={() => setMode('fixtures')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 ${
                mode === 'fixtures'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Próximos</span>
            </button>
            <button
              onClick={() => setMode('results')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 ${
                mode === 'results'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Backtesting</span>
            </button>
          </div>

          <div className="h-5 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

          {/* Market Filters (fixtures mode) */}
          {mode === 'fixtures' && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <span className="text-xs text-slate-400 font-medium px-2 shrink-0 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-emerald-400" />
                Mercado:
              </span>
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'BTTS_SI', label: 'BTTS SÍ' },
                { id: 'BTTS_NO', label: 'BTTS NO' },
                { id: 'OVER_2_5', label: 'Over 2.5' },
                { id: 'UNDER_2_5', label: 'Under 2.5' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setMarketFilter(btn.id as typeof marketFilter)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    marketFilter === btn.id
                      ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-sm'
                      : 'text-slate-300 hover:text-white bg-slate-950/60'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}

          {/* Qualification Filters (results mode) */}
          {mode === 'results' && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <span className="text-xs text-slate-400 font-medium px-2 shrink-0 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-emerald-400" />
                Calificación:
              </span>
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'HITS_ONLY', label: 'Con Aciertos' },
                { id: 'BOTH_HITS', label: 'Doble Acierto' },
                { id: 'MISSES_ONLY', label: 'Con Fallos' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setFilterMode(btn.id as typeof filterMode)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    filterMode === btn.id
                      ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-sm'
                      : 'text-slate-300 hover:text-white bg-slate-950/60'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Buscar equipo o liga..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-48 px-3 py-1.5 text-xs bg-slate-950 text-slate-200 placeholder-slate-500 border border-slate-800 rounded focus:outline-none focus:border-emerald-500"
          />

          {mode === 'fixtures' && (
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded border border-slate-800 shrink-0">
              <span className="text-xs text-slate-400 whitespace-nowrap">
                Confianza: <strong className="text-emerald-400 font-mono">{minConfidence}%</strong>
              </span>
              <input
                type="range"
                min="50"
                max="85"
                step="5"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseInt(e.target.value, 10))}
                className="w-20 accent-emerald-400 bg-slate-900 h-1 rounded appearance-none cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* Table List View */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Escaneando ligas globales y cargando listado detallado...</p>
        </div>
      ) : mode === 'fixtures' && filteredFixtures.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-lg">
          <p className="text-sm font-medium text-slate-300">No se encontraron partidos próximos con los filtros actuales</p>
        </div>
      ) : mode === 'results' && filteredResults.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-lg">
          <p className="text-sm font-medium text-slate-300">No se encontraron resultados de backtesting global</p>
        </div>
      ) : mode === 'fixtures' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                  <th className="py-3 px-3 cursor-pointer hover:text-emerald-400 transition-colors group" onClick={() => toggleSort('date')}>
                    <div className="flex items-center gap-1">
                      <span className="group-hover:text-emerald-300 transition-colors">Fecha / Hora</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </th>
                  <th className="py-3 px-3 cursor-pointer hover:text-emerald-400 transition-colors group" onClick={() => toggleSort('league')}>
                    <div className="flex items-center gap-1">
                      <span className="group-hover:text-emerald-300 transition-colors">Liga</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold text-slate-200 cursor-pointer hover:text-emerald-400 transition-colors group" onClick={() => toggleSort('teams')}>
                    <div className="flex items-center gap-1">
                      <span className="group-hover:text-emerald-300 transition-colors">Encuentro (Local vs Visita)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center cursor-pointer hover:text-emerald-400 transition-colors group" onClick={() => toggleSort('btts')}>
                    <div className="flex items-center justify-center gap-1">
                      <span className="group-hover:text-emerald-300 transition-colors">Pronóstico BTTS</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center cursor-pointer hover:text-emerald-400 transition-colors group" onClick={() => toggleSort('overUnder')}>
                    <div className="flex items-center justify-center gap-1">
                      <span className="group-hover:text-emerald-300 transition-colors">Pronóstico Over/Under</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center cursor-pointer hover:text-emerald-400 transition-colors group" onClick={() => toggleSort('totalXG')}>
                    <div className="flex items-center justify-center gap-1">
                      <span className="group-hover:text-emerald-300 transition-colors">Marcador (xG)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center cursor-pointer hover:text-emerald-400 transition-colors group" onClick={() => toggleSort('confidence')}>
                    <div className="flex items-center justify-center gap-1">
                      <span className="group-hover:text-emerald-300 transition-colors">Confianza</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {filteredFixtures.map((fixture) => {
                  const pred = fixture.prediction;
                  if (!pred) return null;

                  return (
                    <tr key={fixture.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                        <div>{fixture.dateRaw}</div>
                        <div className="text-slate-500 font-normal">{fixture.time}</div>
                      </td>
                      <td className="py-3 px-3 text-emerald-400 font-sans font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[140px]">{fixture.leagueName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[130px] text-right">{fixture.homeTeam}</span>
                          <span className="text-slate-500 font-mono text-[10px] px-1 bg-slate-950 border border-slate-800 rounded">vs</span>
                          <span className="truncate max-w-[130px] text-left">{fixture.awayTeam}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            pred.bttsPick === 'BTTS_SI'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {pred.bttsPick === 'BTTS_SI' ? 'SÍ' : 'NO'} ({(pred.bttsProbability * 100).toFixed(0)}%)
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            pred.overUnderPick === 'OVER_2_5'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {pred.overUnderPick === 'OVER_2_5' ? 'OVER 2.5' : 'UNDER 2.5'} ({(pred.over25Probability * 100).toFixed(0)}%)
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap text-slate-200">
                        <div className="font-bold">{pred.predictedScore.home} - {pred.predictedScore.away}</div>
                        <div className="text-[10px] text-slate-400 font-normal">xG: {pred.totalExpectedGoals}</div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="font-bold text-emerald-400 tabular-nums">
                          {fixture.confidenceScore}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Results / Backtesting Global Table with Sorting by Probability Percentage */
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                  <th className="py-3 px-3 cursor-pointer hover:text-emerald-400 transition-colors group" onClick={() => toggleResultSort('date')}>
                    <div className="flex items-center gap-1">
                      <span className="group-hover:text-emerald-300 transition-colors">Fecha</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </th>
                  <th className="py-3 px-3 cursor-pointer hover:text-emerald-400 transition-colors group" onClick={() => toggleResultSort('league')}>
                    <div className="flex items-center gap-1">
                      <span className="group-hover:text-emerald-300 transition-colors">Liga</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold text-slate-200 cursor-pointer hover:text-emerald-400 transition-colors group" onClick={() => toggleResultSort('teams')}>
                    <div className="flex items-center gap-1">
                      <span className="group-hover:text-emerald-300 transition-colors">Encuentro</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center cursor-pointer hover:text-emerald-400 transition-colors group" onClick={() => toggleResultSort('score')}>
                    <div className="flex items-center justify-center gap-1">
                      <span className="group-hover:text-emerald-300 transition-colors">Marcador Real</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center cursor-pointer hover:text-emerald-400 transition-colors group" onClick={() => toggleResultSort('btts')}>
                    <div className="flex items-center justify-center gap-1">
                      <span className="group-hover:text-emerald-300 transition-colors">BTTS (Pronóstico vs Real)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center cursor-pointer hover:text-emerald-400 transition-colors group" onClick={() => toggleResultSort('overUnder')}>
                    <div className="flex items-center justify-center gap-1">
                      <span className="group-hover:text-emerald-300 transition-colors">Over/Under (Pronóstico vs Real)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center cursor-pointer hover:text-emerald-400 transition-colors group" onClick={() => toggleResultSort('confidence')}>
                    <div className="flex items-center justify-center gap-1">
                      <span className="group-hover:text-emerald-300 transition-colors">Confianza</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {filteredResults.map((res) => {
                  const evalObj = res.evaluation;
                  const pred = res.prediction;

                  return (
                    <tr key={res.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                        {res.dateRaw}
                      </td>
                      <td className="py-3 px-3 text-emerald-400 font-sans font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[140px]">{res.leagueName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[130px] text-right">{res.homeTeam}</span>
                          <span className="text-slate-500 font-mono text-[10px] px-1 bg-slate-950 border border-slate-800 rounded">vs</span>
                          <span className="truncate max-w-[130px] text-left">{res.awayTeam}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-white whitespace-nowrap">
                        {res.score}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-slate-300">
                            {pred?.bttsPick === 'BTTS_SI' ? 'BTTS SÍ' : 'BTTS NO'} ({pred ? (pred.bttsProbability * 100).toFixed(0) : 0}%)
                          </span>
                          <span
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                              evalObj?.bttsHit ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                            }`}
                          >
                            {evalObj?.bttsHit ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {evalObj?.bttsHit ? 'ACERTÓ' : 'FALLÓ'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-slate-300">
                            {pred?.overUnderPick === 'OVER_2_5' ? 'OVER 2.5' : 'UNDER 2.5'} ({pred ? (pred.over25Probability * 100).toFixed(0) : 0}%)
                          </span>
                          <span
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                              evalObj?.overUnderHit ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                            }`}
                          >
                            {evalObj?.overUnderHit ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {evalObj?.overUnderHit ? 'ACERTÓ' : 'FALLÓ'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap font-bold text-cyan-400">
                        {pred ? `${Math.round(Math.max(pred.bttsProbability, pred.bttsNoProbability, pred.over25Probability, pred.under25Probability) * 100)}%` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
