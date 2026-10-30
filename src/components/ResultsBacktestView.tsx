import React, { useState, useMemo } from 'react';
import { FinishedMatch, BacktestMetrics } from '../types/football';
import { AuditHistoryView } from './AuditHistoryView';
import {
  CheckCircle2,
  XCircle,
  Calendar,
  Percent,
  Check,
  X,
  TrendingUp,
  Target,
  Search,
  ShieldCheck,
  BarChart3,
} from 'lucide-react';

interface ResultsBacktestViewProps {
  results: FinishedMatch[];
  metrics: BacktestMetrics;
  leagueName: string;
  daysBehind: number;
  onDaysBehindChange: (days: number) => void;
  isLoading: boolean;
}

export const ResultsBacktestView: React.FC<ResultsBacktestViewProps> = ({
  results,
  metrics,
  leagueName,
  daysBehind,
  onDaysBehindChange,
  isLoading,
}) => {
  const [subTab, setSubTab] = useState<'backtest' | 'audit'>('backtest');
  const [filterMode, setFilterMode] = useState<'ALL' | 'HITS_ONLY' | 'BOTH_HITS' | 'MISSES_ONLY'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter matches
  const filteredResults = useMemo(() => {
    return results.filter((m) => {
      // Days filter
      if (m.daysAgo > daysBehind) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        if (!m.homeTeam.toLowerCase().includes(term) && !m.awayTeam.toLowerCase().includes(term)) {
          return false;
        }
      }

      // Evaluation filter
      if (filterMode === 'HITS_ONLY') {
        const hasHit = m.evaluation?.bttsHit || m.evaluation?.overUnderHit;
        if (!hasHit) return false;
      } else if (filterMode === 'BOTH_HITS') {
        if (!m.evaluation?.bothHit) return false;
      } else if (filterMode === 'MISSES_ONLY') {
        const hasMiss = !m.evaluation?.bttsHit || !m.evaluation?.overUnderHit;
        if (!hasMiss) return false;
      }

      return true;
    });
  }, [results, daysBehind, searchTerm, filterMode]);

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setSubTab('backtest')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            subTab === 'backtest'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Resultados & Backtesting
        </button>
        <button
          onClick={() => setSubTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            subTab === 'audit'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Historial de Auditoría & Fingerprints
        </button>
      </div>

      {subTab === 'audit' ? (
        <AuditHistoryView
          results={results}
          leagueName={leagueName}
          daysBehind={daysBehind}
        />
      ) : (
        <div className="space-y-6">
          {/* Top Banner & Context */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
                <span>SECCIÓN B</span>
                <span aria-hidden="true">·</span>
                <span>PARTIDOS FINALIZADOS & CALIFICACIÓN DEL MODELO</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Backtesting & Calificación: {leagueName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
                Partidos jugados en los últimos {daysBehind} días. El sistema evalúa retrospectivamente las predicciones del modelo estadístico contra los marcadores reales para calificar si <span className="text-emerald-400 font-semibold">ACERTÓ</span> o <span className="text-rose-400 font-semibold">FALLÓ</span>.
              </p>
            </div>

            {/* Days Window Selector */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-lg shrink-0">
              <span className="text-xs text-slate-400 px-2 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Ventana:
              </span>
              {[7, 14, 21, 30].map((days) => (
                <button
                  key={days}
                  onClick={() => onDaysBehindChange(days)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors tabular-nums ${
                    daysBehind === days
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          {/* KPI Performance Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Precision General */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Precisión Global</span>
                <Percent className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1 tabular-nums">
                {metrics.overallAccuracy}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <span className="text-emerald-400 font-medium">
                  {metrics.bttsHits + metrics.overUnderHits} aciertos
                </span>{' '}
                de {metrics.totalMatches * 2} picks
              </div>
            </div>

            {/* Aciertos BTTS */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Aciertos BTTS</span>
                <Target className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
                {metrics.bttsAccuracy}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {metrics.bttsHits} aciertos / {metrics.bttsEvaluated} partidos
              </div>
            </div>

            {/* Aciertos Over/Under 2.5 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Aciertos Over/Under 2.5</span>
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-cyan-400 mt-1 tabular-nums">
                {metrics.overUnderAccuracy}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {metrics.overUnderHits} aciertos / {metrics.overUnderEvaluated} partidos
              </div>
            </div>

            {/* Marcador Exacto & ROI */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Marcador Exacto</span>
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
                {metrics.exactScoreHits} <span className="text-xs text-slate-500 font-normal">({metrics.exactScoreAccuracy}%)</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Brier Score: <span className="font-mono text-slate-300">{metrics.brierScore}</span>
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <span className="text-xs text-slate-500 font-medium px-2 shrink-0">Calificación:</span>
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'HITS_ONLY', label: 'Con Aciertos' },
                { id: 'BOTH_HITS', label: 'Doble Acierto' },
                { id: 'MISSES_ONLY', label: 'Con Fallos' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setFilterMode(btn.id as typeof filterMode)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    filterMode === btn.id
                      ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Buscar equipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-950 text-slate-200 placeholder-slate-500 border border-slate-800 rounded focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Match Results Table / Cards */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Consultando partidos finalizados desde thefishy.co.uk...</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-lg">
              <p className="text-sm font-medium text-slate-300">No se encontraron partidos finalizados</p>
              <p className="text-xs text-slate-500 mt-1">
                No hay registros para la ventana de {daysBehind} días con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResults.map((match) => {
                const pred = match.prediction;
                const evalObj = match.evaluation;

                return (
                  <div
                    key={match.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 transition-all hover:border-slate-700"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Match date & Real Score */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 font-mono">
                          <span>{match.dateRaw}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-500">{match.time}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-400">
                            {match.daysAgo === 0 ? 'Hoy' : `Hace ${match.daysAgo} días`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between sm:justify-start sm:gap-6">
                          {/* Home Team */}
                          <div className="flex-1 sm:flex-initial sm:w-44 text-right sm:text-left">
                            <span className="text-sm sm:text-base font-bold text-white truncate block">
                              {match.homeTeam}
                            </span>
                          </div>

                          {/* Official Final Score Badge */}
                          <div className="px-4 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-center font-mono">
                            <span className="text-lg font-bold text-white tracking-wider tabular-nums">
                              {match.score}
                            </span>
                            <div className="text-[10px] text-slate-400 font-sans uppercase">
                              Final
                            </div>
                          </div>

                          {/* Away Team */}
                          <div className="flex-1 sm:flex-initial sm:w-44 text-left">
                            <span className="text-sm sm:text-base font-bold text-white truncate block">
                              {match.awayTeam}
                            </span>
                          </div>
                        </div>

                        {/* Reality Summary */}
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 font-mono">
                          <span>
                            Resultado Real:{' '}
                            <strong className="text-slate-200">
                              {match.actualBtts ? 'Ambos Marcaron (SÍ)' : 'No Ambos (NO)'}
                            </strong>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Total Goles:{' '}
                            <strong className="text-slate-200">
                              {match.totalGoals} ({match.actualOver25 ? 'Over 2.5' : 'Under 2.5'})
                            </strong>
                          </span>
                        </div>

                        {/* Immutability & Audit Veracity Badge & Prediction Confidence */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {pred?.auditHash && (
                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-slate-950/60 px-2.5 py-1 rounded border border-emerald-500/20">
                              <span className="font-semibold">🔒 Auditoría Inmutable</span>
                              <span className="text-slate-500">|</span>
                              <span className="text-slate-300">Hash: {pred.auditHash}</span>
                              {pred.lockedAt && (
                                <>
                                  <span className="text-slate-500">|</span>
                                  <span className="text-slate-400">Bloqueado: {new Date(pred.lockedAt).toLocaleString()}</span>
                                </>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 bg-slate-950/60 px-2.5 py-1 rounded border border-cyan-500/20">
                            <span className="font-semibold">⚡ Confianza:</span>
                            <span className="font-bold text-white">
                              {pred ? Math.round(Math.max(pred.bttsProbability, pred.bttsNoProbability, pred.over25Probability, pred.under25Probability) * 100) : 50}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Model Prediction vs Actual Reality with Clear Acertó / Falló Badges */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0 lg:w-[460px]">
                        {/* BTTS Evaluation Box */}
                        <div
                          className={`p-3 rounded-lg border flex flex-col justify-between ${
                            evalObj?.bttsHit
                              ? 'bg-emerald-950/20 border-emerald-500/30'
                              : 'bg-rose-950/20 border-rose-500/30'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                              Mercado BTTS
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                                evalObj?.bttsHit
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-rose-500 text-white'
                              }`}
                            >
                              {evalObj?.bttsHit ? (
                                <>
                                  <Check className="w-3 h-3 stroke-[3]" /> ACERTÓ
                                </>
                              ) : (
                                <>
                                  <X className="w-3 h-3 stroke-[3]" /> FALLÓ
                                </>
                              )}
                            </span>
                          </div>

                          <div className="text-xs text-slate-300">
                            Pronóstico:{' '}
                            <span className="font-bold text-white font-mono">
                              {pred?.bttsPick === 'BTTS_SI' ? 'BTTS SÍ' : 'BTTS NO'}
                            </span>{' '}
                            <span className="text-[11px] text-slate-400 font-mono">
                              ({pred ? (pred.bttsProbability * 100).toFixed(0) : 50}%)
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Real: {match.actualBtts ? 'SÍ anotaron ambos' : 'NO anotaron ambos'}
                          </div>
                        </div>

                        {/* Over/Under Evaluation Box */}
                        <div
                          className={`p-3 rounded-lg border flex flex-col justify-between ${
                            evalObj?.overUnderHit
                              ? 'bg-emerald-950/20 border-emerald-500/30'
                              : 'bg-rose-950/20 border-rose-500/30'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                              Mercado O/U 2.5
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                                evalObj?.overUnderHit
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-rose-500 text-white'
                              }`}
                            >
                              {evalObj?.overUnderHit ? (
                                <>
                                  <Check className="w-3 h-3 stroke-[3]" /> ACERTÓ
                                </>
                              ) : (
                                <>
                                  <X className="w-3 h-3 stroke-[3]" /> FALLÓ
                                </>
                              )}
                            </span>
                          </div>

                          <div className="text-xs text-slate-300">
                            Pronóstico:{' '}
                            <span className="font-bold text-white font-mono">
                              {pred?.overUnderPick === 'OVER_2_5' ? 'OVER 2.5' : 'UNDER 2.5'}
                            </span>{' '}
                            <span className="text-[11px] text-slate-400 font-mono">
                              ({pred ? (pred.over25Probability * 100).toFixed(0) : 50}%)
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Real: {match.totalGoals} goles ({match.actualOver25 ? 'Over 2.5' : 'Under 2.5'})
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
