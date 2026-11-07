import { getUpcomingFixtures, getFinishedResults, getLeagueTableAndStats } from '../src/services/theFishyScraper';
import { runBacktest, predictMatch, DEFAULT_PARAMETERS } from '../src/services/predictiveModel';
import fs from 'fs';

async function run() {
  console.log('Iniciando actualización rápida de pronósticos y screener global (Ligas Principales)...');
  
  const majorLeagues = [
    { id: '1', name: 'Premier League', group: 'England' },
    { id: '2', name: 'Championship', group: 'England' },
    { id: '3', name: 'League One', group: 'England' },
    { id: '4', name: 'League Two', group: 'England' },
    { id: '31', name: 'La Liga', group: 'Spain' },
    { id: '32', name: 'Bundesliga', group: 'Germany' },
    { id: '33', name: 'Serie A', group: 'Italy' },
    { id: '34', name: 'Ligue 1', group: 'France' },
    { id: '10', name: 'Scottish Premiership', group: 'Scotland' },
    { id: '17', name: 'Champions League', group: 'UEFA' },
    { id: '18', name: 'Europa League', group: 'UEFA' },
    { id: '36', name: 'Eredivisie', group: 'Netherlands' },
    { id: '37', name: 'Primeira Liga', group: 'Portugal' },
    { id: '35', name: 'Belgian Pro League', group: 'Belgium' },
    { id: '38', name: 'Swiss Super League', group: 'Switzerland' },
    { id: '30', name: 'MLS', group: 'America' },
    { id: '77', name: 'Liga MX', group: 'Mexico' },
    { id: '78', name: 'Argentine Liga Profesional', group: 'Argentina' },
    { id: '76', name: 'Brazil Serie A', group: 'Brazil' },
    { id: '74', name: 'Australia A-League', group: 'Australia' },
  ];

  const allFixtures: any[] = [];
  const allResults: any[] = [];

  for (const l of majorLeagues) {
    try {
      console.log(`Procesando liga ${l.id} (${l.name})...`);
      const teams = await getLeagueTableAndStats(l.id);
      const fixtures = await getUpcomingFixtures(l.id, 7);
      const results = await getFinishedResults(l.id, 30);
      const backtest = runBacktest(results, teams, DEFAULT_PARAMETERS, l.id);
      
      const preds = fixtures.map(f => {
        const p = predictMatch(f.homeTeam, f.awayTeam, teams, DEFAULT_PARAMETERS);
        const maxProb = Math.max(p.bttsProbability, p.bttsNoProbability, p.over25Probability, p.under25Probability);
        const confidenceScore = Math.round(maxProb * 100);
        return { 
          ...f, 
          leagueId: l.id,
          leagueName: l.name, 
          prediction: p, 
          pred: p,
          confidenceScore 
        };
      });

      const evaluatedResults = backtest.evaluatedMatches.map(r => ({ 
        ...r, 
        leagueId: l.id,
        leagueName: l.name 
      }));

      allFixtures.push(...preds);
      allResults.push(...evaluatedResults);

      const payload = {
        leagueId: l.id,
        leagueName: l.name,
        timestamp: new Date().toISOString(),
        fixtures: preds,
        results: evaluatedResults,
        teams,
        backtest: backtest.metrics,
        parameters: DEFAULT_PARAMETERS
      };

      fs.writeFileSync(`data_league_${l.id}.json`, JSON.stringify(payload, null, 2));
      try {
        if (!fs.existsSync('public')) fs.mkdirSync('public', { recursive: true });
        fs.writeFileSync(`public/data_league_${l.id}.json`, JSON.stringify(payload, null, 2));
      } catch {}

      console.log(`Liga ${l.id} (${l.name}) actualizada correctamente.`);
    } catch (err) {
      console.warn(`Aviso: No se pudo obtener datos en vivo para la liga ${l.id} (${l.name}):`, err);
    }
  }

  allFixtures.sort((a, b) => b.confidenceScore - a.confidenceScore);
  allResults.sort((a, b) => a.daysAgo - b.daysAgo);

  const screenerPayload = {
    success: true,
    count: allFixtures.length,
    fixtures: allFixtures,
    timestamp: new Date().toISOString()
  };

  const resultsPayload = {
    success: true,
    count: allResults.length,
    results: allResults,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync('screener.json', JSON.stringify(screenerPayload, null, 2));
  fs.writeFileSync('screener-results.json', JSON.stringify(resultsPayload, null, 2));
  try {
    if (!fs.existsSync('public')) fs.mkdirSync('public', { recursive: true });
    fs.writeFileSync('public/screener.json', JSON.stringify(screenerPayload, null, 2));
    fs.writeFileSync('public/screener-results.json', JSON.stringify(resultsPayload, null, 2));
  } catch {}

  console.log(`Actualización rápida completa. Total partidos próximos: ${allFixtures.length}, Resultados backtest: ${allResults.length}`);
}

run().catch(err => {
  console.error('Error fatal en actualización:', err);
  process.exit(0);
});
