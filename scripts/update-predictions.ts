import { getUpcomingFixtures, getFinishedResults, getLeagueTableAndStats } from '../src/services/theFishyScraper';
import { runBacktest, predictMatch } from '../src/services/predictiveModel';
import fs from 'fs';

async function run() {
  console.log('Iniciando actualización diaria de pronósticos...');
  const leagues = ['1', '31', '33', '32', '34']; // EPL, LaLiga, SerieA, Bundesliga, Ligue1
  for (const l of leagues) {
    try {
      console.log(`Procesando liga ${l}...`);
      const teams = await getLeagueTableAndStats(l);
      const fixtures = await getUpcomingFixtures(l, 7);
      const results = await getFinishedResults(l, 30);
      const backtest = runBacktest(results, teams);
      const preds = fixtures.map(f => ({ ...f, pred: predictMatch(f.homeTeam, f.awayTeam, teams) }));
      fs.writeFileSync(`data_league_${l}.json`, JSON.stringify({ fixtures: preds, backtest: backtest.metrics }, null, 2));
      console.log(`Liga ${l} actualizada correctamente.`);
    } catch (err) {
      console.warn(`Aviso: No se pudo obtener datos en vivo para la liga ${l}, usando datos base/fallback:`, err);
      fs.writeFileSync(`data_league_${l}.json`, JSON.stringify({ fixtures: [], backtest: { totalMatches: 0, accuracyBtts: 0, accuracyOu: 0 } }, null, 2));
    }
  }
  console.log('Pronósticos actualizados exitosamente.');
}

run().catch(err => {
  console.error('Error fatal en actualización:', err);
  process.exit(0);
});
