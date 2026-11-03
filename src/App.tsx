import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  LeagueOption,
  LeagueDataResponse,
  ModelParameters,
  BacktestMetrics,
} from './types/football';
import { DEFAULT_PARAMETERS, predictMatch, runBacktest, optimizeParameters } from './services/predictiveModel';
import { Header } from './components/Header';
import { LeagueSelector } from './components/LeagueSelector';
import { FixturesView } from './components/FixturesView';
import { ResultsBacktestView } from './components/ResultsBacktestView';
import { OptimizerView } from './components/OptimizerView';
import { LeagueTableView } from './components/LeagueTableView';
import { GithubExportView } from './components/GithubExportView';
import { ScreenerView } from './components/ScreenerView';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('fixtures');
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('1'); // Default Premier League
  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [data, setData] = useState<LeagueDataResponse | null>(null);

  const [daysAhead, setDaysAhead] = useState<number>(7);
  const [daysBehind, setDaysBehind] = useState<number>(30);

  const [modelParams, setModelParams] = useState<ModelParameters>(DEFAULT_PARAMETERS);
  const [optimizationResult, setOptimizationResult] = useState<{
    bestParams: ModelParameters;
    bestMetrics: BacktestMetrics;
    improvementDelta: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [, startTransition] = useTransition();

  // Load available leagues once on mount with fallback
  useEffect(() => {
    fetch('/api/leagues')
      .then(async (r) => {
        const contentType = r.headers.get('content-type') || '';
        if (!r.ok || !contentType.includes('application/json')) {
          throw new Error('Not JSON');
        }
        const text = await r.text();
        return JSON.parse(text);
      })
      .then((res) => {
        if (res.success && Array.isArray(res.leagues)) {
          setLeagues(res.leagues);
        } else {
          throw new Error();
        }
      })
      .catch(() => {
        setLeagues([
          { id: '1', name: 'Premier League', group: 'England' },
          { id: '31', name: 'La Liga', group: 'Spain' },
          { id: '32', name: 'Bundesliga', group: 'Germany' },
          { id: '33', name: 'Serie A', group: 'Italy' },
          { id: '34', name: 'Ligue 1', group: 'France' },
        ]);
      });
  }, []);

  // Fetch league data with static fallback
  const loadLeagueData = useCallback(
    async (tableId: string, ahead: number, behind: number, forceRefresh: boolean = false) => {
      if (forceRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setErrorMessage(null);

      try {
        let json;
        try {
          const queryParams = new URLSearchParams({
            table: tableId,
            daysAhead: String(ahead),
            daysBehind: String(behind),
            homeAdv: String(modelParams.homeAdvantage),
            extWeight: String(modelParams.extendedStatsWeight),
            formWeight: String(modelParams.formWeight),
            bttsThresh: String(modelParams.bttsThreshold),
            overThresh: String(modelParams.over25Threshold),
          });

          if (forceRefresh) {
            queryParams.set('forceRefresh', 'true');
          }

          const resp = await fetch(`/api/data?${queryParams.toString()}`);
          const contentType = resp.headers.get('content-type') || '';
          if (!resp.ok || !contentType.includes('application/json')) {
            throw new Error('Not JSON API response (static hosting)');
          }
          const text = await resp.text();
          json = JSON.parse(text);
          if (!json.success || !json.data) {
            throw new Error(json.error || 'Error en API');
          }
        } catch (apiErr) {
          // Fallback to static JSON file (for GitHub Pages / static hosting)
          const baseUrl = import.meta.env.BASE_URL || '/';
          const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
          
          let staticResp = await fetch(`${base}data_league_${tableId}.json?t=${Date.now()}`);
          if (!staticResp.ok) {
            staticResp = await fetch(`${base}data_league_1.json?t=${Date.now()}`);
          }
          if (!staticResp.ok) {
            throw new Error('No se encontraron archivos JSON estáticos');
          }
          const staticText = await staticResp.text();
          if (staticText.trim().startsWith('<!DOCTYPE') || !staticText.trim().startsWith('{')) {
            throw new Error('Static file returned HTML');
          }
          const staticJson = JSON.parse(staticText);
          const fallbackTeams = staticJson.teams || {};
          const leagueName = staticJson.leagueName || `Liga ${tableId}`;
          const fixtures = (staticJson.fixtures || []).map((f: any) => ({
            ...f,
            prediction: predictMatch(f.homeTeam, f.awayTeam, fallbackTeams, modelParams),
          }));
          const backtestResult = runBacktest((staticJson.results || []).map((r: any) => ({ ...r, leagueName })), fallbackTeams, modelParams);

          json = {
            success: true,
            data: {
              ...staticJson,
              leagueId: tableId,
              leagueName,
              timestamp: new Date().toISOString(),
              fixtures,
              results: backtestResult.evaluatedMatches,
              teams: fallbackTeams,
              backtest: backtestResult.metrics,
              parameters: modelParams,
            },
          };
        }

        if (json.success && json.data) {
          setData(json.data);
          setOptimizationResult(null);
        } else {
          setErrorMessage(json.error || 'Error al obtener datos');
        }
      } catch (staticErr: unknown) {
        const msg = staticErr instanceof Error ? staticErr.message : 'Error desconocido';
        setErrorMessage(`No se pudieron obtener datos. En GitHub Pages asegúrate de que el workflow diario haya generado los archivos JSON (${msg}).`);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [modelParams]
  );

  // Trigger load when league or window changes
  useEffect(() => {
    loadLeagueData(selectedLeagueId, daysAhead, daysBehind);
  }, [selectedLeagueId, daysAhead, daysBehind, loadLeagueData]);

  // Client-side instant recalculation when parameters are tweaked via sliders
  const handleParametersChange = (newParams: ModelParameters) => {
    setModelParams(newParams);

    if (data && data.teams) {
      startTransition(() => {
        // Recalculate upcoming fixtures
        const updatedFixtures = data.fixtures.map((f) => ({
          ...f,
          prediction: predictMatch(f.homeTeam, f.awayTeam, data.teams, newParams),
        }));

        // Recalculate finished matches backtest
        const backtestRes = runBacktest(data.results, data.teams, newParams);

        setData({
          ...data,
          parameters: newParams,
          fixtures: updatedFixtures,
          results: backtestRes.evaluatedMatches,
          backtest: backtestRes.metrics,
        });
      });
    }
  };

  // Run auto optimizer on current finished results
  const handleRunAutoOptimize = () => {
    if (!data || data.results.length === 0) return;
    setIsOptimizing(true);

    setTimeout(() => {
      try {
        const opt = optimizeParameters(data.results, data.teams);
        setOptimizationResult(opt);
      } catch (err) {
        console.error('Optimization error:', err);
      } finally {
        setIsOptimizing(false);
      }
    }, 150);
  };

  // Apply optimized parameters
  const handleApplyOptimized = () => {
    if (optimizationResult) {
      handleParametersChange(optimizationResult.bestParams);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Universal Top Bar */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onRefresh={() => loadLeagueData(selectedLeagueId, daysAhead, daysBehind, true)}
        isRefreshing={isRefreshing}
        lastUpdated={data?.timestamp || null}
      />

      {/* League Selector Toolbar */}
      <LeagueSelector
        leagues={leagues}
        selectedLeagueId={selectedLeagueId}
        onSelectLeague={(id) => setSelectedLeagueId(id)}
        onSelectTab={setCurrentTab}
        currentTab={currentTab}
        isLoading={isLoading}
      />

      {/* Error Alert if any */}
      {errorMessage && (
        <div className="w-full px-4 sm:px-6 lg:px-8 mt-4">
          <div className="p-4 bg-rose-950/40 border border-rose-500/50 rounded-lg flex items-center justify-between gap-3 text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => loadLeagueData(selectedLeagueId, daysAhead, daysBehind, true)}
              className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-900 text-rose-200 rounded text-xs font-semibold whitespace-nowrap"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'fixtures' && (
          <FixturesView
            fixtures={data?.fixtures || []}
            teams={data?.teams || {}}
            leagueName={data?.leagueName || 'Premier League'}
            daysAhead={daysAhead}
            onDaysAheadChange={(days) => setDaysAhead(days)}
            isLoading={isLoading}
          />
        )}

        {currentTab === 'results' && (
          <ResultsBacktestView
            results={data?.results || []}
            metrics={
              data?.backtest || {
                totalMatches: 0,
                bttsEvaluated: 0,
                bttsHits: 0,
                bttsAccuracy: 0,
                overUnderEvaluated: 0,
                overUnderHits: 0,
                overUnderAccuracy: 0,
                overallAccuracy: 0,
                exactScoreHits: 0,
                exactScoreAccuracy: 0,
                confusionMatrix: {
                  btts: {
                    predictedYesActualYes: 0,
                    predictedYesActualNo: 0,
                    predictedNoActualYes: 0,
                    predictedNoActualNo: 0,
                  },
                  overUnder: {
                    predictedOverActualOver: 0,
                    predictedOverActualUnder: 0,
                    predictedUnderActualOver: 0,
                    predictedUnderActualUnder: 0,
                  },
                },
                logLoss: 0,
                brierScore: 0,
                simulatedRoi: 0,
              }
            }
            leagueName={data?.leagueName || 'Premier League'}
            daysBehind={daysBehind}
            onDaysBehindChange={(days) => setDaysBehind(days)}
            isLoading={isLoading}
          />
        )}

        {currentTab === 'optimizer' && (
          <OptimizerView
            parameters={modelParams}
            onParametersChange={handleParametersChange}
            metrics={
              data?.backtest || {
                totalMatches: 0,
                bttsEvaluated: 0,
                bttsHits: 0,
                bttsAccuracy: 0,
                overUnderEvaluated: 0,
                overUnderHits: 0,
                overUnderAccuracy: 0,
                overallAccuracy: 0,
                exactScoreHits: 0,
                exactScoreAccuracy: 0,
                confusionMatrix: {
                  btts: {
                    predictedYesActualYes: 0,
                    predictedYesActualNo: 0,
                    predictedNoActualYes: 0,
                    predictedNoActualNo: 0,
                  },
                  overUnder: {
                    predictedOverActualOver: 0,
                    predictedOverActualUnder: 0,
                    predictedUnderActualOver: 0,
                    predictedUnderActualUnder: 0,
                  },
                },
                logLoss: 0,
                brierScore: 0,
                simulatedRoi: 0,
              }
            }
            onRunAutoOptimize={handleRunAutoOptimize}
            isOptimizing={isOptimizing}
            optimizationResult={optimizationResult}
            onApplyOptimized={handleApplyOptimized}
          />
        )}

        {currentTab === 'standings' && (
          <LeagueTableView
            teams={data?.teams || {}}
            leagueName={data?.leagueName || 'Premier League'}
          />
        )}

        {currentTab === 'screener' && <ScreenerView />}

        {currentTab === 'export' && <GithubExportView data={data} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-slate-500 text-xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>FishyFootball Predictor & Backtester</span>
            <span aria-hidden="true">·</span>
            <span>Estadísticas de <a href="https://thefishy.co.uk" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white underline">TheFishy.co.uk</a></span>
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            Mercados: BTTS SÍ / NO · OVER / UNDER 2.5 GOLES · POISSON BIVARIATE
          </div>
        </div>
      </footer>
    </div>
  );
}
