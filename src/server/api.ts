import { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
import {
  getAvailableLeagues,
  getLeagueTableAndStats,
  getUpcomingFixtures,
  getFinishedResults,
  getThisWeeksFixtures,
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
    res.json({
      success: true,
      leagues: [
        { id: '1', name: 'Premier League', group: 'England' },
        { id: '31', name: 'La Liga', group: 'Spain' },
        { id: '32', name: 'Bundesliga', group: 'Germany' },
        { id: '33', name: 'Serie A', group: 'Italy' },
        { id: '34', name: 'Ligue 1', group: 'France' },
      ]
    });
  }
});

// GET /api/screener - Scans ALL available leagues for upcoming prediction opportunities
apiRouter.get('/screener', async (_req: Request, res: Response) => {
  try {
    const screenerPath = path.resolve(process.cwd(), 'screener.json');
    if (fs.existsSync(screenerPath)) {
      const content = fs.readFileSync(screenerPath, 'utf-8');
      const json = JSON.parse(content);
      if (json && json.success) {
        return res.json(json);
      }
    }

    const allFixtures: (FixtureMatch & { leagueId: string; leagueName: string; confidenceScore: number })[] = [];

    try {
      const fishyFixtures = await getThisWeeksFixtures();
      if (fishyFixtures && fishyFixtures.length > 0) {
        for (const f of fishyFixtures) {
          const pred = predictMatchImmutable('1', f.homeTeam, f.awayTeam, f.dateRaw, {}, DEFAULT_PARAMETERS);
          const maxProb = Math.max(pred.bttsProbability, pred.bttsNoProbability, pred.over25Probability, pred.under25Probability);
          const confidenceScore = Math.round(maxProb * 100);
          allFixtures.push({
            ...f,
            leagueId: f.leagueId || 'thisweek',
            leagueName: f.leagueName || 'General',
            prediction: pred,
            confidenceScore,
          });
        }
      }
    } catch (err) {
      console.warn('Error fetching thisweeksfixtures:', err);
    }

    if (allFixtures.length === 0) {
      const daysAhead = 7;
      const leagues = await getAvailableLeagues();
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
          } catch (err) {}
        });
        await Promise.all(promises);
      }
    }

    allFixtures.sort((a, b) => b.confidenceScore - a.confidenceScore);
    res.json({ success: true, count: allFixtures.length, fixtures: allFixtures });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/screener-results - Scans finished results across ALL available leagues for backtesting
apiRouter.get('/screener-results', async (_req: Request, res: Response) => {
  try {
    const resultsPath = path.resolve(process.cwd(), 'screener-results.json');
    if (fs.existsSync(resultsPath)) {
      const content = fs.readFileSync(resultsPath, 'utf-8');
      const json = JSON.parse(content);
      if (json && json.success) {
        return res.json(json);
      }
    }

    const daysBehind = 14;
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
        } catch (err) {}
      });
      await Promise.all(promises);
    }

    allResults.sort((a, b) => b.daysAgo - a.daysAgo);
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

    let leagues: any[] = [];
    let teams: any = {};
    let rawFixtures: any[] = [];
    let rawResults: any[] = [];
    let usedStaticFallback = false;

    try {
      [leagues, teams, rawFixtures, rawResults] = await Promise.all([
        getAvailableLeagues(),
        getLeagueTableAndStats(tableId),
        getUpcomingFixtures(tableId, daysAhead),
        getFinishedResults(tableId, daysBehind),
      ]);
      if (!teams || Object.keys(teams).length === 0) {
        throw new Error('No teams found from live scraping');
      }
    } catch (scrapeErr) {
      console.warn(`Live scraping failed for table=${tableId}, falling back to static json:`, scrapeErr);
      usedStaticFallback = true;
    }

    const params: ModelParameters = {
      homeAdvantage: req.query.homeAdv ? parseFloat(String(req.query.homeAdv)) : DEFAULT_PARAMETERS.homeAdvantage,
      extendedStatsWeight: req.query.extWeight ? parseFloat(String(req.query.extWeight)) : DEFAULT_PARAMETERS.extendedStatsWeight,
      formWeight: req.query.formWeight ? parseFloat(String(req.query.formWeight)) : DEFAULT_PARAMETERS.formWeight,
      bttsThreshold: req.query.bttsThresh ? parseFloat(String(req.query.bttsThresh)) : DEFAULT_PARAMETERS.bttsThreshold,
      over25Threshold: req.query.overThresh ? parseFloat(String(req.query.overThresh)) : DEFAULT_PARAMETERS.over25Threshold,
    };

    if (usedStaticFallback) {
      const jsonPath = path.resolve(process.cwd(), `data_league_${tableId}.json`);
      const fallbackPath = fs.existsSync(jsonPath) ? jsonPath : path.resolve(process.cwd(), 'data_league_1.json');
      if (fs.existsSync(fallbackPath)) {
        const fileContent = fs.readFileSync(fallbackPath, 'utf-8');
        const staticData = JSON.parse(fileContent) as LeagueDataResponse;
        
        const fallbackTeams = staticData.teams || {};
        const leagueName = staticData.leagueName || `Liga ${tableId}`;
        const fixtures = (staticData.fixtures || []).map(f => ({
          ...f,
          prediction: predictMatchImmutable(tableId, f.homeTeam, f.awayTeam, f.dateRaw, fallbackTeams, params),
        }));
        const backtestResult = runBacktest((staticData.results || []).map(r => ({ ...r, leagueName })), fallbackTeams, params, tableId);

        const payload: LeagueDataResponse = {
          ...staticData,
          leagueId: tableId,
          leagueName,
          timestamp: new Date().toISOString(),
          fixtures,
          results: backtestResult.evaluatedMatches,
          teams: fallbackTeams,
          backtest: backtestResult.metrics,
          parameters: params,
        };

        return res.json({ success: true, data: payload });
      }
    }

    const leagueInfo = leagues.find(l => l.id === tableId) || { id: tableId, name: `Liga ${tableId}`, group: '' };

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
    try {
      const tableId = String(req.query.table || '1');
      const jsonPath = path.resolve(process.cwd(), `data_league_${tableId}.json`);
      if (fs.existsSync(jsonPath)) {
        const fileContent = fs.readFileSync(jsonPath, 'utf-8');
        const staticData = JSON.parse(fileContent);
        return res.json({ success: true, data: staticData });
      }
    } catch {}

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
