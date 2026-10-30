import React, { useState, useMemo } from 'react';
import { FixtureMatch, TeamStats } from '../types/football';
import {
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Target,
  BarChart2,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';

interface FixturesViewProps {
  fixtures: FixtureMatch[];
  teams: Record<string, TeamStats>;
  leagueName: string;
  daysAhead: number;
  onDaysAheadChange: (days: number) => void;
  isLoading: boolean;
}

export const FixturesView: React.FC<FixturesViewProps> = ({
  fixtures,
  teams,
  leagueName,
  daysAhead,
  onDaysAheadChange,
  isLoading,
}) => {
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'BTTS_SI' | 'BTTS_NO' | 'OVER_2_5' | 'UNDER_2_5'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  // Filter fixtures
  const filteredFixtures = useMemo(() => {
    return fixtures.filter((f) => {
      // Days filter
      if (f.daysFromNow > daysAhead) return false;

      // Text search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTeam = f.homeTeam.toLowerCase().includes(term) || f.awayTeam.toLowerCase().includes(term);
        if (!matchesTeam) return false;
      }

      // Market filter
      if (marketFilter === 'BTTS_SI' && f.prediction?.bttsPick !== 'BTTS_SI') return false;
      if (marketFilter === 'BTTS_NO' && f.prediction?.bttsPick !== 'BTTS_NO') return false;
      if (marketFilter === 'OVER_2_5' && f.prediction?.overUnderPick !== 'OVER_2_5') return false;
      if (marketFilter === 'UNDER_2_5' && f.prediction?.overUnderPick !== 'UNDER_2_5') return false;

      return true;
    });
  }, [fixtures, daysAhead, searchTerm, marketFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    let bttsYesCount = 0;
    let bttsNoCount = 0;
    let over25Count = 0;
    let under25Count = 0;
    let totalXG = 0;

    fixtures.forEach((f) => {
      if (f.prediction) {
        if (f.prediction.bttsPick === 'BTTS_SI') bttsYesCount++;
        else bttsNoCount++;

        if (f.prediction.overUnderPick === 'OVER_2_5') over25Count++;
        else under25Count++;

        totalXG += f.prediction.totalExpectedGoals;
      }
    });

    const avgXG = fixtures.length > 0 ? (totalXG / fixtures.length).toFixed(2) : '0.00';

    return {
      bttsYesCount,
      bttsNoCount,
      over25Count,
      under25Count,
      avgXG,
    };
  }, [fixtures]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Context */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
            <span>SECCIÓN A</span>
            <span aria-hidden="true">·</span>
            <span>PARTIDOS PRÓXIMOS (MÁXIMO 7 DÍAS)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Cartelera de Partidos & Pronósticos: {leagueName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Partidos no empezados programados dentro de la ventana de consulta. El modelo estadístico Poisson bivariate calcula probabilidades para BTTS (Ambos Marcan) y Over/Under 2.5 goles.
          </p>
        </div>

        {/* Days Window Selector */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-lg shrink-0">
          <span className="text-xs text-slate-400 px-2 font-medium flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Ventana:
          </span>
          {[1, 3, 5, 7].map((days) => (
            <button
              key={days}
              onClick={() => onDaysAheadChange(days)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors tabular-nums ${
                daysAhead === days
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Partidos Programados</span>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
            {fixtures.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Próximos {daysAhead} días
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>BTTS SÍ vs NO</span>
            <Target className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
            <span className="text-emerald-400">{stats.bttsYesCount}</span>
            <span className="text-slate-600 mx-1">/</span>
            <span className="text-amber-400">{stats.bttsNoCount}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            SÍ ({stats.bttsYesCount}) · NO ({stats.bttsNoCount})
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Over 2.5 vs Under 2.5</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
            <span className="text-indigo-400">{stats.over25Count}</span>
            <span className="text-slate-600 mx-1">/</span>
            <span className="text-cyan-400">{stats.under25Count}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Over ({stats.over25Count}) · Under ({stats.under25Count})
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Goles Esperados Promedio</span>
            <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
            {stats.avgXG} <span className="text-xs text-slate-500 font-normal">xG/p</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Expectativa de gol combinada
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <span className="text-xs text-slate-500 font-medium px-2 shrink-0">Filtrar por Pick:</span>
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
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                marketFilter === btn.id
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
            placeholder="Buscar por equipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-950 text-slate-200 placeholder-slate-500 border border-slate-800 rounded focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Fixtures List */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Consultando partidos próximos desde thefishy.co.uk...</p>
        </div>
      ) : filteredFixtures.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-lg">
          <p className="text-sm font-medium text-slate-300">No se encontraron partidos próximos</p>
          <p className="text-xs text-slate-500 mt-1">
            No hay partidos programados dentro de los próximos {daysAhead} días con los filtros actuales. Prueba ampliando a 7 días o seleccionando otra liga.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFixtures.map((fixture) => {
            const pred = fixture.prediction;
            const homeStats = teams[fixture.homeTeam];
            const awayStats = teams[fixture.awayTeam];
            const isExpanded = expandedMatchId === fixture.id;

            const bttsYesPct = pred ? (pred.bttsProbability * 100).toFixed(1) : '50.0';
            const bttsNoPct = pred ? (pred.bttsNoProbability * 100).toFixed(1) : '50.0';
            const over25Pct = pred ? (pred.over25Probability * 100).toFixed(1) : '50.0';
            const under25Pct = pred ? (pred.under25Probability * 100).toFixed(1) : '50.0';

            return (
              <div
                key={fixture.id}
                className="bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden transition-all hover:border-slate-700"
              >
                {/* Main Match Header Row */}
                <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Match Info & Teams */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 font-mono">
                      <span>{fixture.dateRaw}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-300 font-semibold">{fixture.time}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-400">
                        {fixture.daysFromNow === 0 ? 'Hoy' : fixture.daysFromNow === 1 ? 'Mañana' : `En ${fixture.daysFromNow} días`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-start sm:gap-6">
                      {/* Home Team */}
                      <div className="flex-1 sm:flex-initial sm:w-48 text-right sm:text-left">
                        <div className="text-sm sm:text-base font-bold text-white truncate">
                          {fixture.homeTeam}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {homeStats ? `Pos #${homeStats.pos} · Pts: ${homeStats.pts}` : 'Local'}
                        </div>
                      </div>

                      <div className="px-3 py-1 text-xs font-mono font-semibold text-slate-500 bg-slate-950 border border-slate-800 rounded">
                        VS
                      </div>

                      {/* Away Team */}
                      <div className="flex-1 sm:flex-initial sm:w-48 text-left">
                        <div className="text-sm sm:text-base font-bold text-white truncate">
                          {fixture.awayTeam}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {awayStats ? `Pos #${awayStats.pos} · Pts: ${awayStats.pts}` : 'Visitante'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Market Predictions Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                    {/* BTTS Pick */}
                    <div className="text-center p-2 rounded bg-slate-900 border border-slate-800">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        Ambos Marcan (BTTS)
                      </div>
                      <div className="mt-1">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            pred?.bttsPick === 'BTTS_SI'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {pred?.bttsPick === 'BTTS_SI' ? 'BTTS: SÍ' : 'BTTS: NO'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1 tabular-nums">
                        {pred?.bttsPick === 'BTTS_SI' ? `${bttsYesPct}%` : `${bttsNoPct}%`} prob.
                      </div>
                    </div>

                    {/* Over/Under 2.5 Pick */}
                    <div className="text-center p-2 rounded bg-slate-900 border border-slate-800">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        Goles (+/- 2.5)
                      </div>
                      <div className="mt-1">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            pred?.overUnderPick === 'OVER_2_5'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {pred?.overUnderPick === 'OVER_2_5' ? 'OVER 2.5' : 'UNDER 2.5'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1 tabular-nums">
                        {pred?.overUnderPick === 'OVER_2_5' ? `${over25Pct}%` : `${under25Pct}%`} prob.
                      </div>
                    </div>

                    {/* Expected Score & xG */}
                    <div className="col-span-2 sm:col-span-1 text-center p-2 rounded bg-slate-900 border border-slate-800 flex flex-col justify-center">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        Marcador Probable
                      </div>
                      <div className="text-sm font-bold font-mono text-white mt-1">
                        {pred?.predictedScore.home} - {pred?.predictedScore.away}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                        xG Total: {pred?.totalExpectedGoals}
                      </div>
                    </div>
                  </div>

                  {/* Expand Analysis Button */}
                  <div className="flex items-center justify-end lg:justify-center">
                    <button
                      onClick={() => setExpandedMatchId(isExpanded ? null : fixture.id)}
                      className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 border border-slate-700/60"
                      title="Ver análisis detallado del modelo"
                    >
                      <span>{isExpanded ? 'Ocultar' : 'Detalles'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Statistical Breakdown */}
                {isExpanded && pred && (
                  <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Column 1: Poisson Expectancy */}
                      <div className="space-y-2">
                        <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
                          Goles Esperados (xG) Poisson
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1.5">
                          <div className="flex justify-between text-slate-400">
                            <span>xG {fixture.homeTeam} (Local):</span>
                            <span className="font-mono font-semibold text-white tabular-nums">
                              {pred.homeExpectedGoals}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>xG {fixture.awayTeam} (Visita):</span>
                            <span className="font-mono font-semibold text-white tabular-nums">
                              {pred.awayExpectedGoals}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                            <span className="font-medium text-slate-300">Total Esperado:</span>
                            <span className="font-mono font-bold text-emerald-400 tabular-nums">
                              {pred.totalExpectedGoals} goles
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Probabilidades 1X2 */}
                      <div className="space-y-2">
                        <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-indigo-400" />
                          Probabilidades 1X2 & Cuotas
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1.5">
                          <div className="flex justify-between text-slate-400">
                            <span>Victoria Local (1):</span>
                            <span className="font-mono font-semibold text-white tabular-nums">
                              {(pred.homeWinProbability * 100).toFixed(1)}% {fixture.odds.home ? `(@${fixture.odds.home})` : ''}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Empate (X):</span>
                            <span className="font-mono font-semibold text-white tabular-nums">
                              {(pred.drawProbability * 100).toFixed(1)}% {fixture.odds.draw ? `(@${fixture.odds.draw})` : ''}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Victoria Visita (2):</span>
                            <span className="font-mono font-semibold text-white tabular-nums">
                              {(pred.awayWinProbability * 100).toFixed(1)}% {fixture.odds.away ? `(@${fixture.odds.away})` : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Column 3: Stats TheFishy Extended */}
                      <div className="space-y-2">
                        <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                          Métricas TheFishy Ext.
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1.5 font-mono text-[11px]">
                          <div className="flex justify-between text-slate-400">
                            <span>Posesión %:</span>
                            <span className="text-white">
                              {homeStats?.psF ?? 50}% vs {awayStats?.psF ?? 50}%
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Tiros al arco /p:</span>
                            <span className="text-white">
                              {homeStats?.stF ?? '-'} vs {awayStats?.stF ?? '-'}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Racha reciente:</span>
                            <span className="text-emerald-400 tracking-wider">
                              {homeStats?.form || '-'} vs {awayStats?.form || '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
