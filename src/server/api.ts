import { Request, Response, Router } from 'express';
import {
  getAvailableLeagues,
  getLeagueTableAndStats,
  getUpcomingFixtures,
  getFinishedResults,
  clearScraperCache
} from '../services/theFishyScraper.ts';
import {
  DEFAULT_PARAMETERS,
  predictMatch,
  predictMatchImmutable,
  runBacktest,
  optimizeParameters
} from '../services/predictiveModel.ts';
import { ModelParameters, LeagueDataResponse, FixtureMatch, FinishedMatch } from '../types/football.ts';

export const apiRouter = Router();

// GET /api/leagues
apiRouter.get('/leagues', async (_req: Request, res: Response) => {
  try {
    const leagues = await getAvailableLeagues();
    res.json({ success: true, count: leagues.length, leagues });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/screener - Scans ALL available leagues for upcoming prediction opportunities
apiRouter.get('/screener', async (req: Request, res: Response) => {
  try {
    const daysAhead = Math.min(7, Math.max(1, parseInt(String(req.query.daysAhead || '7'), 10)));
    const leagues = await getAvailableLeagues();
    const allFixtures: (FixtureMatch & { leagueId: string; leagueName: string; confidenceScore: number })[] = [];

    // Process leagues in parallel batches of 15 to avoid overwhelming network while scanning all 200+ leagues
    const batchSize = 15;
    for (let i = 0; i < leagues.length; i += batchSize) {
      const batch = leagues.slice(i, i + batchSize);
      const promises = batch.map(async (league) => {
        try {
          const [teams, rawFixtures] = await Promise.all([
            getLeagueTableAndStats(league.id),
            getUpcomingFixtures(league.id, daysAhead),
          ]);

          if (rawFixtures && rawFixtures.length > 0) {
            for (const f of rawFixtures) {
              const pred = predictMatchImmutable(league.id, f.homeTeam, f.awayTeam, f.dateRaw, teams, DEFAULT_PARAMETERS);
              const maxProb = Math.max(pred.bttsProbability, pred.bttsNoProbability, pred.over25Probability, pred.under25Probability);
              const confidenceScore = Math.round(maxProb * 100);

              allFixtures.push({
                ...f,
                leagueId: league.id,
                leagueName: league.name,
                prediction: pred,
                confidenceScore,
              });
            }
          }
        } catch (err) {
          // Ignore individual league fetch errors during global scan
        }
      });
      await Promise.all(promises);
    }

    allFixtures.sort((a, b) => b.confidenceScore - a.confidenceScore);
    res.json({ success: true, count: allFixtures.length, fixtures: allFixtures });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/screener-results - Scans finished results across ALL available leagues for backtesting
apiRouter.get('/screener-results', async (req: Request, res: Response) => {
  try {
    const daysBehind = Math.min(14, Math.max(1, parseInt(String(req.query.daysBehind || '14'), 10)));
    const leagues = await getAvailableLeagues();
    let allResults: FinishedMatch[] = [];

    const batchSize = 15;
    for (let i = 0; i < leagues.length; i += batchSize) {
      const batch = leagues.slice(i, i + batchSize);
      const promises = batch.map(async (league) => {
        try {
          const [teams, rawResults] = await Promise.all([
            getLeagueTableAndStats(league.id),
            getFinishedResults(league.id, daysBehind),
          ]);

          if (rawResults && rawResults.length > 0) {
            const backtest = runBacktest(rawResults.map(r => ({ ...r, leagueName: league.name })), teams, DEFAULT_PARAMETERS, league.id);
            allResults.push(...backtest.evaluatedMatches);
          }
        } catch (err) {
          // Ignore individual league errors
        }
      });
      await Promise.all(promises);
    }

    allResults.sort((a, b) => a.daysAgo - b.daysAgo);
    res.json({ success: true, count: allResults.length, results: allResults });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/data
apiRouter.get('/data', async (req: Request, res: Response) => {
  try {
    const tableId = String(req.query.table || '1');
    const daysAhead = Math.min(14, Math.max(1, parseInt(String(req.query.daysAhead || '7'), 10)));
    const daysBehind = Math.min(60, Math.max(1, parseInt(String(req.query.daysBehind || '30'), 10)));
    const forceRefresh = req.query.forceRefresh === 'true';

    if (forceRefresh) {
      clearScraperCache();
    }

    const [leagues, teams, rawFixtures, rawResults] = await Promise.all([
      getAvailableLeagues(),
      getLeagueTableAndStats(tableId),
      getUpcomingFixtures(tableId, daysAhead),
      getFinishedResults(tableId, daysBehind),
    ]);

    const leagueInfo = leagues.find(l => l.id === tableId) || { id: tableId, name: `Liga ${tableId}`, group: '' };

    const params: ModelParameters = {
      homeAdvantage: req.query.homeAdv ? parseFloat(String(req.query.homeAdv)) : DEFAULT_PARAMETERS.homeAdvantage,
      extendedStatsWeight: req.query.extWeight ? parseFloat(String(req.query.extWeight)) : DEFAULT_PARAMETERS.extendedStatsWeight,
      formWeight: req.query.formWeight ? parseFloat(String(req.query.formWeight)) : DEFAULT_PARAMETERS.formWeight,
      bttsThreshold: req.query.bttsThresh ? parseFloat(String(req.query.bttsThresh)) : DEFAULT_PARAMETERS.bttsThreshold,
      over25Threshold: req.query.overThresh ? parseFloat(String(req.query.overThresh)) : DEFAULT_PARAMETERS.over25Threshold,
    };

    const fixtures = rawFixtures.map(f => ({
      ...f,
      leagueName: leagueInfo.name,
      prediction: predictMatchImmutable(tableId, f.homeTeam, f.awayTeam, f.dateRaw, teams, params),
    }));

    const backtestResult = runBacktest(rawResults.map(r => ({ ...r, leagueName: leagueInfo.name })), teams, params, tableId);

    const payload: LeagueDataResponse = {
      leagueId: tableId,
      leagueName: leagueInfo.name,
      timestamp: new Date().toISOString(),
      fixtures,
      results: backtestResult.evaluatedMatches,
      teams,
      backtest: backtestResult.metrics,
      parameters: params,
    };

    res.json({ success: true, data: payload });
  } catch (err: unknown) {
    console.error('API /data error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/optimize
apiRouter.post('/optimize', async (req: Request, res: Response) => {
  try {
    const { tableId = '1', daysBehind = 30 } = req.body || {};
    const [teams, rawResults] = await Promise.all([
      getLeagueTableAndStats(tableId),
      getFinishedResults(tableId, daysBehind),
    ]);

    const optimization = optimizeParameters(rawResults, teams);
    res.json({ success: true, optimization });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});
