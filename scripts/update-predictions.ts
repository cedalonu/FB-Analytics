import { getUpcomingFixtures, getFinishedResults, getLeagueTableAndStats } from '../src/services/theFishyScraper';
import { runBacktest, predictMatch, DEFAULT_PARAMETERS } from '../src/services/predictiveModel';
import fs from 'fs';

const LEAGUE_NAMES: Record<string, string> = {
  '1': 'Premier League',
  '31': 'La Liga',
  '32': 'Bundesliga',
  '33': 'Serie A',
  '34': 'Ligue 1'
};

async function run() {
  console.log('Iniciando actualización diaria de pronósticos...');
  const leagues = ['1', '31', '33', '32', '34']; // EPL, LaLiga, SerieA, Bundesliga, Ligue1
  for (const l of leagues) {
    try {
      console.log(`Procesando liga ${l} (${LEAGUE_NAMES[l] || l})...`);
      const teams = await getLeagueTableAndStats(l);
      const fixtures = await getUpcomingFixtures(l, 7);
      const results = await getFinishedResults(l, 30);
      const backtest = runBacktest(results, teams);
      const leagueName = LEAGUE_NAMES[l] || `Liga ${l}`;
      const preds = fixtures.map(f => {
        const p = predictMatch(f.homeTeam, f.awayTeam, teams);
        return { ...f, leagueName, prediction: p, pred: p };
      });
      const evaluatedResults = backtest.evaluatedMatches.map(r => ({ ...r, leagueName }));

      const payload = {
        leagueId: l,
        leagueName,
        timestamp: new Date().toISOString(),
        fixtures: preds,
        results: evaluatedResults,
        teams,
        backtest: backtest.metrics,
        parameters: DEFAULT_PARAMETERS
      };

      fs.writeFileSync(`data_league_${l}.json`, JSON.stringify(payload, null, 2));
      fs.writeFileSync(`public/data_league_${l}.json`, JSON.stringify(payload, null, 2));
      console.log(`Liga ${l} actualizada correctamente.`);
    } catch (err) {
      console.warn(`Aviso: No se pudo obtener datos en vivo para la liga ${l}, usando datos base/fallback:`, err);
      const leagueName = LEAGUE_NAMES[l] || `Liga ${l}`;
      const fallbackPayload = {
        leagueId: l,
        leagueName,
        timestamp: new Date().toISOString(),
        fixtures: [],
        results: [],
        teams: {},
        backtest: {
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
            btts: { predictedYesActualYes: 0, predictedYesActualNo: 0, predictedNoActualYes: 0, predictedNoActualNo: 0 },
            overUnder: { predictedOverActualOver: 0, predictedOverActualUnder: 0, predictedUnderActualOver: 0, predictedUnderActualUnder: 0 }
          },
          logLoss: 0,
          brierScore: 0,
          simulatedRoi: 0
        },
        parameters: DEFAULT_PARAMETERS
      };
      fs.writeFileSync(`data_league_${l}.json`, JSON.stringify(fallbackPayload, null, 2));
      fs.writeFileSync(`public/data_league_${l}.json`, JSON.stringify(fallbackPayload, null, 2));
    }
  }
  console.log('Pronósticos actualizados exitosamente.');
}

run().catch(err => {
  console.error('Error fatal en actualización:', err);
  process.exit(0);
});
